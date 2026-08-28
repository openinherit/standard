#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

/**
 * INHERIT referential integrity validator.
 *
 * Validates that UUID cross-references between entities resolve
 * to actual entries in the document. For example:
 * - bequest.beneficiaryId must exist in people[].id
 * - executor.personId must exist in people[].id
 * - kinship.personId1 must exist in people[].id
 * - valuation.entityId must exist in assets[].id, properties[].id, or assetCollections[].id
 *
 * Usage: node scripts/validate-refs.mjs <inherit-document.json>
 *
 * Exit codes:
 *   0 — all references valid
 *   1 — broken references found
 *   2 — usage error
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

if (process.argv.length < 3) {
  console.error('Usage: node scripts/validate-refs.mjs <inherit-document.json>');
  process.exit(2);
}

const filePath = resolve(process.argv[2]);
let doc;
try {
  doc = JSON.parse(readFileSync(filePath, 'utf-8'));
} catch (err) {
  console.error(`${RED}Error:${NC} Failed to parse ${filePath}: ${err.message}`);
  process.exit(2);
}

// ── Collect all entity IDs by type ─────────────────────────────────

function collectIds(arr) {
  if (!Array.isArray(arr)) return new Set();
  return new Set(arr.filter(item => item?.id).map(item => item.id));
}

const peopleIds = collectIds(doc.people);
const assetIds = collectIds(doc.assets);
const propertyIds = collectIds(doc.properties);
const collectionIds = collectIds(doc.assetCollections);
const documentIds = collectIds(doc.documents);
const bequestIds = collectIds(doc.bequests);
const trustIds = collectIds(doc.trusts);
const executorIds = collectIds(doc.executors);
const valuationIds = collectIds(doc.valuations);
const liabilityIds = collectIds(doc.liabilities);
const lifetimeTransferIds = collectIds(doc.lifetimeTransfers);
const eventIds = collectIds((doc.applicationState || {}).events);
const organisationIds = collectIds(doc.organisations);
const spaceIds = collectIds(doc.spaces);
// Include the estate's own ID in the lookup set
const estateId = doc.estate?.id ? [doc.estate.id] : [];
const allEntityIds = new Set([
  ...estateId,
  ...peopleIds, ...assetIds, ...propertyIds, ...collectionIds,
  ...documentIds, ...bequestIds, ...trustIds, ...executorIds,
  ...valuationIds, ...liabilityIds, ...lifetimeTransferIds, ...eventIds,
  ...organisationIds, ...spaceIds,
]);

let errors = 0;

function checkRef(entityType, entityIndex, fieldName, refValue, validSets, validSetNames) {
  if (!refValue) return;
  for (const validSet of validSets) {
    if (validSet.has(refValue)) return;
  }
  console.error(
    `${RED}BROKEN REF:${NC} ${entityType}[${entityIndex}].${fieldName} = "${refValue}" ` +
    `→ not found in ${validSetNames}`
  );
  errors++;
}

function checkRefArray(entityType, entityIndex, fieldName, refArray, validSets, validSetNames) {
  if (!Array.isArray(refArray)) return;
  refArray.forEach((refValue, i) => {
    checkRef(entityType, entityIndex, `${fieldName}[${i}]`, refValue, validSets, validSetNames);
  });
}

// ── Validate cross-references ──────────────────────────────────────

// Estate
if (doc.estate) {
  checkRef('estate', 0, 'testatorPersonId', doc.estate.testatorPersonId, [peopleIds], 'people');
  checkRef('estate', 0, 'companionEstateId', doc.estate.companionEstateId, [allEntityIds], 'all entities');
  checkRef('estate', 0, 'mirrorWillId', doc.estate.mirrorWillId, [allEntityIds], 'all entities');
}

// Bequests
(doc.bequests || []).forEach((b, i) => {
  checkRef('bequests', i, 'beneficiaryId', b.beneficiaryId, [peopleIds], 'people');
  checkRef('bequests', i, 'sourceAssetId', b.sourceAssetId, [assetIds, propertyIds], 'assets/properties');
  checkRefArray('bequests', i, 'assetIds', b.assetIds, [assetIds, propertyIds], 'assets/properties');
  checkRefArray('bequests', i, 'hotchpotTransferIds', b.hotchpotTransferIds, [lifetimeTransferIds], 'lifetimeTransfers');
  checkRef('bequests', i, 'assetCollectionId', b.assetCollectionId, [collectionIds], 'assetCollections');
});

// Executors
(doc.executors || []).forEach((e, i) => {
  checkRef('executors', i, 'personId', e.personId, [peopleIds], 'people');
});

// Guardians
(doc.guardians || []).forEach((g, i) => {
  checkRef('guardians', i, 'guardianPersonId', g.guardianPersonId, [peopleIds], 'people');
  checkRefArray('guardians', i, 'childPersonIds', g.childPersonIds, [peopleIds], 'people');
});

// Kinships
(doc.kinships || []).forEach((k, i) => {
  checkRef('kinships', i, 'personId1', k.personId1, [peopleIds], 'people');
  checkRef('kinships', i, 'personId2', k.personId2, [peopleIds], 'people');
});

// Relationships
(doc.relationships || []).forEach((r, i) => {
  checkRef('relationships', i, 'personId1', r.personId1, [peopleIds], 'people');
  checkRef('relationships', i, 'personId2', r.personId2, [peopleIds], 'people');
});

// Trusts
(doc.trusts || []).forEach((t, i) => {
  if (Array.isArray(t.trustees)) {
    t.trustees.forEach((trustee, j) => {
      checkRef('trusts', i, `trustees[${j}].personId`, trustee.personId, [peopleIds], 'people');
    });
  }
  if (Array.isArray(t.beneficiaries)) {
    t.beneficiaries.forEach((ben, j) => {
      checkRef('trusts', i, `beneficiaries[${j}].personId`, ben.personId, [peopleIds], 'people');
    });
  }
});

// Valuations
(doc.valuations || []).forEach((v, i) => {
  checkRef('valuations', i, 'entityId', v.entityId, [assetIds, propertyIds, collectionIds], 'assets/properties/collections');
});

// Lifetime transfers
(doc.lifetimeTransfers || []).forEach((lt, i) => {
  checkRef('lifetimeTransfers', i, 'donorPersonId', lt.donorPersonId, [peopleIds], 'people');
  checkRef('lifetimeTransfers', i, 'doneePersonId', lt.doneePersonId, [peopleIds], 'people');
  checkRef('lifetimeTransfers', i, 'assetId', lt.assetId, [assetIds, propertyIds], 'assets/properties');
});

// Nonprobate transfers
(doc.nonprobateTransfers || []).forEach((nt, i) => {
  checkRef('nonprobateTransfers', i, 'beneficiaryPersonId', nt.beneficiaryPersonId, [peopleIds], 'people');
  checkRef('nonprobateTransfers', i, 'assetId', nt.assetId, [assetIds, propertyIds], 'assets/properties');
});

// Proxy authorisations
(doc.proxyAuthorisations || []).forEach((pa, i) => {
  checkRef('proxyAuthorisations', i, 'grantorPersonId', pa.grantorPersonId, [peopleIds], 'people');
  checkRef('proxyAuthorisations', i, 'agentPersonId', pa.agentPersonId, [peopleIds], 'people');
});

// Dealer interests (applicationState)
((doc.applicationState || {}).dealerInterests || []).forEach((di, i) => {
  checkRef('applicationState.dealerInterests', i, 'assetId', di.assetId, [assetIds, propertyIds, collectionIds], 'assets/properties/collections');
});

// Events (applicationState)
((doc.applicationState || {}).events || []).forEach((ev, i) => {
  checkRefArray('applicationState.events', i, 'affectedEntityIds', ev.affectedEntityIds, [allEntityIds], 'all entities');
});

// Documents
(doc.documents || []).forEach((d, i) => {
  checkRef('documents', i, 'entityId', d.entityId, [allEntityIds], 'all entities');
});

// Assets — collection and space references
(doc.assets || []).forEach((a, i) => {
  checkRef('assets', i, 'assetCollectionId', a.assetCollectionId, [collectionIds], 'assetCollections');
  checkRef('assets', i, 'spaceId', a.spaceId, [spaceIds], 'spaces');
  if (a.splitFrom) {
    const splitSets = a.splitFrom.entityType === 'asset_collection' ? [collectionIds] : [assetIds];
    const splitNames = a.splitFrom.entityType === 'asset_collection' ? 'assetCollections' : 'assets';
    checkRef('assets', i, 'splitFrom.entityId', a.splitFrom.entityId, splitSets, splitNames);
  }
});

// Asset collections — split references
(doc.assetCollections || []).forEach((ac, i) => {
  if (ac.splitFrom) {
    const splitSets = ac.splitFrom.entityType === 'asset_collection' ? [collectionIds] : [assetIds];
    const splitNames = ac.splitFrom.entityType === 'asset_collection' ? 'assetCollections' : 'assets';
    checkRef('assetCollections', i, 'splitFrom.entityId', ac.splitFrom.entityId, splitSets, splitNames);
  }
});

// Spaces — property references
(doc.spaces || []).forEach((s, i) => {
  checkRef('spaces', i, 'propertyId', s.propertyId, [propertyIds], 'properties');
});

// ── Report ─────────────────────────────────────────────────────────

console.log('');
if (errors === 0) {
  console.log(`${GREEN}All cross-references valid.${NC}`);
  process.exit(0);
} else {
  console.log(`${RED}${errors} broken reference(s) found.${NC}`);
  process.exit(1);
}
