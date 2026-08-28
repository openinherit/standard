# LegalZoom Integration Guide

## Overview

[LegalZoom](https://www.legalzoom.com/) is the largest consumer legal services platform in the United States, serving millions of customers since its founding in 2001. The company went public on the Nasdaq in 2021 and has facilitated the creation of an estimated four million or more last wills and testaments, making it one of the highest-volume estate document producers in the world.

LegalZoom's estate planning product line includes:

- **Last Will and Testament** — a guided questionnaire that produces a state-specific will as a downloadable PDF
- **Living Trust** — a revocable living trust package including pour-over will, certificate of trust, and transfer documents
- **Power of Attorney** — both financial and healthcare powers of attorney
- **Healthcare Directive** (Living Will) — advance directive for medical treatment preferences
- **Legal Plans** — a subscription service (from ~$14.99/month) providing ongoing access to an attorney network for document review, updates, and consultations

LegalZoom's model is fundamentally **questionnaire-driven**: the consumer answers a structured series of questions about their personal details, family, assets, wishes, and appointed roles. The platform then generates legally compliant documents as PDF output. There is no persistent structured data API for estate planning — the consumer's answers exist within LegalZoom's internal systems but are not exposed programmatically to third parties.

This is a **partial integration guide**. LegalZoom does not currently offer a public API for estate planning data. The guide documents the conceptual alignment between LegalZoom's data capture and INHERIT's schemas, describes how an integration could work using patterns LegalZoom has already deployed in other product lines, and provides a partnership pathway for making this integration real.

## Integration Opportunity

### The Problem

LegalZoom serves a mass-market audience — individuals and families who may not have an existing relationship with a solicitor or financial adviser. Many of these consumers will later need to:

1. **Share their estate plan with a professional adviser** — a financial planner, tax adviser, or solicitor who needs structured data, not a PDF to re-key manually
2. **Update their plan on a different platform** — life changes (marriage, divorce, children, relocation to another jurisdiction) may lead the consumer to a different service provider, but their data is locked inside LegalZoom
3. **Coordinate with executors and trustees** — appointed individuals need access to plan details, ideally in a format their own tools can ingest
4. **Submit data to government registries** — as jurisdictions move towards digital probate and estate registration, structured data will become a regulatory expectation rather than a convenience

Without a standard data format, each of these use cases requires manual re-entry of information the consumer has already provided. This is error-prone, time-consuming, and creates a poor experience for both consumers and professionals.

### The Opportunity

INHERIT provides the missing interchange layer. A LegalZoom + INHERIT integration would enable:

- **Data portability for consumers** — export a structured, machine-readable representation of their estate plan alongside the PDF documents. The consumer owns their data and can take it wherever they choose.
- **Pre-fill from advisory platforms** — financial advisers using INHERIT-compatible platforms (wealth management tools, practice management systems) could push client data into LegalZoom's intake flow, eliminating redundant data entry and reducing errors.
- **Downstream consumption by professionals** — solicitors, accountants, and estate administrators could import LegalZoom-originated estate data into their own systems without manual transcription.
- **Multi-platform continuity** — a consumer who starts with a LegalZoom will and later establishes a trust through a different provider can carry their data forward in a standard format.
- **Regulatory readiness** — as digital probate initiatives mature (particularly in the UK and EU), having estate data in a standards-compliant format positions LegalZoom ahead of regulatory requirements.

### Strategic Fit

LegalZoom has already demonstrated interest in platform interoperability through its **Embedded Legal Services Flow** for business formation, which allows partners to pre-fill LegalZoom's intake questionnaire from their own data. This proves the technical pattern exists within LegalZoom's architecture. Extending this pattern to estate planning — with INHERIT as the data interchange format — is a natural evolution.

LegalZoom's **Legal Plans** subscription service also creates an ongoing relationship with consumers that benefits from data portability. A consumer on a Legal Plan who can export their estate data in INHERIT format, share it with their assigned attorney, and receive updates back in the same format has a materially better experience than one working with static PDFs.

## Conceptual Field Mapping

The following tables map LegalZoom's publicly visible questionnaire fields (as presented in their estate planning intake flow) to INHERIT v4 schemas. These mappings are based on the information LegalZoom collects during its guided questionnaire process, as documented in their public-facing product descriptions and user experience.

> **Note:** LegalZoom's internal data model is not publicly documented. These mappings represent the conceptual alignment between the information LegalZoom captures and INHERIT's structured schemas. Actual field names, data types, and internal identifiers would need to be confirmed through a technical partnership.

### Personal Information -> `person.json`

LegalZoom collects the testator's personal details at the start of the estate planning questionnaire.

| LegalZoom Questionnaire Field | INHERIT Schema | INHERIT Field | Notes |
|---|---|---|---|
| Full legal name | `person.json` | `givenName`, `additionalName`, `familyName` | LegalZoom captures full name; split into structured components |
| Date of birth | `person.json` | `dateOfBirth` | ISO 8601 date format |
| State of residence | `person.json` / `estate.json` | `contact.address.region` / `domicile` | US state — maps to ISO 3166-2 code (e.g. `US-CA`). Also determines the estate's domicile and governing law |
| Address | `person.json` | `contact.address` | Full postal address mapped to INHERIT's `common/address.json` structure |
| Phone number | `person.json` | `contact.phone` | E.164 format recommended |
| Email address | `person.json` | `contact.email` | Used for account and document delivery |
| Gender | `person.json` | `gender` | Collected for document pronoun generation; maps to INHERIT enum |
| Citizenship / country of birth | `person.json` | `taxResidency`, `identifiers[]` | Relevant for cross-border estate planning |
| Marital status | `person.json` / `relationship.json` | Determines relationship creation | See Spouse/Partner section below |

The testator person record should include `roles: ["testator"]` in the INHERIT output.

**INHERIT fields not collected by LegalZoom (typical):** `dateOfDeath`, `ritualName`, `clanOrLineage`, `phoneticReading`, `titles[]` (beyond standard prefix). These would remain empty or be populated from other sources.

### Spouse / Partner -> `person.json` + `relationship.json`

If the testator indicates they are married or have a domestic partner, LegalZoom collects spouse/partner details.

| LegalZoom Questionnaire Field | INHERIT Schema | INHERIT Field | Notes |
|---|---|---|---|
| Spouse/partner full name | `person.json` | `givenName`, `additionalName`, `familyName` | Creates a second `person` record |
| Date of birth (if collected) | `person.json` | `dateOfBirth` | May not be collected in all flows |
| Relationship type | `relationship.json` | `relationshipType` | Map: Married -> `spouse`; Domestic partner -> `partner`; Civil union -> `civil_partner` |
| Date of marriage/union | `relationship.json` | `startDate` | ISO 8601 date |
| Whether spouse is a US citizen | `person.json` | `taxResidency` | Affects marital deduction for federal estate tax |
| Property regime | `estate.json` | `defaultPropertyRegime` | Inferred from state of residence — community property vs separate property states |

The relationship record links the testator and spouse via `fromPersonId` and `toPersonId`, with the appropriate `relationshipType`.

**Community property states** (Arizona, California, Idaho, Louisiana, Nevada, New Mexico, Texas, Washington, Wisconsin) have different default property treatment. LegalZoom's questionnaire accounts for this implicitly through state selection; in INHERIT, this is captured explicitly in `estate.defaultPropertyRegime`.

### Children and Dependants -> `person.json` + `kinship.json` + `guardian.json`

LegalZoom collects details for each child or dependant, including whether guardianship appointments are needed for minors.

| LegalZoom Questionnaire Field | INHERIT Schema | INHERIT Field | Notes |
|---|---|---|---|
| Child's full name | `person.json` | `givenName`, `additionalName`, `familyName` | One `person` record per child |
| Date of birth | `person.json` | `dateOfBirth` | Used to determine minor status |
| Relationship to testator | `kinship.json` | `kinshipType` | Map: Biological child -> `parent_child_biological`; Adopted child -> `parent_child_adopted`; Stepchild -> `parent_child_step` |
| Is child a minor | Derived | Calculated from `dateOfBirth` | Determines whether guardian appointment is relevant |
| Named guardian for minors | `guardian.json` | `guardianPersonId`, `scope` | Creates a `guardian` record linking to the appointed person. Scope: `personal` for care of the child |
| Alternate guardian | `guardian.json` | Second `guardian` record with `priority: 2` | LegalZoom allows naming a backup guardian |
| Special needs / provisions | `person.json` / `wish.json` | `notes` / special needs trust reference | May trigger a supplemental needs trust in the Living Trust product |

Each child generates:
- A `person` record (with `roles` including `beneficiary` if they inherit)
- A `kinship` record linking the child to the testator (and potentially to the spouse)
- A `guardian` record if the child is a minor and a guardian has been appointed

### Beneficiaries -> `person.json` (with beneficiary role)

LegalZoom's questionnaire collects beneficiary designations — who receives what, and in what proportions.

| LegalZoom Questionnaire Field | INHERIT Schema | INHERIT Field | Notes |
|---|---|---|---|
| Beneficiary name | `person.json` | `givenName`, `familyName` | May reference an already-created person (spouse, child) or create a new one |
| Beneficiary relationship | `kinship.json` / `relationship.json` | `kinshipType` / `relationshipType` | Determines which linking schema to use |
| Share / percentage | `bequest.json` | `share` / `percentage` | See Bequests section below |
| Contingent beneficiary | `bequest.json` | Linked via `contingentBequests` or priority ordering | LegalZoom allows naming alternate beneficiaries |
| Organisation beneficiary (charity) | `organisation.json` | `name`, `organisationType: "charity"` | Charitable bequests create an `organisation` record rather than a `person` |

Each individual beneficiary should have `"beneficiary"` included in their `roles` array on the `person` record. Organisation beneficiaries map to `organisation.json` with appropriate type classification.

### Assets -> `asset.json` Categories

LegalZoom's Living Trust product collects more detailed asset information than the basic will product. The will questionnaire may ask about asset types at a high level to guide specific bequest decisions.

| LegalZoom Asset Category | INHERIT Schema | INHERIT `assetCategory` | Notes |
|---|---|---|---|
| Real property (house, land) | `asset.json` | `real_property` | Address, estimated value, ownership type (sole, joint, community) |
| Bank accounts | `asset.json` | `financial_account` | Institution name, account type (current, savings), approximate balance |
| Investment / brokerage accounts | `asset.json` | `financial_account` | Institution name, approximate value |
| Retirement accounts (401k, IRA) | `asset.json` | `pension` | Account type, institution, approximate value. Note: retirement accounts typically pass by beneficiary designation, not by will |
| Life insurance policies | `insurance-policy.json` | N/A (dedicated schema) | Insurer, policy number, death benefit amount, named beneficiaries |
| Vehicles | `asset.json` | `vehicle` | Make, model, year, approximate value |
| Business interests | `asset.json` | `business_interest` | Business name, ownership percentage, entity type |
| Personal property (jewellery, art, collections) | `asset.json` | `personal_possession` | Description, estimated value |
| Digital assets | `asset.json` | `digital_asset` | Description, access instructions (LegalZoom may reference these in the will's digital asset provisions) |

**Monetary values:** LegalZoom presents values in dollars (e.g. $250,000). INHERIT stores monetary amounts in minor units (e.g. `25000000` for USD 250,000.00) with an explicit `currency` field set to `USD`.

**Ownership types:** LegalZoom captures how assets are held (sole ownership, joint tenancy, tenancy in common, community property). This maps to INHERIT's `ownershipType` field on the asset record. Joint assets and assets with beneficiary designations (retirement accounts, life insurance) may pass outside the will — INHERIT captures this via the `transferMechanism` field.

### Executor and Trustee Selection -> `executor.json`, `trust.json`

| LegalZoom Questionnaire Field | INHERIT Schema | INHERIT Field | Notes |
|---|---|---|---|
| Primary executor name | `executor.json` | `personId`, `priority: 1` | Creates an `executor` record referencing a `person` |
| Alternate executor name | `executor.json` | `personId`, `priority: 2` | Second `executor` record |
| Executor relationship to testator | `person.json` / `kinship.json` | Appropriate linking record | |
| Executor powers (sell property, etc.) | `executor.json` | `powers[]` | LegalZoom's standard will grants broad executor powers; map to INHERIT's powers enum |
| Primary trustee (Living Trust) | `trust.json` | `trustees[].personId`, `role: "trustee"` | The settlor is typically the initial trustee of a revocable living trust |
| Successor trustee | `trust.json` | `trustees[]` with ordering | Takes over when the initial trustee can no longer serve |
| Corporate trustee | `trust.json` / `organisation.json` | `trustees[].organisationId` | Some consumers name a bank or trust company |

For LegalZoom's Living Trust product, the trust record should include:
- `trustType` — typically `discretionary` for a revocable living trust
- `revocability: "revocable"` — standard for living trusts
- `isTestamentary: false` — living trusts are inter vivos
- `settlor` — reference to the testator's person ID
- `governingLaw` — derived from the state of residence

### Specific Bequests -> `bequest.json`

LegalZoom's questionnaire allows the testator to make specific gifts of particular assets to named beneficiaries, as well as defining the residuary estate distribution.

| LegalZoom Questionnaire Field | INHERIT Schema | INHERIT Field | Notes |
|---|---|---|---|
| Specific gift description | `bequest.json` | `description` | Free-text description of the item or asset |
| Specific gift recipient | `bequest.json` | `beneficiaryPersonId` or `beneficiaryOrganisationId` | Reference to the recipient |
| Gift type | `bequest.json` | `bequestType` | Map: specific item -> `specific`; cash amount -> `pecuniary`; percentage of estate -> `residuary` |
| Cash amount (pecuniary legacy) | `bequest.json` | `amount` | In minor units (cents for USD) |
| Residuary estate split | `bequest.json` | `percentage` | Percentage of residuary estate (e.g. `5000` for 50.00%) |
| Per stirpes / per capita | `bequest.json` | `distributionMethod` | How the share passes if the beneficiary predeceases |
| Contingent beneficiary for bequest | `bequest.json` | `contingentBeneficiaryPersonId` | Alternate recipient |

A typical LegalZoom will generates multiple `bequest` records:
- Zero or more `specific` bequests (particular items to named people)
- Zero or more `pecuniary` bequests (fixed cash amounts)
- One or more `residuary` bequests (the remainder of the estate, split by percentage)

### Pet Care -> `pet.json`

LegalZoom's will questionnaire includes provisions for pet care — naming a caretaker and optionally setting aside funds.

| LegalZoom Questionnaire Field | INHERIT Schema | INHERIT Field | Notes |
|---|---|---|---|
| Pet name | `pet.json` | `name` | Direct mapping |
| Pet type / species | `pet.json` | `species` | Map to INHERIT enum (e.g. `dog`, `cat`, `horse`, `other`) |
| Pet breed (if collected) | `pet.json` | `breed` | Direct mapping |
| Named caretaker | `pet.json` | `caretakerPersonId` | Reference to the appointed person's `person` record |
| Alternate caretaker | `pet.json` | `alternateCaretakerPersonId` | Backup caretaker |
| Funds for pet care | `pet.json` / `bequest.json` | `careFundAmount` / linked bequest | May create a pecuniary bequest earmarked for pet care |
| Care instructions | `pet.json` | `careInstructions` | Free-text wishes for the pet's ongoing care |

### Healthcare Wishes -> `wish.json`

LegalZoom's Healthcare Directive (Living Will) product captures the testator's preferences for medical treatment in various scenarios.

| LegalZoom Questionnaire Field | INHERIT Schema | INHERIT Field | Notes |
|---|---|---|---|
| Life-sustaining treatment preference | `wish.json` | `wishType: "healthcare"`, `description` | Whether to continue, withdraw, or withhold life support |
| Artificial nutrition and hydration | `wish.json` | `wishType: "healthcare"`, `description` | Specific preference for feeding tubes |
| Pain management preferences | `wish.json` | `wishType: "healthcare"`, `description` | Comfort care instructions |
| Organ donation preference | `wish.json` | `wishType: "organ_donation"`, `description` | Whether and what to donate |
| Burial / cremation preference | `wish.json` | `wishType: "funeral"`, `description` | Disposition of remains |
| Healthcare agent (POA) | `person.json` | `roles: ["attorney"]` | The person appointed under the healthcare power of attorney |
| Alternate healthcare agent | `person.json` | Second attorney with priority ordering | Backup healthcare agent |
| Specific medical conditions / instructions | `wish.json` | `description` | Free-text additional instructions |

Each distinct healthcare preference should generate a separate `wish` record with the appropriate `wishType` classification. The healthcare agent is a `person` record with the `attorney` role, linked to the estate.

### Document Output -> `document.json`

LegalZoom's primary output is a set of PDF documents. Each generated document maps to an INHERIT `document` record.

| LegalZoom Document | INHERIT `document.json` Field | Notes |
|---|---|---|
| Last Will and Testament | `type: "will"`, `title: "Last Will and Testament"` | The primary will document |
| Living Trust Agreement | `type: "trust_deed"`, `title: "Revocable Living Trust Agreement"` | The trust instrument |
| Pour-Over Will | `type: "will"`, `subtype: "pour_over"`, `title: "Pour-Over Will"` | Companion will for the trust |
| Financial Power of Attorney | `type: "power_of_attorney"`, `subtype: "financial"` | Durable financial POA |
| Healthcare Power of Attorney | `type: "power_of_attorney"`, `subtype: "healthcare"` | Healthcare proxy / medical POA |
| Healthcare Directive (Living Will) | `type: "advance_directive"`, `title: "Healthcare Directive"` | Advance directive for medical treatment |
| Certificate of Trust | `type: "certificate_of_trust"` | Summary document for third parties |
| Transfer Deed(s) | `type: "deed"` | Property transfer documents for funded trusts |
| HIPAA Authorisation | `type: "authorisation"`, `subtype: "hipaa"` | Health information release |

Each document record should include:
- `mimeType: "application/pdf"` — LegalZoom delivers documents as PDFs
- `createdAt` — the date the document was generated
- `status` — `draft` (unsigned) or `executed` (signed and witnessed)
- `jurisdiction` — the US state for which the document was drafted
- `entityId` and `entityType: "estate"` — linking the document to the estate record

## Embedded Services Flow

### The Existing Pattern

LegalZoom currently offers an **Embedded Legal Services Flow** for business formation. This feature allows partners (payroll companies, accounting platforms, banking apps) to embed LegalZoom's business formation process within their own user interface. The key technical capabilities of this flow are:

1. **Data pre-fill** — the partner passes structured data (company name, owner details, registered agent, state of formation) to LegalZoom via API parameters, pre-populating the intake questionnaire so the consumer does not need to re-enter information already held by the partner platform
2. **Embedded UI** — the LegalZoom questionnaire renders within the partner's application (via iframe or redirect), maintaining a consistent user experience
3. **Completion callback** — LegalZoom notifies the partner when the process is complete, passing back confirmation data and document references
4. **White-label options** — some degree of visual customisation is available to match the partner's branding

### Applying the Pattern to Estate Planning

The same architectural approach could be extended to estate planning with INHERIT as the data interchange format. The integration would work as follows:

#### Inbound: Partner -> LegalZoom (Pre-fill)

A financial adviser, estate planning platform, or other INHERIT-compatible system holds structured estate data for a client. When the client decides to create or update legal documents through LegalZoom:

1. The partner system exports the client's data as an INHERIT document (JSON)
2. The partner initiates the Embedded Flow, passing the INHERIT document as the pre-fill payload
3. LegalZoom's intake system maps INHERIT fields to its internal questionnaire model:
   - `person` records with `roles: ["testator"]` populate the personal information section
   - `person` records with spousal/partner relationships populate the spouse section
   - `person` records linked via `kinship` populate the children section
   - `executor` records populate the executor selection
   - `bequest` records populate the gifts and legacies section
   - `asset` records populate the asset inventory
   - `wish` records populate the healthcare directive section
4. The consumer reviews and confirms the pre-filled data, making any adjustments within LegalZoom's questionnaire
5. LegalZoom generates the legal documents

This eliminates the most tedious part of the LegalZoom experience — answering questions the consumer has already answered elsewhere. For a typical estate plan with a spouse, three children, two executors, and ten assets, this could save 30-45 minutes of data entry.

#### Outbound: LegalZoom -> Partner (Export)

After document generation, LegalZoom exports the finalised estate data back to the partner:

1. LegalZoom maps its internal questionnaire data to INHERIT schema format
2. The INHERIT document includes all entity records (people, relationships, kinships, assets, bequests, executors, guardians, wishes, trusts) plus `document` records referencing the generated PDFs
3. The partner system receives the INHERIT document via the completion callback
4. The partner imports the data, updating their records with any changes the consumer made during the LegalZoom flow

This creates a **round-trip data flow**: structured data goes in, legal documents and updated structured data come out. The consumer's estate plan is now represented in both human-readable (PDF) and machine-readable (INHERIT JSON) formats.

#### Technical Considerations

**Schema version negotiation.** The Embedded Flow should declare which INHERIT version it supports (e.g. `v4`). The `$schema` field in the INHERIT document identifies the version. Partners and LegalZoom should agree on supported versions during onboarding.

**Partial data.** Not all INHERIT fields will be relevant to every LegalZoom product. A Healthcare Directive flow only needs person data and healthcare wishes — it should accept an INHERIT document with only those entities populated and ignore the rest gracefully.

**Validation.** LegalZoom should validate incoming INHERIT data against the published JSON Schema before attempting to map it. Invalid documents should be rejected with clear error messages referencing the schema validation failures.

**Idempotency.** Re-submitting the same INHERIT document should produce the same pre-fill result. The `documentId` field can serve as an idempotency key.

**Consent and data protection.** The consumer must explicitly consent to data being shared between the partner and LegalZoom. INHERIT's `visibility` fields and `provenance` metadata provide a framework for recording this consent, but the consent mechanism itself is an application-layer concern.

## Partnership Pathway

This section is designed to be shared with LegalZoom's partnership, product, or business development team. It outlines the value proposition, implementation approach, and next steps for an INHERIT integration.

### Value Proposition for LegalZoom

**1. Increased conversion from professional referrals.** Financial advisers, estate planners, and solicitors frequently recommend that their clients create or update legal documents. Today, this recommendation sends the client to LegalZoom's website where they start from scratch. With an INHERIT integration, the referring professional can pre-fill the client's data, dramatically reducing friction and increasing the likelihood the client completes the process.

**2. Higher-quality intake data.** Data arriving via INHERIT has already been validated against a published schema. It is structured, typed, and consistent — reducing downstream errors compared to manual questionnaire entry where consumers may misspell names, transpose dates, or misclassify assets.

**3. Competitive differentiation.** No major consumer legal services platform currently supports a structured data interchange standard for estate planning. Being the first to adopt INHERIT positions LegalZoom as the interoperability leader in the space.

**4. Legal Plans retention.** Consumers on LegalZoom's Legal Plans subscription who can export and import their estate data in a standard format have a stronger reason to maintain their subscription. Their data is portable (reducing lock-in anxiety) whilst the convenience of LegalZoom's update flow keeps them engaged.

**5. Enterprise and B2B channel expansion.** Financial institutions, insurance companies, and employee benefits platforms are natural distribution partners for estate planning services. These organisations hold structured client data that maps cleanly to INHERIT. An Embedded Flow with INHERIT pre-fill makes LegalZoom's estate planning products embeddable in any partner's workflow.

**6. Regulatory preparedness.** Digital estate registries and electronic probate filing are under active development in multiple jurisdictions. Adopting a structured data standard now positions LegalZoom to support these requirements as they emerge, rather than retrofitting later.

### Proposed Implementation Phases

#### Phase 1: INHERIT Export (Consumer Data Portability)

**Effort:** Low-medium
**Dependency:** None (can be built on LegalZoom's existing data)

Allow consumers to download their estate plan data in INHERIT format alongside the existing PDF documents. This requires:

- Mapping LegalZoom's internal questionnaire model to INHERIT schemas (the conceptual mapping in this document provides the starting point)
- Building an INHERIT document generator that produces valid JSON conforming to the published schemas
- Adding a "Download data (INHERIT format)" option in the consumer's account dashboard
- Validating output against the INHERIT JSON Schema before delivery

This phase establishes LegalZoom as a good actor on data portability — an increasingly important consumer expectation and a topic of growing regulatory interest.

#### Phase 2: INHERIT Import (Pre-fill from External Data)

**Effort:** Medium
**Dependency:** Phase 1 mapping work

Accept INHERIT documents as input to pre-fill the estate planning questionnaire. This requires:

- Building an INHERIT document parser and validator
- Mapping INHERIT entities to LegalZoom's internal questionnaire fields (the reverse of Phase 1)
- Handling partial documents gracefully (not all fields will be present)
- Adding an import option in the consumer flow ("Have existing estate data? Import it")
- Security review of imported data (sanitisation, validation, size limits)

This phase directly reduces intake friction and improves data quality.

#### Phase 3: Embedded Estate Planning Flow

**Effort:** Medium-high
**Dependency:** Phase 2

Extend the existing Embedded Legal Services Flow (currently business formation only) to estate planning products, using INHERIT as the data interchange format. This requires:

- Adapting the Embedded Flow infrastructure to support estate planning products
- Defining the partner onboarding process (API credentials, supported INHERIT versions, callback URLs)
- Building the round-trip data flow (INHERIT in, documents + updated INHERIT out)
- Partner documentation and sandbox environment

This phase unlocks the B2B distribution channel and professional referral pathway.

#### Phase 4: Ongoing Synchronisation

**Effort:** Medium
**Dependency:** Phase 3

Support ongoing data synchronisation between LegalZoom and partner platforms. When a consumer updates their estate plan on LegalZoom, push the updated INHERIT document to connected partners (with consumer consent). When a partner's data changes, notify LegalZoom that a review may be needed. This requires:

- Webhook infrastructure for change notifications
- Conflict resolution strategy (which system's data takes precedence)
- Consumer consent management for data sharing
- Version tracking and diff capabilities

### About INHERIT

INHERIT is an open data standard for estate planning information, published at [openinherit.org](https://openinherit.org). Key facts for a partnership evaluation:

- **Open standard** — published under a permissive licence, free to implement, no royalties or licensing fees
- **JSON Schema-based** — uses the same technology stack as modern APIs (JSON, JSON Schema, OpenAPI)
- **31+ entity schemas** — comprehensive coverage of estate planning data: people, relationships, assets, trusts, bequests, executors, guardians, documents, wishes, insurance policies, and more
- **Jurisdiction-aware** — designed for multi-jurisdiction estate planning, with extension points for jurisdiction-specific fields
- **Extensible** — platforms can add custom fields via the `x-inherit-` extension mechanism without breaking compliance
- **Versioned** — follows semantic versioning with published migration guides between versions
- **SDK available** — TypeScript SDK (`@openinherit/sdk`) provides type-safe access to all schemas, with validation built in
- **Growing adoption** — integration guides published for Clio, Wealth.com, Addepar, Actionstep, and other platforms in the estate planning ecosystem

### Next Steps

To explore an INHERIT integration, we suggest the following:

1. **Technical review** — LegalZoom's engineering team reviews the INHERIT schema documentation at [openinherit.org](https://openinherit.org) and this conceptual field mapping to assess alignment with their internal data model
2. **Field mapping validation** — a joint working session to refine the conceptual mappings in this document against LegalZoom's actual questionnaire fields and internal data structures
3. **Pilot scope definition** — agree on which product(s) to pilot first (Last Will and Testament is the natural starting point given its volume and the breadth of data captured)
4. **Technical proof of concept** — build a minimal export flow (Phase 1) for a single product to validate the mapping and identify any gaps
5. **Partnership terms** — discuss any commercial, branding, or data-sharing terms for the integration

### Contact

For technical questions about the INHERIT standard, schema documentation, or integration guidance:

- **Website:** [openinherit.org](https://openinherit.org)
- **GitHub:** [github.com/openinherit/standard](https://github.com/openinherit/standard)
- **Discussions:** [github.com/openinherit/standard/discussions](https://github.com/openinherit/standard/discussions)

---

*This guide was prepared based on publicly available information about LegalZoom's estate planning products and the Embedded Legal Services Flow for business formation. LegalZoom is a trademark of LegalZoom.com, Inc. INHERIT is an independent open standard and is not affiliated with or endorsed by LegalZoom.*
