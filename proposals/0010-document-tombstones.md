---
github_issue: https://github.com/openinherit/standard/pulls
---

# Proposal 0010: A document can say an entity was deleted

**Status:** under-review — the pull request that carries this document also carries the change it
describes. Merging that pull request is acceptance; closing it is rejection.
**Author:** Testate Technologies
**Date:** 2026-10-21
**Change class:** additive. One optional root array on `v3/schema.json` and `v3/catalogue.json`,
one new constraint kind on `referentialIntegrity`, and the Level 2 rows that use it. A document with
no `tombstones` validates exactly as before, at Level 1 and at Level 2.

## Summary

A document gains `tombstones[]`: one entry per entity deleted since the version named by
`previousVersionId`, giving the entity's `entityType`, its `id`, when it was deleted (`deletedAt`)
and, optionally, why (`reason`). Level 2 rejects a document that carries a tombstone for an id and
also carries a live entity with that id.

## Motivation

The standard already versions a document — `documentVersion`, `versionedAt`, `previousVersionId`
and `changeDescription` — but it has no way to say that an entity has gone. A consumer that holds
version 3 and receives version 4 can see what was added and what changed, but an entity missing
from version 4 might have been deleted or might simply not have been exported. So the only safe
exchange today is a full snapshot, and every receiver has to diff snapshots to find deletions. An
interchange format with no tombstone cannot express a delta.

## Design

### The tombstone (`v3/schema.json#/$defs/Tombstone`)

```json
"Tombstone": {
  "type": "object",
  "required": [ "entityType", "id", "deletedAt" ],
  "properties": {
    "entityType": { "enum": [ "person", "kinship", "relationship", "property", "asset",
      "asset_collection", "liability", "bequest", "trust", "executor", "guardian", "wish",
      "document", "nonprobate_transfer", "proxy_authorisation", "power_of_appointment",
      "valuation", "lifetime_transfer", "organisation", "space", "insurance_policy", "pet",
      "asset_interest", "dealer_interest" ] },
    "id":        { "type": "string", "format": "uuid", "pattern": "<the uuid pattern>" },
    "deletedAt": { "type": "string", "format": "date-time", "pattern": "<the date-time pattern>" },
    "reason":    { "type": "string", "maxLength": 2000 }
  },
  "additionalProperties": false
}
```

`entityType` uses the vocabulary `splitFrom` and `mergedInto` already use on `asset.json` and
`asset-collection.json`: `asset` and `asset_collection` are spelt exactly as there, and every other
entity that has its own root array and a required `id` is named the same way (singular,
`snake_case`). `importSources` and `extensions` are document metadata, not entities, so they have
no value. The `deletedAt` and `reason` shapes copy `splitFrom.splitAt` and `splitFrom.reason`.

`schema.json` gains `tombstones` (array of `#/$defs/Tombstone`, `maxItems` 10000) and
`catalogue.json` gains the same member by `$ref` to `schema.json#/properties/tombstones/items`, the
way it already takes `importSources`.

### The Level 2 rule (`referentialIntegrity`, kind `absent`)

The same-id rule crosses entity arrays, so it is a validator rule, not a JSON Schema keyword — the
same reason the containment-cycle rule is an `acyclic` row and not a schema keyword.
`IntegrityConstraint.kind` gains `absent`: *the value at `field` must NOT appear at `references`*.
There is one row per entity array, each `tombstones[].id` → `<array>[].id`, `required: true`, code
`INHERIT_TOMBSTONE_LIVE`. A tombstoned id is refused wherever it reappears, not only in the array
its `entityType` names: ids are UUIDs, and an id that is both deleted and alive is a contradiction
whichever array it is alive in.

`scripts/validate-refs.mjs` enforces it, and `INHERIT_TOMBSTONE_LIVE` is added to
`v3/common/error-codes.json` at level 2.

### Non-goals

What cascades when a parent is deleted; retention periods or erasure under data-protection law;
cross-document referential integrity. A tombstone records a deletion; it does not define one.

## Backwards compatibility

Additive. `tombstones` is optional and absent from every existing document, and an `absent` row with
an empty `tombstones` array can never fire, so every existing fixture validates unchanged at Level 1
and Level 2. A consumer that ignores `tombstones` reads a document exactly as it does today. A
validator that does not know kind `absent` reports `INHERIT_CONSTRAINT_UNKNOWN`, as
`referentialIntegrity` already requires — it does not skip the rule.

## Alternatives considered

- **`entityType` limited to `asset` and `asset_collection`.** Rejected: that is all `splitFrom`
  needs, but an estate document deletes people, bequests and executors too, and a tombstone that
  cannot name them cannot carry an estate delta.
- **A JSON Schema keyword for the same-id rule.** Not expressible: it compares values across
  sibling arrays, which JSON Schema cannot do.
- **Check only the array `entityType` names.** Rejected: it would accept a document that tombstones
  an id as a person and keeps it alive as an asset.
- **A `deleted: true` flag on each entity instead of a separate array.** Rejected: it keeps the
  deleted entity's whole record in the document, which is the opposite of a deletion, and touches
  every entity schema.

## Implementation plan

Each done-when clause, the command that proves it, and what would turn it red.

| # | Clause | Files | Proof | Goes red when |
|---|---|---|---|---|
| 1 | both schemas accept a document carrying tombstones (entityType, id, deletedAt), and every existing fixture still validates unchanged | `v3/schema.json`, `v3/catalogue.json`; L1 cases in `tests/v3/schema/schema.test.json` and `tests/v3/catalogue/catalogue.test.json` | `pnpm test`, `pnpm run validate:examples`, `pnpm run test:catalogue-profile` — the new valid cases pass; invalid cases (no `deletedAt`, unknown `entityType`, an extra member) are refused; every pre-existing case keeps its result | the member is missing from either root (`unevaluatedProperties: false` refuses the valid case), or a required member is dropped (the invalid case passes) |
| 2 | the validator rejects a document with a tombstone and a live entity sharing that id, and a test shows it going red | `scripts/validate-refs.mjs`, `scripts/test-referential-integrity.mjs`, `tests/referential-integrity/tombstones/*.json` | `pnpm run test:refs`: `live-same-id.json` exits 1 naming `INHERIT_TOMBSTONE_LIVE`; for **every** `absent` row the suite plants the tombstoned id in that row's array and requires exit 1; a test requires every root entity array of both schemas to have a row | the check is removed or skips an array (that array's case exits 0), or a new entity array is added without a row |
| 3 | the fixtures are in the standard's test suite and CI is green | `tests/referential-integrity/tombstones/` (valid with tombstones, valid with none, invalid with a live same-id entity), plus the L1 cases above | the same commands, then green CI on the pull request | any fixture regresses |
| 4 | every commit passes the publication redline (`--staged`, exit 0) and v1 completeness reports no lost capability | every commit | the redline run before each commit; `check-v1-completeness.py --target .` at the branch head | a commit carries a redline hit, or the change loses a v1 key |
| 5 | the engine's ICP record names the merged pull request | engine registry | after this pull request merges | — |

The red run for clause 2 is the new tests against the unchanged validator, committed before the
check and recorded in the pull request.

Mechanical follow-through: `packages/schema/v3/` re-synced, vendored bundles and generated outputs
regenerated by their own freshness checkers, with no hand edits.
