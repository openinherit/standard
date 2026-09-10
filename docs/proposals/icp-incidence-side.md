---
title: "Declare the incidence side of a death tax"
description: "Add incidenceSide (estate_side | beneficiary_side) to the tax reference data and to a tax rule's scope."
version: "0.1"
status: draft
date: 2026-09-07
lastmod: 2026-09-07
github_issue: https://github.com/openinherit/standard/issues/13
author: "Testate Technologies"
source: "docs/proposals/incidence-side.md"
change_class: additive
---

# Proposal: declare the incidence side of a death tax

**Status:** draft
**Change class:** additive — a new optional field. No existing document becomes invalid.

## Summary

INHERIT's tax reference data already encodes, in its band names, whether a charge falls on the
**estate** or on each **beneficiary**. Nothing declares it. Add an explicit `incidenceSide` enum —
`estate_side | beneficiary_side` — to `reference-data/tax-rates.json` and
`reference-data/tax-thresholds.json`, and require it on the scope of any arriving tax rule.

## Motivation

The distinction is not cosmetic. It determines the **arity of the computation**: an estate-side
charge is computed once per estate; a beneficiary-side charge is computed once per
(beneficiary × share), because the rate is keyed to the recipient's relationship to the deceased.
A consumer that gets this wrong does not produce a slightly wrong number — it produces the wrong
*shape* of answer.

The information is already present, in two files, as a naming convention only:

| Family | Evidence in `reference-data/tax-rates.json` |
|---|---|
| estate-side | `GB` → `standard`, `charityReduced` · `US` → `federal`, `stateLevelRange` · `JP` → `graduated` |
| beneficiary-side | `FR` → `directDescendants`, `siblings`, `unrelated` · `DE` → `taxClassI`, `taxClassII`, `taxClassIII` |

`reference-data/tax-thresholds.json` splits the same way independently: `GB` carries `nilRateBand`
and `residenceNilRateBand` (estate-level), while `DE` carries `taxClassI_spouse` /
`taxClassI_children` and `FR` carries `directDescendants` / `spouse` / `siblings` / `other`
(beneficiary-class-level).

⛔ **And the two files already disagree with each other for one jurisdiction.** Ireland's Capital
Acquisitions Tax is unambiguously **beneficiary-side** — `tax-thresholds.json` keys it `groupA`
("Child of the disponer"), `groupB` ("Linear ancestor, descendant, sibling, niece, nephew"),
`groupC` ("All other relationships"). Yet its band in `tax-rates.json` is `standard`, the same
token the United Kingdom uses for an estate-side charge. Ireland is therefore modelled
beneficiary-side in one file and estate-side-shaped in the other, and **nothing in the standard can
catch it**, because the standard has no field in which the two files could contradict each other.

That is the case for an explicit field rather than a naming convention: a convention cannot be
validated, so it cannot disagree with itself *visibly*.

## Design

```jsonc
// reference-data/tax-rates.json — per jurisdiction entry
{
  "taxName": "Capital Acquisitions Tax",
  "incidenceSide": "beneficiary_side",   // NEW — enum: estate_side | beneficiary_side
  "rates": [ /* … */ ]
}
```

```jsonc
// v3/common/tax-scope.json (new $defs, or an addition to an arriving rule's scope object)
"incidenceSide": {
  "description": "Whether the charge falls on the estate as a whole or on each beneficiary's share",
  "$comment": "Determines the arity of the computation: estate-side is computed once per estate; beneficiary-side once per (beneficiary x share). Ireland CAT and Pennsylvania inheritance tax are beneficiary-side; UK IHT is estate-side.",
  "enum": ["estate_side", "beneficiary_side"]
}
```

**Validation this unlocks (the point of the proposal).** A lint rule can then assert that a
jurisdiction's `incidenceSide` is consistent with the *shape* of its thresholds — a
`beneficiary_side` jurisdiction whose thresholds are not keyed by beneficiary class, or an
`estate_side` one whose thresholds are, is a contradiction the standard can now see. Ireland is the
first case it would catch.

## Backwards compatibility

Additive and optional. Existing instance documents remain valid. Consumers that ignore the field
behave exactly as today. Making it **required** on the reference data is a separate, later question
and is deliberately not proposed here.

## Alternatives considered

- **Infer it from the band names.** Rejected: the inference is exactly what already went wrong for
  Ireland, whose band name is `standard` and whose incidence is beneficiary-side.
- **Carry it outside the standard, in an implementation's parameter layer.** Rejected: a rule whose
  incidence axis lives in a file that does not travel with the rule is a rule whose arity cannot be
  determined by anyone who receives it.
- **A boolean `perBeneficiary`.** Rejected: a boolean has no room for a third case, and mixed
  regimes (a federal estate-side charge alongside a state beneficiary-side one, as in the United
  States) are foreseeable.
