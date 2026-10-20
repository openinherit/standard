---
github_issue: https://github.com/openinherit/standard/pull/86
---

# Proposal 0008: Every declared referential-integrity rule is enforced

**Status:** under-review. The pull request carrying this document also carries the change it
describes. Merging the pull request accepts the proposal; closing it rejects the proposal.
**Author:** Testate Technologies
**Date:** 2026-10-20
**Change class:** corrective. Two declared constraints that named fields which do not exist are
replaced by one that names the real field; one constraint is added for a required reference that was
never declared. No property is added, removed or retyped. A document that was already referentially
intact stays intact; a document with a broken guardian, kinship, relationship, pet or pet-trust
reference, which passed Level 2 before, now fails it.

## Summary

`v3/schema.json`'s `referentialIntegrity` list is the normative definition of Level 2 conformance,
and `scripts/validate-refs.mjs` is the validator CI runs. Nine of the declared constraints were not
enforced. They were recorded as `KNOWN_DIVERGENCES` in `scripts/test-referential-integrity.mjs`.
After this change that list is empty, and each of the nine has a fixture that `validate-refs.mjs`
rejects when the reference is broken.

## Motivation

The nine fall into three groups.

| Constraint | Defect |
|---|---|
| `guardians[].personId` | The validator checked `guardianPersonId` and `childPersonIds`. `guardian.json` declares `personId` and `childPersonId`, so both checks read `undefined` and could never fire |
| `kinships[].fromPersonId`, `kinships[].toPersonId` | The validator checked `personId1` and `personId2`. `kinship.json` declares `fromPersonId` and `toPersonId`, so the same applies |
| `relationships[].person1Id`, `relationships[].person2Id` | Neither name exists. `relationship.json` holds its parties in `partners[]`, each with a required `personId`, minimum two. The declaration itself was wrong, and the validator checked a third spelling (`personId1` / `personId2`) |
| `pets[].petCareArrangement.trustId`, `.bequestId`, `.nominatedCarerPersonId`, `trusts[].petId` | Declared against real fields, never implemented |

So a document could name a guardian, a parent, a spouse or a pet's carer who is not in the document
and pass Level 2.

## Design

### Declarations (`v3/schema.json`)

```diff
-  { "field": "relationships[].person1Id", "references": "people[].id", "required": true, … }
-  { "field": "relationships[].person2Id", "references": "people[].id", "required": true, … }
+  { "field": "relationships[].partners[].personId", "references": "people[].id", "required": true,
+    "code": "INHERIT_REF_BROKEN",
+    "errorMessage": "Relationship partner references a person who does not exist" }
+  { "field": "guardians[].childPersonId", "references": "people[].id", "required": true,
+    "code": "INHERIT_REF_BROKEN",
+    "errorMessage": "Guardian childPersonId references a person who does not exist" }
```

One row replaces two. `partners[]` has no upper bound below 100 (polygamous marriages are in scope),
so a fixed `person1Id` / `person2Id` pair could never have described it. `guardians[].childPersonId`
is `required` in `guardian.json` and is the reference the validator was already trying, and failing,
to check. Declaring it makes the list say what the validator does.

The other seven declarations are already correct and do not change.

### Validator (`scripts/validate-refs.mjs`)

- `guardians`: check `personId` and `childPersonId`.
- `kinships`: check `fromPersonId` and `toPersonId`.
- `relationships`: check every `partners[j].personId`.
- `pets`: collect `pets[].id`; check `petCareArrangement.trustId` against `trusts`,
  `petCareArrangement.bequestId` against `bequests` and `petCareArrangement.nominatedCarerPersonId`
  against `people`.
- `trusts`: check `petId` against `pets`.

The checks against fields that do not exist are deleted, not kept alongside.

## Backwards compatibility

No property changes, so every document valid at Level 1 stays valid at Level 1. At Level 2 a
document with one of these broken references used to pass and now fails, which is the defect being
corrected. Every fixture in `examples/` and `tests/` was re-run under the corrected validator; the
pull request records the result.

## Alternatives considered

- **Remove the five broken declarations.** Rejected: guardians, kinships and relationships are the
  references intestacy and guardianship depend on. Removing the rule would make Level 2 weaker to
  make it agree with a validator bug.
- **Declare `partners[0].personId` and `partners[1].personId`.** Rejected: positional, and wrong for
  a relationship with more than two partners.
- **Keep the two `person1Id` / `person2Id` rows as aliases.** Rejected: a constraint on a field that
  cannot exist can never fire. That is the defect being fixed.

## Implementation plan

Each done-when clause, the command that proves it, and what would turn it red.

| # | Clause | Files | Proof | Goes red when |
|---|---|---|---|---|
| 1 | `KNOWN_DIVERGENCES` is empty | `scripts/test-referential-integrity.mjs` | `node scripts/test-referential-integrity.mjs`: the map is empty and a new test asserts its size is 0 | any declared `entities[].field` row lacks a matching `checkRef` call, or a line is re-added to the map |
| 2 | each of the nine has a fixture that fails `validate-refs.mjs` when the reference is broken | `tests/referential-integrity/intact.json` and `tests/referential-integrity/broken/*.json` (one per rule, including `childPersonId`) | the same suite spawns `validate-refs.mjs`: `intact.json` exits 0 and carries a value at every rule's field; each `broken/<rule>.json` exits 1 and names its field; each broken fixture differs from `intact.json` in exactly one value | a check is deleted or misspelt (that fixture exits 0), or a fixture drifts into testing two things |
| 3 | `run-tests.yml` passes on `main` | the suite above, which `run-tests.yml` already runs as `test:refs` and `validate:refs:all` | the same steps run locally, then green CI on the pull request | an existing fixture carried a broken reference the old validator could not see |

The red run for clause 2 is the new fixtures against the unchanged validator, committed before the
fix and recorded in the pull request.

Mechanical follow-through: `packages/schema/v3/` re-synced, vendored bundles and generated outputs
regenerated by their own freshness checkers, with no hand edits.
