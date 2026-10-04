#!/usr/bin/env node
// Runs the generated Zod validators against the JSON Schema test corpus.
//
// Every case in tests/v3/**/*.test.json carries the verdict the JSON Schema
// gives (valid: true|false). A generated validator is a translation of that
// schema into another language, and translations lose things: if/then,
// unevaluatedProperties and dependentRequired do not all survive. So this
// does not demand perfect agreement. It demands that the set of cases on
// which Zod disagrees with the corpus is EXACTLY the set recorded in
// scripts/runtime-validator-divergences.json:
//
//   - a disagreement not in the register  → REGRESSION (exit 1)
//   - a registered one that no longer reproduces → RATCHET, remove it (exit 1)
//   - a target with no generated validator and no exclusion → CANNOT ANSWER (exit 2)
//
// The register can only shrink. A false_reject — a VALID document refused —
// must carry a reason, and its intended steady state is empty.
//
// Usage:
//   node scripts/test-runtime-validators.mjs                 # gate
//   node scripts/test-runtime-validators.mjs --report        # print observed set as JSON
//   node scripts/test-runtime-validators.mjs --register <f>  # use another register (tests)

import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCorpus, loadRegister, compare } from './lib/runtime-validator-corpus.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const report = args.includes('--report');
const regIdx = args.indexOf('--register');
const registerPath = regIdx >= 0 ? resolve(args[regIdx + 1]) : join(ROOT, 'scripts/runtime-validator-divergences.json');
const modIdx = args.indexOf('--module');
const modulePath = modIdx >= 0 ? resolve(args[modIdx + 1]) : join(ROOT, 'packages/sdk/dist/zod/index.js');

let schemasById;
try {
  ({ schemasById } = await import(pathToFileURL(modulePath).href));
} catch (err) {
  console.error(`CANNOT ANSWER — the generated Zod module did not load: ${relative(ROOT, modulePath)}`);
  console.error(`  ${String(err.message).split('\n')[0]}`);
  console.error('  Run scripts/generate-runtime-validators.sh, then pnpm build:sdk');
  process.exit(2);
}

const register = loadRegister(registerPath);
const corpus = loadCorpus(ROOT);

const excluded = new Map(register.excluded_targets.map((e) => [e.target, e.reason]));
const observed = { false_reject: [], false_accept: [] };
const unanswerable = [];
let ran = 0;

for (const file of corpus) {
  if (excluded.has(file.target)) continue;
  const schema = schemasById[file.id];
  if (!schema) {
    unanswerable.push(`${file.target} ($id ${file.id ?? 'none'}) — no generated validator and no exclusion`);
    continue;
  }
  for (const c of file.cases) {
    ran += 1;
    const accepted = schema.safeParse(c.data).success;
    if (c.valid && !accepted) observed.false_reject.push(c.key);
    if (!c.valid && accepted) observed.false_accept.push(c.key);
  }
}

if (report) {
  console.log(JSON.stringify(observed, null, 2));
  process.exit(0);
}

if (unanswerable.length) {
  console.error(`CANNOT ANSWER — ${unanswerable.length} test target(s) have no generated validator:`);
  for (const u of unanswerable) console.error(`  ${u}`);
  process.exit(2);
}

const result = compare('zod', observed, register.zod);
const files = corpus.filter((f) => !excluded.has(f.target)).length;
console.log(`zod: ${ran} corpus cases in ${files} test files (${excluded.size} targets excluded) — ` +
  `${observed.false_reject.length} false_reject, ${observed.false_accept.length} false_accept, ` +
  `register matches: ${result.ok ? 'yes' : 'NO'}`);
for (const line of result.lines) console.error(line);
process.exit(result.ok ? 0 : 1);
