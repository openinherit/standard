#!/usr/bin/env node
/**
 * Referential integrity test suite.
 * Tests that cross-reference constraints defined in schema.json
 * actually catch broken references in documents.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load the integrity constraints from schema.json
const schema = JSON.parse(readFileSync(resolve(ROOT, 'v3/schema.json'), 'utf8'));
const constraints = schema.properties.referentialIntegrity?.default || [];

console.log(`Loaded ${constraints.length} integrity constraints\n`);

// === Test helpers ===

function resolvePath(doc, pathStr) {
  // Parse path like "bequests[].beneficiaryId" and extract all values
  const segments = pathStr.split('.');
  let current = [doc];

  for (const seg of segments) {
    const match = seg.match(/^(.+)\[\]$/);
    if (match) {
      // Array traversal
      const field = match[1];
      current = current.flatMap(obj => {
        const val = obj?.[field];
        return Array.isArray(val) ? val : [];
      });
    } else {
      // Object field access
      current = current.map(obj => obj?.[seg]).filter(v => v !== undefined && v !== null);
    }
  }

  return current;
}

function checkConstraint(doc, constraint) {
  const fieldValues = resolvePath(doc, constraint.field);
  const targetValues = new Set(resolvePath(doc, constraint.references).map(String));

  const broken = [];
  for (const val of fieldValues) {
    if (val === undefined || val === null) continue;
    if (!targetValues.has(String(val))) {
      broken.push(val);
    }
  }
  return broken;
}

// === Test documents ===

// Valid document — all references resolve
const validDoc = {
  estate: {
    testatorPersonId: 'aaaa0001-0000-4000-a000-000000000001',
    testamentaryScenarios: [
      {
        id: 'scenario-1',
        description: 'Test scenario',
        conditions: [
          { personId: 'aaaa0001-0000-4000-a000-000000000001', event: 'death' },
          { personId: 'aaaa0002-0000-4000-a000-000000000002', event: 'survives' }
        ],
        activeBequests: ['cccc0001-0000-4000-a000-000000000001'],
        activeExecutors: ['dddd0001-0000-4000-a000-000000000001']
      }
    ]
  },
  people: [
    { id: 'aaaa0001-0000-4000-a000-000000000001', givenName: 'James', roles: ['testator'] },
    { id: 'aaaa0002-0000-4000-a000-000000000002', givenName: 'Catherine', roles: ['beneficiary'] },
    { id: 'aaaa0003-0000-4000-a000-000000000003', givenName: 'Oliver', roles: ['beneficiary'] }
  ],
  kinships: [
    { id: 'kk000001-0000-4000-a000-000000000001', fromPersonId: 'aaaa0001-0000-4000-a000-000000000001', toPersonId: 'aaaa0003-0000-4000-a000-000000000003', kinshipType: 'parent_child_biological' }
  ],
  relationships: [
    { id: 'rr000001-0000-4000-a000-000000000001', person1Id: 'aaaa0001-0000-4000-a000-000000000001', person2Id: 'aaaa0002-0000-4000-a000-000000000002', relationshipType: 'married' }
  ],
  assets: [
    { id: 'bb000001-0000-4000-a000-000000000001', name: 'Savings', category: 'financial', spaceId: 'ss000001-0000-4000-a000-000000000001', propertyId: 'pp000001-0000-4000-a000-000000000001', assetCollectionId: 'ac000001-0000-4000-a000-000000000001' }
  ],
  properties: [
    { id: 'pp000001-0000-4000-a000-000000000001', name: 'Family home', propertyType: 'detached' }
  ],
  assetCollections: [
    { id: 'ac000001-0000-4000-a000-000000000001', name: 'Financial accounts' }
  ],
  spaces: [
    { id: 'ss000001-0000-4000-a000-000000000001', name: 'Study' }
  ],
  bequests: [
    { id: 'cccc0001-0000-4000-a000-000000000001', bequestType: 'residuary', beneficiaryId: 'aaaa0002-0000-4000-a000-000000000002', sourceAssetId: 'bb000001-0000-4000-a000-000000000001' }
  ],
  executors: [
    { id: 'dddd0001-0000-4000-a000-000000000001', personId: 'aaaa0002-0000-4000-a000-000000000002', role: 'executor' }
  ],
  guardians: [
    { id: 'gg000001-0000-4000-a000-000000000001', personId: 'aaaa0003-0000-4000-a000-000000000003' }
  ],
  proxyAuthorisations: [
    { id: 'pa000001-0000-4000-a000-000000000001', agentPersonId: 'aaaa0002-0000-4000-a000-000000000002', type: 'lasting_power_of_attorney' }
  ],
  trusts: [
    { id: 'tt000001-0000-4000-a000-000000000001', name: 'Pet trust', trustType: 'discretionary', petId: 'pet00001-0000-4000-a000-000000000001', trustees: [{ role: 'trustee', personId: 'aaaa0002-0000-4000-a000-000000000002' }], beneficiaries: [{ interestType: 'both' }] }
  ],
  pets: [
    {
      id: 'pet00001-0000-4000-a000-000000000001',
      petName: 'Biscuit',
      species: 'cat',
      petCareArrangement: {
        trustId: 'tt000001-0000-4000-a000-000000000001',
        bequestId: 'cccc0001-0000-4000-a000-000000000001',
        nominatedCarerPersonId: 'aaaa0003-0000-4000-a000-000000000003'
      }
    }
  ]
};

// Broken document — specific broken references
const brokenDoc = JSON.parse(JSON.stringify(validDoc));
brokenDoc.bequests[0].beneficiaryId = 'aaaa9999-0000-4000-a000-000000000999'; // person doesn't exist
brokenDoc.executors[0].personId = 'aaaa8888-0000-4000-a000-000000000888'; // person doesn't exist
brokenDoc.kinships[0].toPersonId = 'aaaa7777-0000-4000-a000-000000000777'; // person doesn't exist
brokenDoc.assets[0].spaceId = 'ss009999-0000-4000-a000-000000000999'; // space doesn't exist
brokenDoc.pets[0].petCareArrangement.trustId = 'tt009999-0000-4000-a000-000000000999'; // trust doesn't exist

// === Run tests ===

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

function assertEqual(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log('=== Category 1: Cross-Reference Integrity Tests ===\n');

console.log('Valid document (all refs resolve):');

// Group constraints by field for multi-target testing
const fieldGroups = {};
for (const c of constraints) {
  if (!fieldGroups[c.field]) fieldGroups[c.field] = [];
  fieldGroups[c.field].push(c);
}

for (const [field, group] of Object.entries(fieldGroups)) {
  if (group.length === 1) {
    // Single target — must pass
    test(`${field} → ${group[0].references}`, () => {
      const broken = checkConstraint(validDoc, group[0]);
      if (broken.length > 0) {
        throw new Error(`Found ${broken.length} broken refs: ${broken.join(', ')}`);
      }
    });
  } else {
    // Multi-target — valid if ANY constraint passes
    test(`${field} → [${group.map(c => c.references).join(' | ')}]`, () => {
      const fieldValues = resolvePath(validDoc, field);
      for (const val of fieldValues) {
        if (val === undefined || val === null) continue;
        const anyMatch = group.some(c => {
          const targets = new Set(resolvePath(validDoc, c.references).map(String));
          return targets.has(String(val));
        });
        if (!anyMatch) {
          throw new Error(`Value ${val} not found in any target array`);
        }
      }
    });
  }
}

console.log('\nBroken document (specific broken refs):');

test('bequests[].beneficiaryId — broken ref detected', () => {
  const c = constraints.find(c => c.field === 'bequests[].beneficiaryId');
  const broken = checkConstraint(brokenDoc, c);
  if (broken.length === 0) throw new Error('Should have found broken ref');
  if (broken[0] !== 'aaaa9999-0000-4000-a000-000000000999') throw new Error('Wrong broken ID');
});

test('executors[].personId — broken ref detected', () => {
  const c = constraints.find(c => c.field === 'executors[].personId');
  const broken = checkConstraint(brokenDoc, c);
  if (broken.length === 0) throw new Error('Should have found broken ref');
});

test('kinships[].toPersonId — broken ref detected', () => {
  const c = constraints.find(c => c.field === 'kinships[].toPersonId');
  const broken = checkConstraint(brokenDoc, c);
  if (broken.length === 0) throw new Error('Should have found broken ref');
});

test('assets[].spaceId — broken ref detected', () => {
  const c = constraints.find(c => c.field === 'assets[].spaceId');
  const broken = checkConstraint(brokenDoc, c);
  if (broken.length === 0) throw new Error('Should have found broken ref');
});

test('pets[].petCareArrangement.trustId — broken ref detected', () => {
  const c = constraints.find(c => c.field === 'pets[].petCareArrangement.trustId');
  const broken = checkConstraint(brokenDoc, c);
  if (broken.length === 0) throw new Error('Should have found broken ref');
});

// Multi-target test: sourceAssetId can reference assets[] OR properties[]
test('bequests[].sourceAssetId — valid when referencing assets[].id', () => {
  const constraints_for_field = constraints.filter(c => c.field === 'bequests[].sourceAssetId');
  const allBroken = constraints_for_field.map(c => checkConstraint(validDoc, c));
  // Valid if ANY constraint has no broken refs
  const anyValid = allBroken.some(broken => broken.length === 0);
  if (!anyValid) throw new Error('Should be valid — sourceAssetId references a valid asset');
});

test('bequests[].sourceAssetId — valid when referencing properties[].id', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.bequests[0].sourceAssetId = 'pp000001-0000-4000-a000-000000000001'; // property ID
  const constraints_for_field = constraints.filter(c => c.field === 'bequests[].sourceAssetId');
  const allBroken = constraints_for_field.map(c => checkConstraint(doc, c));
  const anyValid = allBroken.some(broken => broken.length === 0);
  if (!anyValid) throw new Error('Should be valid — sourceAssetId references a valid property');
});

test('bequests[].sourceAssetId — broken when referencing neither', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.bequests[0].sourceAssetId = 'xx000001-0000-4000-a000-000000000999'; // doesn't exist anywhere
  const constraints_for_field = constraints.filter(c => c.field === 'bequests[].sourceAssetId');
  const allBroken = constraints_for_field.map(c => checkConstraint(doc, c));
  const anyValid = allBroken.some(broken => broken.length === 0);
  if (anyValid) throw new Error('Should be broken — sourceAssetId references nothing');
});

// Empty arrays — should pass (nothing to check)
test('empty document — all constraints pass (no refs to check)', () => {
  const emptyDoc = { estate: {}, people: [] };
  for (const c of constraints) {
    const broken = checkConstraint(emptyDoc, c);
    if (broken.length > 0) {
      throw new Error(`Constraint ${c.field} failed on empty doc: ${broken.join(', ')}`);
    }
  }
});

// Scenario cross-references
test('testamentaryScenarios[].conditions[].personId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.estate.testamentaryScenarios[0].conditions[0].personId = 'aaaa9999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'estate.testamentaryScenarios[].conditions[].personId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken scenario condition personId');
});

test('testamentaryScenarios[].activeBequests[] — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.estate.testamentaryScenarios[0].activeBequests = ['cccc9999-0000-4000-a000-000000000999'];
  const c = constraints.find(c => c.field === 'estate.testamentaryScenarios[].activeBequests[]');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken activeBequest ref');
});

test('estate.testatorPersonId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.estate.testatorPersonId = 'aaaa9999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'estate.testatorPersonId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken testatorPersonId ref');
});

test('guardians[].personId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.guardians[0].personId = 'aaaa9999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'guardians[].personId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken guardian personId ref');
});

test('kinships[].fromPersonId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.kinships[0].fromPersonId = 'aaaa9999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'kinships[].fromPersonId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken kinship fromPersonId ref');
});

test('relationships[].person1Id — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.relationships[0].person1Id = 'aaaa9999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'relationships[].person1Id');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken relationship person1Id ref');
});

test('relationships[].person2Id — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.relationships[0].person2Id = 'aaaa9999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'relationships[].person2Id');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken relationship person2Id ref');
});

test('assets[].propertyId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.assets[0].propertyId = 'pp009999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'assets[].propertyId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken asset propertyId ref');
});

test('assets[].assetCollectionId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.assets[0].assetCollectionId = 'ac009999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'assets[].assetCollectionId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken asset assetCollectionId ref');
});

test('proxyAuthorisations[].agentPersonId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.proxyAuthorisations[0].agentPersonId = 'aaaa9999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'proxyAuthorisations[].agentPersonId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken proxyAuth agentPersonId ref');
});

test('testamentaryScenarios[].activeExecutors[] — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.estate.testamentaryScenarios[0].activeExecutors = ['dddd9999-0000-4000-a000-000000000999'];
  const c = constraints.find(c => c.field === 'estate.testamentaryScenarios[].activeExecutors[]');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken activeExecutor ref');
});

test('pets[].petCareArrangement.bequestId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.pets[0].petCareArrangement.bequestId = 'cccc9999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'pets[].petCareArrangement.bequestId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken petCare bequestId ref');
});

test('pets[].petCareArrangement.nominatedCarerPersonId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.pets[0].petCareArrangement.nominatedCarerPersonId = 'aaaa9999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'pets[].petCareArrangement.nominatedCarerPersonId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken petCare nominatedCarerPersonId ref');
});

test('trusts[].petId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.trusts[0].petId = 'pet09999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'trusts[].petId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken trust petId ref');
});

console.log('\n' + '═'.repeat(50));
console.log(`Cross-reference tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('═'.repeat(50));

process.exit(failed > 0 ? 1 : 0);
