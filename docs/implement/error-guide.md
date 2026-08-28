---
title: "Error Guide"
version: "1.1"
status: draft
date: 2026-04-06T12:00
lastmod: 2026-04-07T18:00
author: "Rich Davies"
source: "docs/implement/error-guide.md"
---

# Error Guide

A developer-friendly reference for every validation error INHERIT can produce, organised by [conformance level](./conformance-levels.md). Each entry shows the AJV error message, what it means, and how to fix it.

---

## Error Format: RFC 9457

INHERIT's validation API returns errors following [RFC 9457 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457). This is the standard error format used by Spring Boot, ASP.NET, FastAPI, and most modern API gateways.

### Content-Type

Error responses use `Content-Type: application/problem+json`.

### Error Types

| Type URI | Title | Status | When |
|---|---|---|---|
| `https://openinherit.org/errors/invalid-json` | Invalid JSON | 400 | Malformed JSON, encoding error, duplicate keys |
| `https://openinherit.org/errors/schema-validation` | Schema Validation Failed | 422 | Document fails Level 1 conformance |
| `https://openinherit.org/errors/referential-integrity` | Referential Integrity Failed | 422 | Document fails Level 2 conformance |
| `https://openinherit.org/errors/payload-too-large` | Payload Too Large | 413 | Exceeds 10 MB limit |

### Example Error Response

```json
{
  "type": "https://openinherit.org/errors/schema-validation",
  "title": "Schema Validation Failed",
  "status": 422,
  "detail": "The estate document failed Level 1 (Schema Valid) conformance.",
  "instance": "/validate",
  "errors": [
    {
      "pointer": "/persons/0/dateOfBirth",
      "message": "Must match format 'date' (YYYY-MM-DD)",
      "level": "error"
    }
  ]
}
```

---

## Level 1 Errors (Schema Validation)

Level 1 errors are produced by AJV when the document fails JSON Schema 2020-12 validation. These are structural problems — wrong types, missing fields, invalid values.

### 1. `must have required property 'id'`

**What it means:** Every INHERIT entity (person, asset, bequest, etc.) must have an `id` field containing a UUID.

**Fix:**

```typescript
// Wrong — missing id
const person = {
  givenName: "James",
  familyName: "Ashford",
  roles: ["testator"],
};

// Correct — add a UUID id
const person = {
  id: crypto.randomUUID(),
  givenName: "James",
  familyName: "Ashford",
  roles: ["testator"],
};
```

---

### 2. `must match format "uuid"`

**What it means:** The `id` field must be a valid v4 UUID, not a plain string or sequential number. INHERIT validates formats — it does not merely annotate them.

**Fix:**

```typescript
// Wrong — plain strings are not UUIDs
const person = { id: "1", givenName: "James" };
const person = { id: "my-person", givenName: "James" };

// Correct — use crypto.randomUUID()
const person = { id: crypto.randomUUID(), givenName: "James" };
// e.g. id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
```

---

### 3. `must be integer`

**What it means:** Monetary amounts in INHERIT use integer minor units (pennies/cents), not decimal values. This avoids floating-point rounding errors that plague financial calculations.

**Fix:**

```typescript
// Wrong — decimal amount
const bequest = {
  id: crypto.randomUUID(),
  amount: { amount: 50000.00, currency: "GBP" },
};

// Correct — integer minor units (50000.00 GBP = 5000000 pence)
const bequest = {
  id: crypto.randomUUID(),
  amount: { amount: 5000000, currency: "GBP" },
};
```

**Conversion rule:** multiply the human-readable amount by 100 (for currencies with 2 decimal places).

---

### 4. `must be equal to one of the allowed values`

**What it means:** The field is an enum — only specific values are permitted. Check the schema for the allowed list.

**Common example — person roles:**

```typescript
// Wrong — "heir" is not a valid INHERIT role
const person = {
  id: crypto.randomUUID(),
  givenName: "Sarah",
  familyName: "Ashford",
  roles: ["heir"],
};

// Correct — use a valid role from the enum
const person = {
  id: crypto.randomUUID(),
  givenName: "Sarah",
  familyName: "Ashford",
  roles: ["beneficiary"],
};
```

**Valid person roles:** `testator`, `beneficiary`, `executor`, `guardian`, `trustee`, `witness`, `attorney`, `proxy`, `protector`, `enforcer`.

---

### 5. `must NOT have additional properties` / `must NOT have unevaluated properties`

**What it means:** INHERIT uses strict schemas with [`unevaluatedProperties: false`](https://www.learnjsonschema.com/2020-12/unevaluated/unevaluatedproperties/) on every entity root. Any field not defined in the schema is rejected. This is intentional — it catches typos and prevents data from silently being ignored.

**Fix:**

```typescript
// Wrong — "type" is not a field on property; the correct name is "propertyType"
const property = {
  id: crypto.randomUUID(),
  type: "residential",           // typo: should be propertyType
  address: { /* ... */ },
};

// Correct — use the exact field name from the schema
const property = {
  id: crypto.randomUUID(),
  propertyType: "residential",
  address: { /* ... */ },
};
```

**Debugging tip:** if you see this error, check for:
- Misspelt field names (e.g. `type` instead of `propertyType`)
- Fields from your internal data model that don't exist in INHERIT
- camelCase vs other casing (INHERIT uses camelCase throughout)

> **Learn more:** [Understanding unevaluatedProperties](https://www.learnjsonschema.com/2020-12/unevaluated/unevaluatedproperties/) on learnjsonschema.com explains how this keyword works with `allOf`, `$ref`, and schema composition.

---

### 6. `must match pattern "^[A-Z]{2}$"`

**What it means:** Country and jurisdiction codes must be exactly 2 uppercase letters, following ISO 3166-1 alpha-2.

**Fix:**

```typescript
// Wrong — lowercase, or 3-letter code
const estate = {
  jurisdiction: "gb",     // lowercase
};
const estate = {
  jurisdiction: "GBR",    // 3-letter ISO 3166-1 alpha-3
};

// Correct — 2 uppercase letters
const estate = {
  jurisdiction: "GB",
};
```

---

### 7. `must NOT have fewer than 1 items` / `must NOT have fewer than 2 items`

**What it means:** Some arrays have `minItems` constraints. An empty array (or one that's too short) will fail.

**Examples:**

```typescript
// Wrong — person.roles requires at least 1 item
const person = {
  id: crypto.randomUUID(),
  givenName: "James",
  familyName: "Ashford",
  roles: [],  // minItems: 1
};

// Correct — provide at least one role
const person = {
  id: crypto.randomUUID(),
  givenName: "James",
  familyName: "Ashford",
  roles: ["testator"],
};
```

```typescript
// Wrong — relationship.partners requires at least 2
const relationship = {
  id: crypto.randomUUID(),
  partners: ["one-person-id"],  // minItems: 2
};

// Correct — a relationship needs at least two partners
const relationship = {
  id: crypto.randomUUID(),
  partners: ["person-id-1", "person-id-2"],
};
```

---

### 8. Conditional validation failures (`if`/`then`)

**What it means:** INHERIT uses JSON Schema [`if`/`then`/`else`](https://www.learnjsonschema.com/2020-12/applicator/if/) for conditional requirements. When a field matches a condition, additional fields become required.

**Example — specific bequest requires a beneficiary:**

```typescript
// Wrong — type "specific" requires beneficiaryId or beneficiaryOrganisation
const bequest = {
  id: crypto.randomUUID(),
  bequestType: "specific",
  description: "My Rolex Submariner",
  // missing: who gets it?
};

// Correct — specify who receives it
const bequest = {
  id: crypto.randomUUID(),
  bequestType: "specific",
  description: "My Rolex Submariner",
  beneficiaryId: "person-uuid-here",
};
```

**Debugging tip:** conditional validation errors can be confusing because AJV reports failures against the `then` branch without always making the `if` condition obvious. Check the schema's `if`/`then` blocks to understand which conditions trigger which requirements.

> **Learn more:** [Understanding if/then/else](https://www.learnjsonschema.com/2020-12/applicator/if/) on learnjsonschema.com.

---

## Level 2 Errors (Referential Integrity)

Level 2 errors occur when cross-references within the document point to entities that don't exist. These are caught by the referential integrity checker, not by JSON Schema.

### 9. `Person "xyz" not found in people array`

**What it means:** A field that references a person (by UUID) points to an ID that doesn't exist in the `people` array. This applies to:

- `estate.testatorPersonId`
- `bequest.beneficiaryId`
- `executor.personId`
- `guardian.personId`
- `guardian.childPersonId`
- Witness person IDs in attestations

**Fix:**

```typescript
const people = [
  { id: "aaaa-bbbb-cccc-dddd", givenName: "James", familyName: "Ashford", roles: ["testator"] },
];

// Wrong — references a person who doesn't exist
const estate = {
  testatorPersonId: "xxxx-yyyy-zzzz-0000",  // not in people array
};

// Correct — use an ID that exists in the people array
const estate = {
  testatorPersonId: "aaaa-bbbb-cccc-dddd",
};
```

**Debugging tip:** generate all your people first, store their IDs, then reference those IDs when building estates, bequests, executors, and guardians.

---

### 10. `Property "xyz" not found` / `Asset "xyz" not found`

**What it means:** A bequest or other entity references a property or asset by ID, but that ID doesn't exist in the `properties` or `assets` array.

**Fix:**

```typescript
const assets = [
  { id: "asset-uuid-1", category: "investment", description: "ISA portfolio" },
];

// Wrong — references a non-existent asset
const bequest = {
  id: crypto.randomUUID(),
  sourceAssetId: "asset-uuid-999",  // not in assets array
};

// Correct — reference an asset that exists
const bequest = {
  id: crypto.randomUUID(),
  sourceAssetId: "asset-uuid-1",
};
```

---

## Level 3 Errors (Jurisdiction Complete)

Level 3 validation is not yet automated. Extension-specific field requirements are documented per extension in `v3/extensions/`. Automated checking is planned for a future release.

When Level 3 checking is available, it will verify that jurisdiction-required fields are populated — for example, that a UK England & Wales estate includes `nilRateBand` and `inheritanceTaxRate` in its extension data.

---

### 11. `must match format "date"`

**What it means:** Date fields in INHERIT require ISO 8601 format: `YYYY-MM-DD`. Other date formats — UK (`DD/MM/YYYY`), US (`MM/DD/YYYY`), or natural language (`12 March 2026`) — are rejected.

**Fix:**

```typescript
// Wrong — UK date format
const estate = {
  id: crypto.randomUUID(),
  testatorPersonId: "aaaa-bbbb-cccc-dddd",
  status: "draft",
  jurisdiction: { country: "GB", subdivision: "GB-ENG" },
  createdAt: "26/03/2026",       // DD/MM/YYYY — not ISO 8601
  lastModifiedAt: "26/03/2026",
};

// Wrong — US date format
const estate = {
  // ...
  createdAt: "03-26-2026",       // MM-DD-YYYY — not ISO 8601
};

// Wrong — natural language
const estate = {
  // ...
  createdAt: "March 26, 2026",   // not machine-parseable
};

// Correct — ISO 8601 date
const estate = {
  id: crypto.randomUUID(),
  testatorPersonId: "aaaa-bbbb-cccc-dddd",
  status: "draft",
  jurisdiction: { country: "GB", subdivision: "GB-ENG" },
  createdAt: "2026-03-26",       // YYYY-MM-DD
  lastModifiedAt: "2026-03-26",
};
```

**Conversion tip:** `new Date().toISOString().split('T')[0]` produces the correct format in JavaScript/TypeScript.

---

### 12. Missing required entity arrays

**What it means:** The root INHERIT document requires all entity arrays to be present, even if they are empty. If you omit `trusts`, `guardians`, `wishes`, or any other entity array, the document fails validation.

**AJV error:** `must have required property 'trusts'` (or whichever array is missing)

**Fix:**

```typescript
// Wrong — only includes arrays that have data
const doc = {
  $schema: "https://openinherit.org/v3/schema.json",
  schemaVersion: 3,
  estate: { /* ... */ },
  people: [{ /* ... */ }],
  bequests: [{ /* ... */ }],
  // Missing: kinships, relationships, properties, assets, assetCollections,
  //          liabilities, trusts, executors, guardians, wishes, documents,
  //          nonprobateTransfers, proxyAuthorisations, valuations,
  //          lifetimeTransfers, organisations, spaces, insurancePolicies, pets
};

// Correct — include all required arrays, even if empty
const doc = {
  $schema: "https://openinherit.org/v3/schema.json",
  schemaVersion: 3,
  estate: { /* ... */ },
  people: [{ /* ... */ }],
  kinships: [],
  relationships: [],
  properties: [],
  assets: [],
  assetCollections: [],
  liabilities: [],
  bequests: [{ /* ... */ }],
  trusts: [],
  executors: [],
  guardians: [],
  wishes: [],
  documents: [],
  nonprobateTransfers: [],
  proxyAuthorisations: [],
  valuations: [],
  lifetimeTransfers: [],
  organisations: [],
  spaces: [],
  insurancePolicies: [],
  pets: [],
};
```

**Tip:** the full list of required arrays is: `people`, `kinships`, `relationships`, `properties`, `assets`, `assetCollections`, `liabilities`, `bequests`, `trusts`, `executors`, `guardians`, `wishes`, `documents`, `nonprobateTransfers`, `proxyAuthorisations`, `valuations`, `lifetimeTransfers`, `organisations`, `spaces`, `insurancePolicies`, `pets`.

---

### 13. `must match format "uuid"`  (non-UUID string)

**What it means:** All `id` fields and cross-reference fields (e.g. `personId`, `testatorPersonId`, `beneficiaryId`) must be valid UUIDs. Sequential integers, slugs, and other string formats are rejected.

**AJV error:** `must match format "uuid"`

**Fix:**

```typescript
// Wrong — sequential integer as string
const person = { id: "1", givenName: "James", roles: ["testator"] };

// Wrong — slug/readable identifier
const person = { id: "james-ashford", givenName: "James", roles: ["testator"] };

// Wrong — missing hyphens
const person = { id: "a1b2c3d4e5f64a7b8c9d0e1f2a3b4c5d", givenName: "James", roles: ["testator"] };

// Correct — standard UUID v4 format (8-4-4-4-12 hex digits)
const person = {
  id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  givenName: "James",
  roles: ["testator"],
};

// Best practice — generate at runtime
const person = {
  id: crypto.randomUUID(),
  givenName: "James",
  roles: ["testator"],
};
```

---

### 14. `must be integer` (monetary amount as decimal)

**What it means:** All monetary amounts in INHERIT are integer minor units — pennies, cents, or the smallest unit of the currency. Decimal values like `50000.00` are rejected because they introduce floating-point rounding risks.

**AJV error:** `must be integer`

**Fix:**

```typescript
// Wrong — decimal pounds
const bequest = {
  id: crypto.randomUUID(),
  type: "pecuniary",
  beneficiaryId: "a0000000-0000-0000-0000-000000000003",
  amount: { amount: 10000.00, currency: "GBP" },  // decimal!
};

// Wrong — decimal with string
const bequest = {
  // ...
  amount: { amount: "10000.00", currency: "GBP" },  // string, not integer
};

// Correct — integer minor units (GBP 10,000.00 = 1,000,000 pence)
const bequest = {
  id: crypto.randomUUID(),
  type: "pecuniary",
  beneficiaryId: "a0000000-0000-0000-0000-000000000003",
  amount: { amount: 1000000, currency: "GBP" },
};
```

**Conversion formula:** multiply the human-readable amount by 100 for currencies with 2 decimal places (GBP, USD, EUR). For zero-decimal currencies (JPY), use the amount directly. For 3-decimal currencies (KWD, BHD), multiply by 1000.

---

### 15. `must be equal to one of the allowed values` (unknown enum value)

**What it means:** A field constrained by an `enum` received a value not in the allowed list. This commonly happens when using values from a different system, misspelling a value, or using a value from an extension without the extension schema loaded.

**AJV error:** `must be equal to one of the allowed values`

**Fix:**

```typescript
// Wrong — "house" is not a valid propertyType
const property = {
  id: crypto.randomUUID(),
  name: "42 Acacia Avenue",
  propertyType: "house",  // not in enum
};

// Wrong — American spelling
const asset = {
  id: crypto.randomUUID(),
  name: "Grandmother's ring",
  category: "jewelry",  // should be "jewellery" (British English)
};

// Wrong — value from a different system
const person = {
  id: crypto.randomUUID(),
  givenName: "James",
  roles: ["owner"],  // "owner" is not a valid INHERIT role
};

// Correct — check the enum-reference.md for allowed values
const property = {
  id: crypto.randomUUID(),
  name: "42 Acacia Avenue",
  propertyType: "detached_house",  // valid enum value
};

const asset = {
  id: crypto.randomUUID(),
  name: "Grandmother's ring",
  category: "jewellery",  // British English spelling
};

const person = {
  id: crypto.randomUUID(),
  givenName: "James",
  roles: ["testator"],  // valid INHERIT role
};
```

**Debugging tip:** check [Enum Reference](./enum-reference.md) for the complete list of allowed values for every enum field. INHERIT uses British English spelling throughout (e.g. `jewellery`, not `jewelry`).

---

## Additional Resources

- [Comprehensive JSON Schema 2020-12 keyword reference](https://www.learnjsonschema.com/2020-12/) — full documentation for every keyword INHERIT uses
- [Understanding unevaluatedProperties](https://www.learnjsonschema.com/2020-12/unevaluated/unevaluatedproperties/) — used on every INHERIT entity to reject unknown fields
- [Understanding conditional validation (if/then/else)](https://www.learnjsonschema.com/2020-12/applicator/if/) — how INHERIT expresses conditional requirements
- [Understanding $ref (cross-schema references)](https://www.learnjsonschema.com/2020-12/core/ref/) — how INHERIT schemas reference shared definitions
- [INHERIT validation example](../examples/validate-document.ts) — working TypeScript code that implements Level 1 + Level 2 validation
