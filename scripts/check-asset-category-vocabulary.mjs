#!/usr/bin/env node
/**
 * Gate: the asset category vocabulary has ONE source, and every copy of it
 * agrees with that source.
 *
 * The source is v3/asset.json#/properties/category/enum. The same list is
 * repeated in the schema's own routing (allOf), in five reference-data files,
 * in the vendored bundles, in generated SDK types and in two docs. Until this
 * gate, nothing checked the hand-maintained copies against the schema, so a
 * category could be added to the enum and silently missing everywhere else.
 * The register at scripts/data/asset-category-copies.json classifies every
 * file that mentions the vocabulary.
 *
 *   C1 the source enum is non-empty and has no repeated value
 *   C2 the allOf branches route every value to exactly one category schema,
 *      and route nothing the source does not have. The general branch is
 *      derived (the source minus the values routed by a `const` branch), and
 *      --write regenerates it
 *   C3 keyed companions carry exactly the source's values (per-category content
 *      cannot be generated from a list of names, so the key set is checked)
 *   C4 subset companions name only source values
 *   C4b mixed-vocabulary consumers name only a category or a subcategory; the
 *      register pins the values that predate the gate, and the pin only tightens
 *   C5 every generated copy carries the source list (or the general branch)
 *      exactly, and carries the number of copies the register pins
 *   C6 the category $comment describes every value, and no category schema
 *      names a category ("Use when category is '...'") that does not exist
 *   C7 every value has a `valid: true` case in the source's test suite
 *   C8 every file mentioning a distinctive category value is in the register,
 *      so a new copy cannot appear unchecked
 *
 * Exit 0 clear · 1 refused (each finding printed) · 2 cannot answer (a file is
 * missing or unparsable, a generated file's copies changed shape, or the
 * register names a file that has gone). Never read 2 as clear.
 *
 * Usage: node scripts/check-asset-category-vocabulary.mjs [--root <repo-root>] [--write]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const REGISTER = 'scripts/data/asset-category-copies.json';
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist']);

let root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let write = false;
const args = process.argv.slice(2);
const cannotAnswer = (msg) => {
  console.error(`CANNOT ANSWER — ${msg}`);
  process.exit(2);
};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root' && args[i + 1]) root = resolve(args[++i]);
  else if (args[i] === '--write') write = true;
  else cannotAnswer(`usage: [--root <repo-root>] [--write], got ${args.join(' ')}`);
}

const readText = (rel) => {
  try {
    return readFileSync(join(root, rel), 'utf8');
  } catch (e) {
    cannotAnswer(`${rel}: ${e.message}`);
  }
};
const load = (rel) => {
  try {
    return JSON.parse(readText(rel));
  } catch (e) {
    cannotAnswer(`${rel}: ${e.message}`);
  }
};
const at = (doc, pointer) =>
  pointer
    .split('/')
    .slice(1)
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((o, k) => (o == null ? undefined : o[k]), doc);
// Every string held under `key` anywhere inside `data`, or every array under it.
const valuesAt = (data, key, out = []) => {
  if (Array.isArray(data)) data.forEach((d) => valuesAt(d, key, out));
  else if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) {
      if (k === key) out.push(v);
      valuesAt(v, key, out);
    }
  }
  return out;
};
const diff = (got, want) => ({
  missing: want.filter((v) => !got.includes(v)),
  extra: got.filter((v) => !want.includes(v)),
});
const show = ({ missing, extra }) =>
  [missing.length && `missing ${JSON.stringify(missing)}`, extra.length && `extra ${JSON.stringify(extra)}`]
    .filter(Boolean)
    .join(', ');

const reg = load(REGISTER);
const findings = [];
const cannot = [];
const refuse = (msg) => findings.push(msg);

// ── C1 the source ─────────────────────────────────────────────────────────────
const SRC = reg.source.file;
let asset = load(SRC);
const source = at(asset, reg.source.pointer);
if (!Array.isArray(source) || !source.length) cannotAnswer(`${SRC}#${reg.source.pointer} is not a non-empty enum`);
const repeated = source.filter((v, i) => source.indexOf(v) !== i);
if (repeated.length) refuse(`C1 ${SRC}: the source enum repeats ${JSON.stringify(repeated)}`);
const distinctive = source.filter((v) => v.includes('_'));
if (!distinctive.length) cannotAnswer('the source has no distinctive value (one containing "_"), so discovery would see nothing');

// ── C2 routing: the allOf branches partition the source ──────────────────────
const branchesOf = (doc) =>
  (doc.allOf ?? [])
    .map((b) => b?.if?.properties?.category)
    .filter((c) => c && (typeof c.const === 'string' || Array.isArray(c.enum)));
const constRouted = branchesOf(asset).filter((c) => typeof c.const === 'string').map((c) => c.const);
const derivedGeneral = source.filter((v) => !constRouted.includes(v));

if (write) {
  const enumBranches = branchesOf(asset).filter((c) => Array.isArray(c.enum));
  if (enumBranches.length !== 1) cannotAnswer(`--write needs exactly one enum-routed (general) branch in ${SRC}, found ${enumBranches.length}`);
  const raw = readText(SRC);
  const anchor = raw.indexOf('"$ref": "asset-categories/general.json"');
  const open = raw.lastIndexOf('"enum": [', anchor);
  const close = raw.indexOf(']', open);
  if (anchor < 0 || open < 0 || close < 0) cannotAnswer(`--write could not locate the general branch enum in ${SRC}`);
  const indent = raw.slice(open, close).match(/\n( +)"/)?.[1] ?? ' '.repeat(14);
  const closeIndent = indent.slice(2);
  const body = `"enum": [\n${derivedGeneral.map((v) => `${indent}"${v}"`).join(',\n')}\n${closeIndent}]`;
  writeFileSync(join(root, SRC), raw.slice(0, open) + body + raw.slice(close + 1));
  asset = load(SRC);
  console.log(`wrote ${SRC}: general branch = source minus ${JSON.stringify(constRouted)} (${derivedGeneral.length} values)`);
}

const routes = new Map();
for (const c of branchesOf(asset)) {
  for (const v of typeof c.const === 'string' ? [c.const] : c.enum) routes.set(v, (routes.get(v) ?? 0) + 1);
}
for (const v of source) {
  const n = routes.get(v) ?? 0;
  if (n === 0) refuse(`C2 "${v}" is routed to no category schema (allOf in ${SRC}); run with --write to regenerate the general branch`);
  if (n > 1) refuse(`C2 "${v}" is routed to ${n} category schemas (allOf in ${SRC})`);
}
for (const v of routes.keys()) if (!source.includes(v)) refuse(`C2 "${v}" is routed but is not in the source (allOf in ${SRC})`);

// ── C3 / C4 companions ───────────────────────────────────────────────────────
for (const k of reg.keyed) {
  const node = at(load(k.file), k.pointer);
  const where = `${k.file} ${k.pointer}`;
  if (node == null) {
    cannot.push(`${where} is absent`);
    continue;
  }
  if (k.match === 'keys-equal') {
    const d = diff(Object.keys(node), source);
    if (d.missing.length || d.extra.length) refuse(`C3 ${where}: ${show(d)}`);
  } else if (k.match === 'values-each-once') {
    const vals = valuesAt(node, k.field).filter((v) => typeof v === 'string');
    const twice = [...new Set(vals.filter((v, i) => vals.indexOf(v) !== i))];
    if (twice.length) refuse(`C3 ${where}: ${k.field} repeats ${JSON.stringify(twice)}`);
    const d = diff([...new Set(vals)], source);
    if (d.missing.length || d.extra.length) refuse(`C3 ${where}: ${k.field} ${show(d)}`);
  } else if (k.match === 'values-subset') {
    const vals = valuesAt(node, k.field).filter((v) => typeof v === 'string');
    if (!vals.length) cannot.push(`${where}: no ${k.field} values found`);
    const extra = [...new Set(vals.filter((v) => !source.includes(v)))];
    if (extra.length) refuse(`C4 ${where}: ${k.field} names ${JSON.stringify(extra)}, not in the source`);
  } else if (k.match === 'keys-subset') {
    const extra = Object.keys(node).filter((v) => !source.includes(v));
    if (extra.length) refuse(`C4 ${where}: names ${JSON.stringify(extra)}, not in the source`);
  } else cannotAnswer(`${REGISTER}: unknown match "${k.match}" for ${k.file}`);
}

// ── C4b mixed-vocabulary consumers ───────────────────────────────────────────
for (const c of reg.consumers) {
  const subs = valuesAt(load(c.subcategoriesFrom), 'subcategories')
    .flat()
    .map((s) => s?.value)
    .filter((v) => typeof v === 'string' && v);
  const allowed = new Set([...source, ...subs]);
  const vals = valuesAt(load(c.file), c.field).flat().filter((v) => typeof v === 'string');
  if (!vals.length) cannot.push(`${c.file}: no ${c.field} values found`);
  const offenders = [...new Set(vals.filter((v) => !allowed.has(v)))];
  const pinned = c.pinnedOffenders ?? [];
  for (const v of offenders) {
    if (!pinned.includes(v)) refuse(`C4b ${c.file}: "${v}" in ${c.field} is neither a category nor a subcategory`);
  }
  for (const v of pinned) {
    if (!offenders.includes(v)) {
      refuse(`C4b ${c.file}: RATCHET — "${v}" is pinned as a known offender but no longer occurs; remove it from ${REGISTER} in the same commit`);
    }
  }
}

// ── C5 generated copies ──────────────────────────────────────────────────────
// Lists of category-shaped tokens a text file holds, whatever generator wrote it.
const TOKEN = '[a-z][a-z0-9_]*';
const LINE_KINDS = [
  ['yaml', new RegExp(`^(\\s*)- ['"]?(${TOKEN})['"]?\\s*$`)],
  ['quoted', new RegExp(`^(\\s*)['"](${TOKEN})['"],?\\s*$`)],
  ['py-enum', new RegExp(`^(\\s+)[A-Za-z_][A-Za-z0-9_]* = ['"](${TOKEN})['"]\\s*$`)],
  ['md-row', new RegExp(`^()\\|\\s*\`(${TOKEN})\`\\s*\\|`)],
];
const textLists = (text) => {
  const lists = [];
  let run = null;
  for (const line of text.split('\n')) {
    let hit = null;
    for (const [kind, re] of LINE_KINDS) {
      const m = line.match(re);
      if (m) {
        hit = { key: `${kind}:${m[1]}`, value: m[2] };
        break;
      }
    }
    if (hit && run && run.key === hit.key) run.values.push(hit.value);
    else {
      if (run) lists.push(run.values);
      run = hit ? { key: hit.key, values: [hit.value] } : null;
    }
  }
  if (run) lists.push(run.values);
  for (const m of text.matchAll(new RegExp(`'${TOKEN}'(?:\\s*\\|\\s*'${TOKEN}')+`, 'g'))) {
    lists.push(m[0].split('|').map((s) => s.trim().slice(1, -1)));
  }
  for (const m of text.matchAll(new RegExp(`one of ((?:\`${TOKEN}\`(?:, )?)+)`, 'g'))) {
    lists.push(m[1].split(', ').map((s) => s.replace(/`/g, '')));
  }
  return lists;
};
const jsonLists = (data, out = []) => {
  if (Array.isArray(data)) {
    if (data.length && data.every((v) => typeof v === 'string')) out.push(data);
    else data.forEach((d) => jsonLists(d, out));
  } else if (data && typeof data === 'object') Object.values(data).forEach((d) => jsonLists(d, out));
  return out;
};
const same = (list, want) => list.length === want.length && want.every((v) => list.includes(v));

for (const [file, spec] of Object.entries(reg.generated.files)) {
  const lists = file.endsWith('.json') ? jsonLists(load(file)) : textLists(readText(file));
  // A list is a copy when it holds more than half the source; a different
  // vocabulary that shares a value or two (asset-collection) is not.
  const copies = lists.filter((l) => l.filter((v) => source.includes(v)).length > source.length / 2);
  if (copies.length !== spec.copies) {
    cannot.push(`${file}: expected ${spec.copies} copies of the vocabulary, found ${copies.length} — the generator's output changed shape; re-measure and re-pin in ${REGISTER}`);
  }
  copies.forEach((l, i) => {
    if (same(l, source) || same(l, derivedGeneral)) return;
    const nearest = Math.abs(l.length - source.length) <= Math.abs(l.length - derivedGeneral.length) ? source : derivedGeneral;
    refuse(`C5 ${file}: copy ${i + 1} differs from the source (${show(diff(l, nearest))}) — regenerate: ${spec.regenerate}`);
  });
}

// ── C6 prose that names categories ───────────────────────────────────────────
const comment = asset.properties?.category?.$comment ?? '';
for (const v of source) {
  if (!new RegExp(`(^|[\\s.(])${v}:`).test(comment)) refuse(`C6 ${SRC}: the category $comment does not describe "${v}"`);
}
for (const f of reg.routingSchemas.files) {
  const raw = readText(f);
  for (const m of raw.matchAll(/(?<![A-Za-z])category (?:is|=|==) ((?:'[^']*'(?:,? or |, )?)+)/g)) {
    for (const name of m[1].match(/'[^']*'/g).map((q) => q.slice(1, -1))) {
      if (!source.includes(name)) refuse(`C6 ${f}: names category "${name}", which is not in the source`);
    }
  }
}

// ── C7 every value is exercised ──────────────────────────────────────────────
const tests = load(reg.source.tests).tests ?? [];
const exercised = new Set(tests.filter((t) => t.valid === true).map((t) => t.data?.category));
for (const v of source) if (!exercised.has(v)) refuse(`C7 "${v}" has no valid test case in ${reg.source.tests}`);

// ── C8 discovery: nothing mentions the vocabulary unregistered ──────────────
const registered = new Set([
  REGISTER,
  SRC,
  reg.source.tests,
  ...reg.routingSchemas.files,
  ...reg.keyed.map((k) => k.file),
  ...reg.consumers.flatMap((c) => [c.file, c.subcategoriesFrom]),
  ...Object.keys(reg.generated.files),
  ...Object.keys(reg.usage.files).filter((k) => !k.startsWith('_')),
]);
for (const f of registered) if (!existsSync(join(root, f))) cannot.push(`${REGISTER} names ${f}, which does not exist — the register is stale`);
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue; // a dangling link holds nothing to classify
    }
    if (st.isDirectory()) walk(p, out);
    else if (st.isFile()) out.push(relative(root, p).split(sep).join('/'));
  }
  return out;
};
let scanned = 0;
for (const f of walk(root)) {
  scanned++;
  if (registered.has(f)) continue;
  const text = readFileSync(join(root, f), 'utf8');
  const hits = distinctive.filter((v) => text.includes(v));
  if (hits.length) refuse(`C8 ${f}: mentions ${JSON.stringify(hits)} but is not in ${REGISTER} — register it as a checked copy or as a usage`);
}

// ── verdict ──────────────────────────────────────────────────────────────────
if (cannot.length) {
  console.error(`CANNOT ANSWER — ${cannot.length} problem(s):`);
  for (const c of cannot) console.error(`  ${c}`);
  if (findings.length) {
    console.error(`and ${findings.length} finding(s):`);
    for (const f of findings) console.error(`  ${f}`);
  }
  process.exit(2);
}
if (findings.length) {
  console.error(`REFUSED — ${findings.length} finding(s):`);
  for (const f of findings) console.error(`  ${f}`);
  process.exit(1);
}
const nGenerated = Object.values(reg.generated.files).reduce((a, s) => a + s.copies, 0);
console.log(
  `OK — asset category vocabulary: ${source.length} values from ${SRC}\n` +
    `  routing partitions the source (${constRouted.length} const branches + general ${derivedGeneral.length})\n` +
    `  ${reg.keyed.length} companion checks, ${reg.consumers.length} consumer, ${nGenerated} generated copies in ${Object.keys(reg.generated.files).length} files\n` +
    `  ${scanned} files scanned, ${registered.size} registered`,
);
