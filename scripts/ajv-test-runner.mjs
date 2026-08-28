#!/usr/bin/env node
/**
 * AJV-based test runner for INHERIT v3 schemas.
 * Third validator to cross-check Sourcemeta and Hyperjump results.
 * Uses AJV 2020-12 with format validation enabled.
 */
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
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

// Phase 1: Load all schemas
const ajv = new Ajv({
  allErrors: true,
  strict: false,          // INHERIT uses custom vocabulary keywords
  validateFormats: true,  // Enforce format validation (uuid, date-time, etc.)
});
addFormats(ajv);

const schemaFiles = walk(join(ROOT, 'v3'));
const schemas = [];
for (const file of schemaFiles) {
  try {
    const schema = JSON.parse(readFileSync(file, 'utf8'));
    if (schema.$id) schemas.push({ file, schema });
  } catch (e) {
    // Skip non-schema JSON files
  }
}

// Sort: common types first, then entities, then root schemas (dependency order)
schemas.sort((a, b) => {
  const aDepth = a.file.split('/').length;
  const bDepth = b.file.split('/').length;
  if (aDepth !== bDepth) return bDepth - aDepth; // deeper files first (common/)
  return a.file.localeCompare(b.file);
});

let loaded = 0;
const loadErrors = [];

for (const { file, schema } of schemas) {
  try {
    ajv.addSchema(schema);
    loaded++;
  } catch (e) {
    loadErrors.push({ file, message: e.message.substring(0, 120) });
  }
}

console.log(`Loaded ${loaded} schemas into AJV`);
if (loadErrors.length > 0) {
  console.log(`Schema load warnings: ${loadErrors.length}`);
  for (const err of loadErrors.slice(0, 5)) {
    console.log(`  ${err.file}: ${err.message}`);
  }
  if (loadErrors.length > 5) {
    console.log(`  ... and ${loadErrors.length - 5} more`);
  }
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
const disagreements = [];

for (const dir of testDirs) {
  const testFile = readdirSync(dir).find(f => f.endsWith('.test.json'));
  if (!testFile) continue;

  const suite = JSON.parse(readFileSync(join(dir, testFile), 'utf8'));
  const targetPath = resolve(dir, suite.target);

  if (!existsSync(targetPath)) {
    console.log(`SKIP  ${basename(dir).padEnd(30)} — target not found: ${suite.target}`);
    errorSuites++;
    continue;
  }

  const targetSchema = JSON.parse(readFileSync(targetPath, 'utf8'));
  const schemaId = targetSchema.$id;

  if (!schemaId) {
    console.log(`SKIP  ${basename(dir).padEnd(30)} — schema has no $id`);
    errorSuites++;
    continue;
  }

  let validate;
  try {
    validate = ajv.getSchema(schemaId);
    if (!validate) {
      // Try adding and compiling directly
      ajv.addSchema(targetSchema);
      validate = ajv.getSchema(schemaId);
    }
    if (!validate) {
      console.log(`ERROR ${basename(dir).padEnd(30)} — could not compile schema`);
      errorSuites++;
      continue;
    }
  } catch (e) {
    console.log(`ERROR ${basename(dir).padEnd(30)} — ${e.message.substring(0, 80)}`);
    errorSuites++;
    continue;
  }

  let sp = 0;
  let sf = 0;

  for (let i = 0; i < suite.tests.length; i++) {
    const test = suite.tests[i];
    if (test.data === undefined) continue;

    let valid;
    try {
      valid = validate(test.data);
    } catch (e) {
      valid = false;
    }

    if (valid === test.valid) {
      totalPassed++;
      sp++;
    } else {
      totalFailed++;
      sf++;
      disagreements.push({
        suite: basename(dir),
        index: i + 1,
        description: test.description,
        expected: test.valid,
        got: valid,
        errors: valid === false && validate.errors
          ? validate.errors.slice(0, 3).map(e => `${e.instancePath || '/'} ${e.message}`)
          : []
      });
    }
  }

  if (sf === 0) {
    passedSuites++;
    console.log(`PASS  ${basename(dir).padEnd(30)} ${sp}/${sp + sf}`);
  } else {
    failedSuites++;
    console.log(`FAIL  ${basename(dir).padEnd(30)} ${sp}/${sp + sf}  (${sf} disagreements)`);
  }
}

// Summary
const totalSuites = passedSuites + failedSuites + errorSuites;
const totalTests = totalPassed + totalFailed;

console.log('');
console.log('═'.repeat(60));
console.log('AJV TEST RESULTS');
console.log('═'.repeat(60));
console.log(`Suites:  ${passedSuites} passed, ${failedSuites} failed, ${errorSuites} errors, ${totalSuites} total`);
console.log(`Tests:   ${totalPassed} passed, ${totalFailed} failed, ${totalTests} total`);
console.log('═'.repeat(60));

if (disagreements.length > 0) {
  console.log(`\nDISAGREEMENTS (${disagreements.length}):\n`);
  for (const d of disagreements) {
    const direction = d.expected
      ? 'AJV says invalid, expected valid'
      : 'AJV says valid, expected invalid';
    console.log(`  ${d.suite}: test ${d.index} "${d.description}"`);
    console.log(`    ${direction}`);
    for (const err of d.errors) {
      console.log(`    → ${err}`);
    }
  }
}

process.exit(totalFailed > 0 || errorSuites > 0 ? 1 : 0);
