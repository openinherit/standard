#!/usr/bin/env node
/**
 * Conformance Level 2 and Level 3 test suite.
 *
 * Level 2 — Referentially Intact: all cross-references resolve, conformance
 *   declaration present with level_2.
 * Level 3 — Jurisdiction Complete: all Level 2 constraints pass AND each active
 *   extension's required data is present on the relevant entities.
 *
 * Tests four extensions for Level 3:
 *   - UK England & Wales
 *   - Islamic Succession
 *   - Singapore–Malaysia
 *   - India
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load integrity constraints from schema.json
const schema = JSON.parse(readFileSync(resolve(ROOT, 'v3/schema.json'), 'utf8'));
const constraints = schema.properties.referentialIntegrity?.default || [];

// === Helpers (same as test-referential-integrity.mjs) ===

function resolvePath(doc, pathStr) {
  const segments = pathStr.split('.');
  let current = [doc];

  for (const seg of segments) {
    const match = seg.match(/^(.+)\[\]$/);
    if (match) {
      const field = match[1];
      current = current.flatMap(obj => {
        const val = obj?.[field];
        return Array.isArray(val) ? val : [];
      });
    } else {
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
 * Run all 21 integrity constraints against a document.
 * Returns an array of { constraint, broken } for any failures.
 */
function checkAllConstraints(doc) {
  // Group constraints by field for multi-target semantics
  const fieldGroups = {};
  for (const c of constraints) {
    if (!fieldGroups[c.field]) fieldGroups[c.field] = [];
    fieldGroups[c.field].push(c);
  }

  const failures = [];
  for (const [field, group] of Object.entries(fieldGroups)) {
    if (group.length === 1) {
      const broken = checkConstraint(doc, group[0]);
      if (broken.length > 0) {
        failures.push({ field, broken, constraint: group[0] });
      }
    } else {
      // Multi-target: valid if ANY constraint in the group passes for each value
      const fieldValues = resolvePath(doc, field);
      for (const val of fieldValues) {
        if (val === undefined || val === null) continue;
        const anyMatch = group.some(c => {
          const targets = new Set(resolvePath(doc, c.references).map(String));
          return targets.has(String(val));
        });
        if (!anyMatch) {
          failures.push({ field, broken: [val], constraint: group[0] });
        }
      }
    }
  }

  return failures;
}

/**
 * Check that a document has a valid conformance declaration at the given level.
 */
function checkConformanceDeclaration(doc, expectedLevel) {
  const errors = [];
  if (!doc.conformance) {
    errors.push('Missing conformance object');
    return errors;
  }
  if (doc.conformance.level !== expectedLevel) {
    errors.push(`Conformance level is '${doc.conformance.level}', expected '${expectedLevel}'`);
  }
  if (!doc.conformance.validatedAt) {
    errors.push('Missing conformance.validatedAt');
  }
  if (!doc.conformance.validatedBy) {
    errors.push('Missing conformance.validatedBy');
  }
  if (!doc.conformance.schemaVersion) {
    errors.push('Missing conformance.schemaVersion');
  }
  return errors;
}

/**
 * Check that a document declares extensions and has the corresponding
 * x-inherit-* data blocks on entities.
 */
function checkExtensionCompleteness(doc, extensionId, dataBlockName) {
  const errors = [];

  // 1. Check extensions array exists and contains the extension
  if (!doc.extensions || !Array.isArray(doc.extensions)) {
    errors.push('Missing extensions array');
    return errors;
  }

  const ext = doc.extensions.find(e => e.id === extensionId);
  if (!ext) {
    errors.push(`Extension '${extensionId}' not declared in extensions array`);
    return errors;
  }

  // 2. Check the data block is present somewhere in the document
  // Extensions can appear on the root level (as a top-level x-inherit-* property)
  // or on individual entities
  const blockName = dataBlockName || `x-inherit-${extensionId}`;

  // Check root-level data block
  if (!doc[blockName]) {
    // Check if any entity array has the data block
    const entityArrays = ['people', 'assets', 'properties', 'bequests', 'executors',
      'trusts', 'kinships', 'relationships', 'guardians', 'proxyAuthorisations',
      'pets', 'liabilities', 'assetCollections', 'spaces', 'wishes', 'documents'];

    let foundOnEntity = false;
    for (const arr of entityArrays) {
      if (Array.isArray(doc[arr])) {
        for (const entity of doc[arr]) {
          if (entity[blockName]) {
            foundOnEntity = true;
            break;
          }
        }
      }
      if (foundOnEntity) break;
    }

    if (!foundOnEntity) {
      errors.push(`Extension data block '${blockName}' not found on any entity or root`);
    }
  }

  return errors;
}

// === Test runner ===

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

function assertEmpty(arr, msg) {
  if (arr.length > 0) {
    throw new Error(`${msg}: ${arr.join(', ')}`);
  }
}

// === Shared base document (referentially intact) ===

const baseDoc = {
  schemaVersion: '3.0.0',
  estate: {
    testatorPersonId: 'aaaa0001-0000-4000-a000-000000000001',
    testamentaryScenarios: [
      {
        id: 'scenario-1',
        description: 'Primary scenario',
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
    { id: 'aaaa0001-0000-4000-a000-000000000001', givenName: 'James', familyName: 'Davies', dateOfBirth: '1965-03-15', roles: ['testator'] },
    { id: 'aaaa0002-0000-4000-a000-000000000002', givenName: 'Catherine', familyName: 'Davies', dateOfBirth: '1968-07-22', roles: ['beneficiary'] },
    { id: 'aaaa0003-0000-4000-a000-000000000003', givenName: 'Oliver', familyName: 'Davies', dateOfBirth: '1995-11-04', roles: ['beneficiary'] }
  ],
  kinships: [
    { id: 'kk000001-0000-4000-a000-000000000001', fromPersonId: 'aaaa0001-0000-4000-a000-000000000001', toPersonId: 'aaaa0003-0000-4000-a000-000000000003', kinshipType: 'parent_child_biological' }
  ],
  relationships: [
    { id: 'rr000001-0000-4000-a000-000000000001', person1Id: 'aaaa0001-0000-4000-a000-000000000001', person2Id: 'aaaa0002-0000-4000-a000-000000000002', relationshipType: 'married' }
  ],
  assets: [
    { id: 'bb000001-0000-4000-a000-000000000001', name: 'Savings account', category: 'financial', spaceId: 'ss000001-0000-4000-a000-000000000001', propertyId: 'pp000001-0000-4000-a000-000000000001', assetCollectionId: 'ac000001-0000-4000-a000-000000000001' }
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

function cloneDoc(doc) {
  return JSON.parse(JSON.stringify(doc));
}

// ════════════════════════════════════════════════════════════════
// LEVEL 2 TESTS
// ════════════════════════════════════════════════════════════════

console.log('=== Conformance Level 2: Referentially Intact ===\n');

// --- Level 2 valid document ---

const level2ValidDoc = cloneDoc(baseDoc);
level2ValidDoc.conformance = {
  level: 'level_2',
  validatedAt: '2026-04-05T10:00:00Z',
  validatedBy: 'INHERIT Conformance Test Suite',
  schemaVersion: '3.0.0'
};

test('Level 2 valid — conformance declaration present and correct', () => {
  const errors = checkConformanceDeclaration(level2ValidDoc, 'level_2');
  assertEmpty(errors, 'Conformance declaration errors');
});

test('Level 2 valid — all 21 integrity constraints pass', () => {
  const failures = checkAllConstraints(level2ValidDoc);
  if (failures.length > 0) {
    const details = failures.map(f => `${f.field}: ${f.broken.join(', ')}`).join('; ');
    throw new Error(`${failures.length} constraint(s) failed: ${details}`);
  }
});

test('Level 2 valid — constraint count is 21', () => {
  assertEqual(constraints.length, 21, 'Constraint count');
});

// --- Level 2 with broken references ---

test('Level 2 broken — document claiming Level 2 with broken beneficiary ref is flagged', () => {
  const doc = cloneDoc(level2ValidDoc);
  doc.bequests[0].beneficiaryId = 'aaaa9999-0000-4000-a000-000000000999';
  const failures = checkAllConstraints(doc);
  if (failures.length === 0) {
    throw new Error('Should have detected broken beneficiary reference');
  }
  const bequestFailure = failures.find(f => f.field === 'bequests[].beneficiaryId');
  if (!bequestFailure) {
    throw new Error('Expected failure on bequests[].beneficiaryId');
  }
});

test('Level 2 broken — document claiming Level 2 with broken executor ref is flagged', () => {
  const doc = cloneDoc(level2ValidDoc);
  doc.executors[0].personId = 'aaaa8888-0000-4000-a000-000000000888';
  const failures = checkAllConstraints(doc);
  if (failures.length === 0) {
    throw new Error('Should have detected broken executor reference');
  }
});

test('Level 2 broken — document claiming Level 2 with broken testator ref is flagged', () => {
  const doc = cloneDoc(level2ValidDoc);
  doc.estate.testatorPersonId = 'aaaa7777-0000-4000-a000-000000000777';
  const failures = checkAllConstraints(doc);
  if (failures.length === 0) {
    throw new Error('Should have detected broken testator reference');
  }
});

test('Level 2 broken — conformance declaration missing is flagged', () => {
  const doc = cloneDoc(baseDoc);
  // No conformance object
  const errors = checkConformanceDeclaration(doc, 'level_2');
  if (errors.length === 0) {
    throw new Error('Should have flagged missing conformance declaration');
  }
});

test('Level 2 broken — wrong conformance level is flagged', () => {
  const doc = cloneDoc(baseDoc);
  doc.conformance = {
    level: 'level_1',
    validatedAt: '2026-04-05T10:00:00Z',
    validatedBy: 'Test',
    schemaVersion: '3.0.0'
  };
  const errors = checkConformanceDeclaration(doc, 'level_2');
  if (errors.length === 0) {
    throw new Error('Should have flagged wrong conformance level');
  }
});

// ════════════════════════════════════════════════════════════════
// LEVEL 3 TESTS — UK ENGLAND & WALES
// ════════════════════════════════════════════════════════════════

console.log('\n=== Conformance Level 3: UK England & Wales ===\n');

const ukDoc = cloneDoc(baseDoc);
ukDoc.conformance = {
  level: 'level_3',
  validatedAt: '2026-04-05T10:30:00Z',
  validatedBy: 'INHERIT Conformance Test Suite',
  schemaVersion: '3.0.0'
};
ukDoc.extensions = [
  {
    id: 'uk-england-wales',
    version: '1.0.0',
    schema: 'https://openinherit.org/v3/extensions/uk-england-wales/uk-england-wales.json',
    scope: ['estate', 'people', 'properties', 'executors'],
    dataBlock: 'x-inherit-uk-england-wales'
  }
];
// Root-level extension data block with jurisdiction-specific fields
ukDoc['x-inherit-uk-england-wales'] = {
  nilRateBand: {
    value: 32500000,
    effectiveFrom: '2009-04-06',
    status: 'enacted',
    legislativeReference: 'Inheritance Tax Act 1984 s.7'
  },
  residenceNilRateBand: {
    value: 17500000,
    effectiveFrom: '2017-04-06',
    status: 'enacted',
    legislativeReference: 'Inheritance Tax Act 1984 s.8D'
  },
  inheritanceTaxRate: {
    value: 40,
    effectiveFrom: '1986-03-18',
    status: 'enacted',
    legislativeReference: 'Inheritance Tax Act 1984 s.7'
  },
  intestacyStatutoryLegacy: {
    value: 32200000,
    effectiveFrom: '2023-07-26',
    status: 'enacted',
    legislativeReference: 'Administration of Estates Act 1925 s.46(1)'
  },
  transferableNilRateBand: true,
  transferableNilRateBandPercentage: 100,
  cohabitantRights: {
    applicable: false,
    statute: 'Inheritance (Provision for Family and Dependants) Act 1975',
    notes: 'Cohabitants may claim under IFPA 1975 s.1(1)(ba) as a "maintained person"'
  },
  ifpa1975Eligible: [
    {
      personId: 'aaaa0002-0000-4000-a000-000000000002',
      category: 'spouse'
    },
    {
      personId: 'aaaa0003-0000-4000-a000-000000000003',
      category: 'child'
    }
  ],
  localPropertyTypes: [
    {
      propertyId: 'pp000001-0000-4000-a000-000000000001',
      localType: 'detached_house'
    }
  ],
  localTenureTypes: [
    {
      propertyId: 'pp000001-0000-4000-a000-000000000001',
      localType: 'freehold'
    }
  ],
  localGrantTypes: [
    {
      executorId: 'dddd0001-0000-4000-a000-000000000001',
      localType: 'grant_of_probate'
    }
  ]
};

test('UK Level 3 — conformance declaration present at level_3', () => {
  const errors = checkConformanceDeclaration(ukDoc, 'level_3');
  assertEmpty(errors, 'Conformance declaration errors');
});

test('UK Level 3 — all Level 2 integrity constraints pass', () => {
  const failures = checkAllConstraints(ukDoc);
  if (failures.length > 0) {
    const details = failures.map(f => `${f.field}: ${f.broken.join(', ')}`).join('; ');
    throw new Error(`${failures.length} constraint(s) failed: ${details}`);
  }
});

test('UK Level 3 — uk-england-wales extension declared in extensions array', () => {
  const ext = ukDoc.extensions.find(e => e.id === 'uk-england-wales');
  if (!ext) throw new Error('Extension not found in extensions array');
  if (ext.version !== '1.0.0') throw new Error(`Expected version 1.0.0, got ${ext.version}`);
});

test('UK Level 3 — x-inherit-uk-england-wales data block present', () => {
  const errors = checkExtensionCompleteness(ukDoc, 'uk-england-wales');
  assertEmpty(errors, 'Extension completeness errors');
});

test('UK Level 3 — nilRateBand is a valid temporal rule', () => {
  const nrb = ukDoc['x-inherit-uk-england-wales'].nilRateBand;
  if (!nrb) throw new Error('Missing nilRateBand');
  if (typeof nrb.value !== 'number') throw new Error('nilRateBand.value must be a number');
  if (!nrb.effectiveFrom) throw new Error('Missing nilRateBand.effectiveFrom');
  if (!nrb.status) throw new Error('Missing nilRateBand.status');
  assertEqual(nrb.value, 32500000, 'NRB in minor units (£325,000)');
});

test('UK Level 3 — IHT rate is a valid temporal rule at 40%', () => {
  const iht = ukDoc['x-inherit-uk-england-wales'].inheritanceTaxRate;
  if (!iht) throw new Error('Missing inheritanceTaxRate');
  assertEqual(iht.value, 40, 'IHT rate');
});

test('UK Level 3 — IFPA 1975 eligible persons reference valid people', () => {
  const eligible = ukDoc['x-inherit-uk-england-wales'].ifpa1975Eligible;
  if (!eligible || eligible.length === 0) throw new Error('Missing ifpa1975Eligible');
  const peopleIds = new Set(ukDoc.people.map(p => p.id));
  for (const entry of eligible) {
    if (!peopleIds.has(entry.personId)) {
      throw new Error(`IFPA eligible personId ${entry.personId} not in people array`);
    }
  }
});

test('UK Level 3 — localPropertyTypes reference valid properties', () => {
  const lpt = ukDoc['x-inherit-uk-england-wales'].localPropertyTypes;
  if (!lpt || lpt.length === 0) throw new Error('Missing localPropertyTypes');
  const propIds = new Set(ukDoc.properties.map(p => p.id));
  for (const entry of lpt) {
    if (!propIds.has(entry.propertyId)) {
      throw new Error(`localPropertyType propertyId ${entry.propertyId} not in properties array`);
    }
  }
});

test('UK Level 3 — localGrantTypes reference valid executors', () => {
  const lgt = ukDoc['x-inherit-uk-england-wales'].localGrantTypes;
  if (!lgt || lgt.length === 0) throw new Error('Missing localGrantTypes');
  const execIds = new Set(ukDoc.executors.map(e => e.id));
  for (const entry of lgt) {
    if (!execIds.has(entry.executorId)) {
      throw new Error(`localGrantType executorId ${entry.executorId} not in executors array`);
    }
  }
});

// ════════════════════════════════════════════════════════════════
// LEVEL 3 TESTS — ISLAMIC SUCCESSION
// ════════════════════════════════════════════════════════════════

console.log('\n=== Conformance Level 3: Islamic Succession ===\n');

const islamicDoc = cloneDoc(baseDoc);
// Add an extra person for the wife (mahr creditor) and son
islamicDoc.people.push(
  { id: 'aaaa0004-0000-4000-a000-000000000004', givenName: 'Ahmed', familyName: 'Al-Rahman', dateOfBirth: '1970-01-15', roles: ['testator'] }
);
// Update testator to Ahmed
islamicDoc.estate.testatorPersonId = 'aaaa0004-0000-4000-a000-000000000004';
islamicDoc.estate.testamentaryScenarios[0].conditions[0].personId = 'aaaa0004-0000-4000-a000-000000000004';

islamicDoc.conformance = {
  level: 'level_3',
  validatedAt: '2026-04-05T11:00:00Z',
  validatedBy: 'INHERIT Conformance Test Suite',
  schemaVersion: '3.0.0'
};
islamicDoc.extensions = [
  {
    id: 'islamic-succession',
    version: '1.0.0',
    schema: 'https://openinherit.org/v3/extensions/islamic-succession/islamic-succession.json',
    scope: ['estate', 'people', 'bequests', 'trusts'],
    dataBlock: 'x-inherit-islamic-succession'
  }
];
islamicDoc['x-inherit-islamic-succession'] = {
  school: 'shafii',
  faraidApplies: true,
  heirClassifications: [
    {
      personId: 'aaaa0002-0000-4000-a000-000000000002',
      heirClass: 'wife',
      fixedShareFraction: '1/8',
      residuaryClass: 'none',
      blocked: false
    },
    {
      personId: 'aaaa0003-0000-4000-a000-000000000003',
      heirClass: 'son',
      residuaryClass: 'asaba_by_self',
      blocked: false
    }
  ],
  awlApplied: false,
  raddApplied: false,
  wasiyyaRules: {
    maxPortion: 33.33,
    toNonHeirsOnly: true,
    requiresHeirConsent: true,
    notes: 'Wasiyya limited to one-third per Shafi\'i school'
  },
  iddahPeriods: [
    {
      personId: 'aaaa0002-0000-4000-a000-000000000002',
      periodType: 'death',
      startDate: '2026-01-15',
      endDate: '2026-05-15'
    }
  ],
  waqfDetails: [
    {
      waqfId: 'tt000001-0000-4000-a000-000000000001',
      waqfType: 'khairi',
      dedicationDate: '2020-06-01'
    }
  ],
  priorityDebts: [
    {
      description: 'Unpaid mahr obligation to surviving spouse',
      type: 'mahr',
      amount: { amount: 5000000, currency: 'GBP' }
    },
    {
      description: 'Funeral and burial costs (kafan)',
      type: 'kafan',
      amount: { amount: 350000, currency: 'GBP' }
    }
  ],
  mahr: {
    amount: { amount: 5000000, currency: 'GBP' },
    agreed: true,
    paidInFull: false,
    outstandingAmount: { amount: 5000000, currency: 'GBP' },
    creditorPersonId: 'aaaa0002-0000-4000-a000-000000000002',
    documentRef: 'Nikah contract dated 1995-06-20'
  },
  hijriDates: {
    deathDateHijri: '1447-07-15',
    willDateHijri: '1446-01-10'
  },
  islamicFormalities: {
    shariaCourtReference: 'SYC/2026/001',
    certifiedByScholar: true,
    scholarName: 'Dr Muhammad ibn Yusuf'
  }
};

test('Islamic Level 3 — conformance declaration present at level_3', () => {
  const errors = checkConformanceDeclaration(islamicDoc, 'level_3');
  assertEmpty(errors, 'Conformance declaration errors');
});

test('Islamic Level 3 — all Level 2 integrity constraints pass', () => {
  const failures = checkAllConstraints(islamicDoc);
  if (failures.length > 0) {
    const details = failures.map(f => `${f.field}: ${f.broken.join(', ')}`).join('; ');
    throw new Error(`${failures.length} constraint(s) failed: ${details}`);
  }
});

test('Islamic Level 3 — islamic-succession extension declared', () => {
  const ext = islamicDoc.extensions.find(e => e.id === 'islamic-succession');
  if (!ext) throw new Error('Extension not found');
});

test('Islamic Level 3 — x-inherit-islamic-succession data block present', () => {
  const errors = checkExtensionCompleteness(islamicDoc, 'islamic-succession');
  assertEmpty(errors, 'Extension completeness errors');
});

test('Islamic Level 3 — school of jurisprudence specified (required field)', () => {
  const school = islamicDoc['x-inherit-islamic-succession'].school;
  if (!school) throw new Error('Missing school');
  const validSchools = ['hanafi', 'shafii', 'maliki', 'hanbali', 'jafari', 'ibadi', 'zahiri'];
  if (!validSchools.includes(school)) throw new Error(`Invalid school: ${school}`);
});

test('Islamic Level 3 — faraidApplies is specified', () => {
  const fa = islamicDoc['x-inherit-islamic-succession'].faraidApplies;
  if (typeof fa !== 'boolean') throw new Error('faraidApplies must be a boolean');
});

test('Islamic Level 3 — heir classifications reference valid people', () => {
  const heirs = islamicDoc['x-inherit-islamic-succession'].heirClassifications;
  if (!heirs || heirs.length === 0) throw new Error('Missing heirClassifications');
  const peopleIds = new Set(islamicDoc.people.map(p => p.id));
  for (const heir of heirs) {
    if (!peopleIds.has(heir.personId)) {
      throw new Error(`Heir personId ${heir.personId} not in people array`);
    }
  }
});

test('Islamic Level 3 — wasiyya rules present with valid limits', () => {
  const wr = islamicDoc['x-inherit-islamic-succession'].wasiyyaRules;
  if (!wr) throw new Error('Missing wasiyyaRules');
  if (typeof wr.maxPortion !== 'number' || wr.maxPortion > 100 || wr.maxPortion < 0) {
    throw new Error('wasiyyaRules.maxPortion must be 0-100');
  }
});

test('Islamic Level 3 — priority debts use minor currency units', () => {
  const debts = islamicDoc['x-inherit-islamic-succession'].priorityDebts;
  if (!debts || debts.length === 0) throw new Error('Missing priorityDebts');
  for (const debt of debts) {
    if (!debt.amount || typeof debt.amount.amount !== 'number') {
      throw new Error('Each priority debt must have an amount in minor units');
    }
    if (!debt.amount.currency) throw new Error('Each priority debt must have a currency');
  }
});

test('Islamic Level 3 — mahr creditor references a valid person', () => {
  const mahr = islamicDoc['x-inherit-islamic-succession'].mahr;
  if (!mahr) throw new Error('Missing mahr');
  const peopleIds = new Set(islamicDoc.people.map(p => p.id));
  if (mahr.creditorPersonId && !peopleIds.has(mahr.creditorPersonId)) {
    throw new Error(`Mahr creditorPersonId ${mahr.creditorPersonId} not in people array`);
  }
});

test('Islamic Level 3 — waqf details reference valid trusts', () => {
  const waqfs = islamicDoc['x-inherit-islamic-succession'].waqfDetails;
  if (!waqfs || waqfs.length === 0) throw new Error('Missing waqfDetails');
  const trustIds = new Set(islamicDoc.trusts.map(t => t.id));
  for (const w of waqfs) {
    if (!trustIds.has(w.waqfId)) {
      throw new Error(`Waqf waqfId ${w.waqfId} not in trusts array`);
    }
  }
});

test('Islamic Level 3 — iddah periods reference valid people', () => {
  const periods = islamicDoc['x-inherit-islamic-succession'].iddahPeriods;
  if (!periods || periods.length === 0) throw new Error('Missing iddahPeriods');
  const peopleIds = new Set(islamicDoc.people.map(p => p.id));
  for (const p of periods) {
    if (!peopleIds.has(p.personId)) {
      throw new Error(`Iddah personId ${p.personId} not in people array`);
    }
  }
});

// ════════════════════════════════════════════════════════════════
// LEVEL 3 TESTS — SINGAPORE–MALAYSIA
// ════════════════════════════════════════════════════════════════

console.log('\n=== Conformance Level 3: Singapore–Malaysia ===\n');

const sgMyDoc = cloneDoc(baseDoc);
sgMyDoc.conformance = {
  level: 'level_3',
  validatedAt: '2026-04-05T11:30:00Z',
  validatedBy: 'INHERIT Conformance Test Suite',
  schemaVersion: '3.0.0'
};
sgMyDoc.extensions = [
  {
    id: 'singapore-malaysia',
    version: '1.0.0',
    schema: 'https://openinherit.org/v3/extensions/singapore-malaysia/singapore-malaysia.json',
    scope: ['estate', 'assets'],
    dataBlock: 'x-inherit-singapore-malaysia'
  }
];
sgMyDoc['x-inherit-singapore-malaysia'] = {
  country: 'SG',
  singaporeISA: {
    applicable: true,
    shareSchedule: [
      { relationship: 'spouse', share: '1/2', notes: 'Surviving spouse takes half under ISA' },
      { relationship: 'children', share: '1/2', notes: 'Children share the remaining half equally' }
    ],
    notes: 'Non-Muslim estate distributed per Intestate Succession Act'
  },
  cpfNominations: [
    {
      accountId: 'bb000001-0000-4000-a000-000000000001',
      nominatedPersonIds: [
        'aaaa0002-0000-4000-a000-000000000002',
        'aaaa0003-0000-4000-a000-000000000003'
      ],
      binding: true,
      nominationDate: '2024-01-15',
      notes: 'CPF nomination made under CPF Act s.25(1)'
    }
  ]
};

test('SG-MY Level 3 — conformance declaration present at level_3', () => {
  const errors = checkConformanceDeclaration(sgMyDoc, 'level_3');
  assertEmpty(errors, 'Conformance declaration errors');
});

test('SG-MY Level 3 — all Level 2 integrity constraints pass', () => {
  const failures = checkAllConstraints(sgMyDoc);
  if (failures.length > 0) {
    const details = failures.map(f => `${f.field}: ${f.broken.join(', ')}`).join('; ');
    throw new Error(`${failures.length} constraint(s) failed: ${details}`);
  }
});

test('SG-MY Level 3 — singapore-malaysia extension declared', () => {
  const ext = sgMyDoc.extensions.find(e => e.id === 'singapore-malaysia');
  if (!ext) throw new Error('Extension not found');
});

test('SG-MY Level 3 — x-inherit-singapore-malaysia data block present', () => {
  const errors = checkExtensionCompleteness(sgMyDoc, 'singapore-malaysia');
  assertEmpty(errors, 'Extension completeness errors');
});

test('SG-MY Level 3 — country code specified (required field)', () => {
  const country = sgMyDoc['x-inherit-singapore-malaysia'].country;
  if (!country) throw new Error('Missing country');
  if (!['SG', 'MY'].includes(country)) throw new Error(`Invalid country: ${country}`);
});

test('SG-MY Level 3 — ISA distribution schedule present for Singapore estate', () => {
  const isa = sgMyDoc['x-inherit-singapore-malaysia'].singaporeISA;
  if (!isa) throw new Error('Missing singaporeISA');
  if (!isa.shareSchedule || isa.shareSchedule.length === 0) {
    throw new Error('Missing ISA share schedule');
  }
});

test('SG-MY Level 3 — CPF nominations reference valid people and assets', () => {
  const cpf = sgMyDoc['x-inherit-singapore-malaysia'].cpfNominations;
  if (!cpf || cpf.length === 0) throw new Error('Missing cpfNominations');
  const peopleIds = new Set(sgMyDoc.people.map(p => p.id));
  const assetIds = new Set(sgMyDoc.assets.map(a => a.id));
  for (const nom of cpf) {
    if (!assetIds.has(nom.accountId)) {
      throw new Error(`CPF accountId ${nom.accountId} not in assets array`);
    }
    for (const pid of (nom.nominatedPersonIds || [])) {
      if (!peopleIds.has(pid)) {
        throw new Error(`CPF nominatedPersonId ${pid} not in people array`);
      }
    }
  }
});

// --- Malaysia variant ---

const myDoc = cloneDoc(baseDoc);
myDoc.conformance = {
  level: 'level_3',
  validatedAt: '2026-04-05T11:45:00Z',
  validatedBy: 'INHERIT Conformance Test Suite',
  schemaVersion: '3.0.0'
};
myDoc.extensions = [
  {
    id: 'singapore-malaysia',
    version: '1.0.0',
    schema: 'https://openinherit.org/v3/extensions/singapore-malaysia/singapore-malaysia.json',
    scope: ['estate', 'assets'],
    dataBlock: 'x-inherit-singapore-malaysia'
  }
];
myDoc['x-inherit-singapore-malaysia'] = {
  country: 'MY',
  malaysianDistributionAct: {
    applicable: true,
    shareSchedule: [
      { relationship: 'spouse', share: '1/3' },
      { relationship: 'children', share: '2/3' }
    ],
    notes: 'Non-Muslim estate under Distribution Act 1958'
  },
  epfNominations: [
    {
      accountId: 'bb000001-0000-4000-a000-000000000001',
      nominatedPersonIds: ['aaaa0002-0000-4000-a000-000000000002'],
      binding: true,
      nominationDate: '2023-11-01'
    }
  ]
};

test('MY Level 3 — Malaysia variant with Distribution Act data', () => {
  const da = myDoc['x-inherit-singapore-malaysia'].malaysianDistributionAct;
  if (!da) throw new Error('Missing malaysianDistributionAct');
  if (!da.shareSchedule || da.shareSchedule.length === 0) {
    throw new Error('Missing Distribution Act share schedule');
  }
});

test('MY Level 3 — EPF nominations reference valid people', () => {
  const epf = myDoc['x-inherit-singapore-malaysia'].epfNominations;
  if (!epf || epf.length === 0) throw new Error('Missing epfNominations');
  const peopleIds = new Set(myDoc.people.map(p => p.id));
  for (const nom of epf) {
    for (const pid of (nom.nominatedPersonIds || [])) {
      if (!peopleIds.has(pid)) {
        throw new Error(`EPF nominatedPersonId ${pid} not in people array`);
      }
    }
  }
});

test('MY Level 3 — all Level 2 integrity constraints pass', () => {
  const failures = checkAllConstraints(myDoc);
  if (failures.length > 0) {
    const details = failures.map(f => `${f.field}: ${f.broken.join(', ')}`).join('; ');
    throw new Error(`${failures.length} constraint(s) failed: ${details}`);
  }
});

// ════════════════════════════════════════════════════════════════
// LEVEL 3 TESTS — INDIA
// ════════════════════════════════════════════════════════════════

console.log('\n=== Conformance Level 3: India ===\n');

const indiaDoc = cloneDoc(baseDoc);
indiaDoc.conformance = {
  level: 'level_3',
  validatedAt: '2026-04-05T12:00:00Z',
  validatedBy: 'INHERIT Conformance Test Suite',
  schemaVersion: '3.0.0'
};
indiaDoc.extensions = [
  {
    id: 'india',
    version: '1.0.0',
    schema: 'https://openinherit.org/v3/extensions/india/india.json',
    scope: ['estate', 'properties'],
    dataBlock: 'x-inherit-india'
  }
];
indiaDoc['x-inherit-india'] = {
  personalLaw: 'hindu_succession_act_1956',
  state: 'Maharashtra',
  probateRequired: true,
  probateJurisdiction: {
    court: 'Bombay High Court',
    courtType: 'high_court'
  },
  agriculturalLand: {
    hasAgriculturalLand: true,
    stateCeilingApplies: true,
    willingRestriction: false
  },
  nriComplications: {
    isNri: false,
    femaRestrictions: false
  },
  stampDuty: {
    stateRate: 5,
    exemptions: ['Direct lineal descendants', 'Spouse']
  }
};

test('India Level 3 — conformance declaration present at level_3', () => {
  const errors = checkConformanceDeclaration(indiaDoc, 'level_3');
  assertEmpty(errors, 'Conformance declaration errors');
});

test('India Level 3 — all Level 2 integrity constraints pass', () => {
  const failures = checkAllConstraints(indiaDoc);
  if (failures.length > 0) {
    const details = failures.map(f => `${f.field}: ${f.broken.join(', ')}`).join('; ');
    throw new Error(`${failures.length} constraint(s) failed: ${details}`);
  }
});

test('India Level 3 — india extension declared', () => {
  const ext = indiaDoc.extensions.find(e => e.id === 'india');
  if (!ext) throw new Error('Extension not found');
});

test('India Level 3 — x-inherit-india data block present', () => {
  const errors = checkExtensionCompleteness(indiaDoc, 'india');
  assertEmpty(errors, 'Extension completeness errors');
});

test('India Level 3 — personalLaw specified (required field)', () => {
  const pl = indiaDoc['x-inherit-india'].personalLaw;
  if (!pl) throw new Error('Missing personalLaw');
  const validLaws = [
    'hindu_succession_act_1956', 'indian_succession_act_1925',
    'muslim_personal_law', 'parsi_succession',
    'special_marriage_act', 'goa_civil_code'
  ];
  if (!validLaws.includes(pl)) throw new Error(`Invalid personalLaw: ${pl}`);
});

test('India Level 3 — state is specified', () => {
  const state = indiaDoc['x-inherit-india'].state;
  if (!state || typeof state !== 'string') throw new Error('Missing or invalid state');
});

test('India Level 3 — probate jurisdiction details present', () => {
  const pj = indiaDoc['x-inherit-india'].probateJurisdiction;
  if (!pj) throw new Error('Missing probateJurisdiction');
  if (!pj.court) throw new Error('Missing probateJurisdiction.court');
  if (!['district_court', 'high_court'].includes(pj.courtType)) {
    throw new Error(`Invalid courtType: ${pj.courtType}`);
  }
});

test('India Level 3 — agricultural land details present', () => {
  const al = indiaDoc['x-inherit-india'].agriculturalLand;
  if (!al) throw new Error('Missing agriculturalLand');
  if (typeof al.hasAgriculturalLand !== 'boolean') {
    throw new Error('agriculturalLand.hasAgriculturalLand must be a boolean');
  }
});

// --- India with Goa exception ---

const goaDoc = cloneDoc(baseDoc);
goaDoc.conformance = {
  level: 'level_3',
  validatedAt: '2026-04-05T12:15:00Z',
  validatedBy: 'INHERIT Conformance Test Suite',
  schemaVersion: '3.0.0'
};
goaDoc.extensions = [
  {
    id: 'india',
    version: '1.0.0',
    schema: 'https://openinherit.org/v3/extensions/india/india.json',
    scope: ['estate'],
    dataBlock: 'x-inherit-india'
  }
];
goaDoc['x-inherit-india'] = {
  personalLaw: 'goa_civil_code',
  state: 'Goa',
  probateRequired: true,
  probateJurisdiction: {
    court: 'District Court of North Goa',
    courtType: 'district_court'
  },
  goaException: {
    applies: true,
    communityOfProperty: true,
    forcedHeirship: true
  },
  stampDuty: {
    stateRate: 3.5,
    exemptions: ['Spouse under community of property regime']
  }
};

test('India Level 3 (Goa) — Goa civil code variant with forced heirship', () => {
  const goa = goaDoc['x-inherit-india'].goaException;
  if (!goa) throw new Error('Missing goaException');
  if (!goa.applies) throw new Error('goaException.applies should be true');
  if (!goa.forcedHeirship) throw new Error('goaException.forcedHeirship should be true');
});

test('India Level 3 (Goa) — extension data block present', () => {
  const errors = checkExtensionCompleteness(goaDoc, 'india');
  assertEmpty(errors, 'Extension completeness errors');
});

test('India Level 3 (Goa) — all Level 2 integrity constraints pass', () => {
  const failures = checkAllConstraints(goaDoc);
  if (failures.length > 0) {
    const details = failures.map(f => `${f.field}: ${f.broken.join(', ')}`).join('; ');
    throw new Error(`${failures.length} constraint(s) failed: ${details}`);
  }
});

// ════════════════════════════════════════════════════════════════
// NEGATIVE TESTS — LEVEL 3 FAILURES
// ════════════════════════════════════════════════════════════════

console.log('\n=== Negative Tests: Level 3 Failures ===\n');

test('Level 3 without extensions array is flagged', () => {
  const doc = cloneDoc(baseDoc);
  doc.conformance = {
    level: 'level_3',
    validatedAt: '2026-04-05T13:00:00Z',
    validatedBy: 'Test',
    schemaVersion: '3.0.0'
  };
  // No extensions array
  const errors = checkExtensionCompleteness(doc, 'uk-england-wales');
  if (errors.length === 0) throw new Error('Should flag missing extensions array');
});

test('Level 3 with extension declared but no data block is flagged', () => {
  const doc = cloneDoc(baseDoc);
  doc.conformance = {
    level: 'level_3',
    validatedAt: '2026-04-05T13:00:00Z',
    validatedBy: 'Test',
    schemaVersion: '3.0.0'
  };
  doc.extensions = [
    {
      id: 'uk-england-wales',
      version: '1.0.0',
      schema: 'https://openinherit.org/v3/extensions/uk-england-wales/uk-england-wales.json'
    }
  ];
  // No x-inherit-uk-england-wales data block
  const errors = checkExtensionCompleteness(doc, 'uk-england-wales');
  if (errors.length === 0) throw new Error('Should flag missing data block');
});

test('Level 3 with extension not in extensions array is flagged', () => {
  const doc = cloneDoc(baseDoc);
  doc.extensions = [
    {
      id: 'some-other-extension',
      version: '1.0.0',
      schema: 'https://example.com/ext.json'
    }
  ];
  const errors = checkExtensionCompleteness(doc, 'india');
  if (errors.length === 0) throw new Error('Should flag extension not declared');
});

test('Level 3 claiming level_3 with broken references fails Level 2 prerequisite', () => {
  const doc = cloneDoc(ukDoc);
  doc.bequests[0].beneficiaryId = 'aaaa9999-0000-4000-a000-000000000999';
  const failures = checkAllConstraints(doc);
  if (failures.length === 0) {
    throw new Error('Level 3 document with broken refs should fail Level 2 prerequisite');
  }
});

// ════════════════════════════════════════════════════════════════
// MULTI-EXTENSION COMPOSITION TEST
// ════════════════════════════════════════════════════════════════

console.log('\n=== Multi-Extension Composition ===\n');

const compositeDoc = cloneDoc(baseDoc);
compositeDoc.people.push(
  { id: 'aaaa0004-0000-4000-a000-000000000004', givenName: 'Fatimah', familyName: 'Hassan', dateOfBirth: '1972-05-20', roles: ['beneficiary'] }
);
compositeDoc.conformance = {
  level: 'level_3',
  validatedAt: '2026-04-05T14:00:00Z',
  validatedBy: 'INHERIT Conformance Test Suite',
  schemaVersion: '3.0.0'
};
compositeDoc.extensions = [
  {
    id: 'uk-england-wales',
    version: '1.0.0',
    schema: 'https://openinherit.org/v3/extensions/uk-england-wales/uk-england-wales.json',
    scope: ['estate', 'properties'],
    dataBlock: 'x-inherit-uk-england-wales'
  },
  {
    id: 'islamic-succession',
    version: '1.0.0',
    schema: 'https://openinherit.org/v3/extensions/islamic-succession/islamic-succession.json',
    scope: ['estate', 'people'],
    dataBlock: 'x-inherit-islamic-succession'
  }
];
compositeDoc['x-inherit-uk-england-wales'] = {
  nilRateBand: {
    value: 32500000,
    effectiveFrom: '2009-04-06',
    status: 'enacted'
  },
  inheritanceTaxRate: {
    value: 40,
    effectiveFrom: '1986-03-18',
    status: 'enacted'
  }
};
compositeDoc['x-inherit-islamic-succession'] = {
  school: 'hanafi',
  faraidApplies: true,
  heirClassifications: [
    {
      personId: 'aaaa0002-0000-4000-a000-000000000002',
      heirClass: 'wife',
      fixedShareFraction: '1/8',
      residuaryClass: 'none',
      blocked: false
    }
  ],
  wasiyyaRules: {
    maxPortion: 33.33,
    toNonHeirsOnly: true,
    requiresHeirConsent: true
  }
};

test('Multi-extension — both UK and Islamic extensions declared', () => {
  const ukExt = compositeDoc.extensions.find(e => e.id === 'uk-england-wales');
  const islExt = compositeDoc.extensions.find(e => e.id === 'islamic-succession');
  if (!ukExt) throw new Error('UK extension not declared');
  if (!islExt) throw new Error('Islamic extension not declared');
});

test('Multi-extension — both data blocks present', () => {
  const ukErrors = checkExtensionCompleteness(compositeDoc, 'uk-england-wales');
  const islErrors = checkExtensionCompleteness(compositeDoc, 'islamic-succession');
  assertEmpty(ukErrors, 'UK extension errors');
  assertEmpty(islErrors, 'Islamic extension errors');
});

test('Multi-extension — all Level 2 constraints pass', () => {
  const failures = checkAllConstraints(compositeDoc);
  if (failures.length > 0) {
    const details = failures.map(f => `${f.field}: ${f.broken.join(', ')}`).join('; ');
    throw new Error(`${failures.length} constraint(s) failed: ${details}`);
  }
});

// ════════════════════════════════════════════════════════════════
// SCORECARD
// ════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(50));
console.log(`Conformance tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('═'.repeat(50));

if (failed > 0) {
  console.log('\nFailed tests require attention before conformance can be declared.');
}

process.exit(failed > 0 ? 1 : 0);
