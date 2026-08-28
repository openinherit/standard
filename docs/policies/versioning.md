# Versioning and Compatibility

How INHERIT schemas change over time, and what that means for your implementation.

## Schema Version

Every INHERIT document includes a `schemaVersion` field in the root:

```json
{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "3.0.0",
  "estate": { "..." },
  "people": [ "..." ]
}
```

This tells consumers exactly which schema revision the document was created against. The `$schema` field identifies the schema URI; `schemaVersion` is the semver version of the standard itself.

## Maturity Levels

Each INHERIT schema has a maturity level that determines what changes are permitted:

| Level | Meaning | What Can Change | What Cannot Change |
|-------|---------|----------------|--------------------|
| **Draft** | Experimental — may change without notice | Anything: fields, types, enums, required status | Nothing is guaranteed |
| **Candidate** | Stabilising — backwards-compatible changes only | New optional fields, new enum values, new descriptions | No removals, no type changes, no new required fields |
| **Stable** | Frozen — no changes until next major version | Descriptions, examples, `$comment` annotations only | Everything structural |

### Current Status (v3)

- **31 core entity schemas:** candidate maturity (includes root schema, catalogue, and conformance-declaration)
- **15 common type schemas:** candidate maturity (money, address, jurisdiction, temporal-rule, identifier, visibility, media, completeness, tax-position, cultural-disposition, ai-provenance, audit-event, field-provenance, provenance)
- **5 asset category schemas:** candidate maturity (financial, vehicle, digital, business, general)
- **21 extension schemas:** draft maturity

Promotion to stable requires two independent implementations using the schema in production.

## What Is a Breaking Change?

| Change | Breaking? | Maturity Allowed |
|--------|-----------|-----------------|
| Add an optional field | No | Draft, Candidate |
| Add a new enum value | No | Draft, Candidate |
| Add `description`, `examples`, `$comment` | No | Draft, Candidate, Stable |
| Remove a field | **Yes** | Draft only |
| Change a field's type | **Yes** | Draft only |
| Make an optional field required | **Yes** | Draft only |
| Remove an enum value | **Yes** | Draft only |
| Rename a field | **Yes** | Draft only |

## Enum Evolution

INHERIT schemas use `enum` constraints on many fields (role types, status values, asset categories, trust types). These enums will evolve as new jurisdictions and use cases are supported.

### Request enums vs response enums

In the INHERIT context, a "request enum" is a value provided by a document author (e.g. `person.role`). A "response enum" is a value produced by a system (e.g. `estate.status` returned by a validator).

For **request enums** (document fields), INHERIT uses strict `enum` validation. Only the documented values are accepted. Adding a new enum value is a backwards-compatible change — existing documents remain valid because they only use existing values. Removing an enum value is a breaking change.

### SDK guidance

SDK implementations **should** handle unknown enum values gracefully:

1. Parse the value as a string, not a language-level enum
2. If the value is not in the known set, preserve it rather than discarding it
3. Log a warning or surface it to the caller, but do not throw an exception
4. This allows older SDK versions to round-trip documents created with newer schemas without data loss

### Adding enum values

When adding a new enum value to a candidate schema:

1. Add the value to the `enum` array in the schema
2. Add a `$comment` or update `description` explaining the new value
3. Add test cases for the new value
4. Record the addition in `CHANGELOG.md`
5. Bump the minor version

### Removing enum values

Enum removal is a **breaking change** and is only permitted on draft schemas. For candidate or stable schemas, deprecated enum values remain in the schema indefinitely and are marked with a `$comment` noting the deprecation.

## Deprecation Mechanism

When a field or enum value needs phasing out, INHERIT uses a structured deprecation process.

### Marking a field as deprecated

Add `"deprecated": true` to the field's schema definition and update its `description` to explain the replacement:

```json
{
  "oldFieldName": {
    "type": "string",
    "deprecated": true,
    "description": "Deprecated since v3.2.0. Use newFieldName instead."
  }
}
```

The `deprecated` keyword is a standard JSON Schema 2020-12 annotation. It does not affect validation but is surfaced by documentation generators, IDE integrations, and code generation tools.

### Deprecation lifecycle

1. **Announce** — add `deprecated: true` and update descriptions. Record in CHANGELOG.
2. **Dual support** — both old and new fields are accepted for at least one minor version cycle. Implementations must accept both.
3. **Removal** — only at a major version boundary (e.g. v3 to v4). Draft schemas may remove deprecated fields at any time.

### Deprecating enum values

Enum values cannot be removed from candidate or stable schemas. Instead, add a `$comment` noting the deprecation and document the preferred replacement in the description.

## Forward and Backward Compatibility

### Can a v3.1 consumer read a v3.0 document?

**Yes.** New optional fields added in v3.1 will simply be absent. Consumers should treat missing optional fields as not provided (see the [Null Semantics policy](./null-semantics.md)).

### Can a v3.0 consumer read a v3.1 document?

**Yes, if schemas use `unevaluatedProperties: false`.** Unknown fields will cause validation failures, but the data is still readable. Consumers should:
1. Validate with their version's schemas
2. Ignore unknown fields that fail validation (log a warning)
3. Process all known fields normally

### Recommendation for implementers

Use `unevaluatedProperties: false` for strict validation, but implement a "lenient mode" that strips unknown fields before validation. This lets you import documents from newer versions without failing.

## The `schemaVersion` Field

When present, `schemaVersion` tells you:

- `"3.0.0"` — created with the initial v3 schemas
- `"3.1.0"` — created with v3.1 schemas (may contain new optional fields)

If `schemaVersion` is missing, treat as `"3.0.0"`.

If `schemaVersion` is newer than your validator supports, validate in lenient mode (strip unknown fields, process what you can).

## Extension Compatibility

Extensions (jurisdiction-specific schemas) follow the same maturity model independently. An extension can be draft while the core schemas are candidate. The `extension.json` manifest includes:

- `inherit` — semver range of compatible core versions (e.g. `">=3.0.0 <4.0.0"`)
- `maturity` — the extension's own maturity level

## Changelog Convention

Each schema change is recorded in `CHANGELOG.md` with:

```markdown
## [Unreleased]

### Added
- `formattedAddress` field on common/address.json (optional, non-breaking) — #19
- `schemaVersion` field on root schema (optional, non-breaking) — #16
```
