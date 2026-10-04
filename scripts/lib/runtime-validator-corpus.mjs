// Shared by scripts/test-runtime-validators.mjs and its tests. The Python
// runner (packages/sdk-python/tests/test_corpus.py) implements the same case
// keying; keep the two in step — a key that differs between them would make
// one register entry mean two different cases.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.test.json')) out.push(p);
  }
  return out;
}

const posix = (p) => p.split(sep).join('/');

// A case is keyed "<test file>::<description>", with " [#n]" appended to the
// nth repeat of a description inside one file. Index-free on purpose: adding
// a case must not renumber every register entry after it.
export function loadCorpus(root) {
  return walk(join(root, 'tests/v3')).map((file) => {
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    const targetAbs = resolve(dirname(file), doc.target);
    const target = posix(relative(root, targetAbs));
    const id = JSON.parse(readFileSync(targetAbs, 'utf8')).$id;
    const rel = posix(relative(root, file));
    const seen = new Map();
    const cases = doc.tests.map((t) => {
      const n = (seen.get(t.description) ?? 0) + 1;
      seen.set(t.description, n);
      const key = `${rel}::${t.description}${n > 1 ? ` [#${n}]` : ''}`;
      return { key, valid: t.valid, data: t.data };
    });
    return { file: rel, target, id, cases };
  });
}

export function loadRegister(path) {
  const reg = JSON.parse(readFileSync(path, 'utf8'));
  for (const v of ['zod', 'pydantic']) {
    for (const e of reg[v]?.false_reject ?? []) {
      if (!e.reason || !e.reason.trim()) {
        throw new Error(`${v}.false_reject entry has no reason: ${e.case}`);
      }
    }
  }
  return reg;
}

// Exact-match ratchet: observed must equal registered, in both directions.
export function compare(name, observed, registered) {
  const lines = [];
  for (const kind of ['false_reject', 'false_accept']) {
    const want = new Set((registered?.[kind] ?? []).map((e) => e.case));
    const got = new Set(observed[kind]);
    for (const k of got) if (!want.has(k)) lines.push(`REGRESSION ${name}.${kind}: ${k}`);
    for (const k of want) if (!got.has(k)) lines.push(`RATCHET ${name}.${kind}: no longer reproduces — remove it from the register: ${k}`);
  }
  return { ok: lines.length === 0, lines };
}
