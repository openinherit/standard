---
title: "INHERIT Test Wills Collection"
version: "1.0"
status: draft
date: 2026-04-12T23:45
lastmod: 2026-04-12T23:45
author: "Rich Davies"
source: "docs/wills/README.md"
---

# INHERIT Test Wills Collection

## Purpose

This folder contains realistic mock wills designed to stress-test the INHERIT open estate data standard. Each will targets specific schema capabilities and is crafted to expose modelling gaps. They are used in three ways:

1. **Live demos** — uploaded to [willscan.ai](https://willscan.ai) at conferences to demonstrate AI extraction into INHERIT JSON
2. **Schema validation** — each will has a companion INHERIT fixture in `examples/fixtures/` that validates against the v3 schema
3. **Regression testing** — as the schema evolves, re-extracting these wills confirms nothing was lost

These are demonstration documents. They do not constitute valid legal instruments.

## The Collection

| Will | Jurisdiction | Complexity | What it tests |
|------|-------------|------------|---------------|
| [Katrina Tan Wei Lin](katrina-tan-singapore.md) | Singapore | Simple | Aunt-niece kinship (uncle_aunt), sibling bequests, CPF exclusion, Buddhist funeral wishes, jade bangle provenance, 30-day survivorship. The will that originally exposed INHERIT's kinship deficiencies and triggered the v6.3.0 redesign. |
| [Mark James Richardson](mark-richardson-england.md) | England & Wales | Medium | Executor powers (Trustee Act 2000), statutory exclusion (Apportionment Act 1870), precatory wishes ("keep as family heirloom"), residuary split with mentioned assets, charitable bequest with discharge instruction, 28-day survivorship. The will that found the final 3 gaps. |
| [Fatima binte Abdul Rahman](fatima-al-rashid-singapore.md) | Singapore (AMLA) | Complex | Islamic faraid + wasiyyah one-third limit, Syariah Court Inheritance Certificate, CPF sub-account nominations, HDB joint tenancy, non-Muslim beneficiary under faraid, dual-court process, mahr debt, waqf endowment. |
| [Pierre Dubois](pierre-dubois-france-england.md) | France + England | Complex | Cross-border forced heirship (reserve hereditaire vs testamentary freedom), lex situs for French immovable property, Brussels IV Regulation choice of law, dual wills strategy, governingJurisdictions. |
| [Gloria Helmsley-Winters](gloria-helmsley-winters-new-york.md) | New York, USA | Complex | $8M pet trust, explicit disinheritance of grandchildren, massive charitable trust, judicial variation of bequests, conflictsOfInterest (executor as beneficiary). |
| [Henry Burt III](henry-burt-iii-michigan.md) | Michigan, USA | Extreme | Multi-generational perpetuity trust, generation-skipping across 4 generations, distribution triggered by death of last grandchild, trust duration modelling, GST classification. |
| [Chen Wei Agricultural Trust](chen-wei-agricultural-taiwan.md) | Taiwan + England | Complex | Agricultural property relief (APR), organic farming conditions on inheritance, environmental compliance conditions, cross-border agricultural estate, conditional trust distributions tied to land use. |
| [Maria Santos de la Cruz](maria-santos-manila.md) | Philippines + USA | Complex | Forced heirship (legitime under Philippine Civil Code), US property subject to different rules, charitable remainder trust (CRUT), generation-skipping trust for grandchildren, multiple jurisdictions with conflicting succession rules. |
| [Tommy & Sarah Bancroft](bancroft-mutual-will-australia.md) | Australia (NSW) | Complex | Mutual wills with binding promise not to revoke, blended family (step-children from prior marriages), Aboriginal land with customary succession rights, family provision claims from excluded adult children, superannuation nominations. |
| [Ananya Sharma](ananya-sharma-mumbai.md) | India (Hindu Succession Act) | Complex | Hindu undivided family (HUF) property, coparcenary rights post-2005 Amendment (daughter equality), Parsi succession rules for mixed-faith marriage, stridhan assets, multi-state Indian property with different state amendments. |
| [George Okafor](george-okafor-lagos-london.md) | Nigeria + England | Complex | Dual legal system (Igbo customary law + English common law), eldest son custodial rights under customary law vs testamentary freedom, London property subject to English law, Lagos property subject to customary succession, parallelSuccessionConflicts modelling. |

## How to use

### At a conference demo

1. Open the PDF version of a will in willscan.ai
2. AI extracts it into INHERIT JSON
3. Show the family tree, bequest graph, and asset allocation
4. Audience sees structured data where there was once a PDF

### For schema testing

1. Read the markdown source in this folder
2. Compare against the companion fixture in `examples/fixtures/`
3. Validate: `jsonschema validate v3/schema.json examples/fixtures/<name>.json --resolve v3/`
4. Check: does the fixture capture every clause? If not, the schema has a gap.

### For AI extraction benchmarking

1. Feed the PDF to an AI extraction pipeline
2. Compare the AI's output against the hand-crafted fixture
3. Measure: precision (did the AI add things that aren't in the will?), recall (did the AI miss things that are?), structural accuracy (are the entity links correct?)

## Conventions

- **Filenames:** `<firstname>-<surname>-<jurisdiction>.md` (kebab-case, no dates)
- **PDF generation:** Use the project's pandoc/weasyprint pipeline (see global CLAUDE.md Section 11)
- **Fixtures:** Companion fixtures live in `examples/fixtures/` and use the same name pattern
- **Sensitivity:** All names, addresses, and identifying details are fictional. Any resemblance to real persons is coincidental.
- **Legal disclaimer:** Every will includes a footer stating it is a demonstration document and does not constitute a valid legal instrument.
