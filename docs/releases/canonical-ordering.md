# Canonical Field Ordering

A convention for consistent field ordering across INHERIT documents and schemas. This ordering is advisory — validators do not enforce it — but following it makes documents easier to read, diff, and review.

## Why Define an Ordering?

JSON objects are unordered by specification. Most implementations preserve insertion order, and most serialisers output fields in the order they appear in the source object. When everyone follows the same convention, documents produced by different tools look structurally similar, making comparison and review straightforward.

## Entity Field Ordering

For every INHERIT entity, fields should appear in this order:

1. **Identity** — `id` (always first)
2. **Classification** — type/category/role fields that describe what this entity is (e.g. `category`, `type`, `role`, `propertyType`)
3. **Core identity fields** — name, title, and other human-readable identifiers (e.g. `name`, `givenName`, `familyName`, `title`)
4. **Relationships** — references to other entities by ID (e.g. `personId`, `testatorPersonId`, `beneficiaryId`, `propertyId`, `assetId`)
5. **Domain fields** — the substantive content specific to this entity type (e.g. `estimatedValue`, `tenure`, `amount`, `scope`)
6. **Temporal** — dates and timestamps (e.g. `createdAt`, `lastModifiedAt`, `dateOfBirth`, `valuationDate`)
7. **Metadata** — notes, extensions, and audit fields (e.g. `notes`, `visibility`, extension blocks)

### Example: Asset

```json
{
  "id": "d4e5f6a7-b8c9-0123-def4-56789abcdef0",
  "category": "jewellery_watches",
  "name": "Grandmother's engagement ring",
  "propertyId": "p0000000-0000-0000-0000-000000000001",
  "estimatedValue": { "amount": 350000, "currency": "GBP" },
  "valuationConfidence": "estimated",
  "condition": "good",
  "ownershipCategory": "joint",
  "valuationDate": "2026-01-15",
  "notes": "Insured with Hiscox, policy ref HX-2026-4421"
}
```

### Example: Person

```json
{
  "id": "a0000000-0000-0000-0000-000000000001",
  "roles": ["testator"],
  "givenName": "James",
  "familyName": "Ashford",
  "dateOfBirth": "1965-04-12",
  "contact": { "email": "james@example.com" },
  "sharedWithCompanion": false,
  "notes": "Prefers to be called Jim"
}
```

## Root Document Ordering

The root INHERIT document should order its fields as follows:

1. `inherit` — schema URI (always first)
2. `version` — major version number
3. `schemaVersion` — semver string
4. `exportedAt` — when the document was created
5. `exportedBy` — who created it
6. `generator` — which tool created it
7. `estate` — the estate object
8. Entity arrays (in standard order — see below)
9. `extensions` — extension URIs (always last)

## Standard Entity Array Order

Entity arrays in the root document should appear in this order:

1. `people`
2. `kinships`
3. `relationships`
4. `properties`
5. `assets`
6. `assetCollections`
7. `liabilities`
8. `bequests`
9. `trusts`
10. `executors`
11. `guardians`
12. `wishes`
13. `documents`
14. `nonprobateTransfers`
15. `proxyAuthorisations`
16. `valuations`
17. `lifetimeTransfers`
18. `organisations`
19. `spaces`
20. `insurancePolicies`
21. `pets`

This order follows a logical narrative: who is involved (people, kinships, relationships), what they own (properties, assets, collections, liabilities), what happens to it (bequests, trusts), who manages it (executors, guardians), what the testator wants (wishes), supporting documents, transfer/authorisation mechanisms (nonprobate transfers, proxy authorisations), professional valuations, lifetime transfers, organisations, spaces, insurance policies, and pets.

## Not Enforced by Validation

INHERIT validators do not reject documents with non-canonical field ordering. This convention exists to improve human readability and tooling consistency. SDK serialisers and code generators should output fields in canonical order by default, but consumers must accept fields in any order.
