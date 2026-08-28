# Estateably Integration Guide

## Overview

[Estateably](https://www.estateably.com/) is a probate-focused estate administration platform that automates the preparation of court forms, executor task management, and estate accounting across the United States, Canada, and the United Kingdom. It serves estate attorneys, trust companies, and professional executors — providing structured workflows from the moment a death is reported through to final distribution and estate closure.

Estateably's data model is built around the core entities of probate administration: the deceased, executors, beneficiaries, assets, liabilities, and distributions. It maintains a library of over 3,000 court forms across US, Canadian, and UK jurisdictions, each requiring structured estate data to populate. This probate-centric architecture makes Estateably one of the closest natural fits for INHERIT adoption — its internal entities map almost directly to INHERIT's core schemas with minimal transformation.

### Why INHERIT Matters for Estateably

| Benefit | Detail |
|---------|--------|
| **Data portability** | Estate data entered in Estateably can be exported in a standards-compliant format, shareable with solicitors, financial advisers, tax professionals, and other platforms without manual re-entry |
| **Multi-platform interoperability** | Estates often involve multiple professional advisers using different systems. INHERIT provides a common language for exchanging structured estate data between Estateably and other platforms (Clio, Actionstep, wealth management tools) |
| **Regulatory alignment** | As probate registries modernise toward digital submissions, INHERIT's structured format positions Estateably-managed estates for automated regulatory reporting |
| **Court form data standardisation** | Estateably's 3,000+ court forms require structured data inputs. INHERIT can serve as a canonical data layer, ensuring consistency across forms regardless of jurisdiction |
| **Long-term archival** | Completed estates can be exported as self-describing INHERIT documents for long-term retention, independent of any single platform's continued operation |

### Who Uses Estateably

- **Estate attorneys** managing probate filings across US and Canadian jurisdictions
- **Trust companies** administering estates at scale with professional executor obligations
- **Probate solicitors** in England and Wales handling grant applications, IHT submissions, and estate accounts
- **Bank trust departments** processing estate distributions and fiduciary accounting

### Known Integration Surface

Estateably has a confirmed internal API (evidenced by its partnership with SideDrawer, which enables document synchronisation between the two platforms). However, the API is **not publicly documented** at the time of writing. Estateably also offers a **Clio integration** that imports matter data from Clio into Estateably via a configurable field mapping interface — this one-way import demonstrates that Estateably has a structured data ingestion layer.

This guide documents conceptual mappings based on Estateably's publicly visible features and data model. Field-level API mappings will require direct API access, which would be established through a partnership or integration agreement.

---

## Table of Contents

1. [Conceptual Field Mapping](#conceptual-field-mapping)
2. [Integration Architecture](#integration-architecture)
3. [Partnership Pathway](#partnership-pathway)
4. [Court Form Data Mapping](#court-form-data-mapping)

---

## Conceptual Field Mapping

The mappings below are based on Estateably's publicly described features, its user interface, and the data requirements of probate administration. They represent the most likely mapping between Estateably's internal data model and INHERIT schemas. Exact API field names are marked as **[TBC -- requires API access]**.

### Deceased / `person.json`

Estateably's primary record is the deceased individual whose estate is being administered. This maps directly to an INHERIT `person.json` entity with `roles: ["testator"]`.

| Estateably Concept | INHERIT Field | Notes |
|---|---|---|
| Deceased name | `person.givenName`, `person.familyName` | Estateably captures full legal name for court filings |
| Date of birth | `person.dateOfBirth` | Required for most probate applications |
| Date of death | `person.dateOfDeath` | The triggering event for estate administration |
| Place of death [TBC] | `person.notes` | Not a dedicated INHERIT field; record in notes or a jurisdiction extension |
| Last known address | `person.contact.address` | Map to INHERIT `common/address.json`. Critical for determining domicile |
| Domicile | `estate.domicile` | Determines applicable succession law and court jurisdiction |
| Social Security Number / Social Insurance Number [TBC] | `person.identity.identifiers[]` | Store with appropriate `type` (`ssn`, `sin`, `nino`). Sensitive — apply `visibility` restrictions |
| Marital status at death [TBC] | -- | Not directly modelled in INHERIT core; infer from relationship records or jurisdiction extensions |
| Citizenship / nationality [TBC] | `person.taxResidency` | Relevant for cross-border estates and IHT calculations |

### Estate Record / `estate.json`

Each Estateably matter represents one estate under administration. This maps to INHERIT's `estate.json`.

| Estateably Concept | INHERIT Field | Notes |
|---|---|---|
| Estate/matter ID [TBC] | `estate.provenance.sourceSystemId` | Store Estateably's internal ID for traceability |
| Estate reference number [TBC] | `estate.provenance.sourceSystemRef` | Court file number or firm reference |
| Deceased link | `estate.testatorPersonId` | Reference to the `person.json` record for the deceased |
| Jurisdiction / state / province | `estate.domicile` | Map to ISO 3166-1 alpha-2 (country) or ISO 3166-2 (subdivision). Estateably supports US states, Canadian provinces, and UK jurisdictions |
| Will type (testate / intestate) [TBC] | `estate.willType` | Determines the probate pathway. Map to INHERIT enum: `secular`, `holographic`, `nuncupative`, etc.; or `null` for intestate estates |
| Estate status [TBC] | `estate.status` | See status mapping table below |
| Date matter opened [TBC] | `estate.createdAt` | When the estate was entered into Estateably |
| Date matter closed [TBC] | Indicates `estate.status: "closed"` | When administration was completed |

#### Status Mapping

Estateably's probate workflow stages map to INHERIT's estate lifecycle as follows:

| Estateably Stage (inferred from workflow) | INHERIT `estate.status` | Notes |
|---|---|---|
| Matter opened / initial information gathering | `pre_probate` | Death has occurred; grant not yet applied for |
| Asset and liability identification | `pre_probate` | Cataloguing the estate |
| Court filing / grant application submitted | `pre_probate` | Application in progress |
| Grant issued / letters granted | `in_administration` | Legal authority to administer has been granted |
| Asset collection and debt settlement | `in_administration` | Calling in assets, paying liabilities |
| Distribution to beneficiaries | `distributed` | Assets being transferred to beneficiaries |
| Final accounts filed / estate closed | `closed` | Administration complete |

> **Note:** Estateably's workflow is inherently probate-focused. Unlike general practice management tools, its stages align closely with INHERIT's post-death lifecycle (`pre_probate` through `closed`). The estate planning stages (`planning`, `confirmed`) are not typically relevant — Estateably picks up where estate planning tools leave off.

### Executors / `executor.json` + `person.json`

Estateably tracks executors (personal representatives, administrators) as key participants in estate administration. Each executor maps to both a `person.json` record (their identity) and an `executor.json` record (their role in the estate).

| Estateably Concept | INHERIT Field | Notes |
|---|---|---|
| Executor name | `person.givenName`, `person.familyName` | Identity fields on the person record |
| Executor contact details [TBC] | `person.contact.email`, `person.contact.phone`, `person.contact.address` | Required for court filings and correspondence |
| Executor type (individual / professional) [TBC] | `executor.isProfessional` | Trust companies and solicitor-executors are `true` |
| Executor firm name [TBC] | `executor.firmName` | For professional executors |
| Primary / secondary / substitute [TBC] | `executor.role` | Map to INHERIT enum: `primary`, `secondary`, `substitute` |
| Grant reference [TBC] | `executor.grantReference` | The court-issued reference number |
| Grant date [TBC] | `executor.grantDate` | When the grant was issued |
| Grant type [TBC] | `executor.grantType` | Map to INHERIT enum: `grant_of_probate`, `letters_of_administration`, `letters_of_administration_with_will_annexed`, etc. |
| Issuing court / registry [TBC] | `executor.issuingCourt` | The court or probate registry that issued the grant |

### Beneficiaries / `person.json` + `bequest.json`

Estateably tracks beneficiaries and their entitlements. Each beneficiary is a `person.json` record; their inheritance is modelled as one or more `bequest.json` entries.

| Estateably Concept | INHERIT Field | Notes |
|---|---|---|
| Beneficiary name | `person.givenName`, `person.familyName` | On the person record with `roles: ["beneficiary"]` |
| Beneficiary contact details [TBC] | `person.contact` | Address, email, phone |
| Relationship to deceased [TBC] | `kinship.kinshipType` or `relationship.relationshipType` | Map to INHERIT kinship or relationship types. E.g. "son" maps to `kinship.kinshipType: "parent_child_biological"` |
| Specific bequest [TBC] | `bequest.bequestType: "specific"` | A particular item or asset left to the beneficiary |
| Pecuniary legacy [TBC] | `bequest.bequestType: "pecuniary"` | A fixed monetary amount |
| Residuary share [TBC] | `bequest.bequestType: "residuary"` | A percentage of the residuary estate |
| Bequest description [TBC] | `bequest.description` | Free-text description of the gift |
| Bequest value / share [TBC] | `bequest.value` or `bequest.sharePercentage` | Monetary value in minor units, or percentage for residuary bequests |

### Assets / `asset.json` + Asset Category Schemas

Estateably captures detailed asset information for estate valuation, court reporting, and distribution. Each asset maps to INHERIT's `asset.json` with an appropriate asset category schema.

| Estateably Concept | INHERIT Schema | Notes |
|---|---|---|
| Real property / real estate | `property.json` | Houses, land, commercial property. Map address, title reference, valuation |
| Bank accounts | `asset-categories/financial.json` | Current accounts, savings accounts. Map institution, account reference, balance |
| Investment accounts / brokerage | `asset-categories/financial.json` | Stocks, bonds, funds. Map institution, account reference, holdings value |
| Retirement accounts (401k, RRSP, pension) | `asset-categories/financial.json` | Country-specific retirement vehicles. Note: many are non-probate transfers |
| Life insurance policies | `insurance-policy.json` | Map insurer, policy number, death benefit, named beneficiaries |
| Motor vehicles | `asset-categories/vehicle.json` | Cars, boats, aircraft. Map registration, VIN, valuation |
| Business interests | `asset-categories/business.json` | Company shares, partnership interests. Map entity name, ownership percentage, valuation |
| Personal property / chattels | `asset-categories/general.json` | Jewellery, artwork, collectibles, household goods |
| Digital assets [TBC] | `asset-categories/digital.json` | Cryptocurrency, domain names, digital accounts |

For each asset:

| Estateably Concept | INHERIT Field | Notes |
|---|---|---|
| Asset description [TBC] | `asset.description` | Free-text description |
| Date-of-death value [TBC] | `valuation.amount` | Map to a `valuation.json` record with `valuationType: "date_of_death"` and amount in integer minor units |
| Current value [TBC] | `valuation.amount` | Map to a `valuation.json` record with `valuationType: "current"` |
| Asset location / jurisdiction [TBC] | `asset.jurisdiction` | Relevant for multi-jurisdiction estates and determining applicable law |
| Ownership type (sole / joint / tenants in common) [TBC] | `asset-interest.interestType` | Map to INHERIT's `asset-interest.json` with appropriate ownership type |

### Liabilities / `liability.json`

Estateably tracks the deceased's debts and ongoing obligations that must be settled from the estate.

| Estateably Concept | INHERIT Field | Notes |
|---|---|---|
| Creditor name [TBC] | `liability.creditorName` or link to `organisation.json` | The entity owed money |
| Liability type [TBC] | `liability.liabilityType` | Map to INHERIT enum: `mortgage`, `loan`, `credit_card`, `tax`, `funeral_expenses`, `administration_costs`, `other` |
| Amount owed [TBC] | `liability.amount` | In integer minor units |
| Secured / unsecured [TBC] | `liability.isSecured` | Whether the debt is secured against an asset |
| Linked asset [TBC] | `liability.securedAgainstAssetId` | For mortgages and secured loans, reference the associated asset |

### Distributions / `bequest.json` + Event Tracking

Estateably manages the actual distribution of estate assets to beneficiaries, tracking what has been distributed, to whom, and when.

| Estateably Concept | INHERIT Field | Notes |
|---|---|---|
| Distribution recipient [TBC] | `bequest.beneficiaryPersonId` | The person receiving the distribution |
| Distribution amount [TBC] | `bequest.value` | Amount distributed, in minor units |
| Distribution date [TBC] | `event.occurredAt` (on a distribution event) | When the distribution was made |
| Distribution type (interim / final) [TBC] | `event.eventType` | Track as estate lifecycle events |
| Receipt confirmation [TBC] | `acknowledgement` | Map to INHERIT's `acknowledgement.json` if beneficiary has confirmed receipt |

### Documents / `document.json`

Estateably stores estate-related documents. These map to INHERIT's `document.json`.

| Estateably Concept | INHERIT `document.json` Field | Notes |
|---|---|---|
| Document name [TBC] | `document.title` | Direct mapping |
| Document type / category [TBC] | `document.type` | Map to INHERIT enum: `will`, `codicil`, `grant_of_probate`, `letters_of_administration`, `death_certificate`, `trust_deed`, `power_of_attorney`, `valuation_report`, `tax_return`, `estate_accounts`, `other` |
| File format [TBC] | `document.fileFormat` | Extension (pdf, docx, etc.) |
| File size [TBC] | `document.fileSizeBytes` | In bytes |
| Upload date [TBC] | `document.createdAt` | ISO 8601 timestamp |
| Court form output | `document.type: "court_form"` | Generated court forms are a key Estateably output. See [Court Form Data Mapping](#court-form-data-mapping) |

---

## Integration Architecture

Because Estateably's API is not publicly documented, integration approaches must account for the current access landscape. There are three realistic architectural paths, each with different prerequisites and capabilities.

### Path 1: Clio as Intermediary (Available Now)

Estateably already integrates with Clio — importing matter data from Clio into Estateably with configurable field mapping. Since Clio has a well-documented public API (see the [Clio Integration Guide](../clio/README.md)), INHERIT can reach Estateably indirectly:

```
                    Clio API (documented)         Estateably-Clio integration
  INHERIT document ───────────────────────► Clio ──────────────────────────────► Estateably
                                            Matter
```

**How it works:**

1. Export INHERIT data to Clio using the documented Clio API (see the Clio integration guide for field mappings and code examples)
2. Clio creates or updates a Matter with the estate data stored in Contacts and Custom Fields
3. Estateably's Clio integration imports the Matter into Estateably, using its configurable field mapping UI to align Clio fields with Estateably's internal data model
4. Estate administration proceeds in Estateably

**Advantages:**
- Works today, without any Estateably API access
- Leverages existing, tested integrations on both sides
- Clio's custom field sets for Wills & Estates provide a reasonable data bridge

**Limitations:**
- One-way only (Clio to Estateably). Data changes made in Estateably during administration cannot flow back automatically
- Two-hop translation (INHERIT to Clio to Estateably) introduces potential data loss at each mapping boundary
- Depends on the firm using both Clio and Estateably
- No real-time synchronisation — each hop requires manual or scheduled triggering

### Path 2: Direct API Integration (Requires Partnership)

With access to Estateably's internal API, a direct integration eliminates the Clio intermediary:

```
  INHERIT document ◄────────────────────► Estateably API
                     Direct bi-directional
                     sync
```

**How it works:**

1. Authenticate with Estateably's API (authentication method TBC — likely OAuth 2.0 or API key)
2. Import: read estate data from Estateably's API endpoints (deceased, executors, beneficiaries, assets, liabilities, distributions, documents) and map to INHERIT schemas
3. Export: create or update Estateably records from an INHERIT document, using the field mappings defined in this guide
4. Optionally subscribe to webhooks or polling for change detection

**Advantages:**
- Bi-directional data flow
- No data loss from intermediate translations
- Real-time or near-real-time synchronisation possible
- Direct access to Estateably's rich probate data model

**Prerequisites:**
- Partnership or integration agreement with Estateably
- API documentation and sandbox access
- Agreement on authentication, rate limits, and data handling

### Path 3: INHERIT as a Data Exchange Format (Platform-Neutral)

Rather than building a point-to-point integration, Estateably could adopt INHERIT as its import/export format:

```
  Any platform ──► INHERIT document ──► Estateably (import)
  Estateably   ──► INHERIT document ──► Any platform (export)
```

**How it works:**

1. Estateably implements INHERIT import: accept an INHERIT JSON document and map its entities to Estateably's internal data model
2. Estateably implements INHERIT export: generate a valid INHERIT JSON document from an estate record, including all people, assets, liabilities, bequests, documents, and provenance metadata
3. Any platform that speaks INHERIT can exchange data with Estateably without custom integration code

**Advantages:**
- Write once, interoperate with every INHERIT-compliant platform
- No custom integration code per partner
- Future-proof — new platforms adopting INHERIT automatically gain Estateably interoperability
- Conformance declarations provide verifiable claims about which INHERIT features are supported

**Prerequisites:**
- Estateably development investment in INHERIT support
- Conformance testing against INHERIT's validation suite
- Agreement on the supported INHERIT profile (which schemas, which extensions)

### Recommended Architecture

For immediate value, **Path 1 (Clio intermediary)** provides a working bridge today. For long-term strategic value, **Path 3 (INHERIT as exchange format)** is the strongest approach — it decouples Estateably from any single integration partner and positions it as interoperable with the entire INHERIT ecosystem. Path 2 (direct API) is the natural stepping stone between the two.

---

## Partnership Pathway

Establishing an INHERIT integration with Estateably requires a structured engagement. The following steps outline a realistic pathway from initial contact to production integration.

### Step 1: Introduction and Alignment

**Objective:** Establish mutual understanding of INHERIT and identify shared value.

- Introduce INHERIT as an open standard for estate data interoperability — not a competing product, but a data format that increases the value of Estateably's platform by enabling data portability
- Highlight the natural alignment between Estateably's probate data model and INHERIT's core schemas
- Share this integration guide as a demonstration of the mapping work already completed
- Identify Estateably's partnership or integration team as the primary contact

**Key message:** INHERIT does not replace Estateably's functionality. It provides a standard format for data exchange, allowing Estateably's clients to move data in and out of the platform without vendor lock-in — which increases client trust and platform adoption.

### Step 2: API Access and Technical Discovery

**Objective:** Obtain API documentation and validate the conceptual mappings in this guide.

- Request access to Estateably's API documentation (endpoints, authentication, data model)
- Request a sandbox or test environment for integration development
- Walk through the conceptual field mappings in this guide with Estateably's technical team, replacing [TBC] placeholders with actual API field names
- Identify any Estateably data entities or fields not covered by INHERIT's current schemas — these may inform future INHERIT extensions
- Document any data transformation requirements (date formats, currency handling, enum mappings)

### Step 3: Proof of Concept

**Objective:** Build a working prototype demonstrating bi-directional data exchange.

- **Import pilot:** Take a sample estate from Estateably (with test data), export it via the API, and transform it into a valid INHERIT document. Validate the document against INHERIT's JSON Schema validation suite
- **Export pilot:** Take a sample INHERIT document and import it into Estateably via the API. Verify that all mapped fields populate correctly in Estateably's UI
- **Court form validation:** Confirm that estate data imported via INHERIT produces correctly populated court forms in Estateably — this is the critical acceptance criterion for probate practitioners

### Step 4: Conformance Declaration

**Objective:** Formalise which INHERIT schemas and fields Estateably supports.

- Issue an INHERIT `conformance-declaration.json` for the Estateably integration, specifying:
  - **Supported schemas:** Which INHERIT entity schemas are supported (person, estate, executor, asset, liability, bequest, document, etc.)
  - **Supported fields:** Which fields within each schema are populated on export and consumed on import
  - **Supported jurisdiction extensions:** Which jurisdiction-specific extensions (UK, US, Canada) are implemented
  - **Data direction:** Whether each schema is import-only, export-only, or bi-directional
  - **Conformance level:** The degree of INHERIT compliance (partial, standard, or full)

### Step 5: Production Integration

**Objective:** Deploy the integration for real-world use.

- Implement production-grade error handling, logging, and monitoring
- Establish a data processing agreement covering personal data handled during estate data exchange
- Agree on SLA terms for API availability and support
- Publish the integration in Estateably's integrations directory (if applicable)
- Update this guide with production API field mappings, replacing all [TBC] markers

### Step 6: Bi-Directional Sync and Ongoing Maintenance

**Objective:** Enable continuous data synchronisation and evolve the integration with new INHERIT versions.

- Implement webhook-based or polling-based change detection to keep INHERIT documents synchronised with Estateably estate records
- Establish a process for testing the integration against new INHERIT schema versions before they are released
- Participate in the INHERIT community (GitHub Discussions, issue tracking) to provide probate-practitioner feedback on schema design

---

## Court Form Data Mapping

Estateably's library of over 3,000 court forms across US, Canadian, and UK jurisdictions is one of its most significant features. Each court form requires specific estate data fields to be populated — deceased details, executor information, asset valuations, beneficiary lists, and jurisdiction-specific declarations. This section explores how INHERIT's data model relates to court form data requirements.

### How Court Forms Consume Estate Data

A court form is essentially a template with data placeholders. When a probate practitioner generates a court form in Estateably, the platform pulls structured data from the estate record and populates the relevant fields. For example:

| Court Form Type | Data Required | INHERIT Source Schemas |
|---|---|---|
| Grant of Probate application (England & Wales) | Deceased name, DOB, DOD, domicile, executor details, gross/net estate value, IHT position | `person.json`, `estate.json`, `executor.json`, `valuation.json`, `estate` jurisdiction extensions |
| Letters Testamentary petition (US) | Decedent name, date of death, county of residence, petitioner (executor) details, will date, beneficiary list | `person.json`, `estate.json`, `executor.json`, `document.json` (will), `bequest.json` |
| Certificate of Appointment of Estate Trustee (Ontario, Canada) | Deceased details, applicant details, estate value, beneficiary information, will details | `person.json`, `estate.json`, `executor.json`, `valuation.json`, `bequest.json` |
| Inventory and Appraisement (various US states) | Complete asset list with descriptions and valuations | `asset.json`, `asset-categories/*.json`, `valuation.json` |
| Estate accounts / accounting | All receipts, disbursements, distributions, and remaining balance | `asset.json`, `liability.json`, `bequest.json`, `event.json` |
| IHT400 (HMRC, England & Wales) | Comprehensive estate valuation, reliefs, exemptions, property details, gifts in the seven years before death | `estate.json`, `asset.json`, `liability.json`, `lifetime-transfer.json`, UK jurisdiction extension |
| Final distribution statement | What each beneficiary received, when, and the executor's discharge | `bequest.json`, `person.json` (beneficiaries), `event.json`, `acknowledgement.json` |

### INHERIT as a Canonical Data Layer for Court Forms

The relationship between INHERIT and Estateably's court forms is complementary:

1. **INHERIT provides the structured data.** An INHERIT document contains the people, assets, liabilities, bequests, and jurisdiction-specific details that court forms require. The data is validated against JSON Schemas, ensuring completeness and type correctness before it reaches any form-generation engine.

2. **Estateably provides the form templates and jurisdiction logic.** Estateably knows which fields each court form requires, which court rules apply, and how to format the output for filing. This jurisdictional expertise is Estateably's core value proposition and is not something INHERIT attempts to replicate.

3. **The integration point is data, not forms.** INHERIT does not generate court forms. It provides the data that court forms consume. An Estateably integration would read an INHERIT document, populate its internal estate record, and then use its existing form-generation engine to produce the required filings.

### Jurisdiction Extensions and Court Form Requirements

INHERIT's jurisdiction extension system is designed to capture the jurisdiction-specific data that court forms require but that the core schemas do not model. For example:

| Jurisdiction | INHERIT Extension | Court-Form-Relevant Fields |
|---|---|---|
| England & Wales | `extensions/uk-england-wales` | IHT threshold, nil-rate band, residence nil-rate band, TNRB claim, excepted estate status, probate registry |
| Scotland | `extensions/scotland` | Confirmation (Scottish equivalent of probate), prior rights, legal rights, inventory requirements |
| US (federal estate tax) | `extensions/us-estate` | Federal estate tax exemption, portability election, QTIP election, generation-skipping transfer tax |
| Canada | `extensions/canada` | Provincial probate fees, deemed disposition on death, capital gains implications, RRSP/RRIF beneficiary designations |
| Australia / NZ | `extensions/australia-nz` | Family provision claims, notional estate rules (NSW), relationship property (NZ) |

When an INHERIT document includes the appropriate jurisdiction extension data, Estateably has the structured inputs it needs to populate jurisdiction-specific court forms without manual data entry.

### Form Field Coverage Analysis

Not every INHERIT field maps to a court form requirement, and not every court form field has an INHERIT equivalent. Understanding the coverage boundaries is important for setting integration expectations.

**Fields well-covered by INHERIT:**
- Personal details (names, dates, addresses, identifiers) — required on virtually every court form
- Asset descriptions and valuations — required for inventories, IHT calculations, and estate accounts
- Executor and beneficiary details — required for grant applications and distribution statements
- Liability details — required for estate accounting and creditor notifications
- Will and document metadata — required for proving the will and filing supporting documents

**Fields that may require extension or custom mapping:**
- Court-specific procedural fields (filing fees paid, hearing dates, case numbers) — these are court administration data, not estate data. They are outside INHERIT's scope but could be stored in `provenance` metadata
- Oath / affidavit declarations — legal attestations by the executor. INHERIT's `attestation.json` schema covers this partially
- Jurisdiction-specific tax calculations — INHERIT captures the input data (asset values, reliefs claimed) but does not perform tax calculations. Estateably's tax engine would consume INHERIT data and compute the results
- Practitioner billing and time recording — outside INHERIT's scope entirely

### Multi-Jurisdiction Estate Handling

Estateably's support for US, Canadian, and UK jurisdictions makes it a natural candidate for multi-jurisdiction estate administration. INHERIT handles multi-jurisdiction estates through:

1. **Per-asset jurisdiction declarations** — each asset can specify its `jurisdiction`, allowing a single estate to contain assets governed by different laws
2. **Jurisdiction extensions** — the estate can include multiple jurisdiction extension blocks (e.g. both `uk-england-wales` and `canada` extensions for an estate with assets in both countries)
3. **Conformance declarations per jurisdiction** — the integration can declare which jurisdiction-specific fields are supported for each market Estateably serves

For a cross-border estate (for example, a Canadian citizen who owned property in England), Estateably would need court forms from both jurisdictions. INHERIT can provide the complete estate data in a single document, with jurisdiction-specific extensions providing the additional data each set of court forms requires.

### Court Form Output as INHERIT Documents

In addition to consuming INHERIT data as input, Estateably's generated court forms can themselves be represented as INHERIT `document.json` entities:

| Generated Form | INHERIT `document.type` | Notes |
|---|---|---|
| Grant of Probate application | `grant_of_probate` | The filed application document |
| Inventory / asset schedule | `valuation_report` | The compiled asset list with valuations |
| Estate accounts | `estate_accounts` | The financial summary of administration |
| IHT return | `tax_return` | The inheritance tax submission |
| Distribution statement | `other` | Record of what was distributed to whom |
| Beneficiary receipts | `other` | Signed receipts from beneficiaries |

Storing generated court forms as INHERIT document entities completes the data lifecycle: structured data flows into Estateably, court forms are generated, and the generated forms are recorded back in the INHERIT document as part of the estate's permanent record.

---

## Summary

Estateably's probate-focused data model is one of the closest natural fits for INHERIT among estate administration platforms. The core entities — deceased, executors, beneficiaries, assets, liabilities, distributions, and documents — map almost directly to INHERIT's schemas with minimal transformation required.

The primary barrier to integration is API access. Once that is established (either through a direct partnership or via Clio as an intermediary), the conceptual mappings in this guide provide a solid foundation for building a production integration. The court form data mapping section demonstrates INHERIT's value as a canonical data layer — providing structured, validated estate data that Estateably's form-generation engine can consume across all 3,000+ templates.

**Next steps:**
1. Establish contact with Estateably's partnership or integration team
2. Share this guide as a starting point for technical discussions
3. Request API documentation and sandbox access
4. Build a proof-of-concept using a small number of test estates
5. Formalise the integration through a conformance declaration
