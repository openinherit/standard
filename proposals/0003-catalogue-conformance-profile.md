---
github_issue: https://github.com/openinherit/standard/pulls?q=head%3Aclaude%2Fcatalogue-conformance-profile
---

# Proposal 0003: Catalogue-only is a conformance profile of the one root, not a second root

**Status:** under-review — the pull request that carries this document also carries the schema
change it describes. Merging that pull request is acceptance; closing it is rejection.
**Author:** Testate Technologies
**Date:** 2026-10-04
**Change class:** additive — a strict relaxation of `v3/schema.json`. Every document that validates
today still validates, and is read exactly as before.

## Summary

Add `conformanceProfile` (`estate` | `catalogue`, default `estate`) to the root `v3/schema.json`. A
document that declares `conformanceProfile: "catalogue"` conforms to the root **without an estate
envelope**: `assets` is required, `estate` is not allowed, and the catalogue's own members are
carried at the root. `v3/catalogue.json` stays as the catalogue entry point and accepts the same
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

The root's `required` list moves into an `if`/`then`/`else` on that member (first entry of the
root `allOf`):

| | `conformanceProfile: "catalogue"` | anything else, or absent (`estate`) |
|---|---|---|
| required | `assets` | `schemaVersion`, `estate`, `people` — as today |
| `estate` | **not allowed** — declare the estate profile instead | required |
| `$schema` | the root URL **or** `https://openinherit.org/v3/catalogue.json` | the root URL only — as today |
| catalogue members at the root | the seven above, each by `$ref` to `catalogue.json#/properties/…` | not allowed — as today |
| `conformance.profile` (if present) | must be `catalogue` | must be `estate` |

The catalogue members are referenced, not copied, so the two entry points cannot drift.

### The conformance certificate records the profile

`$defs/Conformance` gains an optional `profile` (`estate` | `catalogue`). It must agree with the
document's `conformanceProfile`. Certificates written before profiles existed have no `profile` and
are read as `estate`.

### `catalogue.json` stays, and points at the root

`v3/catalogue.json` accepts `conformanceProfile` with `const: "catalogue"` (optional, so existing
catalogue documents stay valid), constrains `conformance.profile` to `catalogue`, and its
description withdraws the wrap-in-an-estate advice.

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

- `pnpm test` — 12 new cases in `tests/v3/schema/schema.test.json` and 3 in
  `tests/v3/catalogue/catalogue.test.json`. Against the previous schema, 5 of them fail.
- `pnpm run test:catalogue-profile` (`scripts/check-catalogue-profile.sh`, run in
  `run-tests.yml`) finds every catalogue fixture by its own `$schema` or declared profile. It
  requires each one to declare the profile, carry no estate, and validate against both schemas. It
  also requires `v3/schema.json` to **refuse** the fixture once the declaration is stripped, which
  proves the profile is what admits the document. It exits 1 on the fixtures before they declared
  the profile, and 2 (never a pass) if it finds fewer than two catalogue fixtures.

## Backwards Compatibility

Strict relaxation. A document without `conformanceProfile` is held to exactly the requirements the
root has always had, including the root `$schema` URL and the refusal of root-level
`assetInterests`. The only documents newly accepted by `v3/schema.json` are ones that declare the
catalogue profile. `v3/catalogue.json` accepts everything it accepted before.

Consumers that read `required` from the root's top level will now find it inside `allOf`. Code
generators reading the bundled schema may therefore show `estate` and `people` as optional on the
root type.

## Alternatives Considered

- **Keep two roots and document the wrap.** Rejected. The wrap is where the loss happens, and
  documenting it does not stop it.
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
