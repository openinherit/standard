#!/usr/bin/env node
/**
 * Hermetic tests for scripts/check-conformance-declaration-policy.mjs.
 *
 * Each case mutates a temporary copy of the real policy or schema and asserts the
 * gate's exit code. That proves every check can go red, so a green from the gate
 * means something.
 */
import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/check-conformance-declaration-policy.mjs');
const POLICY = readFileSync(join(ROOT, 'docs/policies/conformance-declaration.md'), 'utf8');
const SCHEMA = JSON.parse(readFileSync(join(ROOT, 'v3/conformance-declaration.json'), 'utf8'));
const dir = mkdtempSync(join(tmpdir(), 'cd-policy-'));

// Every fixture gets its own file: the cases are built before any of them runs.
let n = 0;
const run = (args) => spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
const withPolicy = (text) => {
  const p = join(dir, `policy-${++n}.md`);
  writeFileSync(p, text);
  return ['--policy', p];
};
const withSchema = (obj) => {
  const p = join(dir, `schema-${++n}.json`);
  writeFileSync(p, JSON.stringify(obj));
  return ['--schema', p];
};
const replaceOnce = (text, from, to) => {
  if (!text.includes(from)) throw new Error(`fixture drift: policy no longer contains ${JSON.stringify(from)}`);
  return text.replace(from, to);
};

const schemaWithout = (key) => {
  const s = structuredClone(SCHEMA);
  delete s.properties[key];
  return s;
};

const cases = [
  ['the real policy and schema are in step', [], 0],
  ['a schema whose root cannot name catalogue', withSchema({ ...SCHEMA, properties: { ...SCHEMA.properties, root: { enum: ['estate'] } } }), 1],
  ['a schema without root at all', withSchema(schemaWithout('root')), 1],
  ['the policy drops the root field row', withPolicy(replaceOnce(POLICY, '| `root` | string |', '| root | string |')), 1],
  ['the policy drops the catalogue root row', withPolicy(replaceOnce(POLICY, '| `catalogue` | `v3/catalogue.json`', '| catalogue | `v3/catalogue.json`')), 1],
  ['the policy stops citing the v3 $id', withPolicy(POLICY.replaceAll(SCHEMA.$id, 'https://example.org/x.json')), 1],
  ['a v2 path in a code span', withPolicy(POLICY + '\nSee `v2/conformance-declaration.json`.\n'), 1],
  ['a v2 path as a link target', withPolicy(POLICY + '\nSee [the dialect](v2/dialect.json).\n'), 1],
  ['a bare v1 URL with no file name', withPolicy(POLICY + '\nhttps://openinherit.org/v1/\n'), 1],
  ['the catalogue example claims the estate entity', withPolicy(replaceOnce(POLICY, '"catalogue": {\n      "level": 2', '"estate": {\n      "level": 2')), 1],
  ['an example that is not JSON', withPolicy(replaceOnce(POLICY, '"implementation": "CollectorShelf",', '"implementation": "CollectorShelf",,')), 1],
  ['the policy carries no example', withPolicy(POLICY.replaceAll('```json', '```text')), 1],
  ['the policy file is missing', ['--policy', join(dir, 'absent.md')], 2],
  ['a flag with no value', ['--policy'], 2],
  ['a schema that is not JSON', ['--schema', join(ROOT, 'docs/policies/conformance-declaration.md')], 2],
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
