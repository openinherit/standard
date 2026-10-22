#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

/**
 * INHERIT referential integrity validator.
 *
 * Validates that UUID cross-references between entities resolve
 * to actual entries in the document. For example:
 * - bequest.beneficiaryId must exist in people[].id
 * - executor.personId must exist in people[].id
 * - kinship.fromPersonId must exist in people[].id
 * - valuation.entityId must exist in assets[].id, properties[].id, or assetCollections[].id
 * - asset.propertyId must exist in properties[].id
 * - a tombstones[].id must NOT exist in any live entity array
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
const petIds = collectIds(doc.pets);
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
  checkRef('guardians', i, 'personId', g.personId, [peopleIds], 'people');
  checkRef('guardians', i, 'childPersonId', g.childPersonId, [peopleIds], 'people');
});

// Kinships
(doc.kinships || []).forEach((k, i) => {
  checkRef('kinships', i, 'fromPersonId', k.fromPersonId, [peopleIds], 'people');
  checkRef('kinships', i, 'toPersonId', k.toPersonId, [peopleIds], 'people');
});

// Relationships — every partner, not a fixed pair: partners[] has no upper
// bound below the array cap, because a polygamous marriage is in scope.
(doc.relationships || []).forEach((r, i) => {
  (Array.isArray(r.partners) ? r.partners : []).forEach((p, j) => {
    checkRef('relationships', i, `partners[${j}].personId`, p?.personId, [peopleIds], 'people');
  });
});

// Pets — the trust, bequest and carer that provide for the pet's care
(doc.pets || []).forEach((p, i) => {
  const care = p.petCareArrangement || {};
  checkRef('pets', i, 'petCareArrangement.trustId', care.trustId, [trustIds], 'trusts');
  checkRef('pets', i, 'petCareArrangement.bequestId', care.bequestId, [bequestIds], 'bequests');
  checkRef('pets', i, 'petCareArrangement.nominatedCarerPersonId', care.nominatedCarerPersonId, [peopleIds], 'people');
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
  checkRef('trusts', i, 'petId', t.petId, [petIds], 'pets');
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

// Assets — collection, space and property references
(doc.assets || []).forEach((a, i) => {
  checkRef('assets', i, 'assetCollectionId', a.assetCollectionId, [collectionIds], 'assetCollections');
  checkRef('assets', i, 'spaceId', a.spaceId, [spaceIds], 'spaces');
  checkRef('assets', i, 'propertyId', a.propertyId, [propertyIds], 'properties');
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

// Liabilities — the asset or property a secured debt is charged against.
// Multi-target: securedAgainst is documented as "Property.id or Asset.id", and a
// mortgage — the paradigm secured liability — points at a property, so a
// single-target rule would reject the commonest case in the standard.
(doc.liabilities || []).forEach((l, i) => {
  checkRef('liabilities', i, 'securedAgainst', l.securedAgainst,
           [assetIds, propertyIds], 'assets/properties');
});

// Spaces — property references
(doc.spaces || []).forEach((s, i) => {
  checkRef('spaces', i, 'propertyId', s.propertyId, [propertyIds], 'properties');
});

// Tombstones (proposal 0010) — an id the document says was deleted must not
// also be live in it. Every entity array is searched, not only the one the
// tombstone's entityType names: a deleted person kept alive as an asset is
// the same contradiction.
const LIVE_ENTITY_ARRAYS = [
  'people', 'kinships', 'relationships', 'properties', 'assets', 'assetCollections',
  'liabilities', 'bequests', 'trusts', 'executors', 'guardians', 'wishes', 'documents',
  'nonprobateTransfers', 'proxyAuthorisations', 'powersOfAppointment', 'valuations',
  'lifetimeTransfers', 'organisations', 'spaces', 'insurancePolicies', 'pets',
  'assetInterests', 'dealerInterests', 'legacyContacts', 'recommendedActions',
];

(doc.tombstones || []).forEach((t, i) => {
  if (!t?.id) return;
  for (const array of LIVE_ENTITY_ARRAYS) {
    (Array.isArray(doc[array]) ? doc[array] : []).forEach((entity, j) => {
      if (entity?.id !== t.id) return;
      console.error(
        `${RED}INHERIT_TOMBSTONE_LIVE:${NC} tombstones[${i}].id = "${t.id}" ` +
        `→ still live at ${array}[${j}]`
      );
      errors++;
    });
  }
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
