#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Hermetic tests for scripts/generate-schema-index.mjs --check.
 *
 * Each case builds a temporary v3/ tree, writes an index for it, then changes
 * the tree (or the index) and asserts the gate's exit code. Every way the
 * index can go stale is shown going red before a green from the gate on the
 * real tree means anything.
 */
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/generate-schema-index.mjs');
const base = mkdtempSync(join(tmpdir(), 'schema-index-'));

let n = 0;
const run = (args) => spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
const schema = (path, title = 'A title') => JSON.stringify({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `https://openinherit.org/${path}`,
  title,
  type: 'object',
});
const put = (root, path, body) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), body);
};
// A v3/ tree shaped like the real one: top-level and nested schemas, an
// extension manifest, a JSON-LD context and a non-JSON file.
const tree = () => {
  const root = join(base, `tree-${++n}`);
  for (const p of ['v3/person.json', 'v3/common/money.json', 'v3/extensions/x/x.json']) put(root, p, schema(p));
  put(root, 'v3/extensions/x/extension.json', JSON.stringify({ name: 'x', maturity: 'draft' }));
  put(root, 'v3/context/inherit-v3.json', JSON.stringify({ '@context': {} }));
  put(root, 'v3/vocab/estate/spec.md', '# spec\n');
  return root;
};
// A tree whose index has been generated, then `change` applied to it.
const generated = (change = () => {}) => {
  const root = tree();
  const g = run(['--root', root]);
  if (g.status !== 0) throw new Error(`generate failed: ${g.stdout}${g.stderr}`);
  change(root);
  return ['--check', '--root', root];
};

const cases = [
  ['the real tree is current', ['--check'], 0],
  ['freshly generated', generated(), 0],

  // The defect this gate exists for: a schema added or removed without
  // regenerating the index.
  ['a schema added without regenerating', generated((r) => put(r, 'v3/pet.json', schema('v3/pet.json'))), 1],
  ['a nested schema added without regenerating', generated((r) => put(r, 'v3/common/address.json', schema('v3/common/address.json'))), 1],
  ['a schema removed without regenerating', generated((r) => unlinkSync(join(r, 'v3/common/money.json'))), 1],

  // An entry whose recorded $id or title no longer matches its file.
  ['a title changed without regenerating', generated((r) => put(r, 'v3/person.json', schema('v3/person.json', 'Renamed'))), 1],

  // A .json under v3/ that is neither a schema, a manifest nor a context: a
  // schema that lost its $schema would otherwise drop out of the index silently.
  ['a schema that lost its $schema', generated((r) => {
    const p = join(r, 'v3/person.json');
    const s = JSON.parse(readFileSync(p, 'utf8'));
    delete s.$schema;
    writeFileSync(p, JSON.stringify(s));
  }), 1],

  // A hand edit to the generated file.
  ['the index hand-edited', generated((r) => {
    const p = join(r, 'v3/index.json');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"v3/person.json"', '"v3/persons.json"'));
  }), 1],

  // Non-schema files never change the index.
  ['a manifest edited', generated((r) => put(r, 'v3/extensions/x/extension.json', JSON.stringify({ name: 'x', maturity: 'candidate' }))), 0],

  // 2 — never read as clear.
  ['no index yet', ['--check', '--root', tree()], 2],
  ['no v3/ directory', ['--check', '--root', join(base, 'absent')], 2],
  ['a .json that does not parse', generated((r) => put(r, 'v3/broken.json', '{')), 2],
  ['an unknown argument', ['--nonsense'], 2],
];

let failed = 0;
for (const [name, args, want] of cases) {
  const r = run(args);
  const ok = r.status === want;
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name} — exit ${r.status}, want ${want}`);
  if (!ok) process.stdout.write(r.stdout + r.stderr);
}
rmSync(base, { recursive: true, force: true });
console.log(`${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
