---
title: "Maturity Signalling for Legal Professionals"
version: "1.0"
status: draft
date: 2026-04-07T12:00
lastmod: 2026-04-07T18:00
author: "Rich Davies"
source: "docs/policies/maturity-signalling.md"
supersedes: null
---

## The Problem

INHERIT uses a standard schema maturity lifecycle — `draft`, `candidate`, `stable` — to communicate how settled a given extension's data structure is. These terms are well understood by software developers: they signal how likely the schema is to change, whether to pin a version, whether to expect breaking changes.

Legal professionals ask different questions. A solicitor considering whether to integrate an INHERIT extension into their practice management system does not primarily care whether the JSON Schema is stable. They care whether the content is trustworthy:

- "Has anyone with legal expertise in this jurisdiction reviewed this?"
- "Has a law society or regulatory body referenced it?"
- "If I rely on this to categorise assets for a grant of probate, is there professional backing for that categorisation?"

Schema maturity answers none of these questions. A schema can be `stable` (unlikely to change technically) while having never been reviewed by a qualified lawyer. Conversely, an extension can be `draft` (still evolving structurally) while having substantive input from practising solicitors.

This policy introduces a parallel signal — `legalReviewStatus` — to address the legal professional's trust question directly.

---

## The Three-Tier legalReviewStatus

### `self_verified` — Lowest Trust

The extension's content has been authored and verified by the INHERIT maintainers only. No independent legal review has taken place. The content reflects the maintainers' best understanding of the relevant jurisdiction's succession law, but this has not been validated by a qualified legal professional practising in that jurisdiction.

**Appropriate use:** Technical prototyping, proof-of-concept integrations, and developer testing. Not suitable as the sole basis for production legal workflows without independent verification.

### `peer_reviewed` — Medium Trust

At least one qualified legal professional practising in the relevant jurisdiction has reviewed the extension's content and confirmed that it reflects current succession law accurately. The reviewer's identity and credentials are recorded in the extension manifest.

**Appropriate use:** Production integrations where the implementer wishes to rely on independent legal input. Implementers should still apply their own professional judgement and note the review date — law changes.

### `institutionally_endorsed` — Highest Trust

A regulatory body, professional association (such as a law society or bar association), or government department has formally referenced, approved, or contributed to the extension. This is the standard that signals the broadest community confidence.

**Appropriate use:** Regulated environments, multi-firm deployments, and any context where demonstrable external validation is required. The endorsing organisation and relevant documentation should be cited in the extension manifest.

---

## How This Differs from Schema Maturity

These two signals are independent and serve different audiences. Neither implies the other.

| Dimension | Schema Maturity | legalReviewStatus |
|-----------|----------------|-------------------|
| **Primary audience** | Developers | Legal professionals |
| **Question answered** | "Is this schema likely to change?" | "Has this content been legally verified?" |
| **Values** | `draft`, `candidate`, `stable` | `self_verified`, `peer_reviewed`, `institutionally_endorsed` |
| **Who assesses it** | INHERIT maintainers | Independent legal reviewers or institutions |
| **What changes it** | Schema design decisions, breaking changes, API stability | Legal review, institutional endorsement |
| **Can they diverge?** | Yes — a `stable` schema can be `self_verified` | Yes — a `draft` schema can be `peer_reviewed` |

**Example:** The UK England & Wales extension may reach `stable` schema maturity (the data structure is settled and no further breaking changes are planned) while remaining `self_verified` if no Law Society of England & Wales endorsement has been obtained. It may equally be `peer_reviewed` while still at `draft` schema maturity if a solicitor has reviewed the content during the early development phase.

---

## Current Status

As of Monday 7 April 2026, all INHERIT extensions carry a `legalReviewStatus` of `self_verified`. This is the honest baseline: the content reflects careful research by the INHERIT maintainers, but no independent legal review has been completed for any jurisdiction.

Upgrading extensions to `peer_reviewed` or `institutionally_endorsed` requires:

1. Identifying a qualified legal professional or institution with relevant jurisdiction expertise
2. Conducting a structured review against the extension's content
3. Recording the reviewer's name, qualifications, jurisdiction, and review date in the extension manifest
4. For institutional endorsement: obtaining a formal statement or citation from the relevant body

The INHERIT project welcomes legal professionals who wish to contribute reviews. See `CONTRIBUTING.md` for how to engage.

---

## Extension Manifest Fields

When an extension has been reviewed, the following fields should be added to its entry in `extensions-registry.json`:

| Field | Type | Description |
|-------|------|-------------|
| `legalReviewStatus` | string (enum) | `self_verified`, `peer_reviewed`, or `institutionally_endorsed` |
| `legalReviewedBy` | string | Name and qualifications of the reviewing legal professional |
| `legalReviewDate` | string (ISO 8601 date) | Date the review was completed |
| `lastVerified` | string (ISO 8601 date) | Date the content was last confirmed accurate against current law |
| `responsibleOrganisation` | string | For institutional endorsement: the endorsing body's name |

**Note:** `legalReviewStatus` is required for all extensions. The remaining fields are required when `legalReviewStatus` is `peer_reviewed` or `institutionally_endorsed`, and optional (but encouraged) for `self_verified` entries.

---

## Governance

This policy is owned by the INHERIT project maintainers. Changes to the tier definitions or the criteria for each tier require a formal proposal (see `docs/proposals/`) and must not be made unilaterally.

Reviewers who have contributed peer reviews are credited in the extension manifest and in the release notes for the version in which their review was incorporated. Institutional endorsements are announced via the INHERIT project's public channels.
