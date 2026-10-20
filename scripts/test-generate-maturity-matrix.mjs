#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Hermetic tests for scripts/generate-maturity-matrix.mjs.
 *
 * Each case builds a temporary tree shaped like the real one (a v3/ index, a
 * schema with and without `maturity`, an extension with a manifest, a schema
 * and a registry entry), generates the matrix, then changes the tree and
 * asserts the gate's exit code. Every way the matrix can go stale or lie is
 * shown going red before a green from the gate on the real tree means
 * anything. The real tree is checked by the next CI step, not here.
 */
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/generate-maturity-matrix.mjs');
const base = mkdtempSync(join(tmpdir(), 'maturity-matrix-'));

let n = 0;
const run = (args) => spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
const put = (root, path, body) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), typeof body === 'string' ? body : JSON.stringify(body, null, 2));
};
const edit = (root, path, f) => {
  const doc = JSON.parse(readFileSync(join(root, path), 'utf8'));
  f(doc);
  put(root, path, doc);
};
const schema = (path, extra = {}) => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `https://openinherit.org/${path}`,
  title: `Title of ${path}`,
  ...extra,
});

const tree = () => {
  const root = join(base, `tree-${++n}`);
  const files = {
    'v3/person.json': schema('v3/person.json'),
    'v3/common/money.json': schema('v3/common/money.json', { maturity: 'candidate' }),
    'v3/extensions/x/x.json': schema('v3/extensions/x/x.json', { maturity: 'draft' }),
  };
  for (const [p, d] of Object.entries(files)) put(root, p, d);
  put(root, 'v3/extensions/x/extension.json', { name: 'x', maturity: 'draft' });
  put(root, 'v3/index.json', {
    schemas: Object.keys(files).map((path) => ({ path, $id: files[path].$id, title: files[path].title })),
  });
  put(root, 'extensions-registry.json', {
    version: '3.0.0',
    extensions: [{
      id: 'https://openinherit.org/v3/extensions/x/x.json',
      name: 'Extension X',
      tier: 'core',
      maturity: 'draft',
      legalReviewStatus: 'self_verified',
      path: 'v3/extensions/x/',
      // fields the matrix must never copy: status, not timing
      seeking: 'maintainers by Q3',
      targetRelease: '7.0.0',
    }],
  });
  return root;
};
const generated = (change = () => {}) => {
  const root = tree();
  const g = run(['--root', root]);
  if (g.status !== 0) throw new Error(`generate failed: ${g.stdout}${g.stderr}`);
  change(root);
  return ['--check', '--root', root];
};
const matrixOf = (root) => JSON.parse(readFileSync(join(root, 'maturity-matrix.json'), 'utf8'));

const cases = [
  ['freshly generated', generated(), 0],

  // Stale: a declaration moved and the matrix was not regenerated.
  ['a schema gains maturity without regenerating', generated((r) => edit(r, 'v3/person.json', (d) => { d.maturity = 'draft'; })), 1],
  ['a manifest changes maturity without regenerating', generated((r) => edit(r, 'v3/extensions/x/extension.json', (d) => { d.maturity = 'candidate'; })), 1],
  ['the registry changes maturity without regenerating', generated((r) => edit(r, 'extensions-registry.json', (d) => { d.extensions[0].maturity = 'stable'; })), 1],
  ['legal review status changes without regenerating', generated((r) => edit(r, 'extensions-registry.json', (d) => { d.extensions[0].legalReviewStatus = 'peer_reviewed'; })), 1],
  ['the matrix hand-edited', generated((r) => edit(r, 'maturity-matrix.json', (d) => { d.extensions[0].maturity = 'stable'; })), 1],

  // Lies the generator must refuse rather than publish.
  ['an unknown maturity value', generated((r) => edit(r, 'v3/person.json', (d) => { d.maturity = 'beta'; })), 1],
  ['an extension in the tree but not the registry', generated((r) => {
    put(r, 'v3/extensions/y/extension.json', { name: 'y', maturity: 'draft' });
  }), 1],
  ['a registry entry with no extension in the tree', generated((r) => edit(r, 'extensions-registry.json', (d) => {
    d.extensions.push({ ...d.extensions[0], id: 'https://openinherit.org/v3/extensions/z/z.json', path: 'v3/extensions/z/' });
  })), 1],

  // 2 — never read as clear.
  ['no matrix yet', ['--check', '--root', tree()], 2],
  ['no v3/index.json', ['--check', '--root', join(base, 'absent')], 2],
  ['a registry that does not parse', generated((r) => put(r, 'extensions-registry.json', '{')), 2],
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

// Content assertions on a generated matrix: the resolution rule, the
// consistency flag and the status-only whitelist.
const assert = (name, cond) => {
  if (!cond) failed++;
  console.log(`${cond ? '✅' : '❌'} ${name}`);
};
let content = 0;
{
  const r = tree();
  edit(r, 'extensions-registry.json', (d) => { d.extensions[0].maturity = 'stable'; });
  edit(r, 'v3/extensions/x/extension.json', (d) => { d.maturity = 'stable'; });
  run(['--root', r]);
  const m = matrixOf(r);
  const x = m.extensions[0];
  const person = m.schemas.find((s) => s.path === 'v3/person.json');
  const money = m.schemas.find((s) => s.path === 'v3/common/money.json');
  const checks = [
    ['the least mature declaration wins (stable/stable/draft → draft)', x.maturity === 'draft'],
    ['disagreeing declarations are flagged, not hidden', x.consistent === false],
    ['all three declarations are published', x.declarations.registry === 'stable' && x.declarations.manifest === 'stable' && x.declarations.schema === 'draft'],
    ['legal review status is carried', x.legalReviewStatus === 'self_verified'],
    ['no declaration → undeclared', person.maturity === 'undeclared'],
    ['a declared schema keeps its level', money.maturity === 'candidate'],
    ['extension schemas are not double-counted as core rows', !m.schemas.some((s) => s.path.startsWith('v3/extensions/'))],
    ['the summary counts every row', Object.values(m.summary.schemas).reduce((a, b) => a + b, 0) === m.schemas.length],
    ['no roadmap or timing field is ever copied', !/seeking|targetRelease|Q3|7\.0\.0/.test(JSON.stringify(m))],
    ['deterministic — a second run writes the same bytes', (() => {
      const before = readFileSync(join(r, 'maturity-matrix.json'), 'utf8');
      run(['--root', r]);
      return readFileSync(join(r, 'maturity-matrix.json'), 'utf8') === before;
    })()],
  ];
  for (const [name, cond] of checks) { assert(name, cond); content++; }
}

rmSync(base, { recursive: true, force: true });
const total = cases.length + content;
console.log(`${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);
