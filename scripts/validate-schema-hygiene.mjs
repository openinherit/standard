#!/usr/bin/env node
/**
 * Schema hygiene validation script.
 * Checks all JSON Schema files in v3/ for common issues.
 * Run as part of CI to prevent regressions.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full).forEach(f => files.push(f));
    else if (entry.name.endsWith('.json') && !entry.name.includes('test')) files.push(full);
  }
  return files;
}

const files = walk(join(ROOT, 'v3'));
let errors = 0;
let warnings = 0;

function error(file, msg) {
  console.log(`  ERROR  ${file}: ${msg}`);
  errors++;
}

function warn(file, msg) {
  console.log(`  WARN   ${file}: ${msg}`);
  warnings++;
}

console.log(`Checking ${files.length} schema files...\n`);

for (const file of files) {
  const rel = file.replace(ROOT + '/', '');
  let schema;
  try {
    schema = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    error(rel, `Invalid JSON: ${e.message}`);
    continue;
  }

  // Check 1: $schema present (skip extension manifests, context files, error-codes)
  const isMetadata = rel.includes('extension.json') || rel.includes('context/') || rel.includes('error-codes.json');
  if (!schema.$schema && !isMetadata) {
    error(rel, 'Missing $schema');
  } else if (schema.$schema && !schema.$schema.includes('json-schema.org') && !schema.$schema.includes('openinherit.org')) {
    warn(rel, `Unexpected $schema: ${schema.$schema}`);
  }

  // Check 2: $id present
  if (!schema.$id) {
    // Extension manifests and vocab files may not have $id
    if (!rel.includes('extension.json') && !rel.includes('vocab/') && !rel.includes('context/') && !rel.includes('error-codes.json')) {
      error(rel, 'Missing $id');
    }
  } else if (!schema.$id.includes('/v3/')) {
    error(rel, `$id does not contain /v3/: ${schema.$id}`);
  }

  // Check 3: No bare "^x-inherit-": true patternProperties
  if (schema.patternProperties) {
    for (const [pattern, value] of Object.entries(schema.patternProperties)) {
      if (pattern.includes('x-inherit-') && value === true) {
        error(rel, `Bare patternProperties true for ${pattern} — must be constrained object`);
      }
      if (pattern.includes('x-inherit-') && typeof value === 'object' && !value.type) {
        error(rel, `patternProperties ${pattern} has no type constraint — must require type: object`);
      }
    }
  }

  // Check 4: No maxItems: 100 (cargo cult constraint)
  const json = JSON.stringify(schema);
  const matches = json.match(/"maxItems"\s*:\s*100/g);
  if (matches && matches.length > 0) {
    warn(rel, `Found ${matches.length} maxItems: 100 — likely cargo cult constraint`);
  }

  // Check 5: $ref paths should not use v2/
  const v2Refs = json.match(/"\$ref"\s*:\s*"[^"]*v2[^"]*"/g);
  if (v2Refs) {
    for (const ref of v2Refs) {
      error(rel, `$ref contains v2/: ${ref}`);
    }
  }
}

console.log('\n' + '═'.repeat(50));
console.log(`Schema hygiene: ${errors} errors, ${warnings} warnings, ${files.length} files checked`);
console.log('═'.repeat(50));

process.exit(errors > 0 ? 1 : 0);
