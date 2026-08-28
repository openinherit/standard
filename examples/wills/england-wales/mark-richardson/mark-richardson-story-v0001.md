---
title: "Last Will and Testament of Mark James Richardson"
version: "1.0"
status: approved
date: 2026-04-12T23:00
lastmod: 2026-04-12T23:00
author: "Rich Davies"
source: "examples/wills/england-wales/mark-richardson/mark-richardson-story-v0001.md"
---

# Last Will and Testament of Mark James Richardson

**Jurisdiction:** England & Wales
**Date of execution:** Thursday 14 March 2024
**Complexity:** Medium
**PDF:** `marks-will.pdf` (in Downloads or generated from this source)
**Fixture:** `mark-richardson-inherit-v0001.json` (in this folder)

## What this will tests

- `executorPowers` — 4 statutory powers (Trustee Act 2000, sale/conversion, appropriation, insurance)
- `statutoryExclusions` — Apportionment Act 1870 ss.2-4
- `precatoryWishes` — "I express the wish that she keep it as a family heirloom"
- Residuary split 50/50 between two siblings with `sharePercentage`
- `mentionedPropertyIds` and `mentionedAssetIds` on residuary bequest
- Omega Seamaster with `asset.significance: family_heirloom` and product reference via identifiers
- Pecuniary charitable bequest to MSF with `charityPurposeRestriction` and `executorDirections`
- 28-day survivorship with `failureConsequence: lapse_to_residue`
- `administrationPhases` (debts → funeral → expenses → distribution)
- `constructionClauses` (not explicit in this will but could add gender neutrality)
- Witness details with `Dr.` title (academic honorific)
- Freehold property (`tenureType: "ownership"`)
- Building society ISA with sort code/account via identifiers
- `connections` — Thomas Henderson's relationship to Mark not stated in the will
- `validityStatus` — unmarried condition (Wills Act 1837 s.18)

## The will that found the final 3 gaps

This will exposed executor powers, statutory exclusions, and precatory bequest wishes as gaps in v6.3.0. All three were fixed in the same session — INHERIT now scores 25/25 on this will.

## People

| Person | Role | Relationship to testator |
|--------|------|-------------------------|
| Mark James Richardson | Testator | — |
| Thomas Andrew Henderson | Executor (primary) | Not stated (friend?) |
| Eleanor Rose Brightwell | Beneficiary, executor (substitute) | Sister |
| James David Richardson | Beneficiary | Brother |
| Medecins Sans Frontieres | Organisation | Charity (reg. 1026588) |
| Sarah Jane Cooper | Witness | Neighbour |
| Dr. Rajesh Patel | Witness | Colleague |

## Full will text

See PDF. The will consists of 5 pages executed under English law, with an attestation clause including a capacity declaration.

*This is a demonstration document prepared for API Days Singapore. It does not constitute a valid legal instrument.*
