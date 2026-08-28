# Migration Guide

A conceptual guide for developers with existing estate planning data who want to produce INHERIT-compliant documents. This guide covers common source formats and the key differences from typical data models.

---

## From a Relational Database

Most estate planning software stores data across normalised tables. INHERIT flattens these into a single JSON document with entity arrays. Here's how typical tables map:

| Your table | INHERIT entity | Notes |
|---|---|---|
| `clients` | `person` (with role: `testator`) | The client becomes a person with a testator role |
| `beneficiaries` | `person` (with role: `beneficiary`) | Not a separate array — added to the same `people` array |
| `executors` | `person` (with role: `executor`) + `executor` entity | The person goes in `people`; the executor appointment goes in `executors` with a `personId` reference |
| `assets` / `investments` | `asset` entity | Mapped to the `assets` array |
| `properties` / `real_estate` | `property` entity | Mapped to the `properties` array |
| `gifts` / `legacies` / `bequests` | `bequest` entity | Mapped to the `bequests` array |
| `trusts` | `trust` entity | Mapped to the `trusts` array |
| `guardians` | `guardian` entity | Links a guardian person to a child person |
| `liabilities` / `debts` | `liability` entity | Mapped to the `liabilities` array |

### The single people array

This is the most important conceptual shift. In a relational database, you might have separate `clients`, `beneficiaries`, `executors`, and `witnesses` tables. In INHERIT, all of these are entries in a single `people` array, distinguished by their `roles` field.

A person who is both a beneficiary and an executor appears once in `people` with `roles: ["beneficiary", "executor"]`, then is referenced by ID from both a `bequest` and an `executor` entity.

### Mapping auto-increment IDs

Your database likely uses auto-increment integers (`1`, `2`, `3`). INHERIT requires v4 UUIDs. During migration, generate a UUID for each record and maintain a lookup table mapping old IDs to new UUIDs. Use this lookup when building cross-references.

---

## From Spreadsheets / CSV

Estate data often lives in spreadsheets. Here's how common columns map to INHERIT fields:

| Spreadsheet column | INHERIT field | Transformation |
|---|---|---|
| Beneficiary Name | `person.givenName` + `person.familyName` | Split on the last space (or use a name-parsing library) |
| Gift Amount | `bequest.amount.amount` + `bequest.amount.currency` | Convert to minor units: multiply by 100 for GBP/USD/EUR |
| Property Address | `property.address.streetAddress`, `.locality`, `.postalCode`, `.country` | Split into structured address fields |
| Asset Value | `asset.estimatedValue.amount` + `asset.estimatedValue.currency` | Convert to minor units |
| Date of Birth | `person.dateOfBirth` | Convert to ISO 8601 format: `YYYY-MM-DD` |
| Country | `estate.domicile` or `address.country` | Convert to ISO 3166-1 alpha-2: `"GB"` not `"United Kingdom"` |
| Executor Name | `person.givenName` + `person.familyName` (with role `executor`) | Person goes in `people`; executor appointment in `executors` |

### Common pitfalls with spreadsheet data

- **Monetary values:** spreadsheets store `50000.00` — INHERIT needs `5000000` (integer minor units)
- **Free-text countries:** `"England"`, `"UK"`, `"United Kingdom"` must all become `"GB"`
- **Combined name fields:** `"James Ashford"` must be split into `givenName: "James"` and `familyName: "Ashford"`
- **Missing UUIDs:** every entity needs an `id` — generate one with `crypto.randomUUID()` during import

---

## From Other Formats

Whatever your source format, the migration follows the same sequence:

### Step 1: Build the people array first

Identify every person mentioned anywhere in the source data — clients, beneficiaries, executors, guardians, witnesses, trustees, attorneys. Create a `person` entry for each, assigning a UUID and the appropriate roles. Store the UUID lookup for the next steps.

### Step 2: Build assets and properties

Map each asset and property to its INHERIT entity. Convert monetary values to integer minor units. Assign UUIDs.

### Step 3: Build bequests, executors, guardians, and trusts

These entities reference people (and sometimes assets/properties) by UUID. Use the lookup from Step 1 to populate `beneficiaryId`, `personId`, etc.

### Step 4: Assemble the document

Combine everything into the INHERIT document structure with all 21 entity arrays present. Arrays with no data should be empty (`[]`), not omitted.

### Step 5: Validate

Run the document through Level 1 (schema) and Level 2 (referential integrity) validation. See the [error guide](./error-guide.md) for help with any failures. The [`validate-document.ts`](../examples/validate-document.ts) example provides a ready-made validator.

---

## Key Differences from Typical Data Models

These are the most common surprises for developers migrating existing data:

### UUIDs, not auto-increment

Every entity requires a v4 UUID as its `id`. Use `crypto.randomUUID()` in JavaScript/TypeScript, `uuid.uuid4()` in Python, or your language's equivalent. Sequential integers (`1`, `2`, `3`) will fail validation.

### Integer minor units, not decimals

All monetary amounts are integers in the smallest currency unit. For GBP, USD, and EUR (2 decimal places): multiply by 100.

- `£50,000.00` becomes `5000000`
- `$1,250.75` becomes `125075`

This eliminates floating-point rounding errors.

### Person-with-roles, not separate tables

INHERIT does not have separate `beneficiaries`, `executors`, or `witnesses` collections. There is one `people` array. Each person has a `roles` array indicating their function(s) in the estate. A single person can hold multiple roles.

### All 21 entity arrays must be present

Even if your estate has no trusts, no guardians, and no liabilities, those arrays must exist as empty arrays (`[]`) in the document. The schema requires their presence. The full set is: `people`, `kinships`, `relationships`, `properties`, `assets`, `assetCollections`, `liabilities`, `bequests`, `trusts`, `executors`, `guardians`, `wishes`, `documents`, `nonprobateTransfers`, `proxyAuthorisations`, `valuations`, `lifetimeTransfers`, `organisations`, `spaces`, `insurancePolicies`, and `pets`.

### Strict schemas — no extra fields

INHERIT schemas use [`unevaluatedProperties: false`](https://www.learnjsonschema.com/2020-12/unevaluated/unevaluatedproperties/) on every entity. You cannot include additional fields from your internal data model. If you need to preserve extra data, strip it before export or store it separately.

### ISO 8601 dates

All dates must be in `YYYY-MM-DD` format. Not `DD/MM/YYYY`, not `MM-DD-YYYY`, not Unix timestamps.

### ISO 3166 jurisdiction codes

Jurisdictions use ISO 3166-1 alpha-2 codes (`GB`, `US`, `AU`), not free-text country names. These must be exactly 2 uppercase letters.

---

## Understanding INHERIT's Schema Features

These resources explain the JSON Schema 2020-12 features that INHERIT relies on:

- [Why extra fields are rejected](https://www.learnjsonschema.com/2020-12/unevaluated/unevaluatedproperties/) — `unevaluatedProperties` is set to `false` on every INHERIT entity, preventing unrecognised fields from being silently accepted
- [How INHERIT defines reusable types ($defs)](https://www.learnjsonschema.com/2020-12/core/defs/) — shared definitions like `MoneyAmount`, `Address`, and `DateRange` are defined once and referenced across schemas
- [How INHERIT cross-references schemas ($ref)](https://www.learnjsonschema.com/2020-12/core/ref/) — entity schemas reference common definitions and each other using `$ref`
- [Why INHERIT validates formats](https://www.learnjsonschema.com/2020-12/format-assertion/) — UUIDs, dates, and emails are validated (not just annotated), catching malformed values at schema level
