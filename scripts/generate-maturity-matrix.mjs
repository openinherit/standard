#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Generate maturity-matrix.json, the public maturity matrix of the standard —
 * or, with --check, refuse when the committed matrix no longer matches the
 * declarations it is derived from.
 *
 * The matrix invents nothing. It reads the maturity the standard already
 * declares, in three places:
 *   - the `maturity` keyword on each schema listed in v3/index.json
 *     (v3/vocab/estate/spec.md §3);
 *   - `maturity` on each extension manifest, v3/extensions/<x>/extension.json;
 *   - `maturity` and `legalReviewStatus` per extension in
 *     extensions-registry.json (docs/policies/maturity-signalling.md).
 *
 * Resolution: a row's `maturity` is the LEAST mature level any of its sources
 * declares; with no declaration it is `undeclared`. Where the sources of an
 * extension disagree, or one is missing, the row says `consistent: false` and
 * publishes every declaration. The rule and the guardrails are documented in
 * docs/policies/maturity-matrix.md.
 *
 * Status only: rows carry a fixed set of keys, so no date, target release or
 * other timing field in a source can reach the published matrix.
 *
 * Exit 0 written / current · 1 refused (stale matrix, a maturity value outside
 * the vocabulary, or an extension in the tree and not the registry, or the
 * other way round; each finding printed) · 2 cannot answer (no index, an
 * unparseable input, no matrix to check, a bad argument). Never read 2 as
 * clear.
 *
 * Usage: node scripts/generate-maturity-matrix.mjs [--check] [--root <repo>]
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const MATRIX = 'maturity-matrix.json';
// Least to most mature. `deprecated` sits outside the ladder: a deprecated
// declaration from any source makes the row deprecated.
const LADDER = ['draft', 'candidate', 'stable'];
const VOCABULARY = [...LADDER, 'deprecated'];
const UNDECLARED = 'undeclared';

let root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let check = false;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--check') check = true;
  else if (args[i] === '--root' && args[i + 1]) root = resolve(args[++i]);
  else cannotAnswer(`unknown argument ${args[i]}`);
}

// A crash is not a finding. Node exits 1 on an uncaught error, which would
// read as "refused"; report it as cannot-answer instead.
process.on('uncaughtException', (e) => cannotAnswer(`unexpected input: ${e.message}`));

function cannotAnswer(msg) {
  console.error(`CANNOT ANSWER — ${msg}`);
  process.exit(2);
}

function readJson(path, { optional = false } = {}) {
  const file = join(root, path);
  if (!existsSync(file)) {
    if (optional) return undefined;
    cannotAnswer(`no ${path} at ${root}`);
  }
  try {
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) cannotAnswer(`${path} is not a JSON object`);
    return doc;
  } catch (e) {
    return cannotAnswer(`${path} does not parse: ${e.message}`);
  }
}

const refused = [];
const declared = (value, where) => {
  if (value === undefined || value === null) return null;
  if (!VOCABULARY.includes(value)) {
    refused.push(`${where} declares maturity "${value}", which is not one of ${VOCABULARY.join(', ')}`);
    return null;
  }
  return value;
};
const resolveLevel = (values) => {
  const present = values.filter(Boolean);
  if (!present.length) return UNDECLARED;
  if (present.includes('deprecated')) return 'deprecated';
  return LADDER[Math.min(...present.map((v) => LADDER.indexOf(v)))];
};
const area = (path) => {
  const parts = path.split('/');
  return parts.length === 2 ? 'core' : parts[1];
};

const index = readJson('v3/index.json');
const registry = readJson('extensions-registry.json');
if (!Array.isArray(index.schemas)) cannotAnswer('v3/index.json has no "schemas" list');
if (!Array.isArray(registry.extensions)) cannotAnswer('extensions-registry.json has no "extensions" list');

// Core rows: every indexed schema outside v3/extensions/. Extension schemas
// are reported once, on their extension's row.
for (const e of index.schemas) if (typeof e?.path !== 'string') cannotAnswer('v3/index.json has an entry with no "path"');
const schemas = index.schemas
  .filter((e) => !e.path.startsWith('v3/extensions/'))
  .map((e) => {
    const doc = readJson(e.path);
    const level = declared(doc.maturity, e.path);
    return { path: e.path, title: doc.title ?? null, area: area(e.path), maturity: resolveLevel([level]) };
  })
  .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

// Extension rows: the registry and the tree must describe the same set.
const extDir = join(root, 'v3/extensions');
const inTree = existsSync(extDir)
  ? readdirSync(extDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : [];
const nameOf = (entry) => (entry.path ?? '').replace(/^v3\/extensions\//, '').replace(/\/$/, '');
const inRegistry = new Map();
for (const e of registry.extensions) {
  const name = nameOf(e);
  if (inRegistry.has(name)) refused.push(`extensions-registry.json lists "${name}" more than once`);
  else inRegistry.set(name, e);
}
for (const name of inTree) if (!inRegistry.has(name)) refused.push(`v3/extensions/${name}/ is in the tree but not in extensions-registry.json`);
for (const name of inRegistry.keys()) if (!inTree.includes(name)) refused.push(`extensions-registry.json lists "${name}" but v3/extensions/${name}/ does not exist`);

const extensions = inTree
  .filter((name) => inRegistry.has(name))
  .map((name) => {
    const entry = inRegistry.get(name);
    const manifest = readJson(`v3/extensions/${name}/extension.json`, { optional: true });
    const schemaPath = `v3/extensions/${name}/${name}.json`;
    const schemaDoc = readJson(schemaPath, { optional: true });
    const declarations = {
      registry: declared(entry.maturity, `extensions-registry.json "${name}"`),
      manifest: declared(manifest?.maturity, `v3/extensions/${name}/extension.json`),
      schema: declared(schemaDoc?.maturity, schemaPath),
    };
    const values = Object.values(declarations);
    return {
      extension: name,
      name: entry.name ?? name,
      tier: entry.tier ?? null,
      maturity: resolveLevel(values),
      consistent: values.every((v) => v !== null && v === values[0]),
      declarations,
      legalReviewStatus: entry.legalReviewStatus ?? null,
    };
  });

const count = (rows) => Object.fromEntries([...VOCABULARY, UNDECLARED].map((l) => [l, rows.filter((r) => r.maturity === l).length]));
const matrix = {
  $comment: 'GENERATED by scripts/generate-maturity-matrix.mjs — do not hand-edit. Regenerate with `node scripts/generate-maturity-matrix.mjs`. Derived from the maturity the standard declares; see docs/policies/maturity-matrix.md. Status only: no dates, no sequencing.',
  vocabulary: VOCABULARY,
  resolution: 'least-mature-declared',
  summary: {
    schemas: count(schemas),
    extensions: count(extensions),
    extensionsWithDisagreeingDeclarations: extensions.filter((e) => !e.consistent).length,
  },
  extensions,
  schemas,
};
const text = `${JSON.stringify(matrix, null, 2)}\n`;
const matrixPath = join(root, MATRIX);

if (refused.length) {
  for (const f of refused) console.error(`REFUSED — ${f}`);
  process.exit(1);
}

if (!check) {
  writeFileSync(matrixPath, text);
  console.log(`Wrote ${MATRIX} — ${schemas.length} schemas, ${extensions.length} extensions`);
  process.exit(0);
}

if (!existsSync(matrixPath)) cannotAnswer(`no ${MATRIX} to check — run without --check to generate it`);
if (readFileSync(matrixPath, 'utf8') === text) {
  console.log(`OK — ${MATRIX} matches the declarations of ${schemas.length} schemas and ${extensions.length} extensions`);
  process.exit(0);
}

// Stale. Name the rows that moved, as far as the committed file allows.
const findings = [];
let was = {};
try {
  was = JSON.parse(readFileSync(matrixPath, 'utf8'));
} catch {
  findings.push(`${MATRIX} does not parse`);
}
const diffRows = (key, before = [], after = []) => {
  const b = new Map(before.map((r) => [r[key], JSON.stringify(r)]));
  for (const r of after) {
    if (!b.has(r[key])) findings.push(`${r[key]} is not in ${MATRIX}`);
    else if (b.get(r[key]) !== JSON.stringify(r)) findings.push(`${r[key]}: ${MATRIX} records different declarations`);
  }
  const a = new Set(after.map((r) => r[key]));
  for (const k of b.keys()) if (!a.has(k)) findings.push(`${k} is in ${MATRIX} but no longer in the tree`);
};
diffRows('extension', was.extensions, extensions);
diffRows('path', was.schemas, schemas);
if (!findings.length) findings.push(`${MATRIX} differs from what the generator writes (hand-edited or reformatted)`);
for (const f of findings) console.error(`REFUSED — ${f}`);
console.error('Run: node scripts/generate-maturity-matrix.mjs');
process.exit(1);
