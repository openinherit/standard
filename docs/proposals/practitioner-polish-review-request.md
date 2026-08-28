---
title: "Review Request: INHERIT Practitioner Polish — 14 Schema Improvements"
version: "1.0"
status: partially_implemented
date: 2026-04-12T23:00:00Z
lastmod: 2026-04-12T23:00:00Z
author: "Rich Davies"
source: "docs/proposals/practitioner-polish-review-request.md"
---

# Review Request: INHERIT Practitioner Polish

**To:** Cassian Smith, Juan Cruz Viotti
**From:** Rich Davies, Testate Technologies
**Date:** Saturday 12 April 2026
**Re:** 14 proposed schema improvements to INHERIT v3 — review before API Days Singapore (Tuesday 15 April)

---

## What I'm asking

I'd like you both to review a spec document proposing 14 improvements to the INHERIT open estate data standard. The spec is at:

**`docs/superpowers/specs/2026-04-12-practitioner-polish-design.md`**

in the [openinherit/standard](https://github.com/openinherit/standard) repository.

These improvements were identified by stress-testing INHERIT against a real (mock) Singapore will — clause by clause — from two perspectives: a seasoned Muslim estate practitioner and a data architect building AI will extraction. Every recommendation represents information that exists in the will but that INHERIT currently drops.

INHERIT has zero users today. This is the last window to make breaking and non-breaking changes at zero cost before we go public at API Days Singapore on Tuesday.

---

## Why your input matters

### Cassian

Your *JSON Mastery for API Development* is a reference text for how we've designed INHERIT's schema contracts. Three of your principles directly shaped this spec:

**Chapter 4.4 — Conditional Validation and Cross-Field Rules:** Recommendation #4 (per-condition failure consequences) adds conditional semantics to bequest conditions. When a `survival_period` condition fails, the schema needs to express "lapse to residue" differently from when an `age_attainment` condition fails ("hold in trust"). This is a cross-field rule — the condition's `failureConsequence` interacts with the bequest's `predeceaseRule`. Your chapter on `if/then/else` is exactly how we'd enforce that a `failureConsequence` of `hold_in_trust` requires a `trustId` reference. I'd value your view on whether we should add that enforcement now or leave it advisory.

**Chapter 10.2 — Evolving Enums, Deprecations, and Safe Removals:** Recommendations #1 (person religion) and #2 (non-familial relationships) add new enum-bearing fields. Your principle that enum evolution must be additive — never remove, only add — applies directly. But with zero users, we have the unique opportunity to get the initial enum right rather than patching it later. I'd appreciate your eye on whether the enum values in #1 (`faith` field: buddhist, christian, hindu, jewish, muslim, sikh, none, other) and #2 (`connectionType`: friend, solicitor, financial_adviser...) are the right starting set, or whether we're missing values that would be immediately needed.

**Chapter 3.4 — Common Schema Anti-Patterns and How to Refactor Them:** Recommendation #6 (executor discharge directions) is at risk of being a "notes field by another name." Your anti-pattern guidance on when structured data degenerates into free text is relevant — is `executorDirections` with a `directiveType` enum sufficient structure, or should the directives be more strongly typed?

### Juan

Your *Unifying Business, Data, and Code* (with Ron Itelman) provides the philosophical foundation for why these changes matter. Three of your principles are load-bearing here:

**"Ambiguity — There are multiple possible interpretations":** Recommendation #3 (bequest priority and abatement order) is a textbook case. Every solicitor knows that debts precede bequests and specific bequests precede residuary — but the schema doesn't say so. The ordering is *assumed*, which means it's ambiguous for any non-human consumer. Your framework would classify this as an ambiguity that becomes a knowledge gap when an AI tries to compute estate distribution without the priority hierarchy.

**"Your AI Is Only as Good as Your Data":** Recommendation #10 (will validity conditions) is directly about data quality for AI systems. An AI extraction pipeline can model what a will says, but it can't model the life events that destroy it — marriage revoking the will, religious conversion changing the jurisdiction. Without `validityConditions`, an AI would present a revoked will as valid. This is exactly the "blind spot" your methodology warns about: the AI doesn't know what it doesn't know.

**"Data products package structure, meaning, and context":** Recommendation #5 (asset cultural significance) is about *context*. The jade bangle's provenance chain (who owned it) is structure. Its monetary value is data. But the fact that it carries cultural obligations because it was inherited from the testator's mother — that's context. Without it, the data product is incomplete. Your framework would say we have the structure and meaning but are missing the context layer.

---

## What to look for

I'm not asking you to implement — I'm asking you to challenge. Specifically:

1. **Are any of the 14 recommendations wrong-headed?** Would you push back on adding any of these to a v3 schema? If so, why?

2. **Are the enum values right?** Especially #1 (religion), #2 (connection types), #3 (abatement classes), #4 (failure consequences), and #13 (administration order categories). These are the hardest to change later.

3. **Is anything missing?** The analysis came from one 3-page Singapore will. What would a 40-page English estate plan with trusts, A/B structures, and agricultural property reveal that this spec doesn't cover?

4. **Schema design quality.** The new fields follow INHERIT conventions (`additionalProperties: false`, UUID patterns, maxLength constraints). But are there structural improvements you'd make — `$ref` decomposition, `if/then` enforcement, or composition patterns that would make these additions more robust?

5. **Is recommendation #11 (version clarification) right?** The proposal is: `v3` = schema generation, `6.3.0` = package release, `schemaVersion` in documents = package version. Does this make sense from a JSON Schema governance perspective?

---

## Timeline

API Days Singapore is Tuesday 15 April. I'd appreciate your review by **end of day Monday 14 April** so we can implement on Monday evening Singapore time.

The spec itself is self-contained — you don't need to read the earlier hardening spec unless you want the full context of what's already been done (25 architectural gaps resolved in Phases 1-4, released as v6.3.0 today).

---

## Links

- **Spec to review:** [`docs/superpowers/specs/2026-04-12-practitioner-polish-design.md`](https://github.com/openinherit/standard/blob/main/docs/superpowers/specs/2026-04-12-practitioner-polish-design.md)
- **Hardening spec (context):** [`docs/superpowers/specs/2026-04-12-api-days-ny-hardening-design.md`](https://github.com/openinherit/standard/blob/main/docs/superpowers/specs/2026-04-12-api-days-ny-hardening-design.md)
- **v6.3.0 Release:** [github.com/openinherit/standard/releases/tag/v6.3.0](https://github.com/openinherit/standard/releases/tag/v6.3.0)
- **The will that started it all:** Katrina Tan Wei Lin's Singapore will (fixture at `examples/wills/singapore/katrina-tan/katrina-tan-inherit-v0001.json`)

Thank you both. Your work shaped how INHERIT thinks about data contracts and data quality — I'd like this standard to be worthy of the principles you've written about.

Rich
