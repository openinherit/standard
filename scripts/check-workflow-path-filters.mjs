#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Refuse a workflow `paths:` filter that matches no tracked file.
 *
 * A path filter decides whether a workflow runs at all. If it names a path the
 * repository does not contain, the workflow never fires on that path and its
 * check goes silently dead: it stays green because it never runs. That is how
 * validate-schemas.yml came to filter on `v2/**` while every schema lives in
 * `v3/`, so no schema change was validated by it.
 *
 * Every non-negated `paths:` entry under every trigger must match at least one
 * file in `git ls-files`. `paths-ignore:` is not checked: an ignore pattern that
 * matches nothing excludes nothing, which is harmless.
 *
 * Exit 0 every filter is live · 1 at least one dead filter (named on stderr) ·
 * 2 cannot answer (no workflows found, or git is unavailable).
 *
 * Dependency-free on purpose (no YAML library), so it still runs when the
 * lockfile is what broke. It reads the block and flow forms of a `paths:` list.
 */
import { execFileSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, posix } from 'path';

const cwd = process.cwd();
const dir = join(cwd, '.github/workflows');

function cannotAnswer(msg) {
  console.error(`CANNOT ANSWER: ${msg}`);
  process.exit(2);
}

const workflows = existsSync(dir)
  ? readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort()
  : [];
if (workflows.length === 0) cannotAnswer('no workflow files under .github/workflows');

let tracked;
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { cwd, encoding: 'utf8' }).split('\0').filter(Boolean);
} catch (e) {
  cannotAnswer(`git ls-files failed: ${e.message}`);
}

const unquote = (s) => s.trim().replace(/^(['"])(.*)\1$/, '$2');

/** Return [{line, pattern}] for every entry of every `paths:` list in a workflow. */
function pathFilters(text) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)paths:\s*(.*?)\s*(#.*)?$/);
    if (!m) continue;
    const [, indent, rest] = m;
    if (rest.startsWith('[')) {
      const body = rest.replace(/^\[|\]$/g, '');
      for (const p of body.split(',').map(unquote).filter(Boolean)) out.push({ line: i + 1, pattern: p });
      continue;
    }
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (/^\s*(#.*)?$/.test(l)) continue;
      const item = l.match(/^(\s*)-\s+(.*?)\s*(#.*)?$/);
      if (!item || item[1].length <= indent.length) break;
      out.push({ line: j + 1, pattern: unquote(item[2]) });
    }
  }
  return out;
}

let checked = 0;
const dead = [];
for (const wf of workflows) {
  const rel = `.github/workflows/${wf}`;
  for (const { line, pattern } of pathFilters(readFileSync(join(dir, wf), 'utf8'))) {
    if (pattern.startsWith('!')) continue;
    checked++;
    if (!tracked.some((f) => posix.matchesGlob(f, pattern))) dead.push(`${rel}:${line}  ${pattern}`);
  }
}

if (dead.length) {
  console.error(`REFUSED: ${dead.length} workflow path filter(s) match no tracked file, so the workflow never runs on them:`);
  for (const d of dead) console.error(`  ${d}`);
  console.error('Point the filter at the path that exists, or remove it.');
  process.exit(1);
}
console.log(`Workflow path filters: ${checked} checked across ${workflows.length} workflows, all match a tracked file.`);
