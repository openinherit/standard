---
title: "Declare whether a reference-data key is a fiscal territory or a succession jurisdiction"
description: "Add territoryGranularity so a deliberately coarse tax key can be told from a missing sub-national one."
version: "0.1"
status: draft
date: 2026-09-07
lastmod: 2026-09-07
github_issue: https://github.com/openinherit/standard/issues/14
author: "Testate Technologies"
source: "docs/proposals/territory-granularity.md"
change_class: additive
---

# Proposal: declare whether a reference-data key is a fiscal territory or a succession jurisdiction

**Status:** draft
**Change class:** additive — a new optional field. No existing document becomes invalid.

## Summary

INHERIT keys succession law at **32** territories, mixing countries and subdivisions, and keys tax at
**11**, countries only. Sometimes that is the law being modelled correctly; sometimes it is a gap.
Nothing in the standard says which. Add `territoryGranularity` to each reference-data key so the two
cases stop being indistinguishable.

## Motivation

Measured against the reference data:

| File | Keys | n |
|---|---|---|
| `reference-data/jurisdiction-profiles.json` | `AE AU BR CA CN DE ES FR GB-ENG GB-SCT HK ID IE IL IN IT JP KR MY NG NL NZ SA SG TH TW US US-CA US-NY US-TX VN ZA` | 32 |
| `reference-data/tax-rates.json`, `tax-thresholds.json` | `AU CA DE FR GB IE IN JP NZ SG US` | 11 |

The divergence is **correct in one case and wrong in another**, and the two look identical:

- **United Kingdom — correct.** Inheritance Tax is a single fiscal territory (`GB`) spanning three
  separate succession jurisdictions. Keying tax at `GB` while keying law at `GB-ENG` and `GB-SCT` is
  an accurate model of the law, not an approximation of it.
- **United States — wrong.** `US` alone cannot carry a **state** inheritance tax. Pennsylvania levies
  one (72 P.S. § 9116), and `US-PA` appears in none of the 32 profiles. A consumer computing a
  Pennsylvania estate against `US` gets the federal position and silently omits the state charge.

⭐ **A consumer cannot currently tell these apart**, because the standard records only the key, never
the *reason* for the key's granularity. That is the whole of the gap: the information distinguishing
a deliberate abstraction from an omission exists only in the heads of the people who wrote the file.

## Design

```jsonc
// reference-data/jurisdiction-profiles.json, tax-rates.json, tax-thresholds.json
{
  "GB": {
    "territoryGranularity": "fiscal_territory",   // NEW — enum
    "spansJurisdictions": ["GB-ENG", "GB-SCT", "GB-NIR"],  // NEW — optional, when fiscal_territory
    "taxName": "Inheritance Tax"
  },
  "GB-ENG": {
    "territoryGranularity": "succession_jurisdiction"
  }
}
```

`territoryGranularity` enum:

- `succession_jurisdiction` — a distinct body of succession law. The unit a rule is scoped to.
- `fiscal_territory` — a single tax regime, which may span several succession jurisdictions.
  `spansJurisdictions` names them, and is the crosswalk that does not exist today.
- `federal_layer` — a national layer that sits **above** sub-national charges rather than replacing
  them. `US` is this: declaring it says, in the schema, that a US estate may carry a state charge
  the standard has not modelled.

**Validation this unlocks (the point of the proposal).** A lint rule can then assert that every code
listed in a `fiscal_territory`'s `spansJurisdictions` exists as a profile key — closing the
law↔tax join — and can report a `federal_layer` key as *incomplete by declaration* rather than
leaving the omission silent. Under this proposal the Pennsylvania gap becomes a stated,
machine-readable fact about the standard instead of an invisible one.

## Backwards compatibility

Additive and optional throughout. Existing keys are unchanged — nothing is renamed and nothing is
removed, so every existing document and every existing consumer is unaffected. A key with no
`territoryGranularity` is simply undeclared, exactly as all of them are today.

⛔ **This proposal deliberately does not re-key anything.** Renaming or splitting a reference-data
key is a breaking change to a published artefact with live consumers and is out of scope here.

## Alternatives considered

- **Infer granularity from the key's shape** — two letters means country, five means subdivision.
  Rejected: it is exactly the inference that fails, because it says `GB` and `US` are the same kind
  of thing when one is a complete fiscal territory and the other is a partial federal layer.
- **Split the tax reference data to match the 32 succession keys.** Rejected: it would duplicate one
  UK Inheritance Tax regime across three succession jurisdictions, which models the law less
  accurately than the current shape does. The current shape is right; only its silence is wrong.
- **Record the crosswalk in documentation.** Rejected: a crosswalk that no schema references is a
  crosswalk nothing can validate, and this proposal exists because a convention that cannot be
  validated has already produced one live inconsistency in this reference data.
