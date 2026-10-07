#!/usr/bin/env node
/**
 * Gate: every jurisdiction in the tax reference data says whether it levies a
 * death tax, and the data agrees with the answer.
 *
 * Five jurisdictions (AU, CA, IN, NZ, SG) levy no inheritance or estate tax. The
 * standard used to record that only as prose in a display field ("N/A — No
 * inheritance tax") plus an empty rates array, and an empty rates array is also
 * what "not yet researched" looks like. `deathTaxLevied` makes the answer data,
 * so "no tax here" and "not modelled" can be told apart without reading prose.
 *
 * Checks, over reference-data/tax-thresholds.json and tax-rates.json:
 *   R1 every jurisdiction entry carries `deathTaxLevied` as a boolean
 *   R2 both files list the same jurisdictions with the same value
 *   R3 `false` → no rates, thresholds or standardRate entries
 *   R4 `true`  → a non-empty `rates` array in tax-rates.json
 *   R5 `taxName` begins "N/A" exactly when the value is `false`
 *
 * Exit 0 consistent · 1 refused (each finding printed) · 2 cannot answer (a file
 * is missing, unreadable or has no `jurisdictions` object). Never read 2 as clear.
 *
 * Usage: node scripts/check-death-tax-levied.mjs [--thresholds <path>] [--rates <path>]
 */
import { readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paths = {
  thresholds: join(ROOT, 'reference-data/tax-thresholds.json'),
  rates: join(ROOT, 'reference-data/tax-rates.json'),
};

const cannotAnswer = (msg) => {
  console.error(`CANNOT ANSWER — ${msg}`);
  process.exit(2);
};

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  if (!(key in paths) || !args[i].startsWith('--')) cannotAnswer(`unknown argument ${args[i]}`);
  if (args[i + 1] === undefined) cannotAnswer(`${args[i]} needs a value`);
  paths[key] = resolve(args[i + 1]);
}

const load = (name) => {
  let data;
  try {
    data = JSON.parse(readFileSync(paths[name], 'utf8'));
  } catch (e) {
    cannotAnswer(`${paths[name]}: ${e.message}`);
  }
  const j = data?.jurisdictions;
  if (!j || typeof j !== 'object' || Array.isArray(j) || !Object.keys(j).length) {
    cannotAnswer(`${paths[name]} has no jurisdictions object`);
  }
  return j;
};

const files = { thresholds: load('thresholds'), rates: load('rates') };
const findings = [];
const refuse = (msg) => findings.push(msg);
const hasEntries = (v) => Array.isArray(v) && v.length > 0;

// R1 + R3 + R5, per file.
for (const [name, jurisdictions] of Object.entries(files)) {
  for (const [code, entry] of Object.entries(jurisdictions)) {
    const where = `${name} ${code}`;
    const levied = entry.deathTaxLevied;
    if (typeof levied !== 'boolean') {
      refuse(`R1 ${where}: deathTaxLevied is ${levied === undefined ? 'absent' : JSON.stringify(levied)} — must be true or false`);
      continue;
    }
    if (!levied) {
      for (const key of ['rates', 'thresholds', 'standardRate']) {
        if (hasEntries(entry[key])) refuse(`R3 ${where}: deathTaxLevied is false but ${key} has ${entry[key].length} entr(ies)`);
      }
    }
    const saysNone = /^N\/A\b/.test(entry.taxName ?? '');
    if (saysNone === levied) {
      refuse(`R5 ${where}: taxName ${JSON.stringify(entry.taxName)} disagrees with deathTaxLevied ${levied}`);
    }
  }
}

// R2 — the two files agree.
const codes = new Set([...Object.keys(files.thresholds), ...Object.keys(files.rates)]);
for (const code of [...codes].sort()) {
  const t = files.thresholds[code];
  const r = files.rates[code];
  if (!t || !r) {
    refuse(`R2 ${code}: present in ${t ? 'thresholds' : 'rates'} only`);
    continue;
  }
  if (typeof t.deathTaxLevied === 'boolean' && typeof r.deathTaxLevied === 'boolean' && t.deathTaxLevied !== r.deathTaxLevied) {
    refuse(`R2 ${code}: thresholds says ${t.deathTaxLevied}, rates says ${r.deathTaxLevied}`);
  }
  // R4 — the silent gap: a tax exists and no rate is modelled.
  if (r.deathTaxLevied === true && !hasEntries(r.rates)) {
    refuse(`R4 rates ${code}: deathTaxLevied is true but no rates are modelled`);
  }
}

if (findings.length) {
  for (const f of findings) console.log(`⛔ ${f}`);
  console.log(`\nREFUSED — ${findings.length} finding(s)`);
  process.exit(1);
}
const none = [...codes].filter((c) => files.rates[c].deathTaxLevied === false).sort();
console.log(`OK — ${codes.size} jurisdictions declare deathTaxLevied; no death tax: ${none.join(', ') || 'none'}`);
