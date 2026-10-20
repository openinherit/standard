// SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
// SPDX-License-Identifier: Apache-2.0
//
// The Zod leg of the conformance kit: the generated validators in
// @openinherit/sdk/zod must give every case in packages/conformance/manifest.json
// the kit's verdict -- VALID accepted, every one-rule INVALID refused. The
// JSON Schema and pydantic legs are packages/sdk-python/tests/test_conformance_kit.py.
// There is no divergence register here: a kit case Zod gets wrong is a failure.
//
// Run (after pnpm build:sdk): node --test scripts/test-conformance-kit-zod.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url);
const kit = new URL('packages/conformance/', root);
const read = (url) => JSON.parse(readFileSync(url, 'utf8'));
const { schemasById } = await import(
  pathToFileURL(fileURLToPath(new URL('packages/sdk/dist/zod/index.js', root))).href
);

const manifest = read(new URL('manifest.json', kit));
const schemaIdFor = Object.fromEntries(
  [['estate', 'inherit-v3-bundled.json'], ['catalogue', 'catalogue-v3-bundled.json']]
    .map(([mode, file]) => [mode, read(new URL(`schemas/${file}`, kit)).$id]),
);

test('the manifest has cases of both verdicts', () => {
  assert.ok(manifest.tests.some((t) => t.valid === true));
  assert.ok(manifest.tests.some((t) => t.valid === false));
});

for (const t of manifest.tests) {
  const label = t.valid ? 'accepts' : `refuses (${t.rule.class}: ${t.rule.keyword} at '${t.rule.instancePath}')`;
  test(`zod ${label}: ${t.file}`, () => {
    const schema = schemasById[schemaIdFor[t.schemaMode]];
    assert.ok(schema, `no generated validator for ${schemaIdFor[t.schemaMode]}`);
    const result = schema.safeParse(read(new URL(t.file, kit)));
    const issues = result.success ? '' : JSON.stringify(result.error.issues.slice(0, 3));
    assert.equal(result.success, t.valid, issues);
  });
}
