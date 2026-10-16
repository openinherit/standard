---
github_issue: https://github.com/openinherit/standard/pull/73
---

# Proposal 0006: A wish can be about a whole collection, not only a single item

**Status:** under-review — the pull request that carries this document also carries the schema
change it describes. Merging that pull request is acceptance; closing it is rejection.
**Author:** Testate Technologies
**Date:** 2026-10-16
**Change class:** additive. One optional property on `wish.json`, plus a constraint that applies
only when that new property is present. No existing document becomes invalid, and no existing
field changes meaning.

## Summary

Add `relatedCollectionId` to `wish.json`, a reference to an `AssetCollection.id`, so that a wish can
be about an entire collection. A wish may name a single item (`relatedAssetId`) or a whole
collection (`relatedCollectionId`), but not both. This is the same pairing `bequest.json` already
uses.

## Motivation

Today an heir can ask for a whole collection, but the owner cannot record a wish about one.

Measured by parsing the v6.7.0 schemas rather than grepping them:

| Schema | What it records | Single item | Whole collection |
|---|---|---|---|
| `asset-interest.json` | someone's interest in a thing (the asking side) | `assetId` | `collectionId` |
| `bequest.json` | a gift in a will (binding) | `assetIds` | `assetCollectionId`, and `not: {required: [assetIds, assetCollectionId]}` |
| `wish.json` | the owner's non-binding wish, e.g. `wishType: distribution` | `relatedAssetId` | **absent** |

So an heir can record *"I would like Dad's model railway"* against the collection. Dad can leave the
railway to Michael at collection grain, but only in a will, as a `Bequest`. Without a will,
using `wishType: distribution` (*"preferences about how specific items should be distributed
informally"*), he can only record that wish against each of the railway's twelve items one at a
time. `wish.json` declares `unevaluatedProperties: false`, so a wish carrying a collection reference
is **rejected** today.

That is the wrong grain for the usual case. When siblings disagree, they disagree about the
collection, not about item 7 of 12. And splitting a collection wish across its items gets the
meaning wrong: a wish about the collection covers items added to it later, while twelve item wishes
do not.

### What v6.7.0 already says — and what this proposal therefore does not add

- **The asking side is complete.** `asset-interest.json` covers interest at both grains, with
  `interestLevel`, `intentType`, `expressedByRole`, `sourceType`, `testatorAcknowledged`,
  `productMatch` and `preOrderStatus`. Nothing here duplicates it.
- **The binding decision is complete.** `bequest.json` already has `assetCollectionId` and refuses a
  bequest that names both items and a collection.
- Only the **non-binding, owner-authored** side is missing collection grain, and `wish.json` is that
  side.

## Design

One new optional property, placed next to the one it pairs with, and one top-level constraint:

```diff
     "relatedAssetId": {
-      "description": "Reference to an Asset.id this wish relates to (e.g. a pet, a digital account, a specific item)",
+      "description": "Reference to an Asset.id this wish relates to (e.g. a pet, a digital account, a specific item). A wish may reference either relatedAssetId (a single item) or relatedCollectionId (an entire collection), not both",
       …
     },
+    "relatedCollectionId": {
+      "description": "Reference to an AssetCollection.id, if the wish relates to an entire collection rather than a single item. A wish may reference either relatedAssetId (a single item) or relatedCollectionId (an entire collection), not both",
+      "type": "string",
+      "pattern": "<uuid>",
+      "format": "uuid"
+    },
 …
+  "not": {
+    "required": [ "relatedAssetId", "relatedCollectionId" ]
+  },
```

The wording and the `not` constraint follow `bequest.json`'s `assetIds` / `assetCollectionId`
exactly, so a document cannot use one convention for the will and another for the wish.

### The generated validators enforce it too

The Zod (`@openinherit/sdk/zod`) and pydantic validators are generated from these schemas, and
the generators dropped a schema's own top-level `not`. So both would have accepted a wish naming an
item and a collection. They **already** accepted a bequest doing so: that case sat in
`scripts/runtime-validator-divergences.json` as a known `false_accept`. Adding a second entry was
not an option, because the register may only shrink. `scripts/lib/write-conditional-layer.py` now
compiles a top-level `not` as an unconditional assertion that both evaluators check. Only
`bequest.json` and `wish.json` have one. Four register entries no longer reproduce and are removed:
the bequest not-both case, and a wish with an unknown root property (the now-layered `Wish`
refuses it), each on both validators.

The type is `string`, not `["string", "null"]` as on `asset-interest.json`'s `collectionId`, because
it pairs with `relatedAssetId`, which is a plain `string`. Using the same type on both halves of the
pair keeps the `not` constraint unambiguous.

## How each part is proved

| Claim | Command | What makes it go red |
|---|---|---|
| A wish can name a whole collection | `npm test`: new case in `tests/v3/wish/wish.test.json`, a `distribution` wish with `relatedCollectionId` (valid) | removing the property, because `unevaluatedProperties: false` then rejects it |
| A wish cannot name an item and a collection together | same suite: a wish with both (invalid) | removing the `not` constraint |
| The reference is a UUID | same suite: a non-UUID `relatedCollectionId` (invalid) | dropping the `pattern` |
| Single-item wishes are unchanged | the existing `relatedAssetId` cases in the same file | any change to `relatedAssetId` |
| The generated Zod and pydantic validators refuse an item and a collection together | `node scripts/test-runtime-validators.mjs` and `pytest packages/sdk-python` (corpus against the register, exact both ways) | removing the assertion loop from either evaluator: the wish case and the bequest case both come back as `REGRESSION` |
| `packages/schema/v3` mirrors `v3` | `diff -r v3/ packages/schema/v3/` (Staleness Check) | editing one tree only |
| The generated artefacts carry it | `docs:reference:check`, the OpenAPI drift gate, the runtime-validator regeneration | editing the schema without regenerating |
| Nothing v1 could say is lost | the v1 completeness floor gate | narrowing or deleting `relatedAssetId` |

The new cases are written first and shown failing against the unchanged schema before the schema
changes.

## Backwards compatibility

Additive. Every document valid under v6.7.0 stays valid: the new property is optional, and the
`not` constraint can only fail when the new property is present. The only documents whose validity
changes are ones that **failed** before, namely a wish carrying `relatedCollectionId` on its own,
which now passes.

## Alternatives considered

- **Record the owner's collection decision as an `AssetInterest`** with `expressedByRole: testator`
  and `intentType: allocate`. Rejected. `personId` there is the person *expressing* the interest, so
  an allocation has nowhere to name the person the thing should go to. It would also put the owner's
  own decision in the record of what other people have asked for.
- **Require a `Bequest`.** Rejected: that answers the will case only. A `Wish` exists for the case
  where there is no will, or where the owner is giving guidance rather than making a gift.
- **Change `relatedAssetId` to accept an asset id or a collection id.** Rejected. A reader could no
  longer tell which kind of thing the id refers to without looking it up, and it would change what
  an existing field means.
- **Make `relatedAssetId` an array.** Out of scope. Several items are not the same as a collection,
  and the same distinction is why `bequest.json` keeps `assetIds` and `assetCollectionId` apart.

## Open questions — not settled by this proposal

1. **Level 2.** `schema.json`'s `referentialIntegrity` does not declare `wishes[].relatedAssetId`, so
   no validator checks that a wish's item exists. This proposal does not declare
   `wishes[].relatedCollectionId` either, so both halves of the pair are treated the same. Declaring
   both is a two-row change of its own.
2. **Who the item or collection should go to.** A `distribution` wish carries its recipient only in
   free text (`content`), and `addresseePersonId` is the person the wish is *addressed to*, not the
   recipient. `asset-interest.json`'s `intentType: allocate` has the same gap. A structured recipient
   reference is a separate change.
