#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

/**
 * Execute QUICKSTART.md, so the quickstart cannot drift from the repository.
 *
 * A fenced block preceded by one of these markers is a step:
 *
 *   <!-- quickstart:run -->               run it with bash from the repo root; must exit 0
 *   <!-- quickstart:run expect-fail -->   same, but must exit non-zero (a refusal the doc shows)
 *   <!-- quickstart:output -->            every non-empty line must appear in the
 *                                         combined stdout+stderr of the step before it
 *
 * Unmarked blocks are documentation only (e.g. `git clone`, `npm install` for
 * consumers) and are never run.
 *
 * Usage: node scripts/test-quickstart.mjs [--root <dir>]
 *
 * Exit codes:
 *   0 — every step behaved as documented
 *   1 — at least one step did not
 *   2 — cannot answer: no QUICKSTART.md, no run-blocks, or a malformed marker.
 *       Never read 2 as a pass.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MARKER = /^<!--\s*quickstart:(run(?: expect-fail)?|output)\s*-->\s*$/;
const FENCE = /^(`{3,})/;
const ANSI = /\x1b\[[0-9;]*m/g;

class Malformed extends Error {}

export function parse(markdown) {
  const lines = markdown.split('\n');
  const steps = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(MARKER);
    if (!m) continue;
    const open = lines[i + 1]?.match(FENCE);
    if (!open) throw new Malformed(`line ${i + 1}: marker "${m[1]}" is not followed by a fenced block`);
    const close = lines.findIndex((l, j) => j > i + 1 && l.startsWith(open[1]) && l.trim() === open[1]);
    if (close < 0) throw new Malformed(`line ${i + 2}: fenced block is never closed`);
    const body = lines.slice(i + 2, close).join('\n');

    if (m[1] === 'output') {
      const last = steps[steps.length - 1];
      if (!last) throw new Malformed(`line ${i + 1}: output block with no run-block before it`);
      last.outputs.push(...body.split('\n').map((l) => l.trim()).filter(Boolean));
    } else {
      steps.push({ line: i + 1, code: body, expectFail: m[1] === 'run expect-fail', outputs: [] });
    }
    i = close;
  }
  return steps;
}

function runStep(step, root) {
  const r = spawnSync('bash', ['-eo', 'pipefail', '-c', step.code], { cwd: root, encoding: 'utf-8' });
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(ANSI, '');
  const problems = [];
  if (r.error) problems.push(`could not start bash: ${r.error.message}`);
  else if (step.expectFail && r.status === 0) problems.push('expected a non-zero exit, got 0');
  else if (!step.expectFail && r.status !== 0) problems.push(`exit ${r.status}`);
  for (const line of step.outputs) {
    if (!output.includes(line)) problems.push(`missing output line: ${line}`);
  }
  return { problems, output };
}

function main(argv) {
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx >= 0 ? argv[rootIdx + 1] : join(dirname(fileURLToPath(import.meta.url)), '..');
  const doc = join(root, 'QUICKSTART.md');

  if (!existsSync(doc)) {
    console.error('CANNOT ANSWER — QUICKSTART.md not found');
    return 2;
  }
  let steps;
  try {
    steps = parse(readFileSync(doc, 'utf-8'));
  } catch (err) {
    if (!(err instanceof Malformed)) throw err;
    console.error(`CANNOT ANSWER — QUICKSTART.md ${err.message}`);
    return 2;
  }
  if (!steps.length) {
    console.error('CANNOT ANSWER — QUICKSTART.md has no run-blocks, so there is nothing to prove');
    return 2;
  }

  let failed = 0;
  for (const step of steps) {
    const { problems, output } = runStep(step, root);
    const label = `line ${step.line}: ${step.code.split('\n')[0]}`;
    if (problems.length) {
      failed += 1;
      console.log(`FAIL  ${label}`);
      for (const p of problems) console.log(`        ${p}`);
      console.log(output.split('\n').map((l) => `      | ${l}`).join('\n'));
    } else {
      console.log(`PASS  ${label}`);
    }
  }
  console.log('');
  if (failed) {
    console.log(`${failed} of ${steps.length} quickstart step(s) failed.`);
    return 1;
  }
  console.log(`${steps.length} step(s) passed — QUICKSTART.md matches the repository.`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
