#!/usr/bin/env node
/**
 * Hermetic tests for scripts/check-archive-timestamp-chain.mjs.
 *
 * Each case writes a mutated copy of the real registry, schema or a fixture
 * chain to a temporary directory and asserts the gate's exit code. That proves
 * every rule can go red, so a green from the gate means something.
 */
import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'scripts/check-archive-timestamp-chain.mjs');
const REGISTRY = JSON.parse(readFileSync(join(ROOT, 'reference-data/algorithm-lifecycle-registry.json'), 'utf8'));
const SCHEMA = JSON.parse(readFileSync(join(ROOT, 'v3/common/archive-timestamp-chain.json'), 'utf8'));
const dir = mkdtempSync(join(tmpdir(), 'archive-timestamp-chain-'));

let n = 0;
const run = (args) => spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
const write = (obj) => {
  const p = join(dir, `data-${++n}.json`);
  writeFileSync(p, typeof obj === 'string' ? obj : JSON.stringify(obj));
  return p;
};
const hex = (c, len) => c.repeat(len);

// A three-link chain that satisfies every rule: initial on SHA-256 + RSA-2048,
// a timestamp renewal on the same hash, then a hash-tree renewal onto SHA-384
// with ML-DSA-87.
const CHAIN = {
  evidenceRecordFormat: 'rfc4998',
  protectedObjectDigest: { algorithm: 'sha-256', value: hex('a', 64) },
  archiveTimestamps: [
    { sequence: 0, renewalType: 'initial', timestamp: '2026-03-28T10:00:00Z', digestAlgorithm: 'sha-256',
      signatureAlgorithm: 'rsa-pkcs1v15-2048', coveredDigest: { algorithm: 'sha-256', value: hex('a', 64) },
      timestampTokenRef: 'urn:example:tst:0' },
    { sequence: 1, renewalType: 'timestamp_renewal', timestamp: '2029-03-28T10:00:00Z', digestAlgorithm: 'sha-256',
      signatureAlgorithm: 'ecdsa-p384', coveredDigest: { algorithm: 'sha-256', value: hex('b', 64) },
      timestampTokenRef: 'urn:example:tst:1' },
    { sequence: 2, renewalType: 'hash_tree_renewal', timestamp: '2031-03-28T10:00:00Z', digestAlgorithm: 'sha-384',
      signatureAlgorithm: 'ml-dsa-87', coveredDigest: { algorithm: 'sha-384', value: hex('c', 96) },
      timestampTokenRef: 'urn:example:tst:2' },
  ],
};
// A fixture file in the shape `jsonschema test` reads.
const fixture = (chain) => ['--fixtures', write({ target: 'x', tests: [{ description: 'case', valid: true, data: chain }] })];
const chain = (fn) => { const c = structuredClone(CHAIN); fn(c, c.archiveTimestamps); return fixture(c); };
const registry = (fn) => { const r = structuredClone(REGISTRY); fn(r, Object.fromEntries(r.algorithms.map((a) => [a.id, a]))); return ['--registry', write(r)]; };
const schema = (fn) => { const s = structuredClone(SCHEMA); fn(s); return ['--schema', write(s)]; };

const cases = [
  ['the real registry, schema and repo fixtures are consistent', [], 0],
  ['a clean three-link chain', fixture(CHAIN), 0],
  ['a clean chain checked as of a date its newest link still covers', [...fixture(CHAIN), '--as-of', '2040-01-01'], 0],

  // R1 — the registry is well formed.
  ['a duplicate algorithm id', registry((r) => { r.algorithms.push(structuredClone(r.algorithms[0])); }), 1],
  ['a lifecycle step with no source', registry((r, a) => { delete a['sha-1'].lifecycle[1].source; }), 1],
  ['a lifecycle out of date order', registry((r, a) => { a['sha-1'].lifecycle[1].from = '1990-01-01'; }), 1],
  ['a lifecycle that does not start approved', registry((r, a) => { a['sha-256'].lifecycle[0].status = 'deprecated'; }), 1],
  ['an algorithm kind that is not digest or signature', registry((r, a) => { a['sha-256'].kind = 'cipher'; }), 1],

  // R2 — schema enums and registry agree, both ways.
  ['an id in the registry but not the schema', registry((r) => {
    r.algorithms.push({ id: 'sha-999', kind: 'digest', name: 'x', lifecycle: [{ status: 'approved', from: '2020-01-01', source: 'x', sourceStatus: 'final' }] });
  }), 1],
  ['an id in the schema but not the registry', schema((s) => { s.$defs.signatureAlgorithmId.enum.push('rsa-pkcs1v15-1024'); }), 1],

  // R3 — chain order and internal agreement (RFC 4998 §5.1).
  ['timestamps out of order', chain((c, t) => { t[2].timestamp = '2028-01-01T00:00:00Z'; }), 1],
  ['a gap in sequence', chain((c, t) => { t[2].sequence = 3; }), 1],
  ['a second initial link', chain((c, t) => { t[1].renewalType = 'initial'; }), 1],
  ['a first link that is a renewal, not initial', chain((c, t) => { t[0].renewalType = 'timestamp_renewal'; }), 1],
  ['coveredDigest on a different hash from its link', chain((c, t) => { t[1].coveredDigest.algorithm = 'sha-512'; }), 1],
  ['protected object hashed with a different algorithm from the initial link', chain((c) => { c.protectedObjectDigest = { algorithm: 'sha-512', value: hex('a', 128) }; }), 1],

  // R4 — a timestamp renewal keeps the hash algorithm (RFC 4998 §5.2).
  ['a timestamp renewal that switches hash', chain((c, t) => { t[1].digestAlgorithm = 'sha-512'; t[1].coveredDigest = { algorithm: 'sha-512', value: hex('b', 128) }; }), 1],

  // R5 — every link was on an algorithm still allowed when it was made, and
  // renewed before its algorithms were disallowed.
  ['an initial link minted on SHA-1 after SHA-1 was disallowed', chain((c, t) => {
    c.protectedObjectDigest.algorithm = 'sha-1'; c.protectedObjectDigest.value = hex('a', 40);
    t[0].digestAlgorithm = 'sha-1'; t[0].coveredDigest = { algorithm: 'sha-1', value: hex('a', 40) };
    t[1].digestAlgorithm = 'sha-1'; t[1].coveredDigest = { algorithm: 'sha-1', value: hex('b', 40) };
  }), 1],
  ['a renewal made after the previous signature algorithm was disallowed', chain((c, t) => { t[2].timestamp = '2036-06-01T00:00:00Z'; }), 1],

  // R6 — currency: renewal is due once the newest link's algorithm is disallowed.
  ['an RSA-2048 single-link chain checked as of 2036', [...chain((c, t) => { t.splice(1); }), '--as-of', '2036-06-01'], 1],

  // Cannot answer — never a pass.
  ['the registry is missing', ['--registry', join(dir, 'absent.json')], 2],
  ['the schema is not JSON', ['--schema', write('{ not json')], 2],
  ['fewer chains than the floor', [...fixture(CHAIN), '--min-chains', '5'], 2],
  ['a fixture file with no chains at all', ['--fixtures', write({ target: 'x', tests: [] })], 2],
  ['an --as-of that is not a date', [...fixture(CHAIN), '--as-of', 'soon'], 2],
  ['a flag with no value', ['--registry'], 2],
  ['an unknown argument', ['--nope', 'x'], 2],
];

let failed = 0;
cases.forEach(([name, args, want], i) => {
  const r = run(args);
  const ok = r.status === want;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${i + 1} ${name} — exit ${r.status}, want ${want}`);
  if (!ok) console.log((r.stdout + r.stderr).replace(/^/gm, '       '));
});
rmSync(dir, { recursive: true, force: true });
console.log(`\n${cases.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
