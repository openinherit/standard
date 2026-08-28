# INHERIT Primer

A narrative walkthrough of the INHERIT open estate data standard — from first principles to a working document.

## What Is INHERIT?

INHERIT is an open data standard for estate planning information. It provides a common JSON format for representing everything that makes up an estate plan: the people involved, what they own, what they owe, who gets what, and who's responsible for making it happen.

INHERIT is a **data product for estate planning** in the sense described by Viotti & Itelman in *Unifying Business, Data, and Code* (O'Reilly, 2024) — it packages structure (JSON Schema), meaning (descriptions, enum definitions, reference data), and context (jurisdiction extensions, temporal rules, provenance) together. This is not just a schema set: it is a complete, self-describing data product that eliminates ambiguity, fills knowledge gaps, and removes blind spots from estate data interchange.

Before implementing INHERIT validation, read the [JSON Profile](../policies/json-profile.md) — it defines the parsing and boundary rules that all conformant implementations must follow.

The standard comprises 31 core entity schemas, 14 common types, 5 asset category schemas, and 17 jurisdictional extensions covering common law, civil law, Islamic, Jewish, Hindu, Japanese, African customary, and mixed legal traditions. v3 adds Scotland, Ireland, UAE (dual-track Sharia/DIFC), and India (multi-personal-law).

### What's New in v3

- **`applicationState`** separates interchange data from application-specific state
- **Asset decomposition** — the 86-property asset entity is split into a lean core + 5 category schemas (financial, vehicle, digital, business, general)
- **`$schema`** replaces the old `inherit`/`version` ceremony
- **`estate.domicile`** replaces `estate.jurisdiction`
- **Money type** adds `exponent` field and IEEE 754 integer bounds
- **Temporal kinship** — relationships have `effectiveFrom`, `effectiveTo`, `legalBasis`, `recognisedIn`
- **Contestability** — structured challenge grounds with Banks v Goodfellow limbs
- **Tax treaties** and per-asset `taxTreatment`
- **Death verification** — OpenID Foundation alignment for delegation triggers
- **Posthumous AI consent** — record wishes about AI recreation of likeness
- **21 referential integrity constraints** with formal path syntax
- **Testamentary scenarios** for mirror wills and survivorship
- **Access instructions** with visibility control for digital assets
- **Canonical identity** (inherit-ici-v1) for cross-document person matching
- **Machine-readable conformance rules** on extensions with error codes

## Why Does It Exist?

Estate planning information is trapped in proprietary systems. When a client moves between advisers, or a family needs to understand what a deceased relative arranged, the information doesn't travel. INHERIT gives it a portable, machine-readable format.

More importantly: when people can see their options clearly, they make better decisions. INHERIT powers tools that present estate planning information in plain language, turning an avoided conversation into a resolved one.

## The Four-Facet Data Product

Every INHERIT document is a data product with four facets:

1. **Data** — The estate information: people, assets, bequests, trusts, executors
2. **Structure** — How it's formatted: JSON Schema 2020-12 with format assertion
3. **Meaning** — What each field means: `description` fields, `$comment` annotations, this primer
4. **Context** — Who created it and when: `exportedBy`, `generator`, `exportedAt`, `schemaVersion`, extension manifests with `lastVerified` and `dataProvenance`

> **Tip:** INHERIT uses JSON Schema 2020-12 with format assertion. For keyword-level documentation, see [learnjsonschema.com](https://www.learnjsonschema.com/2020-12/). For format validation specifics, see the [format assertion page](https://www.learnjsonschema.com/2020-12/format-assertion/).

## Worked Example: Building an INHERIT Document

Let's build a valid INHERIT document from scratch. We'll model a simple English estate: James Ashford, aged 60, leaving his house to his wife and a cash gift to his son.

### Step 1: The envelope

Every INHERIT document starts with a root envelope:

```json
{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": 3,
  "exportedAt": "2026-03-26"
}
```

- `$schema` points to the schema version
- `schemaVersion` is `3` for INHERIT v3
- `exportedAt` is when the document was created (ISO 8601)

```typescript
// Using @openinherit/sdk types
import type { InheritDocument } from '@openinherit/sdk';

const envelope: Pick<InheritDocument, '$schema' | 'schemaVersion' | 'exportedAt'> = {
  $schema: 'https://openinherit.org/v3/schema.json',
  schemaVersion: 3,
  exportedAt: '2026-03-26',
};
```

### Step 2: The estate

The estate links everything together:

```json
{
  "estate": {
    "id": "e1000000-0000-0000-0000-000000000001",
    "testatorPersonId": "a0000000-0000-0000-0000-000000000001",
    "status": "planning",
    "domicile": { "country": "GB", "subdivision": "GB-ENG" },
    "createdAt": "2026-03-26",
    "lastModifiedAt": "2026-03-26"
  }
}
```

Key points:
- All IDs are v4 UUIDs (enforced by the schema)
- `testatorPersonId` references a person we'll define next
- `domicile` uses ISO 3166-1 alpha-2 (`country`) and ISO 3166-2 (`subdivision`) codes
- `status` values: `planning`, `confirmed`, `pre_probate`, `in_administration`, `distributed`, `closed`

```typescript
// Using @openinherit/sdk types
import type { Estate } from '@openinherit/sdk';

const estate: Estate = {
  id: 'e1000000-0000-0000-0000-000000000001',
  testatorPersonId: 'a0000000-0000-0000-0000-000000000001',
  status: 'planning',
  domicile: { country: 'GB', subdivision: 'GB-ENG' },
  createdAt: '2026-03-26',
  lastModifiedAt: '2026-03-26',
};
```

### Step 3: The people

Every person referenced anywhere must appear in the `people` array:

```json
{
  "people": [
    {
      "id": "a0000000-0000-0000-0000-000000000001",
      "givenName": "James",
      "familyName": "Ashford",
      "dateOfBirth": "1965-04-12",
      "roles": ["testator"],
      "contact": {
        "address": {
          "streetAddress": "42 Acacia Avenue",
          "addressLocality": "Bristol",
          "postalCode": "BS1 4AA",
          "addressCountry": "GB"
        }
      }
    },
    {
      "id": "a0000000-0000-0000-0000-000000000002",
      "givenName": "Catherine",
      "familyName": "Ashford",
      "roles": ["beneficiary", "executor"]
    },
    {
      "id": "a0000000-0000-0000-0000-000000000003",
      "givenName": "Oliver",
      "familyName": "Ashford",
      "roles": ["beneficiary"]
    }
  ]
}
```

Only `id`, `givenName`, and `roles` are required — all other person fields are optional. A person can have multiple roles: Catherine is both a beneficiary and an executor.

```typescript
// Using @openinherit/sdk types
import type { Person } from '@openinherit/sdk';

const testator: Person = {
  id: 'a0000000-0000-0000-0000-000000000001',
  givenName: 'James',
  familyName: 'Ashford',
  dateOfBirth: '1965-04-12',
  roles: ['testator'],
  contact: {
    address: {
      streetAddress: '42 Acacia Avenue',
      addressLocality: 'Bristol',
      postalCode: 'BS1 4AA',
      addressCountry: 'GB',
    },
  },
};

const catherine: Person = {
  id: 'a0000000-0000-0000-0000-000000000002',
  givenName: 'Catherine',
  familyName: 'Ashford',
  roles: ['beneficiary', 'executor'],
};

const oliver: Person = {
  id: 'a0000000-0000-0000-0000-000000000003',
  givenName: 'Oliver',
  familyName: 'Ashford',
  roles: ['beneficiary'],
};
```

### Step 4: The property

James owns a house:

```json
{
  "properties": [
    {
      "id": "p0000000-0000-0000-0000-000000000001",
      "name": "42 Acacia Avenue",
      "propertyType": "detached",
      "tenureType": "freehold",
      "estimatedValue": { "amount": 45000000, "currency": "GBP" },
      "address": {
        "streetAddress": "42 Acacia Avenue",
        "addressLocality": "Bristol",
        "postalCode": "BS1 4AA",
        "addressCountry": "GB"
      }
    }
  ]
}
```

Note: monetary amounts are **integer minor units** (pennies). `45000000` = GBP 450,000.00.

Property types include: `detached`, `attached`, `apartment`, `land`, `commercial`, `mixed_use`, `rural`, `mobile`, `watercraft`, `other`.

```typescript
// Using @openinherit/sdk types
import type { Property } from '@openinherit/sdk';

const house: Property = {
  id: 'p0000000-0000-0000-0000-000000000001',
  name: '42 Acacia Avenue',
  propertyType: 'detached',
  tenureType: 'freehold',
  estimatedValue: { amount: 45000000, currency: 'GBP' },
  address: {
    streetAddress: '42 Acacia Avenue',
    addressLocality: 'Bristol',
    postalCode: 'BS1 4AA',
    addressCountry: 'GB',
  },
};
```

### Step 5: The bequests

James leaves the house to Catherine and GBP 10,000 to Oliver:

```json
{
  "bequests": [
    {
      "id": "b0000000-0000-0000-0000-000000000001",
      "bequestType": "specific",
      "beneficiaryId": "a0000000-0000-0000-0000-000000000002",
      "description": "My property at 42 Acacia Avenue, Bristol",
      "sourceAssetId": "p0000000-0000-0000-0000-000000000001"
    },
    {
      "id": "b0000000-0000-0000-0000-000000000002",
      "bequestType": "pecuniary",
      "beneficiaryId": "a0000000-0000-0000-0000-000000000003",
      "amount": { "amount": 1000000, "currency": "GBP" }
    }
  ]
}
```

Bequest `bequestType` values: `specific` (named item), `pecuniary` (cash sum), `general`, `demonstrative`, `residuary`, `life_interest`, and `class`.

```typescript
// Using @openinherit/sdk types
import type { Bequest } from '@openinherit/sdk';

const houseToWife: Bequest = {
  id: 'b0000000-0000-0000-0000-000000000001',
  bequestType: 'specific',
  beneficiaryId: 'a0000000-0000-0000-0000-000000000002',
  description: 'My property at 42 Acacia Avenue, Bristol',
  sourceAssetId: 'p0000000-0000-0000-0000-000000000001',
};

const cashToSon: Bequest = {
  id: 'b0000000-0000-0000-0000-000000000002',
  bequestType: 'pecuniary',
  beneficiaryId: 'a0000000-0000-0000-0000-000000000003',
  amount: { amount: 1000000, currency: 'GBP' },
};
```

### Step 6: The executor

Catherine is named as the primary executor:

```json
{
  "executors": [
    {
      "id": "x0000000-0000-0000-0000-000000000001",
      "personId": "a0000000-0000-0000-0000-000000000002",
      "role": "primary"
    }
  ]
}
```

Executor `role` values: `primary`, `secondary`, `substitute`, `administrator`, `administrator_with_will_annexed`.

```typescript
// Using @openinherit/sdk types
import type { Executor } from '@openinherit/sdk';

const executor: Executor = {
  id: 'x0000000-0000-0000-0000-000000000001',
  personId: 'a0000000-0000-0000-0000-000000000002',
  role: 'primary',
};
```

### The complete document

Combine all sections and include empty arrays for the remaining required entity types (`kinships`, `relationships`, `assets`, `assetCollections`, `liabilities`, `trusts`, `guardians`, `wishes`, `documents`, `nonprobateTransfers`, `proxyAuthorisations`, `valuations`, `lifetimeTransfers`, `organisations`, `spaces`, `insurancePolicies`, `pets`) to produce a valid Level 1 (Schema Valid) INHERIT document.

For Level 2 (Referentially Intact), all cross-references must resolve — every `beneficiaryId` matches a person, every `testatorPersonId` matches a person, etc.

## Extensions

Our example is an English estate. To add England & Wales-specific fields (IHT nil-rate band, statutory legacy, IFPA eligibility), reference the UK E&W extension in the estate's jurisdiction data.

The standard ships with 13 jurisdictional and cultural extensions: UK (England & Wales), US, Canada, EU Succession, Australia & New Zealand, Singapore & Malaysia, PRC China, Japan, Latin America, Islamic succession, Jewish succession, Hindu succession, and African customary.

Extensions add fields — they never remove or override core fields. An INHERIT document is always valid against the core schemas, with or without extensions.

## Validating a Document

INHERIT defines three conformance levels:

1. **Schema Valid** — passes JSON Schema validation
2. **Referentially Intact** — all cross-references resolve
3. **Jurisdiction Complete** — all jurisdiction-required fields populated

Run the test suite locally:

```bash
pnpm test
```

Or use the validation endpoint (when available):

```bash
curl -X POST https://api.openinherit.org/v3/validate \
  -H "Content-Type: application/json" \
  -d @my-estate.json
```

## Generating Types

Generate TypeScript types from the OpenAPI schema bundle:

```bash
pnpm run generate
```

This produces typed interfaces and API client stubs in `generated/typescript/`.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to report bugs, propose schema changes, or author extensions.
