#!/usr/bin/env node
/**
 * Cross-border expressiveness test suite (TT-1455).
 *
 * examples/fixtures/cross-border-estate.json is validated for SHAPE by
 * scripts/validate-examples.sh. Shape is not the claim being made about it.
 *
 * The claim is that the standard can express, for an estate whose assets sit in
 * several jurisdictions, WHICH law reaches each thing and WHY — the connecting
 * factor — and not merely where each thing is located. A fixture that only
 * validates proves the schema is permissive; these assertions prove it is
 * expressive, and they fail if a later edit quietly flattens the fixture back
 * into a list of locations.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FIXTURE = resolve(ROOT, 'examples/fixtures/cross-border-estate.json');

const doc = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const estate = doc.estate;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}\n        ${err.message}`);
    failed++;
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

/** Every asset and property carrying its own succession regime. */
function regimes() {
  const out = [];
  for (const collection of ['assets', 'properties']) {
    for (const item of doc[collection] || []) {
      if (item.successionRegime) out.push({ id: item.id, collection, regime: item.successionRegime });
    }
  }
  return out;
}

/** itemId -> the country of the jurisdiction scoped to it by the coordination map. */
function situsByItem() {
  const map = {};
  for (const gj of estate.governingJurisdictions || []) {
    for (const key of ['assetIds', 'propertyIds']) {
      for (const id of gj[key] || []) map[id] = gj.jurisdiction.country;
    }
  }
  return map;
}

console.log(`Cross-border expressiveness — ${FIXTURE.replace(ROOT + '/', '')}\n`);

test('the estate names at least three foreign jurisdictions', () => {
  const domicile = estate.domicile.country;
  const foreign = new Set(
    (estate.governingJurisdictions || []).map(gj => gj.jurisdiction.country).filter(c => c !== domicile)
  );
  assert(foreign.size >= 3, `only ${foreign.size} foreign jurisdictions: ${[...foreign].join(', ')}`);
});

test('every foreign item carries its own connecting factor', () => {
  const rs = regimes();
  assert(rs.length >= 3, `only ${rs.length} per-item succession regimes; need at least 3`);
  for (const { id, collection, regime } of rs) {
    assert(regime.determinedBy, `${collection} ${id} has a successionRegime but no determinedBy`);
  }
});

test('the connecting factor is a choice, not a restatement of location', () => {
  const kinds = new Set(regimes().map(r => r.regime.determinedBy));
  assert(kinds.size >= 2, `every item uses the same connecting factor (${[...kinds].join(', ')})`);
});

test('at least one item is governed by a law other than its own situs', () => {
  const situs = situsByItem();
  const divergent = regimes().filter(
    r => situs[r.id] && r.regime.governingLaw.jurisdiction.country !== situs[r.id]
  );
  assert(
    divergent.length > 0,
    'no item whose governing law differs from its situs — the fixture restates locations rather than expressing which law reaches what'
  );
  for (const r of divergent) {
    assert(
      r.regime.determinedBy !== 'situs',
      `${r.id} is reached by ${r.regime.governingLaw.jurisdiction.country} law but sits in ${situs[r.id]}, so its factor cannot be "situs"`
    );
  }
});

test('the estate governing-law axis stays singular per scope', () => {
  assert(!Array.isArray(estate.domicile), 'domicile must be a single jurisdiction, not a list');
  const defaults = (estate.governingJurisdictions || []).filter(gj => gj.scope === 'default');
  assert(defaults.length === 1, `${defaults.length} jurisdictions scoped "default"; must be exactly 1`);
});

test('every scoped asset and property id resolves', () => {
  const known = new Set();
  for (const collection of ['assets', 'properties']) {
    for (const item of doc[collection] || []) known.add(item.id);
  }
  for (const [id] of Object.entries(situsByItem())) {
    assert(known.has(id), `governingJurisdictions scopes an unknown item ${id}`);
  }
});

test('every foreign jurisdiction holding an item has an ancillary probate entry', () => {
  const domicile = estate.domicile.country;
  const foreign = new Set(
    (estate.governingJurisdictions || [])
      .filter(gj => gj.scope === 'specific_assets')
      .map(gj => gj.jurisdiction.country)
      .filter(c => c !== domicile)
  );
  const covered = new Set((estate.ancillaryProbate || []).map(a => a.jurisdiction.country));
  const missing = [...foreign].filter(c => !covered.has(c));
  assert(missing.length === 0, `foreign jurisdictions with no ancillary probate entry: ${missing.join(', ')}`);
});

console.log('\n' + '═'.repeat(50));
console.log(`Cross-border expressiveness: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('═'.repeat(50));

process.exit(failed > 0 ? 1 : 0);
