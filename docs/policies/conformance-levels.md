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

## Conformance Profiles

A level says **how well** a document conforms. A profile says **what kind** of document it claims
to be. INHERIT has one root, `v3/schema.json`, and two profiles of it, declared in the document by
`conformanceProfile` ([proposal 0003](../../proposals/0003-catalogue-conformance-profile.md)):

| Profile | Declared by | Required | Use it for |
|---|---|---|---|
| `estate` | `conformanceProfile: "estate"`, or nothing at all | `schemaVersion`, `estate`, `people` | a full estate document |
| `catalogue` | `conformanceProfile: "catalogue"` | `assets`. `estate` is not allowed | a catalogue of what a living person owns, with no estate envelope |

A catalogue-profile document carries `assetInterests`, `legacyContacts`, `dealerInterests`,
`giftListSettings`, `legacyLetter`, `completeness` and `recommendedActions` **at the root**, the
same as in `v3/catalogue.json`. It validates against `v3/schema.json` and `v3/catalogue.json`
unchanged.

**Do not wrap a catalogue in an estate document to make it conform.** The estate profile only
carries those members inside `applicationState`, which is not part of the interchange standard.
Declare the catalogue profile instead.

The levels apply to both profiles. Level 3 (jurisdiction complete) is about an estate's
jurisdiction, so it has no meaning for a catalogue-profile document. A catalogue's conformance
certificate therefore records `level_1` or `level_2`, with `"profile": "catalogue"`:

```bash
pnpm run test:catalogue-profile   # every catalogue fixture conforms to the root at this profile
```

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

No schema reaches `stable` maturity until at least two independent implementations pass Level 2 conformance. See the [Maturity Model](../releases/maturity-model.md) for details.
