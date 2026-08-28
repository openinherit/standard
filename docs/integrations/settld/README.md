# Settld Integration Guide

## Overview

[Settld](https://www.settld.com/) (formerly Estate Registry) is a UK-based bereavement notification platform that enables executors and next-of-kin to notify service providers of a death through a single online process. Rather than contacting each bank, utility company, insurer, and pension provider individually — a task that typically requires dozens of separate phone calls, letters, and forms — Settld acts as a centralised notification hub, distributing death notifications to over 1,400 service providers on behalf of the bereaved.

The bereavement notification problem is both emotionally and logistically significant. When a person dies in the United Kingdom, the executor or next-of-kin must notify every organisation the deceased held an account or policy with. Research by the Bereavement Standard Working Group and others consistently shows that families contact an average of 20-30 organisations during estate administration, with each notification requiring identification of the deceased, proof of death, proof of authority, and account details. The process is repetitive, time-consuming, and occurs at a time of acute emotional distress.

Settld addresses this by collecting the deceased's details, verifying the death (typically via the General Register Office death certificate), and then transmitting structured notifications to each relevant service provider. The executor enters the information once, and Settld handles the distribution.

**Current integration status:** Settld does not currently offer a public API. Their "Bereavement API" is aspirational — referenced in public materials as a future capability. This guide is therefore a **proposed integration specification**, mapping INHERIT's data model to Settld's known data entities and outlining how INHERIT could serve as the interchange format for a future Bereavement API.

**Why this matters:** There is no open data standard for bereavement notifications in the United Kingdom or anywhere else. Each service provider currently receives death notifications in a different format — some via proprietary API integrations with Settld, some via email, some via post. The UK's Bereavement Standard Working Group has been working towards standardising death notification processes, but no machine-readable data standard has emerged. INHERIT is positioned to fill this gap.

## Proposed Integration

INHERIT could serve as the data format underlying Settld's bereavement notification workflow in two complementary ways:

### 1. INHERIT as the Bereavement API payload format

When Settld's Bereavement API becomes available, INHERIT documents could serve as the request and response format. An executor's estate planning platform (e.g. Clio, Actionstep, or a consumer tool) would export an INHERIT document containing the deceased's details, death verification, asset references, and organisation references. Settld would consume this document, extract the relevant data, and distribute notifications to the referenced service providers.

This eliminates the need for every estate platform to implement bespoke integrations with Settld. Any system that can produce an INHERIT document can trigger bereavement notifications — the standard becomes the integration layer.

### 2. INHERIT as the notification record format

Settld could use INHERIT's `notification.json` schema to record the status and outcome of each bereavement notification it sends. This creates a structured, portable audit trail of which organisations were notified, when, through which channel, and what the delivery status was. Executors and solicitors could import these notification records back into their estate administration systems, closing the loop between notification and estate management.

### Data flow

```
Estate Platform                  Settld                    Service Providers
(Clio, Actionstep,     -->    Bereavement API     -->    Banks, Utilities,
 consumer app)                (INHERIT format)            Insurers, Pensions

     |                              |                           |
     |  INHERIT document            |  Notification             |
     |  (person, estate,            |  dispatched per           |
     |   deathVerification,         |  organisation             |
     |   assets, orgs)              |                           |
     |                              |                           |
     |  <-- Notification records <--|  <-- Acknowledgements <---|
     |      (notification.json)     |      (provider responses) |
```

### What INHERIT provides that Settld currently lacks

| Capability | Current state | With INHERIT |
|---|---|---|
| Structured deceased details | Settld's proprietary internal format | `person.json` — standardised, portable, interoperable |
| Death verification metadata | Internal verification flag | `estate.deathVerification` — method, authority, trust level, reference number |
| Asset/account identification | Free-text account references | `asset.json` — structured asset records with organisation references |
| Provider records | Settld's internal provider database | `organisation.json` — typed, registered, verifiable |
| Notification audit trail | Settld's internal tracking | `notification.json` — portable, importable, machine-readable |
| Multi-jurisdictional support | UK-focused | INHERIT supports any jurisdiction via ISO 3166 codes |

## Conceptual Field Mapping

The following tables map Settld's known data entities to INHERIT schemas. Because Settld does not publish a public data model, these mappings are inferred from Settld's public-facing forms, published guidance, and the logical requirements of bereavement notification. They should be treated as a starting point for a formal mapping exercise with Settld's engineering team.

### Deceased details --> INHERIT `person.json` + `estate.json`

The deceased person's details are the core of every bereavement notification. Settld collects these during the initial registration process.

| Settld data entity | INHERIT schema field | Notes |
|---|---|---|
| Deceased full name | `person.givenName` + `person.familyName` | Split into structured name components. `person.additionalName` for middle names |
| Deceased maiden name / previous names | `person.notes` or extension field | No dedicated field in INHERIT core — use notes or `x-inherit-bereavement` extension |
| Date of birth | `person.dateOfBirth` | ISO 8601 date format (`YYYY-MM-DD`) |
| Date of death | `person.dateOfDeath` | ISO 8601 date format. Also recorded in `estate.deathVerification.dateOfDeath` |
| Last known address | `person.contact.address` | Maps to `common/address.json` — `streetAddress`, `locality`, `region`, `postalCode`, `country` |
| National Insurance number | `person.identifiers[]` | `system: "urn:hmrc:nino"`, `type: "national_insurance"`, `value: "AB123456C"` |
| Marital status at death | `person.notes` or extension field | INHERIT does not have a dedicated marital status field — inferred from `relationship` entities or recorded in notes |
| Executor/notifier details | Separate `person` entity with `roles: ["executor"]` | The person using Settld is typically the executor or next-of-kin |

### Death certificate verification --> INHERIT `estate.deathVerification`

Settld verifies deaths primarily through the General Register Office (GRO) — the UK government body responsible for civil registration. This maps directly to INHERIT's `deathVerification` object on the estate entity.

| Settld verification data | INHERIT schema field | Notes |
|---|---|---|
| Death certificate number | `estate.deathVerification.referenceNumber` | The GRO death certificate reference |
| Verification method | `estate.deathVerification.method` | `"death_certificate"` for GRO-verified deaths. Other values: `"coroner_report"`, `"court_order"`, `"presumption_of_death"` |
| Issuing authority | `estate.deathVerification.issuingAuthority` | `"General Register Office"` for England & Wales. `"National Records of Scotland"` for Scotland. `"General Register Office for Northern Ireland"` for NI |
| Jurisdiction | `estate.deathVerification.jurisdiction` | `"GB-ENG"` (England), `"GB-WLS"` (Wales), `"GB-SCT"` (Scotland), `"GB-NIR"` (Northern Ireland) |
| Date of death registration | `estate.deathVerification.registrationDate` | May differ from the date of death itself — registration can occur days or weeks after death |
| Verification timestamp | `estate.deathVerification.verifiedAt` | When Settld confirmed the death with GRO |
| Verified by | `estate.deathVerification.verifiedBy` | `"Settld"` or `"Settld via GRO"` |
| Trust level | `estate.deathVerification.trustLevel` | `"government_certified"` when verified via GRO death certificate. `"medical_certified"` if verified via interim death certificate (before registration). `"self_reported"` for unverified initial submissions |

The `trustLevel` enum is particularly relevant to bereavement notification workflows. Service providers need to know the confidence level of a death notification before taking action on accounts. A `government_certified` death verified through the GRO carries the highest trust — providers can freeze accounts, close policies, and begin claims processes. A `self_reported` notification, by contrast, may trigger only an initial hold pending verification. INHERIT's trust level taxonomy gives providers a machine-readable signal to automate their response thresholds.

### Account and service notifications --> INHERIT `notification.json` + `asset.json` + `organisation.json`

This is the core of Settld's value proposition — notifying service providers that an account holder has died. In INHERIT terms, each notification links a deceased person to a service provider (organisation) regarding a specific account or policy (asset).

| Settld notification data | INHERIT schema field | Notes |
|---|---|---|
| Service provider name | `organisation.name` | The bank, utility, insurer, etc. being notified |
| Service provider type | `organisation.organisationType` | `"financial_institution"`, `"utility_provider"`, `"insurance_provider"`, `"pension_provider"`, etc. |
| Account/policy reference | `asset` entity with reference to `organisation` | Each account becomes an `asset` with the organisation referenced via the asset's holder or provider fields |
| Notification type | `notification.notificationType` | Use `"other"` with a descriptive note, or an `x-inherit-bereavement` extension value such as `"x-inherit-bereavement-death_notification"` |
| Notification recipient | `notification.recipientType` + `notification.recipientId` | `recipientType: "organisation"`, `recipientId` referencing the `organisation.id` |
| Notification channel | `notification.channel` | `"email"`, `"in_app"` (for API-integrated providers), `"post"` (for providers requiring physical notification) |
| Date sent | `notification.sentAt` | ISO 8601 datetime |
| Delivery status | `notification.status` | `"pending"`, `"sent"`, `"delivered"`, `"failed"`, `"bounced"` |
| Provider response | `notification.notes` | Free-text field recording the provider's acknowledgement or action taken |

#### Mapping Settld's notification workflow to INHERIT entities

A single Settld notification session — one deceased person, multiple providers — would produce the following INHERIT entities:

1. **One `person` entity** for the deceased (with `roles: ["testator"]`, `dateOfDeath` set)
2. **One `person` entity** for the executor/notifier (with `roles: ["executor"]`)
3. **One `estate` entity** linking the deceased person, with `deathVerification` populated
4. **Multiple `organisation` entities** — one for each service provider being notified
5. **Multiple `asset` entities** — one for each account, policy, or service being reported (where account details are known)
6. **Multiple `notification` entities** — one for each provider notification, referencing the organisation

For example, notifying three banks and two utility companies about a death would produce:

- 2 `person` entities (deceased + executor)
- 1 `estate` entity
- 5 `organisation` entities
- 5+ `asset` entities (one per account)
- 5 `notification` entities

### Provider records --> INHERIT `organisation.json`

Settld maintains an internal database of over 1,400 service providers. Each provider maps to an INHERIT `organisation` entity.

| Settld provider data | INHERIT schema field | Notes |
|---|---|---|
| Provider name | `organisation.name` | Direct mapping |
| Provider category | `organisation.organisationType` | Settld categories map to INHERIT's `organisationType` enum — see table below |
| Bereavement contact details | `organisation.email`, `organisation.phone` | The provider's bereavement team contact details |
| Provider website | `organisation.url` | Direct mapping |
| Regulatory registrations | `organisation.registrations[]` | FCA number for financial firms, Ofgem licence for energy companies, etc. |

**Provider category mapping:**

| Settld provider category | INHERIT `organisationType` |
|---|---|
| Banks and building societies | `financial_institution` |
| Investment platforms | `financial_institution` |
| Credit card providers | `financial_institution` |
| Insurance companies | `insurance_provider` |
| Pension providers | `pension_provider` |
| Energy suppliers | `utility_provider` |
| Water companies | `utility_provider` |
| Broadband and phone | `utility_provider` |
| Council tax | `government_body` |
| HMRC | `government_body` |
| DVLA | `government_body` |
| Social media platforms | `digital_platform` |
| Subscription services | `other` or `x-inherit-bereavement-subscription` |
| Loyalty programmes | `other` or `x-inherit-bereavement-loyalty` |
| Funeral directors | `funeral_provider` |
| Charities (regular donations) | `charity` |

INHERIT's `organisation.estateRoles` array provides additional context. For bereavement notifications, the most common roles would be:

- `"asset_holder"` — banks, investment platforms, pension providers holding the deceased's funds
- `"liability_holder"` — credit card companies, mortgage lenders with outstanding balances
- `"insurer"` — life insurance, home insurance, motor insurance providers
- `"service_provider"` — utilities, broadband, subscription services
- `"employer"` — the deceased's employer (for death-in-service benefits)

## Bereavement Standard Alignment

### The Bereavement Standard Working Group

The UK's Bereavement Standard Working Group — convened by the Department for Work and Pensions (DWP) with participation from HM Treasury, the Financial Conduct Authority (FCA), and major industry bodies — has been working towards improving the experience of bereaved people interacting with service providers. The Working Group's focus areas include:

1. **Tell Us Once expansion** — extending the government's Tell Us Once service (which currently notifies central and local government departments of a death) to include private-sector organisations
2. **Consistent standards for bereavement handling** — establishing minimum standards for how service providers handle death notifications, including response times, required documentation, and vulnerability considerations
3. **Data sharing frameworks** — enabling authorised sharing of death verification data between organisations to reduce the burden on executors
4. **Digital death notification** — moving from paper-based notification (letters, death certificate photocopies) to machine-readable, verifiable digital notifications

### Where INHERIT fits

INHERIT addresses the Working Group's agenda at the data layer — the part that no amount of process improvement can fix without a shared vocabulary and schema. Specifically:

**A machine-readable death verification format.** The `estate.deathVerification` object provides exactly what the Working Group needs for digital death notification: a structured record of how the death was verified, by whom, to what trust level, with a reference number that providers can independently verify. This replaces the current approach of attaching a scanned death certificate PDF to an email.

**A standard vocabulary for deceased details.** INHERIT's `person.json` schema captures the deceased's details in a format that every provider can parse. Name, date of birth, date of death, last address, National Insurance number, identifiers — all in standardised fields with defined formats. No more manual re-keying from one provider's form to another's.

**Typed organisation records with regulatory verification.** INHERIT's `organisation.json` includes `registrations[]` with regulatory body references and live-check capabilities. This means a bereavement notification can include not just the provider's name but its FCA authorisation number, Companies House registration, and current status — enabling automated routing and compliance checks.

**A portable notification audit trail.** Every notification is recorded in `notification.json` with type, channel, timestamp, and delivery status. Executors and their solicitors can import this audit trail into their estate administration systems, demonstrating to the court that all required notifications were sent. This is a probate requirement that currently relies on spreadsheets and filing cabinets.

**Jurisdiction-aware from the ground up.** Although the Bereavement Standard Working Group is UK-focused, INHERIT supports any jurisdiction via ISO 3166-1 alpha-2 and ISO 3166-2 codes. A death notification for a UK resident with bank accounts in the Republic of Ireland or the Channel Islands can be expressed in the same document. This matters because cross-border estate administration is increasingly common, and the bereavement notification problem does not stop at national borders.

### Tell Us Once and INHERIT

The UK government's Tell Us Once service, operated by the DWP, currently notifies participating government departments and local authority services when a death is registered. It is triggered by the registrar at the time of death registration and covers:

- DWP (benefits cessation)
- HMRC (tax affairs)
- Passport Office (passport cancellation)
- DVLA (driving licence cancellation)
- Local authority council tax
- Local authority electoral register

Tell Us Once does **not** currently extend to private-sector organisations — banks, insurers, utilities, and pension providers. This is the gap that Settld fills commercially and that the Bereavement Standard Working Group aims to address through policy.

INHERIT could serve as the data bridge between Tell Us Once and private-sector notification. If Tell Us Once produced an INHERIT-formatted death verification record (with `trustLevel: "government_certified"` and a GRO reference number), Settld — or any authorised bereavement notification service — could consume that record and propagate it to private-sector providers with government-grade trust. This eliminates the need for executors to separately prove the death to each provider; the government's verification travels with the notification.

### The delegation trust framework connection

INHERIT's `deathVerification.trustLevel` enum (`government_certified`, `medical_certified`, `platform_detected`, `community_declared`, `self_reported`) aligns with emerging digital trust frameworks being developed across the identity standards ecosystem. The OpenID Foundation has identified the "delegation trigger gap" — the lack of a standardised, machine-verifiable signal that a person has died, which triggers the delegation of authority to their executor or next-of-kin.

INHERIT's death verification model addresses this gap directly. By encoding both the method of verification and the trust level, INHERIT enables downstream systems to make automated decisions based on the confidence of the death signal. A `government_certified` verification from the GRO triggers full account actions; a `self_reported` notification from an unverified family member triggers a hold pending verification. The trust taxonomy is explicitly designed to be extensible as formal trust frameworks (such as those under development by the OpenID Foundation and the UK Digital Identity and Attributes Trust Framework) mature.

## Partnership Pathway

The following steps outline a practical pathway for exploring INHERIT integration with Settld.

### Phase 1: Introduce INHERIT to Settld's product team

**Objective:** Establish mutual awareness and assess alignment.

- Share this integration guide and the INHERIT specification with Settld's product and engineering leadership
- Demonstrate how INHERIT's data model maps to Settld's existing workflow
- Identify areas where INHERIT's schema covers data that Settld currently handles in unstructured formats
- Discuss Settld's Bereavement API roadmap and timeline

**Key question for Settld:** When the Bereavement API launches, will it use a proprietary data format, or is there appetite for adopting an open standard?

### Phase 2: Joint mapping exercise

**Objective:** Produce a verified field mapping between Settld's internal data model and INHERIT schemas.

- Work with Settld's engineering team to map every field in Settld's internal deceased-details, notification, and provider models to INHERIT equivalents
- Identify gaps where INHERIT needs new fields or extension points to cover Settld's requirements (e.g. bereavement-specific notification types, provider response codes)
- Identify gaps where Settld's model is less structured than INHERIT's and could benefit from adoption (e.g. typed organisation records, death verification trust levels)
- Produce a formal mapping document with field-level correspondence, transformation rules, and edge cases

### Phase 3: Prototype integration

**Objective:** Build a working proof-of-concept.

- Develop an adapter that converts INHERIT documents into Settld's internal format (for inbound integration)
- Develop an adapter that converts Settld's notification records into INHERIT `notification.json` entities (for outbound integration)
- Test with representative estate data covering common scenarios: single-jurisdiction UK estate, estate with Scottish and English accounts, estate with digital-only assets
- Validate that the INHERIT document produced by the round-trip (estate platform --> Settld --> notification records back to estate platform) is complete and accurate

### Phase 4: Bereavement Standard Working Group engagement

**Objective:** Position INHERIT as the data standard the Working Group needs.

- Present the Settld-INHERIT integration as a concrete example of how an open data standard can streamline bereavement notification
- Propose INHERIT's `deathVerification` model as the basis for a standardised digital death notification format
- Engage with HM Treasury, the FCA, and participating industry bodies to discuss adoption pathways
- Explore whether Tell Us Once could produce INHERIT-formatted death verification records as an output

### Phase 5: Ecosystem adoption

**Objective:** Establish INHERIT as the interchange format for bereavement notifications across the UK.

- Publish a Bereavement Notification Extension (`x-inherit-bereavement`) covering notification types, provider response codes, and bereavement-specific workflows not covered by INHERIT's core schema
- Work with other bereavement services (not just Settld) to adopt INHERIT as their interchange format
- Engage with the Life Insurance Association, the Building Societies Association, Energy UK, and other trade bodies to promote INHERIT adoption among their members
- Develop conformance test suites that service providers can use to validate their INHERIT implementation

## Appendix: INHERIT extension for bereavement notifications

INHERIT's extension mechanism (`x-inherit-*` properties) allows domain-specific data to be included without modifying the core schemas. A bereavement notification extension (`x-inherit-bereavement`) could include:

### Extended notification types

The core `notification.notificationType` enum covers general estate notifications. Bereavement-specific notification types could be defined as extension values:

| Extension notification type | Description |
|---|---|
| `x-inherit-bereavement-death_notification` | Initial notification to a service provider that an account holder has died |
| `x-inherit-bereavement-account_freeze_request` | Request to freeze the deceased's account pending probate |
| `x-inherit-bereavement-balance_request` | Request for the date-of-death balance on an account |
| `x-inherit-bereavement-account_closure_request` | Request to close the deceased's account and transfer funds |
| `x-inherit-bereavement-policy_claim` | Notification that a claim is being made on a life insurance or pension policy |
| `x-inherit-bereavement-direct_debit_cancellation` | Request to cancel direct debits on the deceased's account |
| `x-inherit-bereavement-standing_order_cancellation` | Request to cancel standing orders on the deceased's account |

### Extended notification statuses

Provider responses to bereavement notifications follow patterns not covered by the core `notification.status` enum. An extension could track:

| Extension field | Type | Description |
|---|---|---|
| `providerAcknowledgedAt` | `date-time` | When the provider acknowledged receipt of the notification |
| `providerActionTaken` | `string` | Description of the action taken (e.g. "Account frozen", "Balance statement issued") |
| `providerReferenceNumber` | `string` | The provider's internal case or reference number for this bereavement notification |
| `estimatedCompletionDate` | `date` | When the provider expects to complete the requested action |
| `documentsRequired` | `string[]` | Additional documents the provider needs (e.g. "Certified copy of grant of probate", "Completed claim form") |

These would be included on a `notification` entity as:

```json
{
  "id": "a1b2c3d4-...",
  "notificationType": "x-inherit-bereavement-death_notification",
  "recipientType": "organisation",
  "recipientId": "e5f6g7h8-...",
  "channel": "in_app",
  "sentAt": "2026-03-15T10:30:00Z",
  "status": "delivered",
  "x-inherit-bereavement": {
    "providerAcknowledgedAt": "2026-03-15T14:22:00Z",
    "providerActionTaken": "Account frozen pending grant of probate",
    "providerReferenceNumber": "BRV-2026-00451",
    "estimatedCompletionDate": "2026-05-15",
    "documentsRequired": [
      "Certified copy of grant of probate",
      "Original death certificate"
    ]
  }
}
```

This structure preserves full interoperability with any INHERIT-compliant system (the core fields are all standard) whilst carrying bereavement-specific metadata that Settld and service providers need to manage the notification lifecycle.
