#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Hermetic tests for scripts/check-workflow-path-filters.mjs.
 *
 * Each case builds a throwaway git repository with one workflow and a few
 * tracked files, then runs the check there. Every refusing case is shown going
 * red, so a green on the real tree means something.
 */
import { spawnSync } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/check-workflow-path-filters.mjs');
const work = mkdtempSync(join(tmpdir(), 'path-filters-'));

const FILES = ['v3/asset.json', 'v3/common/money.json', 'extensions-registry.json', 'scripts/a.mjs'];

let n = 0;
function tree(workflow, { untracked = [] } = {}) {
  const t = join(work, `tree-${++n}`);
  mkdirSync(join(t, '.github/workflows'), { recursive: true });
  writeFileSync(join(t, '.github/workflows/w.yml'), workflow);
  for (const f of FILES) {
    mkdirSync(dirname(join(t, f)), { recursive: true });
    writeFileSync(join(t, f), '{}\n');
  }
  const git = (...a) => spawnSync('git', a, { cwd: t, encoding: 'utf8' });
  git('init', '-q');
  git('add', '.');
  for (const f of untracked) {
    mkdirSync(dirname(join(t, f)), { recursive: true });
    writeFileSync(join(t, f), '{}\n');
  }
  return t;
}

const wf = (pushPaths, prPaths = pushPaths, key = 'paths') => `name: W
on:
  push:
    ${key}:
${pushPaths.map((p) => `      - '${p}'`).join('\n')}
  pull_request:
    ${key}:
${prPaths.map((p) => `      - "${p}"`).join('\n')}
jobs:
  j:
    runs-on: ubuntu-latest
    steps:
      - run: echo hi
`;

const cases = [
  ['every filter matches a tracked file', tree(wf(['v3/**', 'extensions-registry.json'])), 0, null],
  ['a filter on a directory that has never existed (the v2/** defect)', tree(wf(['v2/**', 'extensions-registry.json'])), 1, 'v2/**'],
  ['the dead filter is only on pull_request', tree(wf(['v3/**'], ['v3/**', 'openapi/v2/**'])), 1, 'openapi/v2/**'],
  ['a single-star glob that matches nothing at that depth', tree(wf(['v3/*.yaml'])), 1, 'v3/*.yaml'],
  ['a file that exists on disk but is not tracked', tree(wf(['dist/bundle.json']), { untracked: ['dist/bundle.json'] }), 1, 'dist/bundle.json'],
  ['a negated pattern is not required to match', tree(wf(['v3/**', '!v3/legacy/**'])), 0, null],
  ['paths-ignore is not a liveness filter and is not checked', tree(wf(['nothing/**'], ['nothing/**'], 'paths-ignore')), 0, null],
  ['a workflow with no paths filter at all', tree(`name: W\non:\n  push:\n  pull_request:\njobs: {}\n`), 0, null],
  ['a tree with no workflows cannot answer', (() => { const t = join(work, 'empty'); mkdirSync(t); spawnSync('git', ['init', '-q'], { cwd: t }); return t; })(), 2, null],
];

let failed = 0;
for (const [name, cwd, want, named] of cases) {
  const r = spawnSync(process.execPath, [GATE], { cwd, encoding: 'utf8' });
  const namesIt = !named || r.stderr.includes(named);
  if (r.status === want && namesIt) {
    console.log(`  ok   ${name} (exit ${r.status})`);
  } else {
    failed++;
    console.log(`  FAIL ${name}: wanted exit ${want}${named ? ` naming ${named}` : ''}, got ${r.status}\n${r.stdout}${r.stderr}`);
  }
}
rmSync(work, { recursive: true, force: true });
console.log(failed ? `\n${failed} of ${cases.length} failed` : `\nall ${cases.length} cases passed`);
process.exit(failed ? 1 : 0);
