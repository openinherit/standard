---
title: "Undocumented Features Audit — What's in the Repo But Not on the Sites"
version: "1.1"
status: draft
date: 2026-04-09T20:00
lastmod: 2026-04-09T20:30
author: "Rich Davies"
source: "docs/implement/undocumented-features-audit.md"
---

# Undocumented Features Audit

**What's in the repo but not on the sites**

Wednesday 9 April 2026

An audit of the `openinherit/standard` repository found 26 documents that exist in the codebase but are not showcased on either www.openinherit.org or dev.openinherit.org. This report groups them into three tiers by impact and urgency.

**Note on dates:** All 26 files were created on Monday 7 April 2026 in a single documentation session. They have not been modified since. Before publishing any of these on the websites, each document should be reviewed for accuracy against the current schemas (v6.0) — some content may have been drafted aspirationally or may reference features not yet implemented.

---

## Tier 1: High-Value — Should Be on the Sites Now

These are the documents that would most change how the sites are perceived by lawyers, developers, and institutional evaluators.

| # | Content | File | Exists | Last Modified | Site | Why it matters |
|---|---------|------|--------|---------------|------|----------------|
| 1 | **Roadmap** | `ROADMAP.md` | Yes | 7 Apr 2026 | both | Shows where INHERIT is going — v7.0 plans, hosted validation, platform certification, Python/Go SDKs. |
| 2 | **Conformance Levels** | `docs/policies/conformance-levels.md` | Yes | 7 Apr 2026 | both | Three levels (Schema Valid, Referentially Intact, Jurisdiction Complete) — how implementers prove compliance. |
| 3 | **Data Protection Guide** | `docs/policies/data-protection-guide.md` | Yes | 7 Apr 2026 | www | GDPR field classification, deceased persons rules, retention periods. The first question every lawyer asks. |
| 4 | **Conformance Test Kit** | `packages/conformance/README.md` | Yes | 7 Apr 2026 | dev | 2,100+ test cases. Trust signal for developers and institutional evaluators. |
| 5 | **Migration Guide** | `docs/implement/migration-guide.md` | Yes | 7 Apr 2026 | dev | How to migrate from spreadsheets, databases, and other formats. "I have existing data, now what?" |
| 6 | **Primer** | `docs/implement/primer.md` | Yes | 7 Apr 2026 | www | Narrative walkthrough from first principles. The "explain it to me like I'm new" document. |
| 7 | **Error Guide** | `docs/implement/error-guide.md` | Yes | 7 Apr 2026 | dev | RFC 9457 compliant error reference with Level 1, 2, and 3 error codes and fixes. |
| 8 | **Code Examples** | `examples/README.md` | Yes | 7 Apr 2026 | dev | 3 TypeScript, Python, Go examples + 30 fixture files. Link from Getting Started and dev homepage. |
| 9 | **Security Policy** | `SECURITY.md` | Yes | 7 Apr 2026 | both | Vulnerability reporting, response times, encrypted reporting. Trust signal for institutional adopters. |
| 10 | **CHANGELOG** | `CHANGELOG.md` | Yes | 7 Apr 2026 | dev | Full version history. Currently the changelog page just links to GitHub instead of rendering the content. |

### Commentary

The **Roadmap**, **Conformance Levels**, and **Data Protection Guide** are the three that would most change how the sites are perceived. Right now the sites show what INHERIT *is*. These three show what it *will become* (roadmap), how you *prove* you're using it correctly (conformance), and how it handles the question *every lawyer will ask first* (data protection).

The **Conformance Test Kit** (2,100+ tests) and **Security Policy** are pure trust signals — they cost nothing to add but immediately signal maturity to developers and institutions.

The **Primer** is probably the missing piece for www — it's the "explain INHERIT to me from scratch" narrative that the current How It Works page tries to be but doesn't quite achieve.

**Review note:** All files are from Monday 7 April. Before publishing, verify each document against the current v6.0 schemas and check for aspirational content that may describe planned rather than implemented features.

---

## Tier 2: Valuable — Should Be Added Soon

These documents deepen the story for specific audiences — developers building integrations, specialist valuers, faith community partners, and institutional evaluators.

| # | Content | File | Exists | Last Modified | Site | Why it matters |
|---|---------|------|--------|---------------|------|----------------|
| 11 | **Extension Composition** | `docs/implement/extension-composition.md` | Yes | 7 Apr 2026 | dev | 7 validated multi-extension combos (England & Wales + Islamic, etc.). Real-world complexity. |
| 12 | **Identifier Systems** | `docs/implement/identifier-systems.md` | Yes | 7 Apr 2026 | dev | Rolex serials, NGC coins, GIA diamonds — how to identify specific asset types. Niche but high-value. |
| 13 | **Companion Estates** | `docs/implement/companion-estates.md` | Yes | 7 Apr 2026 | dev | Couples/household estates with joint ownership. Very common real-world pattern. |
| 14 | **Cultural Sensitivity** | `docs/policies/cultural-sensitivity.md` | Yes | 7 Apr 2026 | www | "Models legal systems, not beliefs." Important for faith community partners. |
| 15 | **Maturity Signalling** | `docs/policies/maturity-signalling.md` | Yes | 7 Apr 2026 | both | Separates developer maturity from legal review status. Two different audiences, two different signals. |
| 16 | **Enum Reference** | `docs/releases/enum-reference.md` | Yes | 7 Apr 2026 | dev | Complete catalogue of every enum value across all schemas. Essential developer reference. |
| 17 | **Person Roles** | `docs/releases/person-roles.md` | Yes | 7 Apr 2026 | dev | All valid roles (testator, beneficiary, executor, guardian, etc.). Quick reference. |
| 18 | **Delegation & Credentials** | `docs/implement/delegation-credential-mapping.md` | Yes | 7 Apr 2026 | dev | W3C Verifiable Credentials, OAuth 2.0 Token Exchange mapping. Shows sophistication. |
| 19 | **Marketplace Integration** | `docs/proposals/marketplace-integration.md` | Yes | 7 Apr 2026 | dev | eBay, Chrono24, Catawiki API mapping for asset valuations. Practical for asset-heavy estates. |

---

## Tier 3: Niche but Worth Having

Technical reference documents that complete the picture for contributors and advanced implementers.

| # | Content | File | Exists | Last Modified | Site |
|---|---------|------|--------|---------------|------|
| 20 | JSON Profile | `docs/policies/json-profile.md` | Yes | 7 Apr 2026 | dev |
| 21 | Canonical JSON | `docs/policies/canonical-json.md` | Yes | 7 Apr 2026 | dev |
| 22 | Versioning Policy | `docs/policies/versioning.md` | Yes | 7 Apr 2026 | dev |
| 23 | JSON Schema Patterns | `docs/implement/json-schema-patterns.md` | Yes | 7 Apr 2026 | dev |
| 24 | Taxonomy Provenance | `docs/policies/taxonomy-provenance.md` | Yes | 7 Apr 2026 | dev |
| 25 | Contract Test Suite | `tests/contract/README.md` | Yes | 7 Apr 2026 | dev |
| 26 | Dynamic Extension Points | `docs/proposals/dynamic-extension-points.md` | Yes | 7 Apr 2026 | dev |

---

## Summary

- **All 26 files exist** in the repository
- **All were created on Monday 7 April 2026** in a single documentation session
- **None have been modified since** — they need review before publishing
- **Key risk:** Some content may be aspirational (describing planned features) rather than documenting what v6.0 actually supports. Each document needs a quick accuracy check before going live.

### What Stands Out Most

The sites currently show what INHERIT **is**. The missing documents show:

- **What it will become** — the Roadmap
- **How you prove you're using it correctly** — Conformance Levels + Test Kit
- **How it handles the first question every lawyer asks** — Data Protection Guide
- **How you get started from scratch** — the Primer + Migration Guide
- **That it's a mature, serious project** — Security Policy, 2,100+ tests, error codes, versioning

These aren't nice-to-haves. For an institutional evaluator doing due diligence, the absence of conformance levels, data protection guidance, and a security policy would be a red flag. Adding them costs very little — the content already exists. It just needs reviewing and publishing.
