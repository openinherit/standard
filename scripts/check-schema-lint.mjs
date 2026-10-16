#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Lint every schema in v3/ and refuse any finding the baseline does not hold.
 *
 * `pnpm run lint` names v3/*.json and v3/common/*.json as targets. The 22
 * jurisdiction extension schemas and the 5 asset-category schemas appear in it
 * only as --resolve arguments, which load them for $ref resolution and never
 * lint them. Widening the targets turns 1 finding into 392 (measured 16 Oct
 * 2026), so they are pinned here as a baseline rather than fixed in one change.
 *
 * Targets are discovered from disk, not listed: every *.json under v3/ except
 * extension.json manifests, which are not JSON Schemas. A schema added later is
 * linted without anyone remembering to add it. The lint flags (--resolve,
 * --exclude, --rule) are read from package.json's `lint` script, so they have
 * one home.
 *
 * The baseline, scripts/data/schema-lint-baseline.json, pins the number of
 * targets and a count per file per rule. It may only fall:
 *   REGRESSION (exit 1)  a count rose, or a file/rule appeared that it does not hold
 *   RATCHET    (exit 1)  a count fell, or more targets were found: re-pin it lower
 *                        with --write-baseline in the same commit
 *   CANNOT ANSWER (exit 2)  no baseline, fewer targets than pinned, or the linter
 *                        did not produce a report. 2 is never a pass.
 *
 * Usage: node scripts/check-schema-lint.mjs [--write-baseline]
 */
import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve, sep } from 'path';
import { fileURLToPath } from 'url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = join(REPO, 'node_modules/.bin/jsonschema');
const cwd = process.cwd();
const BASELINE = join(cwd, 'scripts/data/schema-lint-baseline.json');
const write = process.argv.includes('--write-baseline');

function cannotAnswer(msg) {
  console.error(`CANNOT ANSWER: ${msg}`);
  process.exit(2);
}

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.json') && e.name !== 'extension.json') out.push(p);
  }
  return out;
}

if (!existsSync(join(cwd, 'v3'))) cannotAnswer('no v3/ directory here');
if (!existsSync(BIN)) cannotAnswer(`linter not installed at ${relative(cwd, BIN)} (run pnpm install)`);
const targets = walk(join(cwd, 'v3')).sort();
if (targets.length === 0) cannotAnswer('no schemas found under v3/');

// Everything from the first --flag onward in package.json's lint script.
const lintScript = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).scripts?.lint;
if (!lintScript) cannotAnswer('package.json has no lint script to read the lint flags from');
const tokens = lintScript.trim().split(/\s+/);
const first = tokens.findIndex((t) => t.startsWith('--'));
const flags = first === -1 ? [] : tokens.slice(first);

const r = spawnSync(BIN, ['lint', '--json', ...targets, ...flags], { cwd, encoding: 'utf8', maxBuffer: 64 << 20 });
let report;
try {
  report = JSON.parse(r.stdout);
} catch {
  cannotAnswer(`the linter did not produce a JSON report (exit ${r.status})\n${r.stderr}`);
}
if (!Array.isArray(report.errors) || (r.status !== 0 && report.errors.length === 0)) {
  cannotAnswer(`the linter exited ${r.status} without findings to account for it\n${r.stderr}`);
}

const rel = (p) => relative(cwd, p).split(sep).join('/');
const current = {};
for (const e of report.errors) {
  const f = rel(e.path);
  current[f] ??= {};
  current[f][e.id] = (current[f][e.id] ?? 0) + 1;
}
const total = (m) => Object.values(m).reduce((a, rules) => a + Object.values(rules).reduce((x, y) => x + y, 0), 0);

if (write) {
  const sorted = Object.fromEntries(Object.keys(current).sort().map((f) => [f, Object.fromEntries(Object.entries(current[f]).sort())]));
  mkdirSync(dirname(BASELINE), { recursive: true });
  writeFileSync(BASELINE, JSON.stringify({ targets: targets.length, findings: sorted }, null, 2) + '\n');
  console.log(`Wrote ${rel(BASELINE)}: ${targets.length} schemas, ${total(current)} findings pinned.`);
  process.exit(0);
}

if (!existsSync(BASELINE)) cannotAnswer(`no baseline at ${rel(BASELINE)} (create it with --write-baseline)`);
const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
if (targets.length < base.targets) {
  cannotAnswer(`found ${targets.length} schemas under v3/, the baseline pins ${base.targets}: a run that did not see what it expected cannot vouch for what it saw`);
}

const regressions = [];
const ratchets = [];
if (targets.length > base.targets) ratchets.push(`targets: found ${targets.length}, baseline pins ${base.targets}`);
for (const f of new Set([...Object.keys(current), ...Object.keys(base.findings ?? {})])) {
  const now = current[f] ?? {};
  const was = base.findings?.[f] ?? {};
  for (const rule of new Set([...Object.keys(now), ...Object.keys(was)])) {
    const a = now[rule] ?? 0;
    const b = was[rule] ?? 0;
    if (a > b) regressions.push(`${f}  ${rule}: ${a} (baseline ${b})`);
    else if (a < b) ratchets.push(`${f}  ${rule}: ${a} (baseline ${b})`);
  }
}

if (regressions.length) {
  console.error(`REGRESSION: ${regressions.length} lint finding count(s) above the baseline. Fix the schema; do not raise the baseline.`);
  for (const x of regressions) console.error(`  ${x}`);
}
if (ratchets.length) {
  console.error(`RATCHET: ${ratchets.length} count(s) below the baseline. Re-pin it with 'node scripts/check-schema-lint.mjs --write-baseline' in this commit.`);
  for (const x of ratchets) console.error(`  ${x}`);
}
if (regressions.length || ratchets.length) process.exit(1);
console.log(`Schema lint: ${targets.length} schemas linted, ${total(current)} findings, all held by the baseline.`);
