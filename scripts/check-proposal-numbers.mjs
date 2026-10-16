#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Gate: every proposal in proposals/ has its own number, and says so.
 *
 * A proposal is cited by number — in the CHANGELOG, in schema descriptions and
 * in pull requests — so two proposals with one number make every such citation
 * ambiguous. That happened when two proposals were merged on the same day and
 * each took the next free number.
 *
 * Checks, over proposals/*.md:
 *   P1 no two files share a four-digit number
 *   P2 each file's first "# Proposal NNNN:" heading carries its filename's number
 *      (the template, 0000-proposal-template.md, is allowed its NNNN placeholder)
 *   P3 every .md file is named NNNN-<slug>.md
 *
 * Exit 0 consistent · 1 refused (each finding printed) · 2 cannot answer (the
 * directory is missing or holds no .md files). Never read 2 as clear.
 *
 * Usage: node scripts/check-proposal-numbers.mjs [--dir <path>]
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = '0000-proposal-template.md';
let dir = join(ROOT, 'proposals');

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  if (args[i] === '--dir') dir = resolve(args[i + 1]);
  else {
    console.error(`CANNOT ANSWER — unknown argument ${args[i]}`);
    process.exit(2);
  }
}

if (!existsSync(dir)) {
  console.error(`CANNOT ANSWER — no proposals directory at ${dir}`);
  process.exit(2);
}
const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
if (files.length === 0) {
  console.error(`CANNOT ANSWER — no .md files in ${dir}`);
  process.exit(2);
}

const findings = [];
const byNumber = new Map();
for (const f of files) {
  const m = f.match(/^(\d{4})-.+\.md$/);
  if (!m) {
    findings.push(`P3 ${f}: not named NNNN-<slug>.md`);
    continue;
  }
  const num = m[1];
  byNumber.set(num, [...(byNumber.get(num) ?? []), f]);

  const heading = readFileSync(join(dir, f), 'utf8').match(/^# Proposal (\S+?):/m);
  const allowed = f === TEMPLATE ? ['NNNN', num] : [num];
  if (!heading) findings.push(`P2 ${f}: no "# Proposal ${num}:" heading`);
  else if (!allowed.includes(heading[1])) {
    findings.push(`P2 ${f}: heading says Proposal ${heading[1]}, filename says ${num}`);
  }
}
for (const [num, names] of byNumber) {
  if (names.length > 1) findings.push(`P1 number ${num} is used by ${names.length} proposals: ${names.join(', ')}`);
}

if (findings.length) {
  for (const f of findings) console.error(`REFUSED — ${f}`);
  process.exit(1);
}
console.log(`OK — ${files.length} proposals, every number distinct and matching its heading`);
