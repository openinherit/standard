#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Hermetic tests for scripts/check-schema-lint.mjs.
 *
 * Each case builds a small v3/ tree in a temporary directory, with its own
 * package.json lint flags and baseline, and runs the check against it with the
 * repository's pinned linter. Every refusing case is shown going red.
 */
import { spawnSync } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/check-schema-lint.mjs');
const work = mkdtempSync(join(tmpdir(), 'schema-lint-'));

const schema = (id, description = 'A name') => JSON.stringify({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `https://example.org/${id}`,
  title: 'A',
  description: 'A thing',
  type: 'object',
  properties: { n: { type: 'string', description } },
}, null, 2) + '\n';
const DIRTY = 'A name.'; // one description_trailing_period finding

let n = 0;
function tree(files, baseline) {
  const t = join(work, `tree-${++n}`);
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(dirname(join(t, p)), { recursive: true });
    writeFileSync(join(t, p), body);
  }
  writeFileSync(join(t, 'package.json'), JSON.stringify({
    scripts: { lint: 'jsonschema lint v3/*.json --exclude top_level_examples' },
  }));
  if (baseline !== undefined) {
    mkdirSync(join(t, 'scripts/data'), { recursive: true });
    writeFileSync(join(t, 'scripts/data/schema-lint-baseline.json'), JSON.stringify(baseline));
  }
  return t;
}
const pin = (targets, findings = {}, reasons) => (reasons ? { targets, findings, reasons } : { targets, findings });
const TP = 'description_trailing_period';
const WHY = { [TP]: 'kept on purpose, for a reason a reviewer can read' };

const cases = [
  ['a clean tree against an empty baseline', tree({ 'v3/a.json': schema('a') }, pin(1)), 0, null, []],
  ['a new finding the baseline does not hold', tree({ 'v3/a.json': schema('a', DIRTY) }, pin(1)), 1, 'REGRESSION', []],
  ['a finding the baseline holds, with a recorded reason', tree({ 'v3/a.json': schema('a', DIRTY) }, pin(1, { 'v3/a.json': { [TP]: 1 } }, WHY)), 0, null, []],
  ['a held finding with no recorded reason', tree({ 'v3/a.json': schema('a', DIRTY) }, pin(1, { 'v3/a.json': { [TP]: 1 } })), 1, 'UNREASONED', []],
  ['a held finding whose reason is blank', tree({ 'v3/a.json': schema('a', DIRTY) }, pin(1, { 'v3/a.json': { [TP]: 1 } }, { [TP]: '  ' })), 1, 'UNREASONED', []],
  ['a reason left behind after its findings were fixed', tree({ 'v3/a.json': schema('a') }, pin(1, {}, WHY)), 1, 'RATCHET', []],
  ['a count that rose above the baseline', tree({
    'v3/a.json': schema('a', DIRTY).replace('"type": "object"', '"type": "object",\n  "$comment": "x"').replace('"A thing"', '"A thing."'),
  }, pin(1, { 'v3/a.json': { [TP]: 1 } }, WHY)), 1, 'REGRESSION', []],
  ['a finding fixed without re-pinning the baseline', tree({ 'v3/a.json': schema('a') }, pin(1, { 'v3/a.json': { [TP]: 1 } }, WHY)), 1, 'RATCHET', []],
  ['an extension schema is linted, not only resolved', tree({
    'v3/a.json': schema('a'),
    'v3/extensions/x/x.json': schema('x', DIRTY),
  }, pin(2)), 1, 'v3/extensions/x/x.json', []],
  ['an extension manifest is not a schema and is not linted', tree({
    'v3/a.json': schema('a'),
    'v3/extensions/x/extension.json': JSON.stringify({ name: 'x', description: 'Ends with a period.' }),
  }, pin(1)), 0, null, []],
  ['fewer schemas found than the baseline pins', tree({ 'v3/a.json': schema('a') }, pin(2)), 2, 'CANNOT ANSWER', []],
  ['more schemas found than the baseline pins', tree({ 'v3/a.json': schema('a'), 'v3/b.json': schema('b') }, pin(1)), 1, 'RATCHET', []],
  ['no baseline at all', tree({ 'v3/a.json': schema('a') }), 2, 'CANNOT ANSWER', []],
  ['--write-baseline pins the current state', tree({ 'v3/a.json': schema('a') }), 0, null, ['--write-baseline']],
  ['--write-baseline keeps the reason of a rule it still holds', tree({ 'v3/a.json': schema('a', DIRTY) }, pin(1, { 'v3/a.json': { [TP]: 2 } }, WHY)), 0, null, ['--write-baseline']],
];
// A fresh pin of a dirty tree has no reason to carry, so the check that follows must refuse it.
const unreasoned = tree({ 'v3/a.json': schema('a', DIRTY) });

let failed = 0;
function run(name, cwd, want, says, args) {
  const r = spawnSync(process.execPath, [GATE, ...args], { cwd, encoding: 'utf8' });
  const out = r.stdout + r.stderr;
  const ok = r.status === want && (!says || out.includes(says));
  console.log(ok ? `  ok   ${name} (exit ${r.status})` : `  FAIL ${name}: wanted exit ${want}${says ? ` saying ${says}` : ''}, got ${r.status}\n${out}`);
  if (!ok) failed++;
  return ok;
}
for (const [name, cwd, want, says, args] of cases) {
  if (run(name, cwd, want, says, args) && args.includes('--write-baseline')) {
    run('…and the tree then checks green against what was written', cwd, 0, null, []);
  }
}
if (run('--write-baseline on a dirty tree with no reason to carry', unreasoned, 0, null, ['--write-baseline'])) {
  run('…and the check then refuses the unreasoned finding it pinned', unreasoned, 1, 'UNREASONED', []);
}
rmSync(work, { recursive: true, force: true });
console.log(failed ? `\n${failed} failed` : '\nall cases passed');
process.exit(failed ? 1 : 0);
