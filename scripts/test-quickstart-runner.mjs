// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for scripts/test-quickstart.mjs — the runner that executes
 * QUICKSTART.md. Hermetic: synthetic docs in a temp directory.
 *
 * A runner that silently stops running anything passes every doc, so most of
 * these assert that it goes RED.
 *
 * Run: node --test scripts/test-quickstart-runner.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RUNNER = join(dirname(fileURLToPath(import.meta.url)), 'test-quickstart.mjs');
const F = '```';

function run(doc) {
  const root = mkdtempSync(join(tmpdir(), 'quickstart-'));
  try {
    if (doc !== null) writeFileSync(join(root, 'QUICKSTART.md'), doc);
    return spawnSync(process.execPath, [RUNNER, '--root', root], { encoding: 'utf-8' });
  } finally {
    rmSync(root, { recursive: true });
  }
}

const block = (marker, lang, body) => `<!-- quickstart:${marker} -->\n${F}${lang}\n${body}\n${F}\n`;

test('green when every run-block exits 0 and shows its output', () => {
  const r = run(`# Q\n\n${block('run', 'bash', 'echo hello world')}\n${block('output', 'text', 'hello world')}`);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /1 step\(s\) passed/);
});

test('unmarked blocks are documentation, not steps', () => {
  const r = run(`${F}bash\nexit 7\n${F}\n\n${block('run', 'bash', 'true')}`);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('RED when a run-block fails', () => {
  const r = run(block('run', 'bash', 'echo nope; exit 3'));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL/);
  assert.match(r.stdout, /exit 3/);
});

test('RED when a block marked expect-fail succeeds', () => {
  const r = run(block('run expect-fail', 'bash', 'true'));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /expected a non-zero exit/);
});

test('expect-fail is green when the block does fail', () => {
  const r = run(block('run expect-fail', 'bash', 'echo refused >&2; exit 1') + block('output', 'text', 'refused'));
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('RED when the documented output does not appear', () => {
  const r = run(block('run', 'bash', 'echo 30700000') + block('output', 'text', 'netEstateEquity = 99'));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /missing output line: netEstateEquity = 99/);
});

test('ANSI colour in the real output does not defeat the comparison', () => {
  const r = run(block('run', 'bash', "printf '\\033[32mall good\\033[0m\\n'") + block('output', 'text', 'all good'));
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('a pipeline that fails part-way is a failure', () => {
  const r = run(block('run', 'bash', 'false | cat'));
  assert.equal(r.status, 1);
});

test('exits 2 when the doc has no run-blocks — a vacuous green is refused', () => {
  const r = run(`# Q\n\n${F}bash\necho documented only\n${F}\n`);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no run-blocks/);
});

test('exits 2 when QUICKSTART.md is absent', () => {
  assert.equal(run(null).status, 2);
});

test('exits 2 on an output block with no run-block before it', () => {
  const r = run(block('output', 'text', 'orphan') + block('run', 'bash', 'true'));
  assert.equal(r.status, 2);
});

test('exits 2 on a marker that is not followed by a fenced block', () => {
  const r = run('<!-- quickstart:run -->\n\nprose, not a fence\n');
  assert.equal(r.status, 2);
});

test('exits 2 on a near-miss marker instead of silently treating the block as prose', () => {
  const r = run(`<!-- quickstart: run -->\n${F}bash\nexit 1\n${F}\n` + block('run', 'bash', 'true'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /not a recognised quickstart marker/);
});

test('a marker shown inside an unmarked fenced example is not a step', () => {
  // A four-backtick fence documenting the marker syntax, with a failing
  // three-backtick block inside it. None of it may run.
  const doc = `${F}\`markdown\n<!-- quickstart:run -->\n${F}bash\nexit 9\n${F}\n${F}\`\n\n` + block('run', 'bash', 'true');
  const r = run(doc);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /1 step\(s\) passed/);
});

test('expect-fail does not accept a shell-level failure (command not found)', () => {
  const r = run(block('run expect-fail', 'bash', 'no-such-command-anywhere') + block('output', 'text', 'not found'));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /exit 127/);
});

test('expect-fail with no output block is refused — any failure would satisfy it', () => {
  const r = run(block('run expect-fail', 'bash', 'exit 1'));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /expect-fail step shows no output/);
});
