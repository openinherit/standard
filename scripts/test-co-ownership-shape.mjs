#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

/**
 * INHERIT co-ownership shape check.
 *
 * coOwnership is declared in three places: the core v3/asset.json, and the
 * financial and business category schemas that carried it first. Under allOf
 * all applicable declarations apply at once, so if the copies ever disagree a
 * financial asset is held to both and the stricter one wins silently. This
 * script pins them equal (ignoring $comment, which is allowed to say where the
 * declaration sits).
 *
 * It also checks that every `coOwnership.<field>` path named in
 * reference-data/*.json is a declared property. A rule that tests a field no
 * schema declares never sees a value, so an "is empty" condition on it is
 * always true and the rule fires on every co-owned asset.
 *
 * Usage: node scripts/test-co-ownership-shape.mjs [repo-root]
 *
 * Exit codes:
 *   0 — the declarations agree and every referenced field exists
 *   1 — at least one check failed
 *   2 — a file could not be read or parsed
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const NC = '\x1b[0m';

const root = resolve(process.argv[2] ?? '.');

function load(rel) {
  try {
    return JSON.parse(readFileSync(join(root, rel), 'utf8'));
  } catch (err) {
    console.error(`${RED}CANNOT ANSWER${NC}: ${rel}: ${err.message}`);
    process.exit(2);
  }
}

// Canonical form for comparison: keys sorted, $comment dropped at every level.
function canon(node) {
  if (Array.isArray(node)) return node.map(canon);
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.keys(node)
        .filter((k) => k !== '$comment')
        .sort()
        .map((k) => [k, canon(node[k])]),
    );
  }
  return node;
}

const failures = [];
const CORE = 'v3/asset.json';
const CATEGORIES = ['v3/asset-categories/financial.json', 'v3/asset-categories/business.json'];

const core = load(CORE).properties?.coOwnership;
if (!core) {
  failures.push(`${CORE} declares no coOwnership — only some asset categories can record a co-owner`);
}

for (const rel of CATEGORIES) {
  const copy = load(rel).properties?.coOwnership;
  if (!copy) {
    failures.push(`${rel} no longer declares coOwnership — a v6.6.0 capability has been removed`);
  } else if (core && JSON.stringify(canon(copy)) !== JSON.stringify(canon(core))) {
    failures.push(`${rel} coOwnership differs from ${CORE} — the declarations must stay identical`);
  }
}

// Fall back to the financial copy so this half still runs if the core one is missing.
const reference = core ?? load(CATEGORIES[0]).properties?.coOwnership;
const declared = new Set(Object.keys(reference?.properties ?? {}));
const PATH = /^coOwnership\.([A-Za-z][A-Za-z0-9]*)/;
function walk(node, file) {
  if (typeof node === 'string') {
    const m = PATH.exec(node);
    if (m && !declared.has(m[1])) {
      failures.push(`reference-data/${file} names ${m[0]}, which no schema declares`);
    }
  } else if (Array.isArray(node)) {
    node.forEach((n) => walk(n, file));
  } else if (node && typeof node === 'object') {
    Object.values(node).forEach((n) => walk(n, file));
  }
}
const refFiles = readdirSync(join(root, 'reference-data')).filter((f) => f.endsWith('.json'));
if (refFiles.length === 0) {
  console.error(`${RED}CANNOT ANSWER${NC}: no reference-data/*.json found under ${root}`);
  process.exit(2);
}
for (const f of refFiles) walk(load(join('reference-data', f)), f);

if (failures.length) {
  for (const f of failures) console.error(`${RED}✗${NC} ${f}`);
  console.error(`${RED}co-ownership shape: ${failures.length} failure(s)${NC}`);
  process.exit(1);
}
console.log(
  `${GREEN}co-ownership shape OK${NC} — ${CORE} and ${CATEGORIES.length} categories agree; ` +
    `${refFiles.length} reference-data files name only declared coOwnership fields`,
);
