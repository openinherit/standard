---
title: "Estate.contemplationOfMarriageStatute (and the v3 mirror-will linkage that already covers most of this)"
version: "0.2"
status: tracked
date: 2026-04-14T00:00:00+08:00
lastmod: 2026-04-14T00:00:00+08:00
github_issue: https://github.com/openinherit/standard/issues/40
author: "Rich Davies"
source: "docs/proposals/2026-04-14-contemplation-of-marriage.md"
---

# Contemplation-of-marriage statute citation on `estate`

> **Revision note (v0.2):** the original v0.1 proposal sketched a full
> `estate.contemplationOfMarriage` block with `intendedSpousePersonId`,
> `intendedMarriageDate`, and `statuteRelied`. While drafting the talk
> demo fixtures we discovered v3 already supports the linkage half via
> `estate.mirrorWillId`, `estate.companionEstateId`, and
> `estate.companionLinkStatus`. The proposal is now narrowed to **just
> the statute citation** that explicitly invokes the s.18(3)/s.13 exception.

## Context

A will made before marriage is automatically revoked by that marriage in many
common-law jurisdictions:

- **England & Wales** — Wills Act 1837 s.18
- **Singapore (non-Muslim testators)** — Wills Act (Cap 352) s.13
- (others — see the `marriageRevocation` property added to the
  `uk-england-wales`, `singapore-malaysia` and `uae` extensions in v6.5.0)

Both s.18 and s.13 carry a critical exception: **a will made in expectation of
a particular marriage survives that marriage**, provided the will expressly
identifies the intended spouse (E&W: s.18(3)–(4); SG: s.13 proviso).

## What v3 already covers

INHERIT v3 (as of v6.5.0) ships these existing `estate` properties that
together model the *linkage* between two mirror wills written ahead of a
marriage:

| Property | Role in this scenario |
|---|---|
| `estate.mirrorWillId` (UUID) | Pointer to the companion estate's `id`. Declares "this will is a mirror of that one." |
| `estate.companionEstateId` (UUID) | The shared "household" estate link between two partners. |
| `estate.companionLinkStatus` (`invited\|active\|decoupling\|decoupled`) | Lifecycle of the household link. |
| `estate.revokesDocumentIds` (UUID array) | Lists the prior will document(s) explicitly revoked by this one — i.e. the pre-marriage will the new mirror replaces. |
| `estate.revocationClause` (boolean) | Whether the will contains a general "I revoke all former wills" clause. |
| `estate.notes` (string) | Free-text narrative — sufficient for "made in contemplation of marriage to X on YYYY-MM-DD" prose. |

These four pointers + two flags are enough to represent the **structural** fact
that a pair of mirror wills exist and that they revoke their pre-marriage
predecessors. Audience tooling can resolve everything from these IDs.

## What's still missing

What v3 cannot express is **which statute the will is relying on** to claim the
contemplation-of-marriage exception. The s.18(3) E&W and s.13 proviso SG rules
both require the will to identify the intended spouse — and case law in both
jurisdictions has grown around what "in contemplation of" formally means. A
machine-readable claim would let:

- Probate registries auto-flag a non-compliant claim.
- Cross-jurisdictional planning tools warn when a will *cites* one jurisdiction's
  statute but the testator's domicile at marriage is another.
- The standard match the precision it already gives to `marriageRevocation`
  on the extension side.

## Proposed shape (revised, narrower)

A single optional string property on `estate`:

```json
"estate": {
  "contemplationOfMarriageStatute": "Wills Act 1837 s.18(3)"
}
```

- Free-text statute citation. String, max 255 chars.
- Implementations may parse it; the standard does not impose a structure.
- Used in conjunction with `estate.mirrorWillId` / `companionEstateId` /
  `revokesDocumentIds` (which already exist in v3) to represent the full
  contemplation-of-marriage scenario.

Backwards-compatible: opt-in single string field. No structure changes.

## Worked example

The INHERIT Companion talk demo uses two mirror wills written in contemplation
of marriage: see `mark-mirror.json` and `katrina-mirror.json` at
[openinherit.org/talk/companion](https://www.openinherit.org/talk/companion/).
Each fixture uses v3-native `mirrorWillId`, `companionEstateId`,
`companionLinkStatus: "active"`, `revokesDocumentIds`, and `revocationClause: true`.
The contemplation narrative currently lives in the freeform `estate.notes` field
because the proposed `contemplationOfMarriageStatute` field doesn't exist yet.
Once the proposal lands, the notes will tighten into the structured field.

## Open questions

- Should `contemplationOfMarriageStatute` be a structured citation (act + section
  + subsection + jurisdiction) or remain a plain string? Plain string for v0.2;
  could promote to structured later if tooling demand emerges.
- Should the field only validate when the testator's `domicile` is in a
  jurisdiction whose `marriageRevocation` rule has `revokesPriorWill: true`?
  Constraint adds complexity but prevents nonsensical claims (e.g. a Scots
  will citing s.18(3) when Scots law doesn't auto-revoke wills on marriage).
- Some jurisdictions allow a will to be made in contemplation of *any* future
  marriage of the testator (Australia ACT — Wills Act 1968 s.20A). Worth a
  parallel `contemplatesAnyMarriage` boolean? Or out of scope?

## Status

Draft v0.2 (narrowed from v0.1 after v3 introspection). RFC after the APIdays
Singapore 2026 talk (2026-04-15). Tracked at [openinherit/standard#40](https://github.com/openinherit/standard/issues/40).
