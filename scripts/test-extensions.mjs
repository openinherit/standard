#!/usr/bin/env node
/**
 * Extension schema validation tests.
 * Tests that extension data blocks validate against their extension schemas,
 * and that documents with extension data pass root schema validation.
 */
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load all schemas
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full).forEach(f => files.push(f));
    else if (entry.name.endsWith('.json') && !entry.name.includes('test')) files.push(full);
  }
  return files;
}

const schemas = [];
for (const file of walk(join(ROOT, 'v3'))) {
  try {
    const schema = JSON.parse(readFileSync(file, 'utf8'));
    if (schema.$id) {
      schemas.push({ file, schema });
    }
  } catch (e) {}
}

schemas.sort((a, b) => b.file.split('/').length - a.file.split('/').length);
for (const { schema } of schemas) {
  try { ajv.addSchema(schema); } catch (e) {}
}

console.log(`Loaded ${schemas.length} schemas\n`);

// Test helpers
let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${description}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${description}`);
    console.log(`        ${e.message}`);
  }
}

// Load extension manifests
const extensionDir = join(ROOT, 'v3/extensions');
const extensions = readdirSync(extensionDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => {
    const manifestPath = join(extensionDir, d.name, 'extension.json');
    const schemaFile = readdirSync(join(extensionDir, d.name)).find(f => f !== 'extension.json' && f.endsWith('.json'));
    return {
      name: d.name,
      manifest: existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null,
      schemaPath: schemaFile ? join(extensionDir, d.name, schemaFile) : null
    };
  })
  .filter(e => e.manifest);

console.log(`Found ${extensions.length} extensions\n`);

// === Category 2: Extension Schema Tests ===

console.log('=== Category 2: Extension Schema Validation Tests ===\n');

console.log('Extension manifest validation:');
for (const ext of extensions) {
  test(`${ext.name} — manifest has required fields`, () => {
    const m = ext.manifest;
    if (!m.applicableJurisdictions) throw new Error('Missing applicableJurisdictions');
    if (!Array.isArray(m.applicableJurisdictions)) throw new Error('applicableJurisdictions must be array');
    if (m.applicableJurisdictions.length === 0) throw new Error('applicableJurisdictions must not be empty');
  });

  if (ext.manifest.conformanceRules) {
    test(`${ext.name} — conformanceRules have required fields (id, code, check, path, severity)`, () => {
      for (const rule of ext.manifest.conformanceRules) {
        if (!rule.id) throw new Error(`Rule missing id`);
        if (!rule.code) throw new Error(`Rule ${rule.id} missing code`);
        if (!rule.check) throw new Error(`Rule ${rule.id} missing check`);
        if (!rule.path) throw new Error(`Rule ${rule.id} missing path`);
        if (!rule.severity) throw new Error(`Rule ${rule.id} missing severity`);
      }
    });
  }
}

console.log('\nExtension schema structure:');
for (const ext of extensions) {
  if (!ext.schemaPath) continue;

  test(`${ext.name} — extension schema has $id and $schema`, () => {
    const schema = JSON.parse(readFileSync(ext.schemaPath, 'utf8'));
    if (!schema.$id) throw new Error('Missing $id');
    if (!schema.$schema) throw new Error('Missing $schema');
    if (!schema.$id.includes('/v3/')) throw new Error('$id does not contain /v3/');
  });

  test(`${ext.name} — extension schema compiles in AJV`, () => {
    const schema = JSON.parse(readFileSync(ext.schemaPath, 'utf8'));
    const validate = ajv.getSchema(schema.$id);
    if (!validate) throw new Error('Schema did not compile');
  });
}

// Test valid extension data blocks
console.log('\nExtension data validation:');

// UK England & Wales
test('uk-england-wales — valid extension data block', () => {
  const data = {
    nilRateBand: {
      value: { amount: 32500000, currency: 'GBP' },
      effectiveFrom: '2024-04-06',
      status: 'enacted'
    }
  };
  const validate = ajv.getSchema('https://openinherit.org/v3/extensions/uk-england-wales/uk-england-wales.json');
  if (!validate) throw new Error('Schema not found');
  const valid = validate(data);
  if (!valid) throw new Error('Should be valid: ' + JSON.stringify(validate.errors?.[0]));
});

// Islamic succession
test('islamic-succession — valid extension data block', () => {
  const data = {
    school: 'hanafi',
    faraidApplies: true
  };
  const validate = ajv.getSchema('https://openinherit.org/v3/extensions/islamic-succession/islamic-succession.json');
  if (!validate) throw new Error('Schema not found');
  const valid = validate(data);
  if (!valid) throw new Error('Should be valid: ' + JSON.stringify(validate.errors?.[0]));
});

// Hindu succession
test('hindu-succession — valid extension data block', () => {
  const data = {
    applicableLaw: 'hindu_succession_act_1956'
  };
  const validate = ajv.getSchema('https://openinherit.org/v3/extensions/hindu-succession/hindu-succession.json');
  if (!validate) throw new Error('Schema not found');
  const valid = validate(data);
  if (!valid) throw new Error('Should be valid: ' + JSON.stringify(validate.errors?.[0]));
});

// Test invalid extension data
test('uk-england-wales — invalid: nilRateBand with wrong currency type', () => {
  const data = {
    nilRateBand: { amount: 32500000, currency: 123 } // currency must be string
  };
  const validate = ajv.getSchema('https://openinherit.org/v3/extensions/uk-england-wales/uk-england-wales.json');
  if (!validate) throw new Error('Schema not found');
  const valid = validate(data);
  if (valid) throw new Error('Should be invalid — currency is wrong type');
});

console.log('\n' + '═'.repeat(50));
console.log(`Extension tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('═'.repeat(50));

process.exit(failed > 0 ? 1 : 0);
