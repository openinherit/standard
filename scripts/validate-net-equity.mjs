#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

/**
 * INHERIT derived net-equity validator.
 *
 * asset.netEquity, property.netEquity and estate.netEstateEquity are convenience
 * denormalisations: the authoritative figures are derived from the liabilities
 * array. JSON Schema cannot express arithmetic, so without this script the
 * derivation lives only in a $comment and the stored number is one nobody
 * checks — which is worse than no field at all, because consumers will trust it.
 *
 * Derivations enforced (they are the $comment text in v3/asset.json,
 * v3/property.json and v3/estate.json, in code):
 *
 *   entityValue      = professionalValuation ?? estimatedValue
 *   activeCharges    = SUM(settlementAmount ?? amount) over liabilities whose
 *                      securedAgainst is this entity.id AND chargeStatus === 'active'
 *   netEquity        = max(0, entityValue - activeCharges)
 *   inNegativeEquity = (entityValue - activeCharges) < 0
 *   netEstateEquity  = SUM(asset.netEquity) + SUM(property.netEquity)
 *                      - SUM(amount) over liabilities with no securedAgainst
 *
 * Only entities that STATE a figure are checked. The fields are optional and
 * this script never invents one.
 *
 * Usage: node scripts/validate-net-equity.mjs [--show] <inherit-document.json>
 *
 *   --show  also print every derived figure (one `derived` line per entity
 *           with a value, plus the estate total) — the adopter quickstart's
 *           "run one derivation" step. Checking and exit codes are unchanged.
 *
 * Exit codes:
 *   0 — every stated figure matches its derivation
 *   1 — at least one figure does not
 *   2 — usage error or unreadable document
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const NC = '\x1b[0m';

const args = process.argv.slice(2);
const SHOW = args.includes('--show');
const paths = args.filter((a) => a !== '--show');

if (paths.length !== 1) {
  console.error('Usage: node scripts/validate-net-equity.mjs [--show] <inherit-document.json>');
  process.exit(2);
}

const filePath = resolve(paths[0]);
let doc;
try {
  doc = JSON.parse(readFileSync(filePath, 'utf-8'));
} catch (err) {
  console.error(`${RED}Cannot read ${filePath}: ${err.message}${NC}`);
  process.exit(2);
}

let errors = 0;

function report(code, where, message) {
  errors += 1;
  console.log(`  ${RED}${code}${NC}  ${where}: ${message}`);
}

// professionalValuation wins over estimatedValue — the same precedence the
// $comment states. mortgageOutstanding is deliberately NOT consulted: it is an
// unreferenced convenience figure, while liabilities[] is the array that says
// which charge is still active.
const valueOf = (e) => e.professionalValuation ?? e.estimatedValue ?? null;

const liabilities = doc.liabilities || [];

const activeChargesAgainst = (entityId) =>
  liabilities
    .filter((l) => l.securedAgainst === entityId && l.chargeStatus === 'active')
    .reduce((sum, l) => sum + (l.settlementAmount?.amount ?? l.amount?.amount ?? 0), 0);

function show(where, field, amount, currency, workings) {
  if (SHOW) console.log(`  derived  ${where}: ${field} = ${amount} ${currency}  (${workings})`);
}

function checkEntity(kind, index, entity) {
  const stated = entity.netEquity;
  const statedFlag = entity.inNegativeEquity;
  const value = valueOf(entity);
  const where = `${kind}[${index}] ${entity.id ?? '(no id)'}`;

  if (SHOW && value !== null) {
    const charges = activeChargesAgainst(entity.id);
    show(where, 'netEquity', Math.max(0, value.amount - charges), value.currency,
      `value ${value.amount} - active charges ${charges}, floored at 0`);
  }

  if (stated === undefined && statedFlag === undefined) return;

  if (value === null) {
    report('NET_EQUITY_UNDERIVABLE', where,
      'states netEquity but carries neither professionalValuation nor estimatedValue, so the figure cannot be derived');
    return;
  }

  const charges = activeChargesAgainst(entity.id);
  const raw = value.amount - charges;
  const expected = Math.max(0, raw);

  if (stated !== undefined) {
    if (stated.amount !== expected) {
      report('NET_EQUITY_MISMATCH', where,
        `netEquity states ${stated.amount}, derivation gives ${expected} ` +
        `(value ${value.amount} - active charges ${charges}, floored at 0)`);
    }
    if (stated.currency !== value.currency) {
      report('NET_EQUITY_CURRENCY_MISMATCH', where,
        `netEquity is in ${stated.currency} but the value it derives from is in ${value.currency}`);
    }
  }

  if (statedFlag !== undefined && statedFlag !== raw < 0) {
    report('NET_EQUITY_FLAG_MISMATCH', where,
      `inNegativeEquity states ${statedFlag}, derivation gives ${raw < 0} ` +
      `(value ${value.amount} - active charges ${charges} = ${raw})`);
  }
}

(doc.assets || []).forEach((a, i) => checkEntity('assets', i, a));
(doc.properties || []).forEach((p, i) => checkEntity('properties', i, p));

// ── Estate total ───────────────────────────────────────────────────

const statedEstate = doc.estate?.netEstateEquity;
if (statedEstate !== undefined) {
  const netted = [...(doc.assets || []), ...(doc.properties || [])]
    .filter((e) => e.netEquity !== undefined);
  const unsecured = liabilities.filter((l) => l.securedAgainst === undefined);

  const currencies = new Set([
    ...netted.map((e) => e.netEquity.currency),
    ...unsecured.map((l) => l.amount?.currency).filter(Boolean),
  ]);
  currencies.add(statedEstate.currency);

  if (currencies.size > 1) {
    // Summing across currencies would produce a confident wrong number. The
    // standard has no FX rates, so this is not something to paper over.
    report('NET_EQUITY_CURRENCY_MIXED', 'estate',
      `netEstateEquity cannot be derived across mixed currencies: ${[...currencies].sort().join(', ')}`);
  } else {
    const expected =
      netted.reduce((s, e) => s + e.netEquity.amount, 0) -
      unsecured.reduce((s, l) => s + (l.amount?.amount ?? 0), 0);
    show('estate', 'netEstateEquity', expected, statedEstate.currency,
      `sum of ${netted.length} netted entities minus ${unsecured.length} unsecured liabilities`);
    if (statedEstate.amount !== expected) {
      report('NET_ESTATE_EQUITY_MISMATCH', 'estate',
        `netEstateEquity states ${statedEstate.amount}, derivation gives ${expected} ` +
        `(sum of ${netted.length} netted entities minus ${unsecured.length} unsecured liabilities)`);
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────

console.log('');
if (errors === 0) {
  console.log(`${GREEN}Net-equity figures match their derivations.${NC}`);
  process.exit(0);
} else {
  console.log(`${RED}${errors} net-equity mismatch(es) found.${NC}`);
  process.exit(1);
}
