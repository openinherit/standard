// The root's conformance profile, as the published Zod validator enforces it.
// Run (after pnpm build:sdk): node --test scripts/test-runtime-validator-profile.mjs
//
// v3/schema.json requires schemaVersion, estate and people only in the else
// branch of an if on conformanceProfile (proposal 0003). The Zod generator
// drops if/then/else, so without the conditional layer
// (scripts/lib/write-conditional-layer.py) a root with no estate is accepted.
// The pydantic twin is packages/sdk-python/tests/test_conditional_layer.py.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url);
const { zSchema, zCatalogue, schemasById } = await import(
  pathToFileURL(fileURLToPath(new URL('packages/sdk/dist/zod/index.js', root))).href
);
const corpus = JSON.parse(readFileSync(new URL('tests/v3/schema/schema.test.json', root), 'utf8')).tests;
const fixture = (d) => structuredClone(corpus.find((t) => t.description === d).data);

const MINIMAL = 'valid — truly minimal document (no optional entity arrays)';
const CATALOGUE = 'valid — catalogue profile: a catalogue-only document conforms to the root by declaring conformanceProfile, no estate envelope';
const ROOT_ID = 'https://openinherit.org/v3/schema.json';

for (const [name, schema] of [['zSchema', zSchema], ['schemasById[schema.json]', schemasById[ROOT_ID]]]) {
  test(`${name}: a minimal estate document is accepted`, () => {
    assert.equal(schema.safeParse(fixture(MINIMAL)).success, true);
  });

  for (const member of ['estate', 'people', 'schemaVersion']) {
    test(`${name}: default profile, no ${member} → refused`, () => {
      const doc = fixture(MINIMAL);
      delete doc[member];
      assert.equal(schema.safeParse(doc).success, false);
    });
  }

  test(`${name}: explicit estate profile, no estate → refused`, () => {
    const doc = { ...fixture(MINIMAL), conformanceProfile: 'estate' };
    delete doc.estate;
    assert.equal(schema.safeParse(doc).success, false);
  });

  test(`${name}: a valid catalogue-profile document is accepted`, () => {
    const r = schema.safeParse(fixture(CATALOGUE));
    assert.equal(r.success, true, JSON.stringify(r.error?.issues?.slice(0, 3)));
  });

  test(`${name}: catalogue profile carrying people → refused`, () => {
    assert.equal(schema.safeParse({ ...fixture(CATALOGUE), people: [] }).success, false);
  });

  test(`${name}: catalogue profile with no assets → refused`, () => {
    const doc = fixture(CATALOGUE);
    delete doc.assets;
    assert.equal(schema.safeParse(doc).success, false);
  });
}

test('zCatalogue: a certificate claiming the estate profile → refused', () => {
  const doc = fixture(CATALOGUE);
  doc.conformance = { level: 'level_1', validatedAt: '2026-10-05T00:00:00Z', validatedBy: 't', schemaVersion: '6.6.0', profile: 'estate' };
  assert.equal(zCatalogue.safeParse(doc).success, false);
  doc.conformance.profile = 'catalogue';
  assert.equal(zCatalogue.safeParse(doc).success, true);
});
