---
title: "Co-ownership on every asset, not only financial and business ones"
description: "Promote the existing coOwnership shape from two asset categories to the core Asset schema, so a jointly-owned painting, watch or vehicle can be expressed."
version: "0.1"
status: under-review
date: 2026-10-04
lastmod: 2026-10-04
github_issue: https://github.com/openinherit/standard/pulls?q=head%3Aclaude%2Fasset-owner-edge
author: "Testate Technologies"
source: "docs/proposals/asset-co-ownership.md"
change_class: additive
---

# Proposal: co-ownership on every asset

**Status:** under-review — the pull request that carries this document also carries the schema
change it describes. Merging that pull request is acceptance; closing it is rejection.
**Change class:** additive. One optional property becomes available on categories that did not
have it. No existing document becomes invalid, and no existing field changes meaning.

## Summary

`coOwnership` — co-owner person references, ownership form, the testator's share and a severance
date — is declared today on `asset-categories/financial.json` and `asset-categories/business.json`
only. Declare the same shape, unchanged, on the core `asset.json`, so that it is available to every
asset category: `vehicle`, `digital`, and the twelve categories routed to `general.json` (art,
jewellery and watches, antiques, collectibles, and the rest).

## Motivation

A jointly-owned painting, watch or car cannot be expressed in v6.6.0. `asset.json` declares
`unevaluatedProperties: false`, so an `art` asset carrying `coOwnership` is **rejected**, while a
`financial` asset carrying the identical block is accepted.

The difference matters on death. Whether an item passes **by survivorship** (joint tenancy) or
**under the will or intestacy** (tenancy in common) decides whether it is in the estate at all. A
spouse's collection is the common case of co-owned personal property, and today it can only be
recorded as though the testator owned all of it.

### What v6.6.0 already says about ownership — this is not a missing vocabulary

Measured by parsing the schemas, not by grepping them:

| Where | Field | What it carries |
|---|---|---|
| `asset.json` | `ownershipEvidence` | what proves ownership (title deed, receipts, family recognition …) |
| `asset.json` | `registrationStatus` | whether ownership is formally registered, or disputed |
| `asset.json` | `acquisitionType` | self-acquired / ancestral / inherited — drives customary succession |
| `asset.json` | `provenanceChain` | prior owners |
| `asset.json` | `custodian` | who holds the item now (a bank, a bonded warehouse, a gallery) |
| `asset-categories/financial.json`, `business.json` | `coOwnership` | **who else owns it**, in what form, and the testator's share |
| `property.json` | `ownershipType`, `ownershipPercentage`, `ownershipModel` | the same for real property |

So the gap is narrower than "assets have no ownership fields". It is: **the co-owner edge exists, but
only for two of five asset category groups.** The history explains why — the v3 changelog lists
`coOwnership` among the sub-objects originally added to `asset.json`; when category-specific fields
were decomposed into `asset-categories/*.json`, it went to `financial` and `business` only.

### Who the owner is, when there is only one

In an estate document the owner of every asset is the testator, `estate.testatorPersonId`, by
construction: `ownershipPercentage` is defined as *"the testator's ownership percentage"* everywhere
it appears. This proposal does not add a separate owner reference for the sole-owner case, because
in an estate document there is nothing for it to say that the root does not already say.

## Design

One new optional property on `asset.json`, byte-for-byte the shape already published on the two
categories:

```diff
   "ownershipEvidence": { … },
+  "coOwnership": {
+    "description": "Co-ownership details for assets held jointly or in common with others. Determines whether the asset passes by survivorship or under the will",
+    "$comment": "… Declared on the core asset so every category can express it; asset-categories/financial.json and business.json carry the identical shape …",
+    "type": "object",
+    "properties": {
+      "coOwnerPersonIds":    { "type": "array", "items": { "format": "uuid", … }, … },
+      "ownershipType":       { "enum": [ "joint_tenants", "tenants_in_common", "community_property", "partnership", "other" ] },
+      "ownershipPercentage": { "type": "number", "minimum": 0, "maximum": 100 },
+      "severanceDate":       { "format": "date", … }
+    },
+    "additionalProperties": false
+  },
```

The two category declarations are **left in place**. Under `allOf` both apply to a financial or
business asset, and because they are identical they cannot disagree. Removing them would change
the published file layout for no gain in what a document can say.

Two consequential corrections ride with it:

1. `reference-data/action-rules.json` rule `asset_missing_ownership_details` tests
   `coOwnership.ownershipShare`, a field no schema declares. The rule therefore fires on **every**
   co-owned asset, recorded share or not. It now tests `coOwnership.ownershipPercentage`. With
   co-ownership reachable from every category, leaving it would multiply the false positives.
2. A test pins the three declarations equal and pins every `coOwnership.*` path named in reference
   data to a declared property, so neither defect can come back silently.

## How each part is proved

| Claim | Command | What makes it go red |
|---|---|---|
| Every category can carry `coOwnership` | `pnpm test` — new cases in `tests/v3/asset/asset.test.json` (art, jewellery/watches, vehicle, digital: valid; bad `ownershipType` on art: invalid) | removing the core property — `unevaluatedProperties: false` rejects it on art, vehicle and digital |
| The three declarations agree | `node scripts/test-co-ownership-shape.mjs` | editing any one of the three copies without the other two |
| Reference data names only real `coOwnership` fields | same script | restoring `coOwnership.ownershipShare` |
| Nothing v1 could say is lost | the v1 completeness floor gate | deleting or narrowing either category declaration |
| `packages/schema/v3` mirrors `v3` | `diff -r v3/ packages/schema/v3/` (Staleness Check) | editing one tree only |

## Backwards compatibility

Additive. Every document valid under v6.6.0 stays valid: the new property is optional, and the
categories that already had it see an identical second declaration. The only documents whose
validity changes are ones that **failed** before — a non-financial, non-business asset carrying
`coOwnership` — which now pass.

The action-rule correction changes behaviour for consumers that evaluate it: a co-owned asset that
records `ownershipPercentage` no longer raises *"Record ownership details"*. That is the rule
starting to work as its own title and description say it should.

## Alternatives considered

- **Reuse `property.json`'s flat fields** (`ownershipType` / `ownershipPercentage` /
  `ownershipModel` at the top level of the asset). Rejected: it would give assets a second,
  differently-shaped way to say what `coOwnership` already says for financial and business assets,
  and `property.json` has no co-owner person reference to reuse — it records the testator's share
  but not who holds the rest.
- **Move `coOwnership` into a shared `v3/common/co-ownership.json` and `$ref` it from all three
  places.** Cleaner, and a reasonable later step. Not done here because it moves the published
  definition out of two files that consumers and tooling already address by path; this change is
  meant to add expressiveness without relocating anything.
- **Widen `ownershipType` to match `property.json`** (`tenancy_by_entirety`, `trust`). Out of scope:
  it changes what the existing financial and business field accepts, which is a decision of its own.

## Open questions — not settled by this proposal

1. **Catalogue documents.** `catalogue.json` has no `people[]` array, so `coOwnerPersonIds` in a
   catalogue has nothing to resolve against, and a catalogue has no field naming whose collection
   it is. Naming the owner of a catalogued item that is *not* the person cataloguing it is a
   separate change.
2. **Level 2.** `reference-data/validation-rules.json` already says every `coOwnerPersonId` must be
   in `people[]`, but `schema.json`'s `referentialIntegrity` does not declare it, so no validator
   enforces it. Declaring it is a one-row change; it is left out here because of question 1 —
   it would make every catalogue that records a co-owner fail Level 2.
