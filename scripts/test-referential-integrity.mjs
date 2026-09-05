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

/**
 * kind 'acyclic' — following the reference repeatedly must terminate.
 * Reports INHERIT_CONTAINMENT_CYCLE for a loop and INHERIT_DEPTH_EXCEEDED for a
 * chain longer than maxDepth. A dangling reference is NOT reported here: the
 * existence constraint on the same field owns that, and double-reporting one
 * defect under two codes tells a consumer nothing extra.
 *
 * O(n·depth) with a fresh seen-set per node. That is fine for conformance
 * documents and is not a production validator.
 */
function checkAcyclic(doc, constraint) {
  const [arrayPath, refField] = constraint.field.split('[].');
  const nodes = resolvePath(doc, `${arrayPath}[]`);
  const byId = new Map(nodes.map(n => [String(n.id), n]));
  const maxDepth = constraint.maxDepth ?? 16;
  const failures = [];

  for (const start of nodes) {
    const seen = new Set();
    let current = start;
    let depth = 0;
    while (current?.[refField] !== undefined && current?.[refField] !== null) {
      const nextId = String(current[refField]);
      // nextId === start.id catches the self-cycle, which a plain seen-set misses
      // on the first hop.
      if (seen.has(nextId) || nextId === String(start.id)) {
        failures.push({ id: start.id, code: 'INHERIT_CONTAINMENT_CYCLE' });
        break;
      }
      if (++depth > maxDepth) {
        failures.push({ id: start.id, code: 'INHERIT_DEPTH_EXCEEDED' });
        break;
      }
      seen.add(nextId);
      current = byId.get(nextId);
      if (current === undefined) break; // dangling — the existence constraint owns this
    }
  }
  return failures;
}

/**
 * Dispatch on constraint kind. An unrecognised kind is a hard error: a silently
 * skipped constraint is a gate that reports green.
 */
function checkAny(doc, constraint) {
  const kind = constraint.kind ?? 'existence';
  if (kind === 'existence') return checkConstraint(doc, constraint);
  if (kind === 'acyclic') return checkAcyclic(doc, constraint);
  throw new Error(`INHERIT_CONSTRAINT_UNKNOWN: ${kind} on ${constraint.field}`);
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

// Group constraints by field AND kind for multi-target testing. Grouping by field
// alone would let an existence constraint satisfy an acyclic one on the same field.
const fieldGroups = {};
for (const c of constraints) {
  const key = `${c.field}|${c.kind ?? 'existence'}`;
  if (!fieldGroups[key]) fieldGroups[key] = [];
  fieldGroups[key].push(c);
}

for (const [key, group] of Object.entries(fieldGroups)) {
  const field = group[0].field;
  const kind = group[0].kind ?? 'existence';
  if (group.length === 1) {
    // Single target — must pass
    test(`${field} → ${group[0].references}${kind === 'existence' ? '' : ` (${kind})`}`, () => {
      const broken = checkAny(validDoc, group[0]);
      if (broken.length > 0) {
        throw new Error(`Found ${broken.length} broken refs: ${JSON.stringify(broken)}`);
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

// === Containment (ICP-0057) — every containment link must resolve ===

test('assets[].containedInAssetId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.assets[0].containedInAssetId = 'bb009999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'assets[].containedInAssetId' && (c.kind ?? 'existence') === 'existence');
  if (!c) throw new Error('No existence constraint declared for assets[].containedInAssetId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken containedInAssetId ref');
});

test('spaces[].containedInSpaceId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.spaces[0].containedInSpaceId = 'ss009999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'spaces[].containedInSpaceId' && (c.kind ?? 'existence') === 'existence');
  if (!c) throw new Error('No existence constraint declared for spaces[].containedInSpaceId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken containedInSpaceId ref');
});

test('spaces[].propertyId — broken ref detected', () => {
  const doc = JSON.parse(JSON.stringify(validDoc));
  doc.spaces[0].propertyId = 'pp009999-0000-4000-a000-000000000999';
  const c = constraints.find(c => c.field === 'spaces[].propertyId' && (c.kind ?? 'existence') === 'existence');
  if (!c) throw new Error('No existence constraint declared for spaces[].propertyId');
  const broken = checkConstraint(doc, c);
  if (broken.length === 0) throw new Error('Should have found broken space propertyId ref');
});

// === Containment (ICP-0057) — the chain must terminate and must not loop ===

const SP_A = 'ss00000a-0000-4000-a000-00000000000a';
const SP_B = 'ss00000b-0000-4000-a000-00000000000b';
const SP_C = 'ss00000c-0000-4000-a000-00000000000c';
const AS_A = 'bb00000a-0000-4000-a000-00000000000a';
const AS_B = 'bb00000b-0000-4000-a000-00000000000b';

function acyclicConstraint(field) {
  const c = constraints.find(c => c.field === field && c.kind === 'acyclic');
  if (!c) throw new Error(`No acyclic constraint declared for ${field}`);
  return c;
}

function expectCycle(description, field, doc) {
  test(description, () => {
    const failures = checkAcyclic(doc, acyclicConstraint(field));
    if (failures.length === 0) throw new Error('Should have detected a containment cycle');
    if (!failures.every(f => f.code === 'INHERIT_CONTAINMENT_CYCLE')) {
      throw new Error(`Wrong code: ${JSON.stringify(failures)}`);
    }
  });
}

function expectAcyclicOk(description, field, doc) {
  test(description, () => {
    const failures = checkAcyclic(doc, acyclicConstraint(field));
    if (failures.length > 0) {
      throw new Error(`A legal chain was rejected: ${JSON.stringify(failures)}`);
    }
  });
}

expectCycle('self-cycle on the asset axis', 'assets[].containedInAssetId',
  { assets: [{ id: AS_A, containedInAssetId: AS_A }] });

expectCycle('2-cycle on the asset axis', 'assets[].containedInAssetId',
  { assets: [{ id: AS_A, containedInAssetId: AS_B }, { id: AS_B, containedInAssetId: AS_A }] });

expectCycle('3-cycle on the space axis', 'spaces[].containedInSpaceId',
  { spaces: [{ id: SP_A, containedInSpaceId: SP_B }, { id: SP_B, containedInSpaceId: SP_C }, { id: SP_C, containedInSpaceId: SP_A }] });

// The false-positive guard. A detector that rejects every chain passes all three
// cycle tests above, so without this case the gate could forbid the feature it exists
// to enable.
expectAcyclicOk('a legal 3-deep chain is allowed', 'spaces[].containedInSpaceId',
  { spaces: [{ id: SP_A, containedInSpaceId: SP_B }, { id: SP_B, containedInSpaceId: SP_C }, { id: SP_C }] });

expectAcyclicOk('a dangling reference is left to the existence constraint, not double-reported',
  'spaces[].containedInSpaceId',
  { spaces: [{ id: SP_A, containedInSpaceId: 'ss009999-0000-4000-a000-000000000999' }] });

test('a chain longer than maxDepth is rejected as too deep', () => {
  const c = acyclicConstraint('spaces[].containedInSpaceId');
  const depth = (c.maxDepth ?? 16) + 4;
  const spaces = [];
  for (let i = 0; i < depth; i++) {
    const id = `ss0000${String(i).padStart(2, '0')}-0000-4000-a000-000000000000`;
    const next = i + 1 < depth ? `ss0000${String(i + 1).padStart(2, '0')}-0000-4000-a000-000000000000` : undefined;
    spaces.push(next ? { id, containedInSpaceId: next } : { id });
  }
  const failures = checkAcyclic({ spaces }, c);
  if (!failures.some(f => f.code === 'INHERIT_DEPTH_EXCEEDED')) {
    throw new Error(`Expected INHERIT_DEPTH_EXCEEDED, got ${JSON.stringify(failures)}`);
  }
});

test('an unrecognised constraint kind is a hard error, never a silent skip', () => {
  let threw = false;
  try {
    checkAny({ spaces: [] }, { field: 'spaces[].containedInSpaceId', references: 'spaces[].id', kind: 'invented' });
  } catch (e) {
    threw = /INHERIT_CONSTRAINT_UNKNOWN/.test(e.message);
  }
  if (!threw) throw new Error('An unknown kind was skipped — a skipped constraint is a gate reporting green');
});

test('the acyclic row is not satisfiable by its existence sibling (grouping is by field AND kind)', () => {
  for (const field of ['spaces[].containedInSpaceId', 'assets[].containedInAssetId']) {
    const kinds = constraints.filter(c => c.field === field).map(c => c.kind ?? 'existence').sort();
    assertEqual(kinds, ['acyclic', 'existence'], `kinds declared on ${field}`);
  }
  // Two rows may legitimately share a (field, kind) key — that is multi-target
  // semantics, e.g. bequests[].sourceAssetId -> assets[].id | properties[].id. What
  // must never repeat is the full triple, and an acyclic row must never land in the
  // same group as an existence row on the same field.
  const triples = constraints.map(c => `${c.field}|${c.kind ?? 'existence'}|${c.references}`);
  if (new Set(triples).size !== triples.length) {
    throw new Error('duplicate (field, kind, references) triple in the constraint set');
  }
  const groupKey = c => `${c.field}|${c.kind ?? 'existence'}`;
  for (const field of ['spaces[].containedInSpaceId', 'assets[].containedInAssetId']) {
    const rows = constraints.filter(c => c.field === field);
    if (new Set(rows.map(groupKey)).size !== 2) {
      throw new Error(`${field}: existence and acyclic rows collapsed into one group`);
    }
  }
});

console.log('\n' + '═'.repeat(50));
console.log(`Cross-reference tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('═'.repeat(50));

process.exit(failed > 0 ? 1 : 0);
