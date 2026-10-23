---
github_issue: https://github.com/openinherit/standard/pull/98
---

# Proposal 0009: The family interest record is as expressive as the dealer one

**Status:** under-review — the pull request that carries this document also carries the schema
change it describes. Merging that pull request is acceptance; closing it is rejection.
**Author:** Testate Technologies
**Date:** 2026-10-21
**Change class:** additive. New optional properties on `asset-interest.json`, one widened enum on
`dealer-interest.json`, and conditionals that only apply when a new property is present. No
existing document becomes invalid, and no existing field changes meaning. One existing field,
`asset-interest.testatorAcknowledged`, is marked `deprecated`; it is **not** removed.

## Summary

`asset-interest.json` gains who may see the record (`visibility`), supporting media (`images`),
who started the conversation (`communicationInitiatedBy`), where the interest has got to
(`interestStatus`) and what the testator has decided about it (`testatorDisposition`). The first
two reuse `common/visibility.json` and `common/media.json`; the last three are modelled on the
fields of the same purpose in `dealer-interest.json`. `dealer-interest.privacyLevel` moves onto the
shared `common/visibility.json`.

## Motivation

The standard records the **commercial** interest edge more completely than the **family** one.
Parsed from v6.7.0, not grepped:

| | `dealer-interest.json` (a dealer, collector or investor) | `asset-interest.json` (a family member, beneficiary or friend) |
|---|---|---|
| who may see it | `privacyLevel`, 4 values, inlined | **nothing** |
| who started it | `communicationInitiatedBy` (`buyer \| testator \| proxy \| executor`) | **nothing** — `sourceType` is the channel, not the initiator |
| where it has got to | `offerStatus`, 9 values | **nothing** |
| the owner's decision | `testatorDisposition`, 6 values | `testatorAcknowledged`, **one boolean** |
| photos, video, scans | — | **nothing**, though `common/media.json` is used by 6 entities |

For an inheritance standard that is the wrong way round. The family case is the common one, and it
is the legally sensitive one: an heir asking for items while the owner is alive is a recognised
undue-influence signal, and what rebuts it is a record of who raised it, who could see it and what
the owner did about it. `common/visibility.json` already says, in its own description, that it is
*"used across dealer interests, asset interests, and other privacy-sensitive records"* — and
neither interest entity references it.

## Design

### `asset-interest.json` — five new optional properties

| Property | Shape | Modelled on |
|---|---|---|
| `visibility` | `$ref: common/visibility.json` (6 values) | `asset.visibility`, `wish.visibility`, `bequest.visibility` |
| `images` | array (≤ 20) of `$ref: common/media.json` | `asset.images`, `pet.images`, `space.images` — same key, so a consumer reads media one way everywhere |
| `communicationInitiatedBy` | `interested_party \| testator \| proxy \| executor` | `dealer-interest.communicationInitiatedBy` |
| `interestStatus` | `submitted \| acknowledged \| responded \| withdrawn \| superseded` | `dealer-interest.offerStatus` |
| `testatorDisposition` | `noted \| tentatively_earmarked \| declined` | `dealer-interest.testatorDisposition` |

Four conditionals, in a top-level `allOf`, keep the new fields and the old boolean from disagreeing:

1. `interestStatus: responded` requires a `testatorDisposition`.
2. A `testatorDisposition` requires `interestStatus` to be `responded`, `withdrawn` or `superseded`
   — no decision on an interest the testator has not seen.
3. `testatorAcknowledged: false` cannot sit with `interestStatus` `acknowledged` or `responded`.
4. `testatorAcknowledged: true` cannot sit with `interestStatus: submitted`.

`testatorAcknowledged` gains `"deprecated": true` and a description pointing at `interestStatus`.

### `dealer-interest.json` — `privacyLevel` moves onto the shared enum

`privacyLevel` keeps its name (renaming a required property would break every dealer-interest
document) and replaces its inlined 4-value enum with `$ref: common/visibility.json`. All four old
values are members of the shared six, so this only **widens** it, by `companion_visible` and
`beneficiary_visible`.

### Per-field v1 disposition

Taken from the field-by-field comparison of the two entities (every property `dealer-interest` has
and `asset-interest` lacks, plus the two shared primitives).

| v1 field | Disposition on `asset-interest` | Reason |
|---|---|---|
| `dealer-interest.privacyLevel` (4) | **abstracted** → `visibility` via `common/visibility.json` (6); dealer's own `privacyLevel` re-pointed at the same file | one visibility vocabulary for every privacy-sensitive record, as the shared file already claims |
| `common/visibility.json` | **kept**, `$ref`'d | — |
| `common/media.json` | **kept**, `$ref`'d as `images` | the 7th entity to reference it |
| `dealer-interest.communicationInitiatedBy` | **kept** (same key), `buyer` → `interested_party` | there is no buyer on the family edge; the person expressing interest is `personId` / `organisationId` |
| `dealer-interest.offerStatus` `standing_interest` | **abstracted** → `submitted` | an interest on record, awaiting the testator |
| `offerStatus` `verbal_offer` · `written_offer` · `formal_valuation` · `conditional_offer` | **dropped** | stages of a priced offer; a family interest carries no price. Channel is already `sourceType` |
| `offerStatus` `accepted` | **dropped** | accepting implies a transaction or a gift. An expression of interest binds no one; the testator's most favourable answer is `testatorDisposition: tentatively_earmarked`, and only a will or a `bequest` disposes |
| `offerStatus` `declined` | **moved** to `testatorDisposition: declined` | it is the testator's decision, not a stage of the record |
| `offerStatus` `expired` | **dropped** | a family interest has no validity window; one that is replaced is `superseded` |
| `offerStatus` `withdrawn` | **kept** | the person can take it back |
| *(new)* `acknowledged` · `responded` · `superseded` | **added** | the lifecycle `testatorAcknowledged` could only say half of |
| `dealer-interest.testatorDisposition` `undecided` | **abstracted** → `interestStatus: acknowledged` with no disposition | absence of a decision on a seen interest *is* undecided; a value for it would be a second way to say the same thing |
| `testatorDisposition` `willing_to_sell` · `prefer_not_to_sell` | **dropped** | sale-specific |
| `testatorDisposition` `hold_for_executor` · `deferred_to_family` | **dropped** | a direction about how the item should be distributed is a testator-authored `wish` (`wishType: distribution`), not a response to someone's interest. Keeping the owner's directive out of the record of what others asked for is the separation the undue-influence gate depends on |
| `testatorDisposition` `promised_to_institution` | **abstracted** → `declined` (+ `notes`) | from the asker's side it is a no; the promise itself is a `bequest` or `wish` |
| *(new)* `noted` · `tentatively_earmarked` | **added** | the family answers a dealer has no use for |
| `asset-interest.testatorAcknowledged` | **kept, deprecated** | see Backwards compatibility |
| `dealer-interest.interestedParty` | **dropped** | `asset-interest` already has `personId` / `organisationId` + `expressedByRole` |
| `dealer-interest.assets` · `collection` | **dropped** | `asset-interest` already has `assetId` / `collectionId` / `productMatch` |
| `dealer-interest.offerDetails` · `verificationResult` | **dropped** | money and inspection belong to the commercial edge |
| `dealer-interest.linkedBequestId` | **dropped** | a reference from interest to bequest would invite reading the interest as part of the disposition |
| `dealer-interest.managedByProxyId` | **dropped** | a proxy relaying a family interest is already `sourceType: proxy_reported` / `expressedByRole: proxy`; a proxy *managing* a negotiation is commercial |

### Out of scope

C2PA signing of media and a bounded bid of any kind. A hard "never binding" field
(`wish.bindingNature`-style) is not added either: nothing in `asset-interest` can dispose, and
`tentatively_earmarked`'s description says so.

## Backwards compatibility

Additive within 6.x. Every v6.7.0 document stays valid: each new property is optional, each
conditional fires only when a new property is present, and `privacyLevel`'s enum only widens.

`testatorAcknowledged` stays. `GOVERNANCE.md` permits no removal within a major version, and the
v1 completeness floor would refuse it. Removing it is a 7.0.0 change of its own.

## How each part is proved

The test cases are written first and shown failing against the unchanged schemas.

| Claim | Command | What makes it go red |
|---|---|---|
| `asset-interest` carries visibility, media, initiator, status and disposition | `pnpm test` — new valid cases in `tests/v3/asset-interest/asset-interest.test.json` | removing any property: `unevaluatedProperties: false` rejects it |
| each uses the right vocabulary | same suite: invalid cases (`visibility: everyone`, `communicationInitiatedBy: buyer`, `interestStatus: accepted`, `testatorDisposition: willing_to_sell`, an image without `url`) | dropping the `$ref` or the enum |
| the four conditionals hold | same suite: one invalid case per conditional | deleting that `allOf` member |
| dealer `privacyLevel` uses the shared six | `tests/v3/dealer-interest/dealer-interest.test.json`: `beneficiary_visible` valid, `everyone` invalid | re-inlining the 4-value enum |
| the generated Zod / pydantic validators agree | `node scripts/test-runtime-validators.mjs`, `pytest packages/sdk-python` | not regenerating, or a conditional the generator drops |
| generated artefacts are current | `check-openapi-fresh.sh`, `check-runtime-validators-fresh.sh`, `docs:reference:check`, `test:schema-index`, `diff -r v3/ packages/schema/v3/` | editing the schema without regenerating |
| nothing is lost | `schema-diff.sh origin/main` (0 breaking), the v1 completeness floor | deleting or narrowing an existing field |

### What the proof found, and the two fixes it led to

- **Two conditionals were dropped by the validator generators.** `write-conditional-layer.py`
  compiles an `if` only in the one-property discriminator shape. The two `testatorAcknowledged`
  rules first used `if.required: [testatorAcknowledged, interestStatus]`, and both the Zod and
  pydantic legs reported them as `REGRESSION false_accept`. They now use
  `if.required: [testatorAcknowledged]`; the `then` branch's `properties` already bind only when
  `interestStatus` is present, so the meaning is unchanged.
- **Zod filled in a missing required `privacyLevel`.** `common/visibility.json` declares
  `default: all_parties`, and the Zod generator renders a default as `.default(...)`, so a dealer
  interest *without* its required `privacyLevel` parsed, and came out at the least private level.
  `write-conditional-layer.py` now asserts presence on the raw input for every top-level required
  property whose schema declares a default, directly or through `$ref` / `allOf`. JSON Schema's
  `default` is an annotation and never satisfies `required`. The same cause let Zod accept a
  `Completeness` without `score` and an `Estate` without `status`; those two register entries no
  longer reproduce and are removed.

Red, then green, for each:

| Gate | Red | Green |
|---|---|---|
| `pnpm test` | the 7 new valid cases fail against v6.7.0 (commit `test(...) — deliberately red`) | asset-interest 53/53, dealer-interest 34/34 |
| each constraint | deleting each of the 4 conditionals, the 2 `$ref`s and the 3 enums, and re-inlining dealer's 4-value enum: 11 of 11 deletions fail the case written for them | restored |
| `test-runtime-validators.mjs` / `test_corpus.py` | `REGRESSION` on both `testatorAcknowledged` rules (both legs), and on `missing privacyLevel` (Zod); disabling the new presence assertion brings back the dealer, completeness and estate regressions | register matches, 29 Zod `false_accept` (was 31); pytest 322 passed |
| `check-openapi-fresh.sh`, `check-runtime-validators-fresh.sh`, `docs:reference:check` | STALE before regeneration | fresh |

### Two checks that misread a `$ref`

Both report a loss that is not one. The four old `privacyLevel` values are still accepted, and
`tests/v3/dealer-interest` has a valid case for each of the six.

- `scripts/schema-diff.sh` reports `Removed enum value(s)` on `dealer-interest.json`. It compares
  inline `enum` arrays and does not follow `$ref`. It warns and exits 0.
- The v1 completeness floor keys an enum value by where it is written, so the four values moving
  behind the `$ref` read as four lost keys.

## Alternatives considered

- **Remove `testatorAcknowledged` now.** Rejected for 6.x: a removal, which `GOVERNANCE.md` reserves
  for a major version.
- **One combined response field** (`submitted → acknowledged → noted |
  tentatively_earmarked | declined`). Rejected here because it cannot say `withdrawn` or
  `superseded` without mixing the asker's actions into the testator's answer, and because
  `dealer-interest` already separates status from disposition. The two shapes map one to one:
  the combined value is `testatorDisposition` when present, else `interestStatus`.
- **Name the media property `supportingMedia`.** Rejected: six entities already call it `images`
  for the same `common/media.json` array, and a second key for the same thing is a second code path
  in every consumer.
- **Rename `dealer-interest.privacyLevel` to `visibility`.** Rejected: a rename of a required field
  is breaking.
- **Widen `privacyLevel`'s inline enum to six values instead of a `$ref`.** Not chosen: it would be
  a second copy of the vocabulary, which the next change to `common/visibility.json` would leave
  behind.

## Open questions — not settled by this proposal

1. **When `testatorAcknowledged` goes.** It is deprecated here and can only be removed in a major
   release. *Settled 21 October 2026:* it stays deprecated through 6.x and is removed in 7.0.0; the
   removal and its migration are recorded in `CHANGELOG.md`.
2. **The generators drop an `if` they cannot compile.** `write-conditional-layer.py`'s own docstring
   says a construct it cannot evaluate is never dropped silently, yet a multi-property `if` in a
   top-level `allOf` is skipped. The corpus caught it here only because a case existed for each
   rule. Refusing such an `if` outright is a change of its own.
3. **Timestamps for the response.** When the testator acknowledged and when they responded are not
   recorded. `expressedAt` covers only the interest itself.
