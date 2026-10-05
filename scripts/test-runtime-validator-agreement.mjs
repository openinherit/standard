// The Zod leg of tests/runtime-validators/agreement.test.json: the published
// zSchema (and the $id map) must give every document the declared verdict,
// the same one JSON Schema and pydantic give it
// (packages/sdk-python/tests/test_runtime_agreement.py).
// Run (after pnpm build:sdk): node --test scripts/test-runtime-validator-agreement.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url);
const { zSchema, schemasById } = await import(
  pathToFileURL(fileURLToPath(new URL('packages/sdk/dist/zod/index.js', root))).href
);
const fixtures = JSON.parse(readFileSync(new URL('tests/runtime-validators/agreement.test.json', root), 'utf8'));
const parse = (c) => JSON.parse(c.raw ?? JSON.stringify(c.data));

for (const c of fixtures.tests) {
  test(`zSchema: ${c.description}`, () => {
    assert.equal(zSchema.safeParse(parse(c)).success, c.valid);
  });
  test(`schemasById: ${c.description}`, () => {
    assert.equal(schemasById[fixtures.target].safeParse(parse(c)).success, c.valid);
  });
}

// The layer is not gated on the generated schema succeeding first: a document
// that fails both reports both.
test('a document failing the generated schema still gets the layer\'s verdict', () => {
  const doc = parse(fixtures.tests.find((t) => t.description === 'valid — minimal estate document'));
  delete doc.estate;
  doc.schemaVersion = 'not-a-version';
  const r = zSchema.safeParse(doc);
  assert.equal(r.success, false);
  const messages = r.error.issues.map((i) => i.message);
  assert.ok(messages.includes('required: estate'), JSON.stringify(messages));
});
