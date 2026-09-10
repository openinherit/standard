---
title: "Make \"this jurisdiction levies no death tax\" machine-readable"
description: "Add deathTaxLevied (boolean) so the absence of a death tax stops being a string in a display field."
version: "0.1"
status: draft
date: 2026-09-07
lastmod: 2026-09-07
github_issue: https://github.com/openinherit/standard/issues/12
author: "Testate Technologies"
source: "docs/proposals/death-tax-levied.md"
change_class: additive
---

# Proposal: make "this jurisdiction levies no death tax" machine-readable

**Status:** draft
**Change class:** additive — a new optional boolean. No existing document becomes invalid.

## Summary

Five of the eleven jurisdictions in `reference-data/tax-thresholds.json` levy no death tax. The
standard records that fact **as an English sentence inside a display field**. Add a
`deathTaxLevied` boolean so a consumer can tell *"there is no tax here"* from *"we have not modelled
the tax here"* without reading prose.

## Motivation

Measured in `reference-data/tax-thresholds.json`:

| Jurisdiction | How the standard says it today |
|---|---|
| `AU` | `"taxName": "N/A — No inheritance or estate tax"` |
| `CA` | `"taxName": "N/A — No inheritance or estate tax"` |
| `IN` | `"taxName": "N/A — No inheritance or estate tax"` |
| `NZ` | `"taxName": "N/A — No inheritance or estate tax"` |
| `SG` | `"taxName": "N/A — No estate duty"` |

`taxName` is a **display** field. Its contract is "the name of the tax", and these five entries put
a *negation* in it. Two different sentences are used for the same fact, which is what happens to
every convention that no schema constrains.

The same five jurisdictions also carry an **empty `rates` array** in `reference-data/tax-rates.json`
— so the standard already encodes the fact twice, in two files, in two incompatible ways, and links
neither to the other. An empty `rates` array is genuinely ambiguous: it is what "no tax" looks like,
and it is also what "not yet researched" looks like.

⭐ **This is the distinction that matters to a downstream tool.** "No death tax" is a *modelled
answer* — an estate in New Zealand has a complete tax position and it is zero. "Not modelled" is an
*absence of an answer*, and a tool that treats it as zero is silently wrong. Today no consumer can
tell them apart mechanically, and the difference between them is the difference between a correct
calculation and an unreported liability.

## Design

```jsonc
// reference-data/tax-thresholds.json and tax-rates.json — per jurisdiction entry
{
  "deathTaxLevied": false,          // NEW — boolean
  "taxName": "N/A — No estate duty", // unchanged; stays as the human-readable note
  "thresholds": []
}
```

- `deathTaxLevied: false` — this jurisdiction levies no death tax. An empty `rates` / `thresholds`
  array is then **correct and complete**, not a gap.
- `deathTaxLevied: true` — a death tax exists. An empty `rates` array is then a **gap**, and a lint
  rule can say so.
- **Field absent** — unknown. Explicitly not the same as `false`.

**Validation this unlocks (the point of the proposal).** A lint rule asserting
`deathTaxLevied == true → rates is non-empty` turns coverage from something a human counts into
something the standard checks. It is the first rule that can distinguish an unmodelled jurisdiction
from a tax-free one.

## Backwards compatibility

Additive and optional; three-state by design (`true` / `false` / absent) so that "we have not
decided" remains expressible. The `taxName` prose is deliberately **not** removed — it is the
human-readable note and it should stay one. Normalising those five strings to a single form is a
separate, cosmetic change and is not proposed here.

## Alternatives considered

- **Leave it in `taxName` and parse the string.** Rejected: two spellings already exist among five
  entries, which is the failure rate of an unconstrained convention at n=5.
- **Treat an empty `rates` array as "no tax".** Rejected: it is equally the shape of "not
  researched", and conflating the two makes an unmodelled jurisdiction indistinguishable from a
  tax-free one — the exact error this proposal exists to prevent.
- **A `coverage` object describing what has and has not been modelled.** A larger and probably
  better idea, but it is a different proposal with a much wider surface; this one is the minimum
  that makes the existing five entries honest.
