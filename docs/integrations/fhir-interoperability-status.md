---
title: "FHIR Interoperability Guide — Status and Plan"
version: "1.0"
status: draft
date: 2026-04-06T23:45
lastmod: 2026-04-06T23:45
author: "Richard Davies"
source: "docs/integrations/fhir-interoperability-status.md"
---

# FHIR Interoperability Guide — Status and Plan

## Purpose

This document summarises the current state of FHIR interoperability within INHERIT, the planned work for a full mapping guide, and the strategic context for healthcare-estate integration.

---

## Current State

### FHIR Connection Points Already in the Schema

INHERIT v6 includes four optional URI fields designed for cross-referencing with FHIR resources:

| INHERIT Field | Schema | Maps To | Purpose |
|---------------|--------|---------|---------|
| `fhirPatientRef` | `estate.json` → `deathVerification` | FHIR `Patient` | Links deceased person to their healthcare identity |
| `externalConsentRef` | `proxy-authorisation.json` | FHIR `Consent` | Links delegation authority to healthcare consent records |
| `externalPolicyRef` | `insurance-policy.json` | FHIR `Coverage` | Links estate insurance to healthcare coverage records |
| `healthcareRecordAccess` | `proxy-authorisation.json` | FHIR `Consent.provision` | Scopes healthcare record access for delegates |

These are lightweight reference points — INHERIT does not depend on FHIR, but provides connection points for systems that use both standards.

### Published Documentation

- **`docs/releases/fhir-maturity-mapping.md`** — Maps INHERIT's maturity model (Draft/Candidate/Stable) to FHIR's FMM (FMM 0–5 + Normative). Published in the standard repo.

### Internal Analysis (Strategy Repo — Private)

- **`strategy/orgs/fhir/monetisation-analysis.md`** — Detailed comparison of FHIR's ecosystem monetisation ($10.5M HL7 revenue, billions in ecosystem companies) with lessons for INHERIT.
- **`strategy/orgs/fhir/graham-grieve.md`** — Profile of FHIR's creator. No direct relationship yet. Strategic contact for future.
- **`strategy/orgs/delegation/fhir-of-us-probate-thesis.md`** — Analysis of digital estate delegation as "FHIR of US probate", with implications for INHERIT's positioning.

---

## Planned Work: FHIR Interoperability Guide (v6.6)

### Objective

Create a full mapping guide at `docs/integrations/fhir/` showing how FHIR resources map to INHERIT entities. This is work item v6.6 in the v7 work plan, estimated at half a day.

### Planned Mappings

| FHIR Resource | INHERIT Entity | Direction | Notes |
|---------------|---------------|-----------|-------|
| `Patient` | `person` | FHIR → INHERIT | Demographics, identifiers, next of kin. FHIR Patient has deceased flags that map to INHERIT death verification. |
| `RelatedPerson` | `relationship`, `kinship` | FHIR → INHERIT | Family relationships. FHIR RelatedPerson.relationship maps to INHERIT kinship types. |
| `Coverage` | `insurance-policy` | FHIR → INHERIT | Life insurance, health cover. Coverage.beneficiary maps to INHERIT policy beneficiaries. |
| `Consent` | `proxy-authorisation` | FHIR → INHERIT | Delegation of authority. FHIR Consent.provision maps to INHERIT delegate capabilities. |
| `Observation` | `estate.deathVerification` | FHIR → INHERIT | Cause of death, death certification. FHIR Observation with death-related codes. |
| `Practitioner` | `organisation`, `person` | FHIR → INHERIT | Healthcare professionals involved in death certification or capacity assessment. |
| `Organization` | `organisation` | Bidirectional | Hospitals, care homes, insurers — entities in both domains. |
| `DocumentReference` | `document` | FHIR → INHERIT | Medical records, death certificates, capacity assessments referenced in estate documents. |

### Guide Structure (Planned)

```
docs/integrations/fhir/
├── README.md                    ← Overview and when to use this guide
├── patient-to-person.md         ← Patient → person mapping with field table
├── coverage-to-insurance.md     ← Coverage → insurance-policy mapping
├── consent-to-delegation.md     ← Consent → proxy-authorisation mapping
├── observation-to-death.md      ← Observation → deathVerification mapping
└── examples/
    ├── fhir-patient-to-inherit.json   ← Worked example
    └── inherit-to-fhir-coverage.json  ← Reverse mapping example
```

Each mapping document will include:
- Field-level mapping table (FHIR field → INHERIT field, with transformation notes)
- Code system mappings (FHIR value sets → INHERIT enums)
- Worked JSON example showing a complete transformation
- Edge cases and gaps (fields that exist in one standard but not the other)

### Key Design Decisions

1. **INHERIT does not import FHIR types.** The mapping is a translation guide, not a dependency. Systems convert between formats at integration points.

2. **URI references, not embedded objects.** INHERIT links to FHIR resources by URI (e.g. `fhirPatientRef: "https://fhir.hospital.example/Patient/12345"`), not by embedding FHIR JSON inside INHERIT documents.

3. **Unidirectional by default.** Most mappings flow FHIR → INHERIT (healthcare data enriching estate records). The reverse (INHERIT → FHIR) is less common but supported for insurance and consent scenarios.

4. **Code system alignment.** Where FHIR uses SNOMED CT or ICD-10 codes and INHERIT uses plain enums, the mapping documents will include a translation table. INHERIT will not adopt FHIR's code system approach — the domains are different enough that forced alignment would compromise both.

---

## Why FHIR Interoperability Matters

### The Intersection

Healthcare and estate planning overlap at several critical points:

- **Death verification** — a healthcare event that triggers estate administration
- **Insurance claims** — life insurance, health cover, and death benefits span both domains
- **Capacity assessment** — testamentary capacity is both a medical and legal determination
- **Care home residents** — estates of people in long-term care involve healthcare providers as stakeholders
- **Medical records access** — executors may need medical records for insurance claims or inquest proceedings

### The Audience

The FHIR interoperability guide is primarily for:

- **Health insurers** — mapping policyholder data between claims and estate settlement
- **Hospital IT teams** — death notification workflows that feed into probate systems
- **Care home platforms** — resident estate management alongside care records
- **Government systems** — death registration services that bridge vital records and estate administration
- **Integration vendors** — building middleware between healthcare and legal/estate platforms

### Strategic Positioning

FHIR is the most widely adopted open data standard in healthcare (mandated in the US since 2020). Demonstrating clean interoperability with FHIR signals to the healthcare-adjacent market that INHERIT is serious about integration. It also provides a concrete example of how INHERIT works alongside existing standards rather than competing with them.

---

## Timeline

| Item | Status | Target |
|------|--------|--------|
| FHIR connection points in schema | Done (v6) | — |
| Maturity mapping document | Done | — |
| Full interoperability guide | Not started | Before or shortly after API Days Singapore (Monday 14 April 2026) |
| Worked examples | Not started | With the guide |
| FHIR community outreach | Not started | After guide publication |

---

## References

- HL7 FHIR R4: https://hl7.org/fhir/R4/
- INHERIT Standard: https://github.com/openinherit/standard
- INHERIT Governance Charter: `docs/policies/governance-charter.md`
