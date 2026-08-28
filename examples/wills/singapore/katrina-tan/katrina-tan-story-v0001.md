---
title: "Last Will and Testament of Katrina Tan Wei Lin"
version: "1.0"
status: approved
date: 2026-04-12T10:00
lastmod: 2026-04-12T10:00
author: "Rich Davies"
source: "examples/wills/singapore/katrina-tan/katrina-tan-story-v0001.md"
---

# Last Will and Testament of Katrina Tan Wei Lin

**Jurisdiction:** Singapore (Wills Act, Cap 352)
**Date of execution:** Tuesday 22 August 2023
**Complexity:** Simple
**PDF:** `katrinas-will.pdf` (in Downloads or generated from this source)
**Fixture:** `katrina-tan-inherit-v0001.json` (in this folder)

## What this will tests

- `uncle_aunt` kinship type with `lineage: paternal` and `bloodDegree: whole` (aunt→niece)
- Sibling kinship (Katrina→Daniel)
- Parent-child kinship for deceased mother (empty roles array)
- HDB flat specific devise with `propertyIds` linking
- Jade bangle specific bequest with `assetIds` linking and `significance: family_heirloom`
- Pecuniary bequest to charity (Community Chest) with `executorDirections` discharge
- CPF exclusion via `nonprobateTransfers` with `passesOutsideEstate: true`
- 30-day survivorship clause with `conditionType: survival_period`
- Buddhist funeral wishes
- Witness details (name, address, occupation)
- Singapore-Malaysia extension (ISA distribution context)
- `validityStatus` (unmarried condition — marriage revokes will under s.13)
- `administrationPhases` (debts before bequests)

## The will that started it all

This will originally exposed INHERIT's kinship modelling deficiencies — the jade bangle bequest to niece Rachel Tan could not be modelled because there was no aunt-niece kinship type. The old `aunt_nephew` was gender-specific and factually wrong. This triggered the complete kinship redesign in v6.2.0 and the 4-phase hardening in v6.3.0.

## People

| Person | Role | Relationship to testator |
|--------|------|-------------------------|
| Katrina Tan Wei Lin | Testator | — |
| James Lim Kah Wai | Executor (primary) | Not stated |
| Daniel Tan Wei Hao | Beneficiary, executor (substitute) | Brother |
| Rachel Tan Xin Yi | Beneficiary | Niece (Daniel's daughter) |
| Madam Lim Siew Eng | Kinship node (empty roles) | Late mother |
| Community Chest | Organisation | Charity |

## Full will text

See PDF. The will was drafted for the API Days Singapore talk design and consists of 3 pages executed under the Wills Act (Cap 352).

*This is a demonstration document prepared for API Days Singapore. It does not constitute a valid legal instrument.*
