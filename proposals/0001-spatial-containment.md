---
github_issue: "TBD — file the tracking issue on openinherit/standard and set this field before this proposal is committed"
---

# Proposal 0001: Spatial containment for asset listing

**Status:** draft
**Author:** TBD — set before filing
**Date:** 2026-09-05

## Summary

Make the containment chain — *what is this thing inside?* — expressible and enforceable on both the
space axis and the asset axis, by adding one optional property (`Space.containedInSpaceId`), three
Level-2 existence constraints, and a new `acyclic` constraint kind that lets `referentialIntegrity`
say *"this must not loop"* as well as *"this must exist"*.

## Motivation

Three measured defects, none of which needs a new use case to justify:

1. **The JSON-LD context and the schema disagree.** `v3/context/inherit-v3.jsonld` declares
   `containedInPlace: schema:containedInPlace` inside the `spaces` term. `v3/space.json` sets
   `unevaluatedProperties: false` and has no space-axis containment property, so a `Space` carrying
   the term the context declares is rejected: *"Unevaluated properties are not allowed
   ('containedInPlace' was unexpected)"*. The standard names a term its own schema forbids. Today
   containment is expressible only through the `x-inherit-` escape hatch, which is by definition
   non-standard and therefore not interoperable.

2. **Containment references are unenforced.** `Asset.containedInAssetId` has shipped since 6.6.0 —
   *"Enables hierarchical asset nesting — e.g. a watch inside a safe, tools inside a toolbox"* — and
   **0 of 21** Level-2 constraints covered it. A document whose `containedInAssetId` points at an
   asset that does not exist passed Level 2, while the closely analogous `assets[].spaceId` was
   correctly caught. `spaces[].propertyId` was likewise uncovered: a `Space` could name a `Property`
   that is not in the document.

3. **A containment cycle was not merely unimplemented, it was inexpressible.** The
   `referentialIntegrity` vocabulary is `field` / `references` / `required` / `code` /
   `errorMessage`. It can require that a target exists. It has no way to require that following a
   reference repeatedly terminates. A 2-cycle (`A` inside `B`, `B` inside `A`) and a self-cycle
   (`A` inside `A`) both passed Level 2, and any consumer walking such a document to build a
   containment tree hangs or overflows.

`Space` already carries `id`, `propertyId`, `spaceType`, `name`, `floor`, `notes`, `images` and
`provenance`, and `catalogue.json` already carries a `spaces[]` array — so the missing piece is the
recursive link, not the entity.

## Design

### 1. `Space.containedInSpaceId`

A new optional property on `v3/space.json`, following the `<entity>Id` convention every other UUID
reference in the standard uses:

```diff
   "propertyId": {
     "description": "Reference to the Property.id that contains or is associated with this space",
     "type": "string",
     "pattern": "^[0-9a-fA-F]{8}-...-[0-9a-fA-F]{12}$",
     "format": "uuid"
   },
+  "containedInSpaceId": {
+    "description": "Reference to another Space.id that physically contains this space — a loft
+      inside a house, a shelving bay inside a storage room ... Absent or null means this space sits
+      directly in the Property",
+    "type": [ "string", "null" ],
+    "pattern": "^[0-9a-fA-F]{8}-...-[0-9a-fA-F]{12}$",
+    "format": "uuid"
+  },
```

`type: ["string", "null"]` matches the existing optional reference `Asset.spaceId`, not the required
`Space.propertyId`.

**Which axis to use.** The two axes are not redundant and the `$comment` says so: use
`Space.containedInSpaceId` for **fixed structure that is not itself an estate asset** (a loft, a
cellar, an outbuilding); use `Asset.containedInAssetId` for **movable containers that are themselves
assets** (a safe, a trunk, a toolbox). A loft is not bequeathable, so it cannot be modelled on the
asset axis; a trunk is, so it should not be modelled as a Space.

### 2. The JSON-LD context

`containedInSpaceId` maps to `schema:containedInPlace` as an `@id`-typed term. The previously
declared `containedInPlace` term is **kept**: removing a published term would break any consumer
already emitting it.

```diff
   "spaces": {
     "@id": "inherit:spaces",
     "@container": "@set",
     "@context": {
       "@type": "schema:Place",
       "name": "schema:name",
+      "containedInSpaceId": { "@id": "schema:containedInPlace", "@type": "@id" },
       "containedInPlace": "schema:containedInPlace"
     }
   },
```

### 3. Three Level-2 existence constraints

Added to `referentialIntegrity.default` (21 → 24), in the shape every existing row uses:

| field | references | code |
|---|---|---|
| `assets[].containedInAssetId` | `assets[].id` | `INHERIT_REF_BROKEN` |
| `spaces[].containedInSpaceId` | `spaces[].id` | `INHERIT_REF_BROKEN` |
| `spaces[].propertyId` | `properties[].id` | `INHERIT_REF_BROKEN` |

All three carry `required: false`, matching the shipped `assets[].spaceId` and
`assets[].propertyId` rows. Per the `referentialIntegrity` `$comment`, `required` governs
multi-target grouping, not whether the field may be absent.

### 4. The `acyclic` constraint kind

Two optional keywords on `$defs/IntegrityConstraint` (which sets `additionalProperties: false`, so
the definition must be extended before any row may carry them):

```diff
   "required": { "description": "...", "type": "boolean" },
+  "kind": {
+    "description": "'existence' (the default when absent) requires the referenced id to be present
+      in the target array. 'acyclic' additionally requires that following the reference repeatedly
+      terminates — no node reachable from itself — within maxDepth hops",
+    "enum": [ "existence", "acyclic" ],
+    "default": "existence"
+  },
+  "maxDepth": {
+    "description": "For kind 'acyclic': the maximum number of hops before a chain is rejected as
+      unreasonably deep, with INHERIT_DEPTH_EXCEEDED",
+    "type": "integer", "minimum": 1, "maximum": 64
+  },
```

…and two rows carrying `"kind": "acyclic"`, `"maxDepth": 16`,
`"code": "INHERIT_CONTAINMENT_CYCLE"` — one per axis (24 → 26).

**Two validator obligations this introduces, both deliberate:**

- **An unrecognised `kind` MUST be reported as `INHERIT_CONSTRAINT_UNKNOWN`, never skipped.** A
  silently skipped constraint is a gate that reports green, which is the failure mode the keyword
  exists to prevent.
- **Multi-target grouping is by field AND kind.** `referentialIntegrity`'s existing semantics group
  non-required constraints by field path and pass if any in the group matches. Grouping by field
  alone would let the `existence` row on `spaces[].containedInSpaceId` satisfy the `acyclic` row on
  the same field, silently disabling cycle detection. The `$comment` on both `referentialIntegrity`
  and `kind` now states this.

A dangling reference is reported by the existence constraint only, not additionally by the acyclic
one — one defect, one code.

`maxDepth: 16` is a guard against a pathological or generated chain, not a legal limit. House →
loft → trunk → box → tin is 5.

## Backwards Compatibility

**Schema-wise, additive throughout** — one new optional property, two new optional constraint
keywords, five new constraint rows, no removal, rename or cardinality change. SemVer **MINOR**.
Every existing document remains schema-valid.

**Conformance-wise, this is a tightening, and that should be stated plainly.** Three classes of
document that were Level-2 conformant before are not after:

1. a dangling `assets[].containedInAssetId`;
2. a `spaces[].propertyId` naming a property absent from the document;
3. any containment cycle on either axis.

All three were already malformed in the ordinary sense — they were passing because nothing checked
them. But a consumer that pinned "Level 2 conformant" against a corpus may see documents move out of
conformance, and that is a real consequence, not a technicality.

The **reference implementation is O(n·depth)** with a fresh seen-set per node, which is fine for
conformance documents and is **not** suitable as a production validator over a large corpus. An
implementation should memoise.

## Alternatives Considered

**Name it `containedInPlace`, matching the JSON-LD context.** This has a genuine claim — the context
is a published artefact already naming that exact term. Rejected because every UUID reference in the
standard uses the `<entity>Id` suffix (`spaceId`, `propertyId`, `assetCollectionId`,
`containedInAssetId`), and a bare `containedInPlace` gives a reader no signal that the value is a
document-local UUID rather than an IRI or a name. Mapping the new property to
`schema:containedInPlace` in the context, while keeping the old term, satisfies both.

**Model space nesting on the asset axis only, via `Asset.containedInAssetId`.** Rejected: it forces
a loft or a cellar to be represented as an estate asset, which is a modelling lie with real
consequences — such a "asset" would appear in valuations, bequests and residue calculations.

**Add a depth check without a new `kind`, e.g. a boolean `acyclic: true`.** Rejected as less
extensible: `kind` gives the vocabulary somewhere to put the next constraint semantics without
another boolean, and its `default: "existence"` makes every pre-existing row well-formed unchanged.

**Detect cycles in tooling only, leaving the schema silent.** Rejected because it makes conformance
depend on which validator you run. The whole purpose of a declared constraint vocabulary is that two
independent implementations agree, which the stability requirement in `GOVERNANCE.md` depends on.

## Status of this change under GOVERNANCE.md

`v3/space.json` carries no `maturity` marker — maturity is declared only for extensions
(`v3/extensions/*/extension.json`) — so the *"Who Decides"* table cannot be resolved for it
mechanically. This proposal takes the stricter reading and treats it as **candidate**. Note that the
`candidate` row requires a proposal for **breaking** changes and this change is additive, so the
14-day window is offered rather than owed; the conformance tightening described above is the reason
it is offered anyway.
