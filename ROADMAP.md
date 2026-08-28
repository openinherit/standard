---
title: Roadmap
---

# INHERIT Roadmap

<!-- CI enforces that the version in the heading below matches package.json.
     When bumping the version: update package.json first, then this heading.
     Note: v6.0.0 schema changes are merged but the npm package version bump is pending. -->

## Current: v6.6.0 (April 2026)

*Schema changes merged to `main`. npm publish pending.*

### Website Launch

Two audience-specific sites launched on Wednesday 9 April 2026:

- **[www.openinherit.org](https://www.openinherit.org)** — for legal professionals, estate planners, institutional decision-makers, and journalists. Homepage, 39 example scenarios, 21 jurisdiction extensions, compatible platforms showcase, partners, media pack.
- **[dev.openinherit.org](https://dev.openinherit.org)** — developer portal with schema reference (40+ entity pages generated from schemas), API reference, validator, 7 developer case studies, integration guides, getting-started guide, AI integration guide.

Built with Hugo, deployed on GitHub Pages. Extension data flows from the standard repo to the www site.

### Compatible Platforms

7 platform integration guides published on both sites, showing how estate data flows between real-world platforms and INHERIT:

**Full guides** (field-level mapping, authentication, code examples):
- [Clio](https://dev.openinherit.org/integrations/clio/) — Contacts, Matters, 13 Wills & Estates Custom Field Sets
- [Actionstep](https://dev.openinherit.org/integrations/actionstep/) — Actions, Participants, Data Collections, estate planning and probate workflow templates
- [Wealth.com](https://dev.openinherit.org/integrations/wealth-com/) — REST API, SFTP bulk format, Ester AI output mapping
- [Addepar](https://dev.openinherit.org/integrations/addepar/) — entity hierarchy, position/ownership percentages, 300+ attribute mapping

**Partial guides** (conceptual mapping, partnership pathway):
- [Settld](https://dev.openinherit.org/integrations/settld/) — proposed Bereavement API data format, death verification mapping
- [Estateably](https://dev.openinherit.org/integrations/estateably/) — probate entity mapping, court form data model
- [LegalZoom](https://dev.openinherit.org/integrations/legalzoom/) — Embedded Legal Services Flow concept, questionnaire field mapping

**On roadmap:** LEAP Legal Software, PracticePanther, Rocket Lawyer — [register interest](https://www.openinherit.org/integrations/).

### Catalogue and Dealer Workflows

New fields and schemas supporting catalogue-mode operations and dealer interactions:

- `ownerIntent` — declares the owner's intent for an asset (keep, sell, donate, etc.)
- `listings` — tracks where an asset is listed for sale or auction
- `rootDocumentId` — renamed from `estateId` for clarity across catalogue and estate contexts
- `legacyLetter` — structured support for letters of wishes and legacy letters
- `dealerProfile` — dealer-specific metadata on organisations
- `dealerInterests` and `spaces` arrays added to the catalogue schema

### Pre-orders and Verification

- `preOrderStatus` — tracks pre-order state on asset interests
- `spaceId` — links assets and interests to physical or virtual spaces
- `vatConfiguration` — VAT/tax configuration at the organisation level
- `giftListSettings` — gift list preferences for asset collections
- `verificationResult` — structured verification outcomes
- `internationalShipping` — international shipping configuration on organisations
- `dataSource` — field-level provenance attribution via `field-provenance.json`

### Multi-category Support

Three new condition/grading systems for specialist asset categories:

- **Watch trade** — condition grading aligned with horological trade conventions
- **Classic vehicle** — condition classification for classic and vintage vehicles
- **Book trade** — condition terminology for antiquarian and second-hand books

Additional cross-category fields:

- `portable` space type
- `serviceHistory` — maintenance and service records on assets
- `insuranceCover` — insurance details on assets
- `shippingClass` — shipping classification for logistics
- `validUntil` on valuations — expiry date for valuation validity
- `includedDocuments` — 16 cross-category document types (e.g. certificates, manuals, provenance papers)

### Governance

- **Founding Steward** terminology adopted — replaces the previous "Benevolent Dictator" label throughout governance documents
- Published [governance charter](docs/policies/governance-charter.md) formalising decision-making, voting, and stewardship succession

## Delivered in v5.0.0 (April 2026)

### Delegation Credential Claims Mapping

The [delegation credential claims mapping](docs/implement/delegation-credential-mapping.md) shows how INHERIT's v4 fields correspond to anticipated delegation credential claims across the ecosystem (W3C Verifiable Credentials Data Model 2.0, OpenID Foundation specifications, OAuth 2.0 Token Exchange). INHERIT provides the estate data layer; delegation protocols provide the authentication and access layer.

## Delivered in v4.0.0 (April 2026)

### Schema Credibility

- **21 jurisdiction/cultural extensions** — 17 original + Brazil, Hong Kong, Switzerland, Israel
- **Delegation-readiness fields** — `trustLevel`, `subDelegation`, `activationTrigger`, `credentialRef`, community witness roles
- **Enterprise-requested fields** — insurance claim lifecycle, beneficiary verification, auction data, provenance chains, nomination lifecycle, escheatment, partial documents
- **FHIR interoperability** — `fhirPatientRef`, `externalConsentRef`, `externalPolicyRef`, `healthcareRecordAccess`, human-readable `display` on all FK references, `bundleType`
- **Field name audit** — 23 fields cross-referenced against 7 standards (schema.org, JSON-LD, FHIR R5, W3C VC, RUFADAA, RDAP, platform APIs)

## Delivered in v3.0.0 (April 2026)

### Core Standard

- 31 core entity schemas, 14 common types, 5 asset categories
- 17 jurisdiction/cultural extensions
- OpenAPI 3.1 schema bundle + 109-endpoint Reference REST API
- `schemaVersion` for version detection, `applicationState` for client-side state, `referentialIntegrity` for cross-entity validation
- 45/50 JSON Schema 2020-12 keywords used
- `maxLength` on all ~478 strings, `maxItems` on all ~100 arrays, `pattern` backup on all 261 format fields
- Hybrid content model (embedded base64 + URL references)
- Companion estate design with ownership categories and sync rules

### Developer Experience

- TypeScript, Python, and Go examples
- 10 global estate fixtures across 8 jurisdictions
- AI integration guide with extraction prompts
- Agent configuration files (Claude Code, OpenAI Codex, GitHub Copilot, Cursor)
- Swagger UI API explorer

## Next: v7.0.0

The following items are planned for the next major release. We welcome collaboration from the community on all of these.

### Hosted Validation Service

A hosted validation API endpoint where implementers can validate INHERIT documents without building their own tooling. The [browser-based validator](https://dev.openinherit.org/validator/) already exists on the developer portal; this extends it to a programmatic API. We are exploring a collaboration with [Sourcemeta](https://www.sourcemeta.com/) for the underlying validation engine.

### Platform Certification Programme

An "INHERIT Certified" badge that platforms can earn by demonstrating conformance to the standard. The programme will include automated conformance testing using the [Conformance Test Kit](packages/conformance/) (2,100+ test cases), documentation requirements, and a public registry of certified implementations.

### Delegation and Access Layer

We welcome standards bodies working on the delegation and access layer for digital estates. INHERIT provides the data format; the delegation protocol is a complementary concern. The [delegation credential claims mapping](docs/implement/delegation-credential-mapping.md) documents how INHERIT's fields align with W3C Verifiable Credentials and OAuth 2.0 Token Exchange.

### Additional Jurisdiction Extensions

Planned extensions for South Korea, Indonesia, Philippines, and other jurisdictions based on community demand. The [extension guide](docs/implement/extension-guide.md) documents how to contribute new jurisdiction extensions. Browse the current [21 jurisdictions](https://www.openinherit.org/extensions/).

## How to Influence the Roadmap

- File an issue or proposal on [GitHub](https://github.com/openinherit/standard/issues)
- Browse the [compatible platforms](https://www.openinherit.org/integrations/) — request an integration for your platform
- Partnership organisations get a steering committee seat — see [Partners](https://www.openinherit.org/partners/)
- All roadmap decisions are discussed publicly
