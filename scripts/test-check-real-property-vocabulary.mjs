#!/usr/bin/env node
/**
 * Hermetic tests for scripts/check-real-property-vocabulary.mjs.
 *
 * Each case copies the files the gate reads into a temporary tree, mutates one
 * of them and asserts the exit code and the rule that fired. That proves every
 * check can go red, so a green from the gate means something.
 */
import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/check-real-property-vocabulary.mjs');
const NAMES = ['uk-england-wales', 'northern-ireland', 'ireland'];
const FILES = NAMES.flatMap((n) => [
  `v3/extensions/${n}/${n}.json`,
  `v3/extensions/${n}/extension.json`,
  `tests/v3/${n}/${n}.test.json`,
]);
const base = mkdtempSync(join(tmpdir(), 'real-property-vocabulary-'));

// A fresh copy of the real files, with `mutate(files)` applied to the parsed JSON.
let n = 0;
const tree = (mutate = () => {}) => {
  const dir = join(base, `t${++n}`);
  const files = {};
  for (const f of FILES) {
    try {
      files[f] = JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
    } catch {
      files[f] = undefined; // absent in the real tree: the gate must say so, not the harness
    }
  }
  mutate(files);
  for (const [f, data] of Object.entries(files)) {
    if (data === undefined) continue;
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), typeof data === 'string' ? data : JSON.stringify(data));
  }
  return ['--root', dir];
};
const schema = (f, name) => f[`v3/extensions/${name}/${name}.json`];
const slot = (f, name, array, field) => schema(f, name).properties[array].items.properties[field];

const cases = [
  ['the real tree is clear', [], 0, 'OK'],

  ['ireland without localTenureTypes', tree((f) => delete schema(f, 'ireland').properties.localTenureTypes), 1, 'R1 ireland'],
  ['northern-ireland without landRegistration', tree((f) => delete schema(f, 'northern-ireland').properties.landRegistration), 1, 'R2 northern-ireland'],
  ['ireland titleClass with an empty enum', tree((f) => { slot(f, 'ireland', 'landRegistration', 'titleClass').enum = []; }), 1, 'R2 ireland'],

  ['ireland loses fee_farm_grant', tree((f) => {
    const s = slot(f, 'ireland', 'localTenureTypes', 'localType');
    s.enum = s.enum.filter((v) => v !== 'fee_farm_grant');
  }), 1, 'R3 ireland: localTenureTypes[].localType has lost pinned value "fee_farm_grant"'],
  ['northern-ireland loses registry_of_deeds', tree((f) => {
    const s = slot(f, 'northern-ireland', 'landRegistration', 'register');
    s.enum = s.enum.filter((v) => v !== 'registry_of_deeds');
  }), 1, 'R3 northern-ireland'],
  ['england-wales loses commonhold', tree((f) => {
    const s = slot(f, 'uk-england-wales', 'localTenureTypes', 'localType');
    s.enum = s.enum.filter((v) => v !== 'commonhold');
  }), 1, 'R3 uk-england-wales'],

  ['a new northern-ireland tenure with no test case', tree((f) => {
    slot(f, 'northern-ireland', 'localTenureTypes', 'localType').enum.push('yearly_tenancy');
  }), 1, 'R4 northern-ireland: localTenureTypes[].localType value "yearly_tenancy"'],
  ['the only valid ireland registry_of_deeds case flipped to invalid', tree((f) => {
    for (const t of f['tests/v3/ireland/ireland.test.json'].tests) {
      if (JSON.stringify(t.data).includes('"registry_of_deeds"')) t.valid = false;
    }
  }), 1, 'R4 ireland: landRegistration[].register value "registry_of_deeds"'],

  ['northern-ireland claiming two jurisdictions', tree((f) => {
    f['v3/extensions/northern-ireland/extension.json'].applicableJurisdictions = ['GB-NIR', 'IE'];
  }), 1, 'R5 northern-ireland'],
  ['ireland claiming GB-NIR instead', tree((f) => {
    f['v3/extensions/ireland/extension.json'].applicableJurisdictions = ['GB-NIR'];
  }), 1, 'R5 ireland'],

  ['northern-ireland schema missing', tree((f) => { f['v3/extensions/northern-ireland/northern-ireland.json'] = undefined; }), 2, 'CANNOT ANSWER'],
  ['ireland test file unparsable', tree((f) => { f['tests/v3/ireland/ireland.test.json'] = '{ not json'; }), 2, 'CANNOT ANSWER'],
  ['an unknown argument', ['--tree', base], 2, 'CANNOT ANSWER'],
];

let pass = 0;
let fail = 0;
for (const [name, args, want, needle] of cases) {
  const r = spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
  const out = `${r.stdout}${r.stderr}`;
  if (r.status === want && out.includes(needle)) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name} — want exit ${want} with "${needle}", got ${r.status}\n${out.replace(/^/gm, '      ')}`);
  }
}
rmSync(base, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
