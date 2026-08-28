#!/usr/bin/env node
/**
 * Hyperjump-based test runner for INHERIT schemas.
 * Second validator to cross-check AJV results.
 * Hyperjump is spec-compliance-focused vs AJV's performance focus.
 */
import { registerSchema, validate } from '@hyperjump/json-schema/draft-2020-12';
import { BASIC } from '@hyperjump/json-schema/experimental';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Collect all schema files
function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full).forEach(f => files.push(f));
    else if (entry.name.endsWith('.json') && !entry.name.endsWith('.test.json')) files.push(full);
  }
  return files;
}

// Phase 1: Register all schemas
const schemaFiles = walk(join(ROOT, 'v3'));
let registered = 0;

// Sort: common types first, then entities, then extensions, then root schemas
// This ensures dependencies are registered before schemas that reference them
const schemasToLoad = [];
for (const file of schemaFiles) {
  try {
    const schema = JSON.parse(readFileSync(file, 'utf8'));
    if (schema.$id) schemasToLoad.push({ file, schema });
  } catch (e) {}
}

schemasToLoad.sort((a, b) => {
  const aIsCommon = a.file.includes('common/') ? 0 : 1;
  const bIsCommon = b.file.includes('common/') ? 0 : 1;
  if (aIsCommon !== bIsCommon) return aIsCommon - bIsCommon;
  const aIsRoot = a.file.match(/^[^/]+\/[^/]+\.json$/) ? 1 : 0;
  const bIsRoot = b.file.match(/^[^/]+\/[^/]+\.json$/) ? 1 : 0;
  if (aIsRoot !== bIsRoot) return aIsRoot - bIsRoot;
  return a.file.localeCompare(b.file);
});

for (const { schema } of schemasToLoad) {
  try {
    registerSchema(schema);
    registered++;
  } catch (e) {
    console.log(`REG FAIL: ${schema.$id || file} — ${e.message.substring(0, 100)}`);
  }
}

console.log(`Registered ${registered} schemas with Hyperjump`);

// Verify critical schemas are registered
const criticalSchemas = [
  'https://openinherit.org/v3/attestation.json',
  'https://openinherit.org/v3/estate.json',
  'https://openinherit.org/v3/schema.json'
];
for (const uri of criticalSchemas) {
  const has = await import('@hyperjump/json-schema/draft-2020-12').then(m => m.hasSchema(uri));
  if (!has) console.log(`WARNING: ${uri} not registered`);
}
console.log('');

// Phase 2: Run test suites
const testRoot = join(ROOT, 'tests', 'v3');
const testDirs = readdirSync(testRoot, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => join(testRoot, d.name))
  .sort();

let totalPassed = 0;
let totalFailed = 0;
let passedSuites = 0;
let failedSuites = 0;
let errorSuites = 0;
const failures = [];

for (const dir of testDirs) {
  const testFile = readdirSync(dir).find(f => f.endsWith('.test.json'));
  if (!testFile) continue;

  const suite = JSON.parse(readFileSync(join(dir, testFile), 'utf8'));
  const targetPath = resolve(dir, suite.target);

  if (!existsSync(targetPath)) {
    console.log(`SKIP  ${basename(dir)} — target not found`);
    continue;
  }

  const targetSchema = JSON.parse(readFileSync(targetPath, 'utf8'));
  const schemaId = targetSchema.$id;

  if (!schemaId) {
    console.log(`SKIP  ${basename(dir)} — no $id`);
    continue;
  }

  let sp = 0;
  let sf = 0;
  let hasError = false;

  for (const test of suite.tests) {
    if (test.data === undefined) continue;

    try {
      const output = await validate(schemaId, test.data, BASIC);
      const valid = output.valid;

      if (valid === test.valid) {
        totalPassed++;
        sp++;
      } else {
        totalFailed++;
        sf++;
        failures.push({
          suite: basename(dir),
          test: test.description,
          expected: test.valid,
          got: valid
        });
      }
    } catch (e) {
      // If Hyperjump throws, treat as compile/resolution error
      if (!hasError) {
        console.log(`ERROR ${basename(dir).padEnd(25)} — ${e.message.substring(0, 80)}`);
        hasError = true;
        errorSuites++;
      }
      break;
    }
  }

  if (hasError) continue;

  if (sf === 0) {
    passedSuites++;
    console.log(`PASS  ${basename(dir).padEnd(25)} ${sp}/${sp + sf}`);
  } else {
    failedSuites++;
    console.log(`FAIL  ${basename(dir).padEnd(25)} ${sp}/${sp + sf}  (${sf} failures)`);
  }
}

// Summary
console.log('');
console.log('═'.repeat(60));
console.log('HYPERJUMP TEST RESULTS');
console.log('═'.repeat(60));
console.log(`Suites:  ${passedSuites} passed, ${failedSuites} failed, ${errorSuites} errors, ${passedSuites + failedSuites + errorSuites} total`);
console.log(`Tests:   ${totalPassed} passed, ${totalFailed} failed, ${totalPassed + totalFailed} total`);
console.log('═'.repeat(60));

if (failures.length > 0) {
  console.log(`\nFAILURES (${failures.length}):\n`);
  for (const f of failures.slice(0, 20)) {
    console.log(`  ${f.suite}: ${f.test}`);
    console.log(`    expected valid=${f.expected}, got valid=${f.got}`);
  }
  if (failures.length > 20) {
    console.log(`  ... and ${failures.length - 20} more`);
  }
}

process.exit(totalFailed > 0 || errorSuites > 0 ? 1 : 0);
