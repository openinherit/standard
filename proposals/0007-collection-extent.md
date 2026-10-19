---
github_issue: TBD
---

# Proposal 0007: A collection can state its own extent before any item is listed

**Status:** under-review. The pull request carrying this document also carries the schema change it
describes. Merging the pull request accepts the proposal; closing it rejects the proposal.
**Author:** Testate Technologies
**Date:** 2026-10-19
**Change class:** additive. Four optional properties on `asset-collection.json`, plus two
`dependentRequired` constraints that apply only when the new properties are present. No existing
document becomes invalid, and no existing field changes type or meaning.

## Summary

`asset-collection.json` gains four optional properties:

- `expectedItemCount`: how many items the owner says the collection holds.
- `expectedItemCountIsEstimate`: whether that count is approximate.
- `location`: where the collection is kept.
- `additionalCategories`: categories the collection spans beyond its primary `category`.

With these, an owner can describe a collection before listing a single item in it.

## Motivation

A typical first record of a collection is *"about twenty watches and some jewellery, kept at the
house in Wilmslow"*. Nothing in it has been listed yet.

Measured against v6.7.0, `asset-collection.json` has 20 properties, and none of them is a count, a
size, an extent or a location. `category` takes a single value. That record therefore has to be
squeezed into free text: the schema's own `description` example reads *"Layout stored in the loft
at Oakfield Road"*. A reader cannot get either of these out of free text:

- **How complete the inventory is.** *"9 of 12 listed"* needs a denominator the owner declared,
  separate from the number of items that happen to be listed. A count worked out from the listed
  items is always 100% complete, so it cannot show what is missing.
- **Where the collection is.** `asset.json` already has `location` for a single item. A collection
  that has no items listed yet has nowhere to record it.

A collection spanning two categories, such as watches *and* jewellery, also has to choose one
category and lose the other.

## Design

Four optional properties, placed after `category`. The existing `category` property is unchanged.

```diff
     "category": { … unchanged … },
+    "additionalCategories": {
+      "description": "Further categories the collection spans beyond its primary category, e.g. a watch collection that also holds jewellery",
+      "type": "array", "minItems": 1, "maxItems": 16, "uniqueItems": true,
+      "items": { "enum": [ …the same 16 values as category… ] }
+    },
+    "expectedItemCount": {
+      "description": "How many items the owner says the collection holds, whether or not any has been listed. …",
+      "type": "integer", "minimum": 0
+    },
+    "expectedItemCountIsEstimate": {
+      "description": "True when expectedItemCount is the owner's approximation ('roughly 20') rather than an exact count",
+      "type": "boolean"
+    },
+    "location": {
+      "description": "Where the collection is physically kept … Same meaning as location on an individual asset …",
+      "type": "string", "maxLength": 255
+    },
 …
+  "dependentRequired": {
+    "expectedItemCountIsEstimate": [ "expectedItemCount" ],
+    "additionalCategories": [ "category" ]
+  },
```

- **`expectedItemCount` is declared by the owner and never computed.** It is a single integer, not
  a range, because *"9 of 12 listed"* needs one denominator. It may be `0`: an owner can declare an
  empty shelf. Listed items may outnumber it, because the owner may have under-counted, so the
  schema does not compare the two.
- **`expectedItemCountIsEstimate` covers "roughly 20".** The integer stays usable as a denominator
  while the flag says it is approximate. Without a count there is nothing for the flag to qualify,
  so `dependentRequired` refuses it on its own.
- **`location` uses the same name, type and length limit as `asset.json`'s `location`**, so the
  word means the same thing throughout the standard.
- **`additionalCategories` draws from `category`'s own enum**, has no duplicates, and is valid only
  when `category` is present. `category` stays a single primary value. The description says it
  should not repeat `category`. That rule is not enforced, because enforcing it would need one
  conditional per enum value.
- **No defaults.** A missing count does not mean zero, and a default would invent a denominator.

## How each part is proved

| Claim | Command | What makes it go red |
|---|---|---|
| A collection can carry a count, an estimate flag, a location and additional categories with nothing listed | `npm test`: six new valid cases in `tests/v3/asset-collection/asset-collection.test.json` | removing any property, because `unevaluatedProperties: false` then rejects it |
| A count is a whole number ≥ 0, and not a range | same suite: negative, fractional and range cases (invalid) | dropping `minimum` or `type: integer` |
| An estimate flag needs a count | same suite: flag without a count (invalid) | dropping that `dependentRequired` entry |
| Additional categories need a primary, are non-empty, have no duplicates and come from the category list | same suite: four invalid cases | dropping `dependentRequired`, `minItems`, `uniqueItems` or the `enum` |
| `location` matches `asset.location` | same suite: a 256-character location (invalid) | dropping `maxLength` |
| `packages/schema/v3` mirrors `v3` | `diff -r v3/ packages/schema/v3/` (Staleness Check) | editing one tree only |
| The generated artefacts carry it | `docs:reference:check`, the OpenAPI drift gate, the runtime-validator regeneration | editing the schema without regenerating |

The new cases were written first and failed against the unchanged schema (6 of 47 failing in
`asset-collection.test.json`) before the schema changed.

## Backwards compatibility

Additive. Every document valid under v6.7.0 stays valid: the four properties are optional, they have
no defaults, and each `dependentRequired` constraint applies only when one of the new properties is
present. `category` keeps its type, so generated clients that read it are unaffected.

## Alternatives considered

- **A range (`{min, max}`) for the count.** Rejected. *"9 of 12 listed"* needs one denominator, and
  a range does not have one. The estimate flag is a simpler way to say the count is approximate.
- **A richer `extent` object, which could also say "about a third are missing".** Rejected. *"A
  third missing"* is `expectedItemCount` minus the number listed. Storing it would repeat a fact
  that can be worked out, and the stored copy could disagree with it.
- **Widening `category` to a string or an array.** Rejected. Changing the type of an existing field
  breaks every generated client. A separate `additionalCategories` is additive.
- **Keeping all of this in `description`.** That is the current state, and it is why none of it can
  be read by software.

## Not settled by this proposal

1. **Comparing the declared count with the listed items.** Software can now show *"9 of 12
   listed"*. Whether a document that lists more items than it declares should trigger a warning is
   left to implementations. The schema accepts it.
2. **Structured location.** `location` is free text, the same as on `asset.json`. Linking a
   collection to a `Space` or `Property` is a separate change.
