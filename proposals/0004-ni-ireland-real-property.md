# Proposal 0004: Real property in Northern Ireland and Ireland — local tenure and land registration

**Status:** under-review — the pull request that carries this document also carries the schema
change it describes. Merging that pull request is acceptance; closing it is rejection.
**Author:** Testate Technologies
**Date:** 2026-10-07
**Change class:** additive. Two optional properties on the Ireland extension, and one new core
extension (`northern-ireland`). No existing field changes meaning, and no document that uses only
core extensions becomes invalid. The one exception is under Backwards Compatibility: an
`x-inherit-northern-ireland` block that was previously validated only as a community extension.

## Summary

Let an estate in Northern Ireland or in Ireland say what its land is held under (freehold,
leasehold or fee farm grant), which register the title is on (a land registry folio or the Registry
of Deeds), and the class of registered title. Ireland gains `localTenureTypes` and
`landRegistration` on `x-inherit-ireland`. Northern Ireland, which had no extension at all, gains
`x-inherit-northern-ireland` carrying the same two properties.

## Motivation

Two of the four UK and Irish jurisdictions could not record their own real property.

- **Tenure.** `property.json` holds a territory-neutral `tenureType` (`ownership`, `lease`, …). The
  local term lives in each geographic extension: England & Wales carries `localTenureTypes`
  (`freehold`, `leasehold`, `commonhold`, `share_of_freehold`). Ireland's extension had no tenure
  slot and Northern Ireland had no extension. Neither could record a **fee farm grant**: a fee
  simple subject to a perpetual rent, still common on Northern Ireland housing, and still found on
  older Irish titles even though new ones can no longer be created.
- **Registration.** `property.landRegistry` describes HM Land Registry, which operates in England
  and Wales only. Northern Ireland and Ireland each run two registers: a land registry that records
  title in **folios**, and a **Registry of Deeds** for title that is still unregistered, where the
  deeds are the title. Which register a property is on decides how an executor proves and transfers
  it. Northern Ireland also has a class of registered title, *good fee farm grant*, with no England
  & Wales equivalent.

### What v6.6.0 already says — ownership needed nothing new

| Where | Field | Northern Ireland and Ireland |
|---|---|---|
| `property.json` | `ownershipType` | `joint_tenants` (passes by survivorship) and `tenants_in_common` (passes under the will or intestacy) are the two forms of co-ownership in both jurisdictions. Already expressible |
| `property.json` | `tenureType` | `ownership` / `lease` — the territory-neutral layer. Already expressible |
| `property.json` | `registrationStatus` | whether ownership is formally registered or informally held. Expressible for folio land (`formally_registered`). It has no value for *title unregistered, deeds recorded in the Registry of Deeds* — that is what `landRegistration.register` now says, so the example estates leave `registrationStatus` off those properties rather than mislabel them |

The two new example estates use `ownershipType` and `tenureType` unchanged.

## Design

### Ireland — `v3/extensions/ireland/ireland.json`

```json
"localTenureTypes": {
  "type": "array", "maxItems": 50,
  "items": {
    "type": "object",
    "properties": {
      "propertyId": { "type": "string", "format": "uuid" },
      "localType": { "enum": [ "freehold", "leasehold", "fee_farm_grant" ] }
    },
    "required": [ "propertyId", "localType" ],
    "additionalProperties": false
  }
},
"landRegistration": {
  "type": "array", "maxItems": 50,
  "items": {
    "type": "object",
    "properties": {
      "propertyId": { "type": "string", "format": "uuid" },
      "register": { "enum": [ "land_registry", "registry_of_deeds" ] },
      "folioNumber": { "type": "string", "maxLength": 50 },
      "titleClass": { "enum": [ "absolute", "qualified", "possessory", "good_leasehold" ] },
      "deedsReference": { "type": "string", "maxLength": 100 },
      "retrievedAt": { "type": "string", "format": "date-time" }
    },
    "required": [ "propertyId", "register" ],
    "allOf": [
      { "if": { "properties": { "register": { "const": "registry_of_deeds" } } },
        "then": { "properties": { "folioNumber": false, "titleClass": false } } },
      { "if": { "properties": { "register": { "const": "land_registry" } } },
        "then": { "properties": { "deedsReference": false } } }
    ],
    "additionalProperties": false
  }
}
```

A folio number and a class of title belong to registered land only, and a Registry of Deeds
reference to unregistered land only. The `if`/`then` pair rejects the mixed row under JSON Schema
validation. The generated Zod and pydantic validators cannot express it, and those eight cases are
declared in `scripts/runtime-validator-divergences.json`.

### Northern Ireland — `v3/extensions/northern-ireland/`

A new core extension, `applicableJurisdictions: ["GB-NIR"]`, maturity `draft`,
`successionCoverage: none` and `taxCoverage: none`, which says plainly that it carries real property
only. Its two properties have the same shape as Ireland's, with `titleClass` adding
`good_fee_farm_grant`. It is wired like every other core extension: an `if`/`then` block in
`v3/schema.json`, a row in `extensions-registry.json`, an OpenAPI component, and the resolve lists in
`package.json`. `reference-data/jurisdiction-cascade.json` gains a `GB-NIR` entry: succession
refused with a reason (no Northern Ireland succession profile ships yet), inheritance tax resolving
to the GB rows like the other UK subdivisions.

### Enforcement

`scripts/check-real-property-vocabulary.mjs`, run in the test workflow, refuses:

| Rule | Refuses |
|---|---|
| R1 | an England & Wales, Northern Ireland or Ireland extension without a `localTenureTypes[].localType` enum |
| R2 | Northern Ireland or Ireland without `landRegistration[].register` and `.titleClass` enums |
| R3 | a pinned value removed (`freehold`, `leasehold`, `fee_farm_grant`, `land_registry`, `registry_of_deeds`, each class of title) |
| R4 | any enum value with no `valid: true` case in the extension's test file |
| R5 | `applicableJurisdictions` other than the one legal jurisdiction pinned for that extension |

Exit 2 (cannot answer, never a pass) on a missing or unparsable file. Hermetic tests:
`scripts/test-check-real-property-vocabulary.mjs`.

## Backwards Compatibility

Additive. `x-inherit-ireland` documents without the two new properties validate as before. A
document that already carried an `x-inherit-northern-ireland` block was validated only as a
community extension (generic object). It is now validated strictly against the new schema.

Generated code: the Python code generator numbers same-named enums in file order, so the new
Ireland tenure enum takes the name `LocalType3` and the Hong Kong `localGrantTypes` enum that held it
moves to `LocalType5`. The schemas are unchanged, but **`from openinherit.models import LocalType3`
still imports and now yields the tenure members** (`freehold`, `leasehold`, `fee_farm_grant`)
instead of the grant types. Code that imported the generated enum by its numbered name should import
it through the model field (`LocalGrantType1.model_fields['localType'].annotation`) or switch to
`LocalType5`.

## Alternatives Considered

- **Generalise `property.landRegistry` to every registry.** It is shaped around HM Land Registry
  (title numbers, `freehold`/`leasehold` only) and populated from its data. Widening it would change
  what an existing field means. Local registers belong in the local extension, the way local tenure
  already does.
- **Add Northern Ireland values to the England & Wales extension.** Northern Ireland is a separate
  legal jurisdiction. One extension naming two legal jurisdictions cannot express a law that
  diverges between them, and E&W's `GB-ENG`/`GB-WLS` pair is one jurisdiction with two ISO codes,
  not a precedent for two.
- **New territory-neutral values on `property.tenureType`.** A fee farm grant is a common-law
  freehold variant particular to Ireland and Northern Ireland. The core enum stays neutral; local
  terms go in the extension.
