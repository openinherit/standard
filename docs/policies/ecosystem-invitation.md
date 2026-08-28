---
title: "INHERIT Ecosystem Invitation"
version: "1.0"
status: draft
date: 2026-04-06T23:30
lastmod: 2026-04-06T23:30
author: "Richard Davies"
source: "docs/policies/ecosystem-invitation.md"
---

# INHERIT Ecosystem Invitation

## Building the Estate Data Ecosystem — Together

INHERIT is an open standard for estate data interchange. It defines how estate information — people, assets, bequests, trusts, relationships, organisations, and more — is structured, shared, and validated across systems.

The standard is published under the Apache 2.0 licence. It is free to implement, extend, and build upon. There are no licensing fees, no registration requirements, and no restrictions on commercial use.

We believe that estate planning technology works best when systems can talk to each other. INHERIT provides the shared language. What the ecosystem builds on top of it is up to you.

---

## What INHERIT Provides

INHERIT focuses on the **data layer** — the portable, interoperable representation of estate information:

- **JSON Schema 2020-12 definitions** for 40+ entity types covering estate planning, probate, and catalogue/collection management
- **Reference data** — jurisdiction-specific tax rates, thresholds, form requirements, and regulatory bodies
- **Validation tooling** — schema validation, referential integrity checks, and conformance levels
- **Extension architecture** — jurisdiction-specific extensions (21 jurisdictions to date) with a clear pattern for adding more
- **Test fixtures** — 2,100+ test cases providing a conformance baseline for any implementation

INHERIT does not define access control, delegation protocols, authentication mechanisms, or transport layers. These are complementary concerns that sit above the data standard.

---

## Opportunities for Collaboration

We welcome collaboration from organisations and individuals working in adjacent and complementary areas. The following are examples of where INHERIT's data layer connects naturally with other capabilities — not an exhaustive list, and not a set of prescriptions.

### Delegation and Access Control

Estate planning involves complex delegation relationships: executors acting on behalf of estates, solicitors acting for beneficiaries, financial advisers with limited access to specific assets. INHERIT models these relationships in its `proxy-authorisation` schema, including support for human, agent, and organisational delegates.

Organisations working on delegation frameworks, verifiable credentials, or access control protocols will find that INHERIT's data model provides the estate-domain context for their technology. We welcome proposals for interoperability mappings and protocol bindings.

### Healthcare and Death Verification

INHERIT includes death verification, insurance, and medical-related fields that intersect with healthcare data standards. Organisations working on health information exchange, death registration systems, or bereavement notification services are natural partners for ensuring these fields align with established practice.

### Financial Services Integration

Estate assets span bank accounts, pensions, insurance policies, investments, and property. INHERIT's financial entity types are designed to be mappable to existing financial data standards. Organisations working on open banking, pension dashboards, or investment platforms can help ensure these mappings are accurate and complete.

### Legal Technology

Will-writing platforms, probate case management systems, and trust administration tools are primary consumers of estate data. We welcome integration guides, reference implementations, and real-world feedback on how INHERIT's schemas work in practice.

### International Jurisdiction Coverage

INHERIT currently supports 21 jurisdiction extensions. Every jurisdiction has unique succession rules, tax regimes, and legal frameworks. Organisations with deep knowledge of specific jurisdictions can contribute extensions, reference data, and validation rules.

### Artificial Intelligence and Automation

INHERIT includes provenance tracking, AI provenance metadata, and agent delegation support. As AI systems increasingly participate in estate administration — from document extraction to beneficiary communication — the standard provides a framework for tracking what was done by whom (or what) and with what authority.

---

## How to Get Involved

### For Implementers

Start with the schemas. The full standard is at [github.com/openinherit/standard](https://github.com/openinherit/standard). The `docs/implement/` directory contains getting-started guides, and the `examples/fixtures/` directory provides realistic test documents.

If you build something on INHERIT, we would love to hear about it. Open a Discussion on GitHub or contact us directly.

### For Standards Organisations

We are interested in formal interoperability with complementary standards. If your organisation defines protocols, schemas, or data models that intersect with estate data, we welcome proposals for alignment. This could take the form of:

- Mapping documents showing how your standard's concepts relate to INHERIT's
- Joint extensions that bridge both standards
- Conformance profiles that validate interoperability

We are protocol-agnostic and vendor-neutral. INHERIT does not prescribe specific transport mechanisms, identity systems, or access control frameworks.

### For Researchers and Academics

Estate planning sits at the intersection of law, finance, technology, and culture. We welcome academic engagement — whether that is citing INHERIT in research, contributing jurisdiction-specific analysis, or proposing schema enhancements based on empirical findings.

### For Jurisdiction Experts

If you have deep knowledge of a jurisdiction's succession law, probate process, or tax regime, your expertise is invaluable. Even if you are not a technologist, you can contribute by reviewing existing jurisdiction extensions for accuracy or by providing the domain knowledge needed to create new ones.

---

## Governance

INHERIT is currently in its stewardship phase, maintained by Testate Technologies Ltd with Richard Davies as Founding Steward. The governance charter (published at `docs/policies/governance-charter.md`) defines a clear, adoption-driven path to independent governance.

Key governance principles:

- **Apache 2.0 licence, irrevocable.** Your implementation investment is protected.
- **Backwards compatibility.** Breaking changes require a major version bump and a 12-month deprecation period.
- **Open contribution.** Pull requests, issues, and discussions are welcome from anyone.
- **Steering committee.** An advisory committee representing diverse jurisdictions and use cases guides the standard's direction.

---

## Contact

- **GitHub:** [github.com/openinherit](https://github.com/openinherit)
- **Website:** [openinherit.org](https://openinherit.org)
- **Email:** hello@openinherit.org

We look forward to building the estate data ecosystem together.
