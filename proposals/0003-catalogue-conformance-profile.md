---
github_issue: https://github.com/openinherit/standard/pull/45
---

# Proposal 0003: Catalogue-only is a conformance profile of the one root, not a second root

**Status:** under-review — the pull request that carries this document also carries the schema
change it describes. Merging that pull request is acceptance; closing it is rejection.
**Author:** Testate Technologies
**Date:** 2026-10-04
**Change class:** additive. Every document that validates today still validates, and is read
exactly as before. The root newly accepts two optional declarations, `conformanceProfile` and
`conformance.profile`, and catalogue documents that make the declaration.

## Summary

Add `conformanceProfile` (`estate` | `catalogue`, default `estate`) to the root `v3/schema.json`. A
document that declares `conformanceProfile: "catalogue"` conforms to the root **without an estate
envelope**. For such a document the root applies `v3/catalogue.json` in full: that schema *is* the
catalogue profile. `v3/catalogue.json` stays as the profile's entry point and accepts the same
declaration, so one unchanged document conforms to both.

## Motivation

INHERIT 6.6.0 has **two document roots**. `v3/schema.json` (the estate document, 44 top-level
members) requires `schemaVersion`, `estate` and `people`. `v3/catalogue.json` (29 members) requires
only `assets`, for people cataloguing what they own while they are alive.

The only route offered between them was in `catalogue.json`'s own description: *"Upgrade path: wrap
in a full estate document (schema.json) when needed"*. That route is lossy. Seven of the catalogue's
members have no interchange-level home in the estate root:

| Catalogue member | Where the estate root puts it |
|---|---|
| `assetInterests` — including who the owner intends to receive what | only inside `applicationState` |
| `legacyContacts` — who receives the owner's letter | only inside `applicationState` |
| `dealerInterests` | only inside `applicationState` |
| `completeness` | only inside `applicationState` |
| `recommendedActions` | only inside `applicationState` |
| `giftListSettings` | nowhere |
| `legacyLetter` | nowhere |

`applicationState` describes itself as *"Application-specific state that is NOT part of the INHERIT
interchange standard … should not expect other systems to populate or consume them"*. Wrapping a
catalogue in an estate therefore moves the owner's allocation intent — the reason most people keep
a catalogue at all — out of the standard and into a region other systems are told to ignore.

There was a second cost. A conformance claim could only be made against one root at a time, and
nothing in a document said which kind of document it was. An implementation that only produces
catalogues had no truthful way to say it conforms to *INHERIT*, rather than to a sibling schema.

## Design

### One root, two declared profiles

```jsonc
// v3/schema.json — properties
"conformanceProfile": {
  "default": "estate",
  "enum": [ "estate", "catalogue" ]
}
```

The root's `required` list moves into an `if`/`then`/`else` on that member, which is the first
entry of the root `allOf`:

```jsonc
{
  "if":   { "required": [ "conformanceProfile" ],
            "properties": { "conformanceProfile": { "const": "catalogue" } } },
  "then": { "$ref": "catalogue.json" },
  "else": { "required": [ "schemaVersion", "estate", "people" ],
            "properties": { "$schema": { "const": "https://openinherit.org/v3/schema.json" },
                            "conformance": { "properties": { "profile": { "const": "estate" } } },
                            "assets": { "maxItems": 2000 }, "assetCollections": { "maxItems": 200 },
                            "valuations": { "maxItems": 5000 }, "wishes": { "maxItems": 100 },
                            "importSources": { "maxItems": 50 }, "insurancePolicies": { "maxItems": 50 } } }
}
```

| | `conformanceProfile: "catalogue"` | anything else, or absent (`estate`) |
|---|---|---|
| applies | all of `catalogue.json`, plus the root's own member definitions | the root, as today |
| required | `assets` | `schemaVersion`, `estate`, `people`, as today |
| `estate`, `people`, `bequests` and the other estate-only members | **not allowed** (declare the estate profile instead) | as today |
| `$schema`, if present | `https://openinherit.org/v3/catalogue.json` | the root URL only, as today |
| the seven catalogue members | at the root, as defined in `catalogue.json` | not allowed at the root, as today |
| array caps | the catalogue's, e.g. 10,000 `assets` | the root's, e.g. 2,000 `assets`, as today |
| `conformance.profile`, if present | must be `catalogue` | must be `estate` |

**Why `$ref` the whole schema.** If the root only borrowed the seven catalogue members, the two
entry points would still disagree everywhere else. Six root arrays have tighter `maxItems` caps
than the catalogue's (`assets` 2,000 against 10,000). A catalogue of 2,001 items would then be
valid against `catalogue.json` and refused by the root at the catalogue profile. Applying the whole
schema makes the profile and the entry point one definition. Those six caps therefore move from the
root's `properties` into the `else` branch, where they still bind every estate document exactly as
before. Every other member the two schemas share is defined the same way, or more loosely at the
root, so the root accepts every document `catalogue.json` accepts. That was measured by comparing
each shared member's constraints with descriptions and examples ignored.

### The conformance certificate records the profile

`$defs/Conformance` gains an optional `profile` (`estate` | `catalogue`). It must agree with the
document's `conformanceProfile`. Certificates written before profiles existed have no `profile` and
are read as `estate`.

### `catalogue.json` stays, and points at the root

`v3/catalogue.json` accepts `conformanceProfile` with `const: "catalogue"`. The member is optional,
so existing catalogue documents stay valid. `catalogue.json` also constrains `conformance.profile`
to `catalogue`, and its description withdraws the wrap-in-an-estate advice.

### Worked example

The `examples/fixtures/catalogue-only.json` fixture gains two lines and moves nothing:

```diff
   "$schema": "https://openinherit.org/v3/catalogue.json",
+  "conformanceProfile": "catalogue",
 ...
   "conformance": {
+    "profile": "catalogue",
     "level": "level_1",
```

It then validates against `v3/schema.json` as well as `v3/catalogue.json`.

## Verification

- `pnpm test` adds 15 new cases to `tests/v3/schema/schema.test.json` and 3 to
  `tests/v3/catalogue/catalogue.test.json`. Against the previous schema, every case that expects a
  catalogue-profile document to be accepted fails. The cases include the array cap in both
  directions: 201 collections pass at the catalogue profile and are refused at the estate profile.
- `pnpm run test:catalogue-profile` (`scripts/check-catalogue-profile.sh`, run in
  `run-tests.yml`) finds every catalogue fixture by its own `$schema` or declared profile. It
  requires each one to declare the profile, carry no estate, and validate against both schemas. It
  also requires `v3/schema.json` to **refuse** the fixture once the declaration is stripped, which
  proves the profile is what admits the document.
  - It exits 1 on the fixtures before they declared the profile.
  - It exits 1 when the root is edited to admit them without it.
  - It exits 2, never a pass, on a fixture that does not parse or on fewer than two catalogue
    fixtures.

## Backwards Compatibility

Additive. A document without `conformanceProfile` is held to exactly the requirements the root has
always had. That includes `schemaVersion`, `estate` and `people`, the root `$schema` URL, the array
caps, and the refusal of root-level `assetInterests`. The root newly accepts only two kinds of
document:

- documents that declare `conformanceProfile` or `conformance.profile`, with either value;
- catalogue documents that declare `conformanceProfile: "catalogue"`.

`v3/catalogue.json` accepts everything it accepted before.

`scripts/check-schema-compat.py` reports `assets` as newly required, because it counts every
`required` inside a `then` as a demand. Here the `then` only selects documents carrying
`conformanceProfile: "catalogue"`. The previous root refused all of those under
`unevaluatedProperties: false`, so no previously valid document gains a requirement. All 82 root
cases that existed before this change still pass unchanged. `scripts/schema-diff.sh` reports 0
breaking changes.

Consumers that read `required` from the root's top level will now find it inside `allOf`. Code
generators reading the bundled schema may therefore show `estate` and `people` as optional on the
root type.

## Alternatives Considered

- **Keep two roots and document the wrap.** Rejected. The wrap is where the loss happens, and
  documenting it does not stop it.
- **Borrow only the seven catalogue members at the root.** This was the first draft, and review
  rejected it. The root's tighter array caps would still refuse large catalogues, and estate-only
  members would be allowed in a "catalogue" document. Either way, the two entry points would
  disagree.
- **Promote the seven members to the root for every document.** Rejected for now. It would give
  allocation intent two homes in an estate document (`assetInterests` at the root and in
  `applicationState`). Whether intent belongs at interchange level in the estate profile too is a
  separate question, recorded below.
- **Retire `catalogue.json`.** Rejected. 6.6.0 catalogue documents name it in `$schema`. It is now
  the profile's entry point, not a competing root.
- **Put the profile only on the conformance declaration.** Not enough on its own. A declaration
  describes an implementation, not a document. A document has to say what it is, or a validator
  cannot choose the rules. The declaration's `root` field (proposed separately) and this document
  member complement each other.

## Open questions

1. Should the estate profile also carry `assetInterests` and `legacyContacts` at the root, so that
   moving from the catalogue profile to the estate profile keeps allocation intent inside the
   standard? Until that is decided, a catalogue document never has to make the move to be
   conformant. That is the point of this proposal.
2. Once the conformance-declaration `root` field lands, the declaration should gain a `profile`
   field next to it, with the same two values.
