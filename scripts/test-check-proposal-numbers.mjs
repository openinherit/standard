#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Hermetic tests for scripts/check-proposal-numbers.mjs.
 *
 * Each case builds a temporary proposals directory and asserts the gate's exit
 * code, so every check is shown going red before a green from the gate on the
 * real directory means anything.
 */
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/check-proposal-numbers.mjs');
const base = mkdtempSync(join(tmpdir(), 'proposal-numbers-'));

let n = 0;
const run = (args) => spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
const doc = (num, title = 'A title') => `# Proposal ${num}: ${title}\n\n**Status:** draft\n`;
// Build a proposals directory from { filename: contents }.
const tree = (files) => {
  const d = join(base, `proposals-${++n}`);
  mkdirSync(d);
  for (const [name, body] of Object.entries(files)) writeFileSync(join(d, name), body);
  return ['--dir', d];
};

const cases = [
  ['the real proposals directory', [], 0],

  ['distinct numbers, headings agree', tree({
    '0000-proposal-template.md': '# Proposal NNNN: [Title]\n',
    '0001-a.md': doc('0001'),
    '0002-b.md': doc('0002'),
  }), 0],

  // P1 — the defect this gate was written for: two proposals merged the same
  // day, each taking the next free number.
  ['two proposals share a number', tree({
    '0001-a.md': doc('0001'),
    '0002-b.md': doc('0002'),
    '0002-c.md': doc('0002'),
  }), 1],

  // P2 — a renumbered file whose heading still carries the old number.
  ['heading number disagrees with the filename', tree({
    '0001-a.md': doc('0001'),
    '0002-b.md': doc('0001'),
  }), 1],
  ['no Proposal heading at all', tree({
    '0001-a.md': '# Something else\n',
  }), 1],

  // P3 — a file in proposals/ that is not numbered cannot be ordered.
  ['an unnumbered proposal file', tree({
    '0001-a.md': doc('0001'),
    'spatial-containment.md': doc('0002'),
  }), 1],

  // Template is the one file allowed a placeholder heading, and only at 0000.
  ['the template number used by a real proposal', tree({
    '0000-proposal-template.md': '# Proposal NNNN: [Title]\n',
    '0000-real.md': doc('0000'),
  }), 1],

  // 2 — never read as clear.
  ['directory does not exist', ['--dir', join(base, 'absent')], 2],
  ['directory holds no proposals', tree({ 'README.txt': 'x' }), 2],
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
