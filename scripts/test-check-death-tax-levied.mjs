#!/usr/bin/env node
/**
 * Hermetic tests for scripts/check-death-tax-levied.mjs.
 *
 * Each case mutates a temporary copy of the real tax-thresholds and tax-rates
 * reference data and asserts the gate's exit code. That proves every check can
 * go red, so a green from the gate means something.
 */
import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/check-death-tax-levied.mjs');
const THRESHOLDS = JSON.parse(readFileSync(join(ROOT, 'reference-data/tax-thresholds.json'), 'utf8'));
const RATES = JSON.parse(readFileSync(join(ROOT, 'reference-data/tax-rates.json'), 'utf8'));
const dir = mkdtempSync(join(tmpdir(), 'death-tax-levied-'));

// Every fixture gets its own file: the cases are built before any of them runs.
let n = 0;
const run = (args) => spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
const write = (obj) => {
  const p = join(dir, `data-${++n}.json`);
  writeFileSync(p, typeof obj === 'string' ? obj : JSON.stringify(obj));
  return p;
};
// Mutate one jurisdiction entry in a copy of either file.
const edit = (data, code, fn) => {
  const d = structuredClone(data);
  if (!d.jurisdictions[code]) throw new Error(`fixture drift: no jurisdiction ${code}`);
  fn(d.jurisdictions[code], d);
  return d;
};
const thresholds = (d) => ['--thresholds', write(d)];
const rates = (d) => ['--rates', write(d)];

const cases = [
  ['the real reference data is consistent', [], 0],

  // R1 — the forcing function: every entry answers the question.
  ['a jurisdiction with no deathTaxLevied (thresholds)', thresholds(edit(THRESHOLDS, 'GB', (j) => delete j.deathTaxLevied)), 1],
  ['a jurisdiction with no deathTaxLevied (rates)', rates(edit(RATES, 'NZ', (j) => delete j.deathTaxLevied)), 1],
  ['deathTaxLevied as a string', thresholds(edit(THRESHOLDS, 'SG', (j) => { j.deathTaxLevied = 'false'; })), 1],
  ['a new jurisdiction added to both files without the flag', [
    ...thresholds(edit(THRESHOLDS, 'GB', (j, d) => { d.jurisdictions.ZZ = { name: 'Nowhere', taxName: 'Tax', thresholds: [] }; })),
    ...rates(edit(RATES, 'GB', (j, d) => { d.jurisdictions.ZZ = { name: 'Nowhere', taxName: 'Tax', rates: [] }; })),
  ], 1],

  // R2 — the two files agree.
  ['the files disagree on a value', rates(edit(RATES, 'DE', (j) => { j.deathTaxLevied = false; j.taxName = 'N/A — none'; j.rates = []; })), 1],
  ['a jurisdiction present in only one file', rates(edit(RATES, 'GB', (j, d) => { delete d.jurisdictions.JP; })), 1],

  // R3 — "no tax" with tax data is a contradiction.
  ['levied false but rates present', rates(edit(RATES, 'AU', (j) => { j.rates = [{ rate: 10 }]; })), 1],
  ['levied false but thresholds present', thresholds(edit(THRESHOLDS, 'CA', (j) => { j.thresholds = [{ amount: 1 }]; })), 1],
  ['levied false but a standardRate present', rates(edit(RATES, 'IN', (j) => { j.standardRate = [{ rate: 5 }]; })), 1],

  // R4 — the silent gap itself: a tax that exists with nothing modelled.
  ['levied true with an empty rates array', rates(edit(RATES, 'FR', (j) => { j.rates = []; })), 1],
  ['levied true with no rates key', rates(edit(RATES, 'JP', (j) => { delete j.rates; })), 1],

  // R5 — the prose note and the flag say the same thing.
  ['taxName says N/A but the flag says levied', [
    ...thresholds(edit(THRESHOLDS, 'NZ', (j) => { j.deathTaxLevied = true; j.thresholds = [{ amount: 1 }]; })),
    ...rates(edit(RATES, 'NZ', (j) => { j.deathTaxLevied = true; j.rates = [{ rate: 1 }]; })),
  ], 1],
  ['the flag says not levied but taxName names a tax', [
    ...thresholds(edit(THRESHOLDS, 'IE', (j) => { j.deathTaxLevied = false; j.thresholds = []; })),
    ...rates(edit(RATES, 'IE', (j) => { j.deathTaxLevied = false; j.rates = []; delete j.standardRate; })),
  ], 1],

  // Cannot answer — never a pass.
  ['the thresholds file is missing', ['--thresholds', join(dir, 'absent.json')], 2],
  ['the rates file is not JSON', ['--rates', write('{ not json')], 2],
  ['a file with no jurisdictions object', thresholds({ title: 'x' }), 2],
  ['a flag with no value', ['--rates'], 2],
  ['an unknown argument', ['--nope'], 2],
];

let failed = 0;
cases.forEach(([name, args, want], i) => {
  const r = run(args);
  const ok = r.status === want;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${i + 1} ${name} — exit ${r.status}, want ${want}`);
  if (!ok) console.log((r.stdout + r.stderr).replace(/^/gm, '       '));
});
rmSync(dir, { recursive: true, force: true });
console.log(`\n${cases.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
