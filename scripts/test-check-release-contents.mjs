#!/usr/bin/env node
/**
 * Hermetic tests for scripts/check-release-contents.mjs.
 *
 * Each case builds a synthetic repository tree -- the real v3 schemas, the real
 * schema and conformance package manifests, a small reference-data set -- then
 * mutates one thing and asserts the gate's exit code. Every assertion is shown
 * going red here, so a green from the gate at publish time means something.
 * No network: npm pack works offline on a package with no dependencies.
 */
import { spawnSync } from 'child_process';
import {
  cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/check-release-contents.mjs');
const work = mkdtempSync(join(tmpdir(), 'release-contents-'));

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, obj) => writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');

// The fixture's own version, pinned so the suite does not depend on the repo's release
// number. The packaged manifests are copied from the repo, so their version is overwritten.
const FIXTURE_VERSION = '6.6.0';

let n = 0;
/** A fresh tree whose packages mirror the root exactly -- the gate's green case. */
function makeTree() {
  const t = join(work, `tree-${++n}`);
  mkdirSync(t);
  writeJson(join(t, 'package.json'), { name: 'openinherit', version: FIXTURE_VERSION, private: true });
  cpSync(join(ROOT, 'v3'), join(t, 'v3'), { recursive: true });
  cpSync(join(ROOT, 'extensions-registry.json'), join(t, 'extensions-registry.json'));
  // Root and package reference-data start identical; the package ships only these two.
  mkdirSync(join(t, 'reference-data'));
  writeJson(join(t, 'reference-data/a.json'), { a: 1 });
  writeJson(join(t, 'reference-data/b.json'), { b: 2 });
  writeJson(join(t, 'reference-data/root-only.json'), { notShipped: true });

  const schema = join(t, 'packages/schema');
  mkdirSync(schema, { recursive: true });
  writeJson(join(schema, 'package.json'), { ...readJson(join(ROOT, 'packages/schema/package.json')), version: FIXTURE_VERSION });
  cpSync(join(t, 'v3'), join(schema, 'v3'), { recursive: true });
  cpSync(join(t, 'extensions-registry.json'), join(schema, 'extensions-registry.json'));
  mkdirSync(join(schema, 'reference-data'));
  cpSync(join(t, 'reference-data/a.json'), join(schema, 'reference-data/a.json'));
  cpSync(join(t, 'reference-data/b.json'), join(schema, 'reference-data/b.json'));

  const conf = join(t, 'packages/conformance');
  cpSync(join(ROOT, 'packages/conformance'), conf, { recursive: true });
  set(t, 'packages/conformance/package.json', (p) => { p.version = FIXTURE_VERSION; });
  set(t, 'packages/conformance/manifest.json', (m) => { m.version = FIXTURE_VERSION; });
  return t;
}
const set = (t, rel, fn) => {
  const p = join(t, rel);
  const d = readJson(p);
  fn(d);
  writeJson(p, d);
};
/** Apply the same schema edit to the root and the packaged copy, so only the R4 shape changes. */
const both = (t, rel, fn) => { set(t, rel, fn); set(t, join('packages/schema', rel), fn); };
const spaceConditional = (d) => d.allOf.find((m) => m.then && m.then.required);

const run = (args) => spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
const tree = (mutate = () => {}) => { const t = makeTree(); mutate(t); return ['--root', t]; };

const cases = [
  ['a tree whose packages mirror the root', tree(), 0],

  // R1 -- version
  ['the schema package is at a different version from root', tree((t) => set(t, 'packages/schema/package.json', (p) => { p.version = '6.6.1'; })), 1, 'R1'],
  ['the conformance package is at a different version from root', tree((t) => set(t, 'packages/conformance/package.json', (p) => { p.version = '6.5.0'; })), 1, 'R1+R6'],
  ['--tag names a version the packages are not at', [...tree(), '--tag', 'v6.7.0'], 1, 'R1'],
  ['--tag names the version the packages are at', [...tree(), '--tag', 'v6.6.0'], 0],
  ['--tag is not a version tag', [...tree(), '--tag', 'main'], 2],

  // R2 -- the schema mirror
  ['a packaged schema differs by one byte', tree((t) => {
    const p = join(t, 'packages/schema/v3/pet.json');
    writeFileSync(p, readFileSync(p, 'utf8') + ' ');
  }), 1, 'R2'],
  ['a schema in root v3/ is missing from the package', tree((t) => unlinkSync(join(t, 'packages/schema/v3/pet.json'))), 1, 'R2'],
  ['the package ships a schema root v3/ does not have', tree((t) => writeJson(join(t, 'packages/schema/v3/stray.json'), {})), 1, 'R2'],
  ['"files" stops shipping v3/ at all', tree((t) => set(t, 'packages/schema/package.json', (p) => { p.files = p.files.filter((f) => f !== 'v3'); })), 1, 'R2+R4'],
  ['the packaged extensions registry is stale', tree((t) => set(t, 'packages/schema/extensions-registry.json', (r) => { r.stale = true; })), 1, 'R2'],

  // R3 -- reference data the package ships
  ['a shipped reference-data file differs from root', tree((t) => writeJson(join(t, 'packages/schema/reference-data/a.json'), { a: 0 })), 1, 'R3'],
  ['a shipped reference-data file has no root counterpart', tree((t) => writeJson(join(t, 'packages/schema/reference-data/orphan.json'), {})), 1, 'R3'],
  ['root carries reference data the package does not ship (scope, not drift)', tree(), 0],

  // R4 -- the room-gap fix in the packed schema
  ['catalogue.properties[] is gone', tree((t) => both(t, 'v3/catalogue.json', (c) => { delete c.properties.properties; })), 1, 'R4'],
  ['catalogue.properties is no longer an array of property.json', tree((t) => both(t, 'v3/catalogue.json', (c) => { c.properties.properties.items = { $ref: 'space.json' }; })), 1, 'R4'],
  ['space.json no longer requires propertyId conditionally', tree((t) => both(t, 'v3/space.json', (s) => { s.allOf = s.allOf.filter((m) => !(m.then && m.then.required)); })), 1, 'R4'],
  ['the load-bearing inner required on spaceType is dropped', tree((t) => both(t, 'v3/space.json', (s) => { delete spaceConditional(s).if.required; })), 1, 'R4'],

  // R5 -- the room-gap fix in the packed conformance kit
  // The kit's manifest hashes these files too, so removing or editing one also fires R6.
  ['the catalogue-only fixture is missing', tree((t) => unlinkSync(join(t, 'packages/conformance/catalogue/valid/catalogue-only.json'))), 1, 'R5+R6'],
  ['the catalogue-only expected result is missing', tree((t) => unlinkSync(join(t, 'packages/conformance/expected/catalogue-only.expected.json'))), 1, 'R5+R6'],
  ['the catalogue bundle predates the room-gap fix', tree((t) => set(t, 'packages/conformance/schemas/catalogue-v3-bundled.json', (b) => { delete b.properties.properties; })), 1, 'R5+R6'],
  ['the inherit bundle predates the room-gap fix', tree((t) => set(t, 'packages/conformance/schemas/inherit-v3-bundled.json', (b) => {
    const s = b.$defs['https://openinherit.org/v3/space.json'];
    s.allOf = s.allOf.filter((m) => !(m.then && m.then.required));
  })), 1, 'R5+R6'],

  // R6 -- the packed conformance kit matches its own manifest
  ['the packed manifest is behind the package version', tree((t) => set(t, 'packages/conformance/manifest.json', (m) => { m.version = '6.1.1'; })), 1, 'R6'],
  ['one byte of a packed fixture differs from its manifest hash', tree((t) => {
    const p = join(t, 'packages/conformance/estate/valid/minimal-estate.json');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"James"', '"Jameson"'));
  }), 1, 'R6'],
  ['an INVALID fixture the manifest names is not packed', tree((t) => unlinkSync(join(t, 'packages/conformance/estate/invalid/bad-uuid.json'))), 1, 'R6'],
  ['"files" stops shipping the manifest', tree((t) => set(t, 'packages/conformance/package.json', (p) => { p.files = p.files.filter((f) => f !== 'manifest.json'); })), 1, 'R6'],

  // exit 2 -- cannot answer is never a pass
  ['--root does not exist', ['--root', join(work, 'nowhere')], 2],
  ['root package.json is not JSON', tree((t) => writeFileSync(join(t, 'package.json'), '{')), 2],
  ['an unknown argument', [...tree(), '--frobnicate'], 2],
];

let failed = 0;
for (const [name, args, want, rule] of cases) {
  const r = run(args);
  // A red must be red for exactly the named rule(s) -- otherwise a case could
  // pass on an unrelated failure and prove nothing about its own.
  const fired = [...new Set([...r.stderr.matchAll(/\[(R\d)\]/g)].map((m) => m[1]))];
  const rightRule = !rule || fired.sort().join('+') === rule;
  if (r.status === want && rightRule) {
    console.log(`  ok   ${name} (exit ${want})`);
  } else {
    failed++;
    console.log(`  FAIL ${name}: expected exit ${want}, got ${r.status} (rules fired: ${fired.join(', ') || 'none'})\n${r.stdout}${r.stderr}`);
  }
}
rmSync(work, { recursive: true, force: true });
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
