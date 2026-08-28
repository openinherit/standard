# Conformance Levels

INHERIT defines three conformance levels for document validation, modelled on W3C and FHIR conformance testing.

## The Three Levels

### Level 1: Schema Valid

The document passes JSON Schema 2020-12 validation against all referenced INHERIT schemas.

**What it tests:**
- All required fields are present
- Field types are correct (string, integer, array, etc.)
- Enum values are from allowed sets
- Format assertions pass (UUIDs, dates, emails are validated, not just annotated)
- `unevaluatedProperties` rejects unknown fields

**What it doesn't test:**
- Whether cross-references actually point to real entities
- Whether jurisdiction-specific requirements are met

**Example failures:**
- Missing `id` on a person → fails
- `amount: 325.50` on a money object (must be integer) → fails
- `roles: ["king"]` on a person (not a valid role) → fails

### Level 2: Referentially Intact

All cross-references within the document resolve to existing entities.

**What it tests:**
- `estate.testatorPersonId` matches a person in `people`
- `bequest.beneficiaryId` matches a person in `people`
- `executor.personId` matches a person in `people`
- `bequest.propertyId` matches a property in `properties` (if present)
- Witness person IDs in attestations match people in `people`

**What it doesn't test:**
- Whether the estate is complete for its jurisdiction

**Example failures:**
- Bequest references `beneficiaryId: "abc-123"` but no person has that ID → fails
- Estate references a testator who isn't in the people array → fails

### Level 3: Jurisdiction Complete

All jurisdiction-required fields are populated per the active extension.

**What it tests:**
- For a UK E&W estate: `nilRateBand`, `residenceNilRateBand`, `inheritanceTaxRate` are present
- For a Japanese estate: `kosekiRecords` are present
- For an Islamic estate: `heirClassifications` are present
- Extension-specific mandatory fields are populated

**What it doesn't test:**
- Whether the values are correct (that's legal advice, not validation)

**Example failures:**
- UK estate missing `nilRateBand` in the extension data → fails
- Islamic estate missing heir classifications → fails

## Checking Your Document's Level

Run the test suite locally:

```bash
pnpm test
```

The `/validate` endpoint (when available) returns which level the document achieves:

```json
{
  "valid": true,
  "conformanceLevel": 2,
  "errors": [
    {
      "path": "/estate/extensions/uk-england-wales",
      "message": "Missing required field: nilRateBand",
      "level": "warning"
    }
  ]
}
```

A document at Level 2 with Level 3 warnings is perfectly usable — it just means some jurisdiction-specific fields are incomplete.

## Two Implementations Before Stable

No schema reaches `stable` maturity until at least two independent implementations pass Level 2 conformance. See the [Maturity Model](maturity-model.md) for details.
