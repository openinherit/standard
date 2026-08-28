#!/usr/bin/env node
/**
 * Validates all INHERIT fixture files in examples/fixtures/ against the root schema.
 * Uses the jsonschema CLI (same tool as the test runner) with all required --resolve flags.
 *
 * Usage: node scripts/test-fixtures.mjs
 */

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = 'examples/fixtures';
const SCHEMA = 'v3/schema.json';

// Files that should be skipped — known-invalid, non-JSON, or extension-only fixtures
const SKIP_FILES = new Set([
  'broken-references.json',
  'catalogue-only.json',
  'sample-will-text.txt',
]);
const SKIP_PREFIX = 'extension-';

// Resolve flags — must match the test command in package.json
const RESOLVE_ARGS = [
  'v3/extensions/brazil/brazil.json',
  'v3/extensions/hong-kong/hong-kong.json',
  'v3/extensions/switzerland/switzerland.json',
  'v3/extensions/israel/israel.json',
  'v3/dialect.json',
  'v3/vocab/estate/meta.json',
  'v3/asset-collection.json',
  'v3/asset-interest.json',
  'v3/asset.json',
  'v3/asset-categories/financial.json',
  'v3/asset-categories/vehicle.json',
  'v3/asset-categories/digital.json',
  'v3/asset-categories/business.json',
  'v3/asset-categories/general.json',
  'v3/attestation.json',
  'v3/bequest.json',
  'v3/catalogue.json',
  'v3/dealer-interest.json',
  'v3/document.json',
  'v3/event.json',
  'v3/estate.json',
  'v3/executor.json',
  'v3/guardian.json',
  'v3/kinship.json',
  'v3/liability.json',
  'v3/lifetime-transfer.json',
  'v3/nonprobate-transfer.json',
  'v3/organisation.json',
  'v3/person.json',
  'v3/space.json',
  'v3/property.json',
  'v3/proxy-authorisation.json',
  'v3/relationship.json',
  'v3/schema.json',
  'v3/trust.json',
  'v3/valuation.json',
  'v3/insurance-policy.json',
  'v3/notification.json',
  'v3/pet.json',
  'v3/acknowledgement.json',
  'v3/subscription.json',
  'v3/wish.json',
  'v3/conformance-declaration.json',
  'v3/common/address.json',
  'v3/common/completeness.json',
  'v3/common/identifier.json',
  'v3/common/jurisdiction.json',
  'v3/common/media.json',
  'v3/common/money.json',
  'v3/common/tax-position.json',
  'v3/common/temporal-rule.json',
  'v3/common/visibility.json',
  'v3/common/ai-provenance.json',
  'v3/common/field-provenance.json',
  'v3/common/cultural-disposition.json',
  'v3/common/provenance.json',
].flatMap(f => ['--resolve', f]);

const files = readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.json'));
let passed = 0;
let failed = 0;
let skipped = 0;

for (const file of files) {
  if (SKIP_FILES.has(file) || file.startsWith(SKIP_PREFIX)) {
    console.log(`SKIP: ${file}`);
    skipped++;
    continue;
  }

  const fixturePath = join(FIXTURES_DIR, file);
  const args = ['jsonschema', 'validate', SCHEMA, fixturePath, ...RESOLVE_ARGS];

  try {
    execFileSync('npx', args, { stdio: 'pipe' });
    console.log(`PASS: ${file}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${file}`);
    if (err.stderr) {
      console.error(`  ${err.stderr.toString().trim()}`);
    }
    if (err.stdout) {
      console.error(`  ${err.stdout.toString().trim()}`);
    }
    failed++;
  }
}

// Also validate will-companion fixtures in examples/wills/
function findInheritFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findInheritFiles(full));
    } else if (entry.name.includes('-inherit-') && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

for (const fixturePath of findInheritFiles('examples/wills')) {
  const args = ['jsonschema', 'validate', SCHEMA, fixturePath, ...RESOLVE_ARGS];
  try {
    execFileSync('npx', args, { stdio: 'pipe' });
    console.log(`PASS: ${fixturePath}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${fixturePath}`);
    if (err.stderr) console.error(`  ${err.stderr.toString().trim()}`);
    if (err.stdout) console.error(`  ${err.stdout.toString().trim()}`);
    failed++;
  }
}

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed > 0 ? 1 : 0);
