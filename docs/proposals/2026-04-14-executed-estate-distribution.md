---
title: "Executed-estate distribution fields"
version: "0.2"
status: tracked
date: 2026-04-14T00:00:00+08:00
lastmod: 2026-04-14T00:00:00+08:00
github_issue: https://github.com/openinherit/standard/issues/41
author: "Rich Davies"
source: "docs/proposals/2026-04-14-executed-estate-distribution.md"
---

# Executed-estate distribution fields

> **Revision note (v0.2):** the original v0.1 proposed `estate.status:
> "executed"` as a new enum value. v3 already has `estate.status:
> "distributed"` which carries the same semantic meaning, so the proposal
> drops the enum extension and uses the existing value. The remaining
> proposal narrows to: `estate.executedFromWillId`, `estate.distributionContext`,
> and per-bequest resolution annotations (`primaryBeneficiaryFailed`,
> `failureReason`, `resolvedBeneficiaries`, `resolvedFromSubstitutionId`).

## Context

INHERIT today models testamentary *intent* — who the testator wants their
estate to go to. It has no vocabulary for the *executed* estate — who actually
inherited what after death, after substitution clauses, survivorship periods,
and intestacy fallbacks have all resolved.

Probate registries, executors and beneficiaries all need to record what
happened post-death: which bequests resolved as written, which failed, and
where the failed ones were redirected. Without that, INHERIT can describe a
will but cannot describe how it was executed.

## Proposed shape

Two additions (down from three in v0.1).

### 1. ~~`estate.status: "executed"`~~ — withdrawn

v3's existing `estate.status: "distributed"` already carries this semantic.
The talk demo's distribution fixtures use `"distributed"`. No new enum value
needed.

### 2. `estate.executedFromWillId`

A new optional UUID property on `estate`, pointing back to the document ID of
the will being executed. Mirror of the existing `estate.revokesDocumentIds`
pattern but for the *forward* link from an executed-state record to its
testamentary source.

```json
"estate": {
  "status": "distributed",
  "executedFromWillId": "<uuid of the will document being executed>"
}
```

### 3. `estate.distributionContext`

A new optional object capturing the death event and the survivorship analysis:

```json
"estate": {
  "status": "executed",
  "executedFromWillId": "<uuid of the will document being executed>",
  "distributionContext": {
    "deathDate": "YYYY-MM-DD",
    "simultaneousDeath": { "coDecedentPersonId": "<uuid>" },
    "survivorshipClauseDays": 30,
    "spouseSurvivedRequiredPeriod": false,
    "notes": "free text — facts and presumptions relied on"
  }
}
```

- `deathDate` (required if `status: executed`) — ISO date of the testator's
  death.
- `simultaneousDeath` (optional) — flags a commorientes situation; the
  `coDecedentPersonId` references the other deceased person.
- `survivorshipClauseDays` (optional) — the survivorship period from the
  will's wishes/conditions, repeated here for executed-state convenience.
- `spouseSurvivedRequiredPeriod` (optional) — boolean recording whether the
  spouse satisfied the survivorship clause. Drives substitution analysis.
- `notes` (optional) — free text for facts and legal presumptions relied
  on (e.g. s.184 LPA 1925 presumption of order of death).

### 4. Per-bequest resolution annotations

Each bequest gains four optional fields to record its execution:

```json
{
  "id": "...",
  "bequestType": "residuary",
  "beneficiaryId": "<original primary>",
  "primaryBeneficiaryFailed": true,
  "failureReason": "did_not_survive_survivorship_period",
  "resolvedBeneficiaries": [
    { "personId": "<uuid>", "sharePercentage": 50 },
    { "personId": "<uuid>", "sharePercentage": 50 }
  ],
  "resolvedFromSubstitutionId": "<uuid of the substitution clause that fired>"
}
```

Or, when a single beneficiary resolves the bequest:

```json
{
  "primaryBeneficiaryFailed": false,
  "resolvedBeneficiaryId": "<uuid>"
  // (or resolvedBeneficiaryOrganisation for charity gifts)
}
```

`failureReason` is a controlled vocabulary; initial values:
`predeceased`, `did_not_survive_survivorship_period`, `disclaimed`,
`disqualified`, `lapsed_no_substitute`.

Backwards-compatible: existing documents are unaffected. The fields are
opt-in and only meaningful when `estate.status === "executed"`.

## Worked example

The INHERIT Companion talk demo uses two distribution fixtures showing
simultaneous death after a marriage that revoked the original wills: see
`mark-distribution.json` and `katrina-distribution.json` at
[openinherit.org/talk/companion](https://www.openinherit.org/talk/companion/).
Each fixture sets `estate.status: "executed"`, populates
`distributionContext` with the simultaneous-death facts, and annotates each
bequest with its resolution — including the substitution clauses that
fired when the spouse failed survivorship.

## Open questions

- Should `failureReason` be a closed enum (committed to the standard) or an
  open string (with a recommended vocabulary)? Closed enum is easier for tools
  to consume; open string accommodates jurisdictional edge cases.
- `executedFromWillId` is a soft pointer (UUID) to the will document. Should
  the standard formalise will-document IDs as a first-class concept and
  enforce that pointer here?
- Should `resolvedBeneficiaries` and `resolvedBeneficiaryId` be unified into
  a single field (always an array) or kept as a single/multi pair for
  ergonomic JSON?
- The companion fixtures also annotate executors with `actingReason` (e.g.
  primary executor predeceased simultaneously, substitute promoted). Worth
  pulling that into this proposal as a fourth area, or split into a separate
  proposal on executor execution-state?

## Status

Draft. RFC after the APIdays Singapore 2026 talk (2026-04-15). Tracked at [openinherit/standard#41](https://github.com/openinherit/standard/issues/41).
