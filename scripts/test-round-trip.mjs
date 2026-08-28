#!/usr/bin/env node
// Round-trip test: parse → serialise → parse → deep-compare
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

let passed = 0, failed = 0;

function test(description, fn) {
  try { fn(); passed++; console.log(`  PASS  ${description}`); }
  catch (e) { failed++; console.log(`  FAIL  ${description}\n        ${e.message}`); }
}

function roundTrip(obj) {
  const serialised = JSON.stringify(obj);
  const parsed = JSON.parse(serialised);
  return parsed;
}

function deepEqual(a, b, path = '') {
  if (a === b) return;
  if (typeof a !== typeof b) throw new Error(`Type mismatch at ${path}: ${typeof a} vs ${typeof b}`);
  if (a === null || b === null) throw new Error(`Null mismatch at ${path}`);
  if (Array.isArray(a) !== Array.isArray(b)) throw new Error(`Array mismatch at ${path}`);
  if (Array.isArray(a)) {
    if (a.length !== b.length) throw new Error(`Array length mismatch at ${path}: ${a.length} vs ${b.length}`);
    for (let i = 0; i < a.length; i++) deepEqual(a[i], b[i], `${path}[${i}]`);
    return;
  }
  if (typeof a === 'object') {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) throw new Error(`Key count mismatch at ${path}: ${keysA.length} vs ${keysB.length}`);
    for (const key of keysA) {
      if (!(key in b)) throw new Error(`Missing key at ${path}.${key}`);
      deepEqual(a[key], b[key], `${path}.${key}`);
    }
    return;
  }
  throw new Error(`Value mismatch at ${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuid() {
  // Deterministic UUIDs for test reproducibility
  return 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
}

function money(amount, currency = 'GBP') {
  return { amount, currency };
}

function baseDocument(overrides = {}) {
  return {
    '$schema': 'https://openinherit.org/v3/schema.json',
    '@context': 'https://openinherit.org/v3/context/inherit-v1.jsonld',
    schemaVersion: '1.9.0',
    exportedAt: '2026-04-05T00:00:00Z',
    generator: { name: 'Round-trip Test', version: '1.0.0' },
    ...overrides,
  };
}

// ===========================================================================
// Test 1: Minimal document from fixture
// ===========================================================================

console.log('\n--- Test 1: Minimal fixture round-trip ---');

test('minimal-estate.json round-trips without data loss', () => {
  const filePath = resolve(ROOT, 'examples/fixtures/minimal-estate.json');
  const original = JSON.parse(readFileSync(filePath, 'utf-8'));
  const result = roundTrip(original);
  deepEqual(original, result, 'root');
});

// ===========================================================================
// Test 2: English family estate fixture
// ===========================================================================

console.log('\n--- Test 2: English family estate fixture round-trip ---');

test('english-family-estate.json round-trips without data loss', () => {
  const filePath = resolve(ROOT, 'examples/fixtures/english-family-estate.json');
  const original = JSON.parse(readFileSync(filePath, 'utf-8'));
  const result = roundTrip(original);
  deepEqual(original, result, 'root');
});

// ===========================================================================
// Test 3: Fully-populated document (inline)
// ===========================================================================

console.log('\n--- Test 3: Fully-populated document round-trip ---');

test('fully-populated document with all entity types round-trips', () => {
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'confirmed',
      revocationClause: true,
      notes: 'Full estate with all entity types populated.',
      createdAt: '2026-01-01T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: {
        country: 'GB',
        subdivision: 'GB-ENG',
        legalSystems: ['common_law'],
        name: 'England & Wales',
      },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: 'Alice',
        familyName: 'Testator',
        dateOfBirth: '1965-03-15',
        roles: ['testator'],
        contact: {
          email: 'alice@example.com',
          phone: '+44 7700 900000',
          address: {
            streetAddress: '1 Test Lane',
            addressLocality: 'London',
            postalCode: 'SW1A 1AA',
            addressCountry: 'GB',
          },
        },
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        givenName: 'Bob',
        familyName: 'Beneficiary',
        dateOfBirth: '1990-06-20',
        roles: ['beneficiary', 'executor'],
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        givenName: 'Carol',
        familyName: 'Guardian',
        roles: ['guardian'],
      },
    ],
    kinships: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        kinshipType: 'parent_child_biological',
        fromPersonId: '22222222-2222-4222-8222-222222222222',
        toPersonId: '33333333-3333-4333-8333-333333333333',
      },
    ],
    relationships: [
      {
        id: '66666666-6666-4666-8666-666666666666',
        type: 'marriage_civil',
        partners: [
          { personId: '22222222-2222-4222-8222-222222222222', ordinal: 1 },
          { personId: '33333333-3333-4333-8333-333333333333', ordinal: 2 },
        ],
        currentStatus: 'active',
      },
    ],
    properties: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        name: '1 Test Lane, London',
        propertyType: 'detached',
        tenureType: 'ownership',
        isPrimaryResidence: true,
        ownershipType: 'sole',
        estimatedValue: money(50000000),
        address: {
          streetAddress: '1 Test Lane',
          addressLocality: 'London',
          postalCode: 'SW1A 1AA',
          addressCountry: 'GB',
        },
      },
    ],
    assets: [
      {
        id: '88888888-8888-4888-8888-888888888888',
        name: 'Savings Account',
        category: 'financial',
        estimatedValue: money(10000000),
        subcategory: 'savings_account',
      },
    ],
    liabilities: [
      {
        id: '99999999-9999-4999-8999-999999999999',
        name: 'Mortgage',
        liabilityType: 'mortgage',
        currentBalance: money(15000000),
      },
    ],
    bequests: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        bequestType: 'specific',
        beneficiaryId: '33333333-3333-4333-8333-333333333333',
        description: 'The family home at 1 Test Lane.',
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        bequestType: 'residuary',
        beneficiaryId: '33333333-3333-4333-8333-333333333333',
        description: 'The residue of the estate.',
      },
    ],
    executors: [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        personId: '33333333-3333-4333-8333-333333333333',
        role: 'primary',
      },
    ],
    guardians: [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        personId: '44444444-4444-4444-8444-444444444444',
        childPersonId: '33333333-3333-4333-8333-333333333333',
        role: 'primary',
        appointmentType: 'testamentary',
      },
    ],
    trusts: [
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        name: 'Family Discretionary Trust',
        trustType: 'discretionary',
        status: 'active',
        trustees: [
          { personId: '33333333-3333-4333-8333-333333333333', role: 'trustee' },
        ],
        beneficiaries: [
          { personId: '33333333-3333-4333-8333-333333333333' },
        ],
      },
    ],
    wishes: [
      {
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        wishType: 'funeral',
        description: 'Cremation, ashes scattered at sea.',
      },
    ],
    documents: [
      {
        id: '10000000-0000-4000-8000-000000000001',
        documentType: 'will',
        title: 'Last Will and Testament of Alice Testator',
        executionDate: '2026-01-15',
      },
    ],
    nonprobateTransfers: [
      {
        id: '10000000-0000-4000-8000-000000000002',
        transferType: 'joint_tenancy',
        description: 'Joint bank account passes to Bob by survivorship.',
      },
    ],
    proxyAuthorisations: [
      {
        id: '10000000-0000-4000-8000-000000000003',
        type: 'lasting_power_of_attorney',
        scope: 'property_and_financial',
        principalPersonId: '22222222-2222-4222-8222-222222222222',
        agentPersonId: '33333333-3333-4333-8333-333333333333',
      },
    ],
    extensions: [],
    assetCollections: [
      {
        id: '10000000-0000-4000-8000-000000000004',
        name: 'Investment Portfolio',
        assetIds: ['88888888-8888-4888-8888-888888888888'],
      },
    ],
    valuations: [
      {
        id: '10000000-0000-4000-8000-000000000005',
        targetType: 'property',
        targetId: '77777777-7777-4777-8777-777777777777',
        value: money(50000000),
        valuationDate: '2026-03-01',
        source: 'estate_agent',
      },
    ],
    lifetimeTransfers: [
      {
        id: '10000000-0000-4000-8000-000000000006',
        transferType: 'gift',
        recipientPersonId: '33333333-3333-4333-8333-333333333333',
        value: money(500000),
        transferDate: '2025-12-25',
        description: 'Christmas gift.',
      },
    ],
    pets: [
      {
        id: '10000000-0000-4000-8000-000000000007',
        name: 'Biscuit',
        species: 'dog',
        breed: 'Labrador Retriever',
        caregiverPersonId: '44444444-4444-4444-8444-444444444444',
      },
    ],
    events: [
      {
        id: '10000000-0000-4000-8000-000000000008',
        eventType: 'will_execution',
        date: '2026-01-15',
        description: 'Will signed and witnessed.',
      },
    ],
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');
});

// ===========================================================================
// Test 4: Extension data (x-inherit-* properties)
// ===========================================================================

console.log('\n--- Test 4: Extension data round-trip ---');

test('document with x-inherit-* extension properties round-trips', () => {
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'planning',
      createdAt: '2026-04-05T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: { country: 'GB', legalSystems: ['common_law'] },
      'x-inherit-practitionerNotes': {
        firmName: 'Smith & Partners LLP',
        matterRef: 'SP/2026/001234',
        feeEstimate: money(250000),
      },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: 'Test',
        familyName: 'Person',
        roles: ['testator'],
        'x-inherit-nationalInsuranceNumber': 'QQ 12 34 56 C',
        'x-inherit-nhsNumber': '943 476 5919',
      },
    ],
    kinships: [],
    relationships: [],
    properties: [],
    assets: [],
    liabilities: [],
    bequests: [],
    trusts: [],
    executors: [],
    guardians: [],
    wishes: [],
    documents: [],
    nonprobateTransfers: [],
    proxyAuthorisations: [],
    extensions: [],
    'x-inherit-practitionerNotes': {
      firmName: 'Smith & Partners LLP',
      matterRef: 'SP/2026/001234',
      notes: 'Client instructed on 5 April 2026.',
    },
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');
});

test('extension fixture (uk-england-wales) round-trips', () => {
  const filePath = resolve(ROOT, 'examples/fixtures/extension-uk-england-wales.json');
  const original = JSON.parse(readFileSync(filePath, 'utf-8'));
  const result = roundTrip(original);
  deepEqual(original, result, 'root');
});

// ===========================================================================
// Test 5: Unicode names
// ===========================================================================

console.log('\n--- Test 5: Unicode names round-trip ---');

test('Japanese koseki names (kanji + katakana) survive round-trip', () => {
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'planning',
      createdAt: '2026-04-05T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: { country: 'JP', legalSystems: ['civil_law'] },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: '太郎',
        familyName: '田中',
        additionalName: 'タナカ タロウ',
        roles: ['testator'],
        notes: '戸籍謄本（こせきとうほん）に基づく氏名',
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        givenName: '花子',
        familyName: '田中',
        additionalName: 'タナカ ハナコ',
        roles: ['beneficiary'],
      },
    ],
    kinships: [],
    relationships: [],
    properties: [],
    assets: [],
    bequests: [],
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');
});

test('Arabic names with diacritics survive round-trip', () => {
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'planning',
      createdAt: '2026-04-05T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: { country: 'AE', legalSystems: ['sharia'] },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: 'فَاطِمَة',
        familyName: 'الرَّشِيد',
        additionalName: 'بِنْت عَبْد الرَّحْمَن',
        roles: ['testator'],
        notes: 'الوَصِيَّة — الاسم الكامل مع التشكيل',
      },
    ],
    kinships: [],
    relationships: [],
    properties: [],
    assets: [],
    bequests: [],
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');
});

test('Hebrew names survive round-trip', () => {
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'planning',
      createdAt: '2026-04-05T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: { country: 'IL', legalSystems: ['civil_law'] },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: 'דָּוִד',
        familyName: 'כֹּהֵן',
        additionalName: 'בֶּן אַבְרָהָם',
        roles: ['testator'],
        notes: 'צוואה — שם מלא עם ניקוד',
      },
    ],
    kinships: [],
    relationships: [],
    properties: [],
    assets: [],
    bequests: [],
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');
});

test('mixed Unicode document with all three scripts round-trips', () => {
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'planning',
      createdAt: '2026-04-05T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: { country: 'GB', legalSystems: ['common_law'] },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: 'James',
        familyName: 'Smith',
        roles: ['testator'],
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        givenName: '太郎',
        familyName: '田中',
        roles: ['beneficiary'],
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        givenName: 'فَاطِمَة',
        familyName: 'الرَّشِيد',
        roles: ['beneficiary'],
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        givenName: 'דָּוִד',
        familyName: 'כֹּהֵן',
        roles: ['beneficiary'],
      },
    ],
    kinships: [],
    relationships: [],
    properties: [],
    assets: [],
    bequests: [],
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');
});

// ===========================================================================
// Test 6: Maximum-length strings
// ===========================================================================

console.log('\n--- Test 6: Maximum-length strings round-trip ---');

test('255-character name fields survive round-trip', () => {
  const longName = 'A'.repeat(255);
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'planning',
      createdAt: '2026-04-05T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: { country: 'GB', legalSystems: ['common_law'] },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: longName,
        familyName: longName,
        additionalName: longName,
        roles: ['testator'],
      },
    ],
    kinships: [],
    relationships: [],
    properties: [],
    assets: [],
    bequests: [],
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');
  // Verify length explicitly
  if (result.people[0].givenName.length !== 255) {
    throw new Error(`Expected 255 chars, got ${result.people[0].givenName.length}`);
  }
});

test('2000-character notes field survives round-trip', () => {
  const longNotes = 'N'.repeat(2000);
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'planning',
      notes: longNotes,
      createdAt: '2026-04-05T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: { country: 'GB', legalSystems: ['common_law'] },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: 'Test',
        familyName: 'Person',
        roles: ['testator'],
      },
    ],
    kinships: [],
    bequests: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        bequestType: 'specific',
        beneficiaryId: '22222222-2222-4222-8222-222222222222',
        description: 'D'.repeat(2000),
      },
    ],
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');
  if (result.estate.notes.length !== 2000) {
    throw new Error(`Expected 2000 chars in notes, got ${result.estate.notes.length}`);
  }
  if (result.bequests[0].description.length !== 2000) {
    throw new Error(`Expected 2000 chars in description, got ${result.bequests[0].description.length}`);
  }
});

test('255-char Unicode string (mixed scripts) survives round-trip', () => {
  // Mix of CJK, Arabic, Hebrew, Latin — each char is multi-byte in UTF-8
  const mixed = '太郎'.repeat(50) + 'فَاطِمَة'.repeat(5) + 'דָּוִד'.repeat(5) + 'A'.repeat(255 - 100 - 25 - 15);
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'planning',
      createdAt: '2026-04-05T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: { country: 'GB', legalSystems: ['common_law'] },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: mixed,
        familyName: 'Test',
        roles: ['testator'],
      },
    ],
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');
});

// ===========================================================================
// Test 7: Boundary money values
// ===========================================================================

console.log('\n--- Test 7: Boundary money values round-trip ---');

test('money amount 0 round-trips without precision loss', () => {
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'planning',
      createdAt: '2026-04-05T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: { country: 'GB', legalSystems: ['common_law'] },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: 'Test',
        familyName: 'Person',
        roles: ['testator'],
      },
    ],
    assets: [
      {
        id: '88888888-8888-4888-8888-888888888888',
        name: 'Zero-value asset',
        category: 'financial',
        estimatedValue: money(0),
      },
    ],
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');
  if (result.assets[0].estimatedValue.amount !== 0) {
    throw new Error(`Expected 0, got ${result.assets[0].estimatedValue.amount}`);
  }
});

test('money amount 999999999999999 (max boundary) round-trips without precision loss', () => {
  const maxAmount = 999999999999999;
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'planning',
      createdAt: '2026-04-05T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: { country: 'GB', legalSystems: ['common_law'] },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: 'Test',
        familyName: 'Person',
        roles: ['testator'],
      },
    ],
    assets: [
      {
        id: '88888888-8888-4888-8888-888888888888',
        name: 'Maximum-value asset',
        category: 'financial',
        estimatedValue: money(maxAmount),
      },
    ],
    properties: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        name: 'Expensive property',
        propertyType: 'detached',
        tenureType: 'ownership',
        estimatedValue: money(maxAmount, 'USD'),
      },
    ],
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');

  // Explicit precision check
  if (result.assets[0].estimatedValue.amount !== maxAmount) {
    throw new Error(`Asset amount precision lost: expected ${maxAmount}, got ${result.assets[0].estimatedValue.amount}`);
  }
  if (result.properties[0].estimatedValue.amount !== maxAmount) {
    throw new Error(`Property amount precision lost: expected ${maxAmount}, got ${result.properties[0].estimatedValue.amount}`);
  }
});

test('money amount -999999999999999 (negative boundary) round-trips without precision loss', () => {
  const minAmount = -999999999999999;
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'planning',
      createdAt: '2026-04-05T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: { country: 'GB', legalSystems: ['common_law'] },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: 'Test',
        familyName: 'Person',
        roles: ['testator'],
      },
    ],
    liabilities: [
      {
        id: '99999999-9999-4999-8999-999999999999',
        name: 'Maximum liability',
        liabilityType: 'other',
        currentBalance: money(minAmount),
      },
    ],
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');

  if (result.liabilities[0].currentBalance.amount !== minAmount) {
    throw new Error(`Liability amount precision lost: expected ${minAmount}, got ${result.liabilities[0].currentBalance.amount}`);
  }
});

test('multiple money values at boundaries in one document', () => {
  const doc = baseDocument({
    estate: {
      id: '11111111-1111-4111-8111-111111111111',
      testatorPersonId: '22222222-2222-4222-8222-222222222222',
      status: 'planning',
      createdAt: '2026-04-05T00:00:00Z',
      lastModifiedAt: '2026-04-05T00:00:00Z',
      domicile: { country: 'GB', legalSystems: ['common_law'] },
    },
    people: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        givenName: 'Test',
        familyName: 'Person',
        roles: ['testator'],
      },
    ],
    assets: [
      {
        id: '88888888-8888-4888-8888-888888888881',
        name: 'Zero asset',
        category: 'financial',
        estimatedValue: money(0),
      },
      {
        id: '88888888-8888-4888-8888-888888888882',
        name: 'One penny',
        category: 'financial',
        estimatedValue: money(1),
      },
      {
        id: '88888888-8888-4888-8888-888888888883',
        name: 'Max asset',
        category: 'financial',
        estimatedValue: money(999999999999999),
      },
      {
        id: '88888888-8888-4888-8888-888888888884',
        name: 'Negative asset',
        category: 'financial',
        estimatedValue: money(-999999999999999),
      },
    ],
    bequests: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        bequestType: 'pecuniary',
        beneficiaryId: '22222222-2222-4222-8222-222222222222',
        amount: money(999999999999999),
        description: 'Max bequest amount.',
      },
    ],
  });

  const result = roundTrip(doc);
  deepEqual(doc, result, 'root');

  // Verify each boundary explicitly
  const amounts = result.assets.map(a => a.estimatedValue.amount);
  const expected = [0, 1, 999999999999999, -999999999999999];
  for (let i = 0; i < expected.length; i++) {
    if (amounts[i] !== expected[i]) {
      throw new Error(`Asset ${i} amount: expected ${expected[i]}, got ${amounts[i]}`);
    }
  }
});

// ===========================================================================
// Test 8: Fixture files (all available)
// ===========================================================================

console.log('\n--- Test 8: All fixture files round-trip ---');

import { readdirSync } from 'fs';

const fixturesDir = resolve(ROOT, 'examples/fixtures');
const fixtureFiles = readdirSync(fixturesDir).filter(f => f.endsWith('.json'));

for (const file of fixtureFiles) {
  test(`${file} round-trips without data loss`, () => {
    const filePath = resolve(fixturesDir, file);
    const raw = readFileSync(filePath, 'utf-8');
    const original = JSON.parse(raw);
    const result = roundTrip(original);
    deepEqual(original, result, 'root');
  });
}

// ===========================================================================
// Scorecard
// ===========================================================================

const total = passed + failed;
console.log(`\nRound-trip tests: ${passed} passed, ${failed} failed, ${total} total`);
process.exit(failed > 0 ? 1 : 0);
