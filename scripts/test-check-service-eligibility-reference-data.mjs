#!/usr/bin/env node
/**
 * Hermetic tests for scripts/check-service-eligibility-reference-data.mjs.
 *
 * Each case copies the files the gate reads into a temporary tree, mutates one
 * of them and asserts the exit code and the rule that fired. That proves every
 * check can go red, so a green from the gate means something.
 */
import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, mkdtempSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/check-service-eligibility-reference-data.mjs');
const VOCAB = 'reference-data/regulated-service-types.json';
const PROFILES = 'reference-data/will-requirements-profiles.json';
const JURISDICTIONS = 'reference-data/jurisdiction-profiles.json';
const CEDAR_DIRS = ['cedar/service-eligibility', 'tests/cedar/service-eligibility'];
const JSON_FILES = [VOCAB, PROFILES, JURISDICTIONS];
const CEDAR_FILES = CEDAR_DIRS.flatMap((d) =>
  readdirSync(join(ROOT, d)).filter((f) => f.endsWith('.cedar')).map((f) => `${d}/${f}`),
);
const base = mkdtempSync(join(tmpdir(), 'service-eligibility-reference-data-'));

// A fresh copy of the real files, with `mutate(files)` applied: JSON files are
// parsed objects, Cedar files are strings. Setting a file to undefined omits it.
let n = 0;
const tree = (mutate = () => {}) => {
  const dir = join(base, `t${++n}`);
  const files = {};
  for (const f of JSON_FILES) {
    try {
      files[f] = JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
    } catch {
      files[f] = undefined; // absent in the real tree: the gate must say so, not the harness
    }
  }
  for (const f of CEDAR_FILES) files[f] = readFileSync(join(ROOT, f), 'utf8');
  mutate(files);
  for (const [f, data] of Object.entries(files)) {
    if (data === undefined) continue;
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), typeof data === 'string' ? data : JSON.stringify(data));
  }
  return ['--root', dir];
};
const types = (f) => f[VOCAB].serviceTypes;
const profile = (f, jur) => f[PROFILES].profiles[jur];
const requirement = (f, jur, id) => profile(f, jur).requirements.find((r) => r.id === id);
const sct = 'cedar/service-eligibility/sct.cedar';
const nir = 'cedar/service-eligibility/nir.cedar';

const cases = [
  ['the real tree is clear', [], 0, 'OK'],

  ['a Scotland permit names a service type the vocabulary does not have', tree((f) => {
    f[sct] = f[sct].replace('resource.serviceType == "iht_advice"', 'resource.serviceType == "iht_planning"');
  }), 1, 'R1 cedar/service-eligibility/sct.cedar: serviceType "iht_planning" is not in'],
  ['a serviceType test the gate cannot read', tree((f) => {
    f[nir] = f[nir].replace('resource.serviceType == "iht_advice"', 'resource.serviceType != "will_drafting"');
  }), 1, 'R1 cedar/service-eligibility/nir.cedar: a resource.serviceType expression'],

  ['Scotland loses its status for confirmation papers', tree((f) => {
    delete types(f).reserved_confirmation_activities.jurisdictions['GB-SCT'];
  }), 1, 'R2 cedar/service-eligibility/sct.cedar: "reserved_confirmation_activities" has no GB-SCT status'],
  ['a policy that names service types but declares no jurisdiction', tree((f) => {
    f[nir] = f[nir].replace(/@jurisdiction\("GB-NIR"\)\s*permit/, 'permit');
  }), 1, 'R2 cedar/service-eligibility/nir.cedar: a policy naming service types has no @jurisdiction'],

  ['the Northern Ireland profile removed', tree((f) => { delete f[PROFILES].profiles['GB-NIR']; }), 1,
    'R3 the packs cover GB-NIR but will-requirements-profiles.json has no profile for it'],
  ['a profile for a jurisdiction with no pack', tree((f) => {
    f[PROFILES].profiles['US-PA'] = profile(f, 'GB-ENG');
  }), 1, 'R3 will-requirements-profiles.json has a profile for US-PA but no pack covers it'],
  ['a service-type status keyed by an unknown jurisdiction', tree((f) => {
    types(f).will_drafting.jurisdictions['GB-XYZ'] = { status: 'unreserved', basis: 'x' };
  }), 1, 'R3 regulated-service-types.json will_drafting: "GB-XYZ" is not a key of jurisdiction-profiles.json'],

  ['two requirements with one id', tree((f) => {
    const reqs = profile(f, 'GB-SCT').requirements;
    reqs.push({ ...reqs[0] });
  }), 1, 'R4 GB-SCT: requirement id'],
  ['a requirement category outside the closed set', tree((f) => {
    requirement(f, 'GB-ENG', 'will_in_writing').category = 'vibes';
  }), 1, 'R4 GB-ENG will_in_writing: category "vibes"'],
  ['blocking given as a string', tree((f) => {
    requirement(f, 'GB-NIR', 'two_witnesses_present').blocking = 'yes';
  }), 1, 'R4 GB-NIR two_witnesses_present: blocking must be true or false'],
  ['a requirement with no legislative reference', tree((f) => {
    requirement(f, 'GB-SCT', 'legal_rights').legislativeReference = '';
  }), 1, 'R4 GB-SCT legal_rights: legislativeReference is empty'],
  ['a service-type status outside the closed set', tree((f) => {
    types(f).iht_advice.jurisdictions['GB-ENG'].status = 'maybe';
  }), 1, 'R4 iht_advice GB-ENG: status "maybe"'],

  ['Scotland loses legal rights', tree((f) => {
    profile(f, 'GB-SCT').requirements = profile(f, 'GB-SCT').requirements.filter((r) => r.id !== 'legal_rights');
  }), 1, 'R5 GB-SCT has lost pinned requirement "legal_rights"'],
  ['Scotland loses prior rights', tree((f) => {
    profile(f, 'GB-SCT').requirements = profile(f, 'GB-SCT').requirements.filter((r) => r.id !== 'prior_rights');
  }), 1, 'R5 GB-SCT has lost pinned requirement "prior_rights"'],
  ['Northern Ireland probate papers downgraded to unreserved', tree((f) => {
    types(f).reserved_probate_activities.jurisdictions['GB-NIR'].status = 'unreserved';
  }), 1, 'R5 reserved_probate_activities is pinned reserved in GB-NIR, found "unreserved"'],

  ['the vocabulary missing', tree((f) => { f[VOCAB] = undefined; }), 2, 'CANNOT ANSWER'],
  ['the profiles unparsable', tree((f) => { f[PROFILES] = '{ not json'; }), 2, 'CANNOT ANSWER'],
  ['no pack files at all', tree((f) => { for (const c of CEDAR_FILES) f[c] = undefined; }), 2, 'CANNOT ANSWER'],
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
