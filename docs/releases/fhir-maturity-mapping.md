---
title: "FHIR Maturity Mapping"
version: "1.0"
status: draft
date: 2026-04-05T03:00
lastmod: 2026-04-05T03:00
author: "Rich Davies"
source: "docs/releases/fhir-maturity-mapping.md"
---

# FHIR Maturity Mapping

INHERIT's maturity model is influenced by HL7 FHIR's maturity framework. This document maps INHERIT maturity levels to FHIR's FMM (FHIR Maturity Model) for implementers familiar with the FHIR ecosystem.

## Maturity level mapping

| INHERIT level | FMM equivalent | Criteria | Meaning |
|--------------|---------------|----------|---------|
| **Draft** | FMM 0–1 | Schema published, may change substantially. No production implementations required. | Experimental — suitable for prototyping and feedback. Breaking changes expected. |
| **Candidate** | FMM 2–3 | Schema tested in at least one production system. Community feedback incorporated. API stability improving. | Production-ready for early adopters. Breaking changes possible but will be documented with migration guidance. |
| **Stable** | FMM 4–5 | Multiple independent implementations. Two-implementation rule satisfied. Extensive test coverage. | Mature — breaking changes require a major version increment and formal deprecation process. |

## Key differences from FHIR

| Aspect | FHIR | INHERIT |
|--------|------|---------|
| **Granularity** | Per-resource (each FHIR resource has its own FMM level) | Per-schema (each INHERIT entity schema has its own maturity level) |
| **Governance** | HL7 ballot process — formal committee votes | Steering committee review — lighter process, faster iteration |
| **Promotion criteria** | Connectathon testing + ballot | Two independent implementations + community review |
| **Number of levels** | 6 (FMM 0–5, plus Normative) | 3 (Draft, Candidate, Stable) |
| **Normative status** | FHIR has a formal "Normative" level above FMM 5 | INHERIT does not currently distinguish between Stable and Normative |

## FHIR interoperability

INHERIT v4 includes fields designed for interoperability with FHIR systems:

- `fhirPatientRef` on estate deathVerification — URI to the FHIR Patient resource
- `externalConsentRef` on proxy-authorisation — URI to a FHIR Consent resource
- `externalPolicyRef` on insurance-policy — URI to a FHIR Coverage resource
- `healthcareRecordAccess` on proxy-authorisation — maps to FHIR Consent.provision scope

These fields are optional URI references. INHERIT does not depend on FHIR — it provides connection points for systems that use both standards.

## Why this mapping matters

Healthcare and estate planning intersect at end-of-life care, insurance claims, and medical record access after death. Systems that use FHIR for healthcare data can use INHERIT for estate data, with URI references linking the two. This mapping helps implementers in healthcare-adjacent organisations (insurers, hospitals, care homes) understand where INHERIT fits alongside FHIR in their architecture.
