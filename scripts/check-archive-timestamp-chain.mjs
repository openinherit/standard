#!/usr/bin/env node
/**
 * Gate: archive timestamp chains follow RFC 4998, and every algorithm they name
 * is in the algorithm-lifecycle registry and was allowed when it was used.
 *
 * v3/common/archive-timestamp-chain.json checks a chain's shape and that each
 * algorithm id is a member of a closed enum. JSON Schema cannot compare one
 * array item with the next, read a date window from another file, or check that
 * its own enum still matches the registry. This script does those, over
 * reference-data/algorithm-lifecycle-registry.json, the schema, and every
 * `valid: true` chain in the test fixtures:
 *
 *   R1 the registry is well formed: unique ids, kind digest|signature, each
 *      lifecycle starts `approved`, dates strictly ascending, every step sourced,
 *      every profile declared
 *   R2 the schema's digestAlgorithmId / signatureAlgorithmId enums equal the
 *      registry's ids of that kind, both ways
 *   R3 chain order (RFC 4998 §5.1): sequence 0..n-1, timestamps strictly
 *      ascending, only the first link is `initial`, each coveredDigest uses its
 *      link's digestAlgorithm, and the protected object hash uses the initial's
 *   R4 a timestamp_renewal keeps the preceding link's digestAlgorithm (§5.2)
 *   R5 every link's algorithms were not disallowed when it was made, and were
 *      still not disallowed when the next link renewed them (§5.3 step 2)
 *   R6 with --as-of <YYYY-MM-DD>: the newest link's algorithms are not
 *      disallowed on that date, i.e. no renewal is overdue
 *
 * Cryptographic verification of evidence records is out of scope.
 *
 * Exit 0 consistent · 1 refused (each finding printed) · 2 cannot answer (an
 * input is missing or unreadable, a bad argument, or fewer chains found than
 * --min-chains). Never read 2 as clear.
 *
 * Usage: node scripts/check-archive-timestamp-chain.mjs [--registry <path>]
 *   [--schema <path>] [--fixtures <path>]... [--min-chains <n>] [--as-of <date>]
 */
import { readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_DIRS = ['tests/v3/archive-timestamp-chain', 'tests/v3/attestation'];

const cannotAnswer = (msg) => {
  console.error(`CANNOT ANSWER — ${msg}`);
  process.exit(2);
};

const opts = {
  registry: join(ROOT, 'reference-data/algorithm-lifecycle-registry.json'),
  schema: join(ROOT, 'v3/common/archive-timestamp-chain.json'),
  fixtures: [],
  'min-chains': '1',
  'as-of': null,
};
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  if (!args[i].startsWith('--') || !(key in opts)) cannotAnswer(`unknown argument ${args[i]}`);
  if (args[i + 1] === undefined) cannotAnswer(`${args[i]} needs a value`);
  if (key === 'fixtures') opts.fixtures.push(resolve(args[i + 1]));
  else opts[key] = key === 'registry' || key === 'schema' ? resolve(args[i + 1]) : args[i + 1];
}
const minChains = Number(opts['min-chains']);
if (!Number.isInteger(minChains) || minChains < 1) cannotAnswer(`--min-chains must be a positive integer`);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
let asOf = null;
if (opts['as-of'] !== null) {
  if (!DATE.test(opts['as-of']) || Number.isNaN(Date.parse(opts['as-of']))) cannotAnswer(`--as-of must be YYYY-MM-DD, got ${opts['as-of']}`);
  asOf = Date.parse(`${opts['as-of']}T00:00:00Z`);
}

const load = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    cannotAnswer(`${path}: ${e.message}`);
  }
};
const registry = load(opts.registry);
const schema = load(opts.schema);
if (!Array.isArray(registry?.algorithms) || !registry.algorithms.length) cannotAnswer(`${opts.registry} has no algorithms array`);
const schemaEnum = (name) => {
  const e = schema?.$defs?.[name]?.enum;
  if (!Array.isArray(e)) cannotAnswer(`${opts.schema} has no $defs.${name}.enum`);
  return e;
};

const findings = [];
const refuse = (msg) => findings.push(msg);

// R1 — the registry.
const KINDS = ['digest', 'signature'];
const STATUSES = Object.keys(registry.statuses ?? {});
const PROFILES = Object.keys(registry.profiles ?? {});
const byId = new Map();
for (const a of registry.algorithms) {
  const where = `registry ${a?.id ?? '(no id)'}`;
  if (typeof a?.id !== 'string' || !a.id) { refuse(`R1 ${where}: no id`); continue; }
  if (byId.has(a.id)) refuse(`R1 ${where}: duplicate id`);
  byId.set(a.id, a);
  if (!KINDS.includes(a.kind)) refuse(`R1 ${where}: kind ${JSON.stringify(a.kind)} is not digest or signature`);
  for (const p of a.profiles ?? []) if (!PROFILES.includes(p)) refuse(`R1 ${where}: profile ${p} is not declared in profiles`);
  const lc = a.lifecycle;
  if (!Array.isArray(lc) || !lc.length) { refuse(`R1 ${where}: no lifecycle`); continue; }
  if (lc[0].status !== 'approved') refuse(`R1 ${where}: lifecycle starts ${JSON.stringify(lc[0].status)}, not approved`);
  lc.forEach((s, i) => {
    if (!STATUSES.includes(s.status)) refuse(`R1 ${where} step ${i}: status ${JSON.stringify(s.status)} is not declared in statuses`);
    if (!DATE.test(s.from ?? '') || Number.isNaN(Date.parse(s.from))) refuse(`R1 ${where} step ${i}: from ${JSON.stringify(s.from)} is not YYYY-MM-DD`);
    if (typeof s.source !== 'string' || !s.source.trim()) refuse(`R1 ${where} step ${i}: no source`);
    if (!['final', 'draft'].includes(s.sourceStatus)) refuse(`R1 ${where} step ${i}: sourceStatus must be final or draft`);
    if (i > 0 && !(s.from > lc[i - 1].from)) refuse(`R1 ${where} step ${i}: ${s.from} is not after ${lc[i - 1].from}`);
  });
}

// R2 — schema enums and registry agree.
for (const [kind, def] of [['digest', 'digestAlgorithmId'], ['signature', 'signatureAlgorithmId']]) {
  const inSchema = new Set(schemaEnum(def));
  const inRegistry = new Set(registry.algorithms.filter((a) => a.kind === kind).map((a) => a.id));
  for (const id of inRegistry) if (!inSchema.has(id)) refuse(`R2 ${kind} ${id}: in the registry but not in schema $defs.${def}`);
  for (const id of inSchema) if (!inRegistry.has(id)) refuse(`R2 ${kind} ${id}: in schema $defs.${def} but not in the registry`);
}

// The status of an algorithm at a moment (ms since epoch); null if unknown.
const statusAt = (id, t) => {
  const a = byId.get(id);
  if (!a) return null;
  let status = null;
  for (const s of a.lifecycle ?? []) if (Date.parse(`${s.from}T00:00:00Z`) <= t) status = s.status;
  return status ?? 'not_yet_approved';
};
const usable = (s) => s === 'approved' || s === 'deprecated';

// Collect chains from fixtures.
const fixtureFiles = opts.fixtures.length
  ? opts.fixtures
  : FIXTURE_DIRS.flatMap((d) => {
    const abs = join(ROOT, d);
    let names;
    try { names = readdirSync(abs); } catch (e) { cannotAnswer(`${abs}: ${e.message}`); }
    return names.filter((f) => f.endsWith('.test.json')).map((f) => join(abs, f));
  });
const chains = [];
const collect = (node, where) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.archiveTimestamps) && 'evidenceRecordFormat' in node) { chains.push({ chain: node, where }); return; }
  for (const [k, v] of Object.entries(node)) collect(v, `${where}/${k}`);
};
for (const file of fixtureFiles) {
  const doc = load(file);
  if (!Array.isArray(doc?.tests)) cannotAnswer(`${file} has no tests array`);
  doc.tests.forEach((t, i) => { if (t.valid === true) collect(t.data, `${file.replace(`${ROOT}/`, '')} #${i}`); });
}
if (chains.length < minChains) cannotAnswer(`found ${chains.length} valid chain(s) in the fixtures, expected at least ${minChains}`);

// R3–R6 per chain.
for (const { chain, where } of chains) {
  const ts = chain.archiveTimestamps;
  if (!ts.length) { refuse(`R3 ${where}: no archive timestamps`); continue; }
  const at = (l) => Date.parse(l.timestamp);
  if (chain.protectedObjectDigest?.algorithm !== ts[0]?.digestAlgorithm) {
    refuse(`R3 ${where}: protectedObjectDigest uses ${chain.protectedObjectDigest?.algorithm}, initial link uses ${ts[0]?.digestAlgorithm}`);
  }
  ts.forEach((l, i) => {
    const link = `${where} link ${i}`;
    if (l.sequence !== i) refuse(`R3 ${link}: sequence ${l.sequence}, expected ${i}`);
    if ((l.renewalType === 'initial') !== (i === 0)) refuse(`R3 ${link}: renewalType ${l.renewalType} ${i === 0 ? 'must be initial' : 'cannot be initial after the first link'}`);
    if (Number.isNaN(at(l))) refuse(`R3 ${link}: timestamp ${JSON.stringify(l.timestamp)} is not a date-time`);
    if (l.coveredDigest?.algorithm !== l.digestAlgorithm) refuse(`R3 ${link}: coveredDigest uses ${l.coveredDigest?.algorithm}, link uses ${l.digestAlgorithm}`);
    for (const alg of [l.digestAlgorithm, l.signatureAlgorithm]) {
      const s = statusAt(alg, at(l));
      if (s === null) refuse(`R5 ${link}: ${alg} is not in the registry`);
      else if (!usable(s)) refuse(`R5 ${link}: ${alg} was ${s} at ${l.timestamp}`);
    }
    if (i === 0) return;
    const prev = ts[i - 1];
    if (!(at(l) > at(prev))) refuse(`R3 ${link}: ${l.timestamp} is not after ${prev.timestamp}`);
    if (l.renewalType === 'timestamp_renewal' && l.digestAlgorithm !== prev.digestAlgorithm) {
      refuse(`R4 ${link}: timestamp renewal switches hash ${prev.digestAlgorithm} → ${l.digestAlgorithm}; that needs a hash_tree_renewal`);
    }
    for (const alg of [prev.digestAlgorithm, prev.signatureAlgorithm]) {
      const s = statusAt(alg, at(l));
      if (s !== null && !usable(s)) refuse(`R5 ${link}: renewed at ${l.timestamp}, after link ${i - 1}'s ${alg} became ${s}`);
    }
  });
  if (asOf !== null) {
    const last = ts[ts.length - 1];
    for (const alg of [last.digestAlgorithm, last.signatureAlgorithm]) {
      const s = statusAt(alg, asOf);
      if (s !== null && !usable(s)) refuse(`R6 ${where}: renewal overdue — newest link's ${alg} is ${s} as of ${opts['as-of']}`);
    }
  }
}

if (findings.length) {
  for (const f of findings) console.log(`⛔ ${f}`);
  console.log(`\nREFUSED — ${findings.length} finding(s)`);
  process.exit(1);
}
console.log(`OK — ${byId.size} algorithms in the registry match the schema; ${chains.length} fixture chain(s) follow RFC 4998 and the lifecycle${asOf !== null ? ` (current as of ${opts['as-of']})` : ''}`);
