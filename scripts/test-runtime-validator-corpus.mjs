// Tests for the ratchet the runtime-validator corpus gate rests on.
// Run: node --test scripts/test-runtime-validator-corpus.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compare, loadCorpus, loadRegister } from './lib/runtime-validator-corpus.mjs';

const reg = (fr = [], fa = []) => ({
  false_reject: fr.map((c) => ({ case: c, reason: 'r' })),
  false_accept: fa.map((c) => ({ case: c })),
});

test('observed equal to registered passes', () => {
  const r = compare('zod', { false_reject: ['a'], false_accept: ['b'] }, reg(['a'], ['b']));
  assert.equal(r.ok, true);
});

test('an unregistered disagreement is a REGRESSION', () => {
  const r = compare('zod', { false_reject: [], false_accept: ['new'] }, reg());
  assert.equal(r.ok, false);
  assert.match(r.lines[0], /^REGRESSION zod\.false_accept: new$/);
});

test('a registered disagreement that no longer reproduces is a RATCHET failure', () => {
  const r = compare('pydantic', { false_reject: [], false_accept: [] }, reg(['gone']));
  assert.equal(r.ok, false);
  assert.match(r.lines[0], /^RATCHET pydantic\.false_reject: .*gone$/);
});

test('a case registered under the wrong kind fails both ways', () => {
  const r = compare('zod', { false_reject: ['x'], false_accept: [] }, reg([], ['x']));
  assert.equal(r.lines.length, 2);
});

test('a false_reject with no reason is refused when the register loads', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rv-'));
  const p = join(dir, 'r.json');
  writeFileSync(p, JSON.stringify({ excluded_targets: [], zod: { false_reject: [{ case: 'k', reason: ' ' }], false_accept: [] } }));
  assert.throws(() => loadRegister(p), /no reason/);
});

test('repeated descriptions are keyed by occurrence, not index', () => {
  const root = mkdtempSync(join(tmpdir(), 'rv-'));
  mkdirSync(join(root, 'v3'));
  mkdirSync(join(root, 'tests/v3/thing'), { recursive: true });
  writeFileSync(join(root, 'v3/thing.json'), JSON.stringify({ $id: 'https://example.org/thing.json' }));
  writeFileSync(join(root, 'tests/v3/thing/thing.test.json'), JSON.stringify({
    target: '../../../v3/thing.json',
    tests: [
      { description: 'invalid — x', data: 1, valid: false },
      { description: 'valid — y', data: 2, valid: true },
      { description: 'invalid — x', data: 3, valid: false },
    ],
  }));
  const [file] = loadCorpus(root);
  assert.equal(file.target, 'v3/thing.json');
  assert.equal(file.id, 'https://example.org/thing.json');
  assert.deepEqual(file.cases.map((c) => c.key), [
    'tests/v3/thing/thing.test.json::invalid — x',
    'tests/v3/thing/thing.test.json::valid — y',
    'tests/v3/thing/thing.test.json::invalid — x [#2]',
  ]);
});
