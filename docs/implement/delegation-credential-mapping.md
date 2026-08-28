# Delegation Credential Claims Mapping

## Overview

Digital estate delegation — how platforms verify that a person is deceased and grant delegated access to authorised representatives — is an emerging area of standardisation across multiple bodies, including the OpenID Foundation, the W3C Verifiable Credentials (VC Data Model 2.0) working group, and various national digital identity schemes.

INHERIT addresses the *data layer*: what estate information looks like in a structured, portable format. Delegation protocols address the *protocol and credential layer*: authentication, authorisation, and delegation verification.

The two layers are complementary. A delegation credential answers "who is allowed to act, and what can they do?" An INHERIT document answers "what is the estate, and what does it contain?" This document shows how INHERIT's existing fields align with the delegation credential patterns emerging across the ecosystem — including W3C Verifiable Credentials (VC Data Model 2.0), OAuth 2.0 Token Exchange (RFC 8693), and proposed digital estate delegation frameworks.

> **Note:** No single delegation protocol has been finalised for digital estate management. The credential claim names below reflect established patterns from the OIDF's existing specifications (OpenID Connect, FAPI, eKYC & IDA), the W3C Verifiable Credentials (VC Data Model 2.0) Data Model, and emerging digital estate proposals. INHERIT's fields are designed to be credential-system agnostic — they work with whatever delegation protocol the ecosystem converges on. All INHERIT fields listed here are shipping in v4.0.

## Credential Claims Mapping

The table below maps typical delegation credential claims to the corresponding INHERIT schema field(s). The "Direction" column indicates whether INHERIT provides data *to* the credential (source), consumes data *from* the credential (consumer), or both.

| Delegation Credential Claim | INHERIT Schema | INHERIT Field(s) | Direction | Notes |
|---|---|---|---|---|
| `subject_id` — the deceased person | `estate.json` | `testatorPersonId` → `person.id` | Source | INHERIT's testator person record provides the identity attributes (name, date of birth, identifiers) that the delegation credential references. The `person.identity.externalIds` array can store the delegation subject identifier. |
| `delegate_id` — the authorised representative | `proxy-authorisation.json` | `proxyPersonId` → `person.id` | Source | The executor, solicitor, or family member granted delegated authority. INHERIT's `person.json` provides the delegate's identity attributes. |
| `delegation_type` — on-behalf-of vs impersonation | `proxy-authorisation.json` | `delegationType` | Both | INHERIT distinguishes `on_behalf_of` (principal/agent — the delegate acts as themselves representing the deceased) from `impersonation` (the delegate acts as if they were the deceased). Maps directly to the delegation semantics in RFC 8693. |
| `scope` — what the delegate can do | `proxy-authorisation.json` | `scope` | Source | INHERIT defines granular scopes: `full`, `information_gathering`, `communication`, `financial`, `legal`, `medical`, `digital`, `property`, `limited`. A delegation credential's scope claim could reference or mirror these values. |
| `legal_authority` — the legal basis for delegation | `executor.json` | `appointmentType`, `appointmentSource` | Source | INHERIT records whether authority comes from a `will`, `court_appointment`, `statutory_default`, or `intestacy_rules`. The `appointmentSource` field can hold a URI to the grant of probate or court order. |
| `death_verified` — whether/how death was confirmed | `estate.json` | `deathVerification.method` | Source | INHERIT's `deathVerification` object provides: `method` (death_certificate, coroner_report, civil_registry, court_order, medical_certificate, community_declaration, presumption_of_death), `issuingAuthority`, `referenceNumber`, `jurisdiction`, `dateOfDeath`, `registrationDate`, `verifiedAt`, `verifiedBy`. |
| `confidence` / `trust_level` — verification confidence | `estate.json` | `deathVerification.trustLevel` | Both | INHERIT defines five trust levels: `government_certified`, `medical_certified`, `platform_detected`, `community_declared`, `self_reported`. These align with trust tiers common across identity assurance frameworks. A delegation verification service could populate this field; an INHERIT document could provide evidence for a verification request. |
| `issuer` — who issued the credential | `proxy-authorisation.json` | `credentialRef` | Consumer | INHERIT stores a URI pointing to the external delegation credential. When a credential is issued, its URI is stored in `credentialRef`, linking the INHERIT document to the authoritative credential. |
| `expiry` — when the delegation expires | `proxy-authorisation.json` | `expiryDate` | Both | INHERIT records delegation expiry as an ISO 8601 date. A delegation credential's `exp` claim and INHERIT's `expiryDate` should be synchronised. |
| `activation_trigger` — what activates the delegation | `proxy-authorisation.json` | `activationTrigger` | Source | INHERIT defines: `on_death`, `on_incapacity`, `on_court_order`, `on_inactivity`, `on_date`, `immediate`. The `on_inactivity` trigger aligns with Google's Inactive Account Manager pattern; `on_death` aligns with Apple's Legacy Contact. |
| `sub_delegation` — whether re-delegation is permitted | `proxy-authorisation.json` | `subDelegation` | Source | INHERIT models delegation chains (executor → solicitor → paralegal). When `subDelegation` is true, the delegate may create further delegation credentials for downstream agents. |
| `consent_ref` — external consent record | `proxy-authorisation.json` | `externalConsentRef` | Consumer | URI pointing to a FHIR Consent resource or other external consent system. Enables healthcare platforms to verify that the delegation includes informed consent. |
| `healthcare_access` — medical record authority | `proxy-authorisation.json` | `healthcareRecordAccess` | Source | Boolean indicating whether the delegation includes authority to access the deceased's medical records. Relevant for healthcare platforms implementing delegation protocols. |
| `constraints` — delegation limitations | `proxy-authorisation.json` | `delegationConstraints` | Source | Structured constraints limiting how the delegation may be exercised — geographic, temporal, or domain-specific restrictions. |

## Integration Flow

The following sequence shows how INHERIT and a delegation protocol would work together in a typical estate administration scenario:

### 1. Estate document created

A solicitor or estate planning platform creates an INHERIT document containing the estate plan: testator details, named executors, assets, trusts, bequests, and proxy authorisations.

```json
{
  "testatorPersonId": "a1b2c3d4-...",
  "deathVerification": null,
  "proxyAuthorisations": [
    {
      "proxyPersonId": "e5f6g7h8-...",
      "scope": "full",
      "activationTrigger": "on_death",
      "subDelegation": true,
      "credentialRef": null
    }
  ]
}
```

### 2. Death occurs and is verified

When the testator dies, the death is verified through a civil registry, medical certificate, or court order. The INHERIT document is updated:

```json
{
  "deathVerification": {
    "method": "death_certificate",
    "issuingAuthority": "General Register Office",
    "referenceNumber": "DC-2026-789012",
    "jurisdiction": { "country": "GB", "subdivision": "GB-ENG" },
    "dateOfDeath": "2026-08-15",
    "registrationDate": "2026-08-22",
    "trustLevel": "government_certified"
  }
}
```

### 3. Delegation credential issued

A credential issuer (identity provider, government service, or probate registry) issues a delegation credential using data from the INHERIT document:

- **Subject:** resolved from `testatorPersonId` → person record
- **Delegate:** resolved from `proxyPersonId` → person record
- **Scope:** copied from `proxyAuthorisation.scope`
- **Death evidence:** sourced from `deathVerification` (method, reference number, trust level)
- **Activation:** confirmed because `activationTrigger` is `on_death` and death is verified

### 4. Credential linked back to INHERIT

The issued credential's URI is stored in the INHERIT document:

```json
{
  "credentialRef": "https://delegation-provider.example/credentials/abc123"
}
```

### 5. Platform accepts delegation

The executor presents the delegation credential to a platform (bank, social media, cloud provider). The platform verifies the credential, confirms the delegation scope, and grants appropriate access. If the platform needs to understand the full estate context — asset details, other beneficiaries, distribution instructions — it reads the linked INHERIT document.

## Design Principles

### Protocol-agnostic references

INHERIT's `credentialRef` field is a URI, not a protocol-specific type. This means the same field works for:

- W3C Verifiable Credentials (VC Data Model 2.0)
- OAuth 2.0 token references
- OpenID Foundation delegation credentials (when formalised)
- National digital identity schemes (GOV.UK Verify, Aadhaar, SingPass)

No schema change is needed when delegation protocols publish their specifications — `credentialRef` is ready today.

### Trust level alignment

INHERIT's `trustLevel` enum aligns with the trust tiers common across identity assurance frameworks:

| INHERIT `trustLevel` | Verification source | Ecosystem alignment |
|---|---|---|
| `government_certified` | Civil registry, vital records office | Highest assurance — official government verification |
| `medical_certified` | Medical certificate of death, coroner | High assurance — professional medical verification |
| `platform_detected` | Platform inactivity detection, signal analysis | Medium assurance — algorithmic, not human-verified |
| `community_declared` | Family elder, religious leader, community authority | Lower assurance — customary law, no government record |
| `self_reported` | Family member report without independent verification | Lowest assurance — requires additional verification |

### Scope granularity

INHERIT's scope values are more granular than a typical OAuth scope string but can be composed into a delegation credential scope claim. For example, a delegation with `scope: "financial"` in INHERIT would translate to a credential authorising access to bank accounts, investment platforms, and pension providers — but not social media accounts or healthcare records.

## Implementer Guidance

### For platforms accepting delegation credentials

If you are implementing delegation credential acceptance:

1. **Accept INHERIT documents** as supporting evidence alongside delegation credentials. The credential proves delegation authority; the INHERIT document provides the estate context.
2. **Map your platform's account data** to INHERIT schemas using the relevant [platform integration guide](platforms/). This enables structured data release to authorised delegates.
3. **Populate `credentialRef`** on the INHERIT proxy authorisation when issuing or receiving a delegation credential. This creates a bidirectional link between the estate record and the delegation proof.

### For estate platforms building INHERIT support

If you are implementing INHERIT document creation:

1. **Pre-populate delegation-relevant fields** — `activationTrigger`, `scope`, `subDelegation`, `delegationType` — during estate planning, before death occurs. This makes credential issuance immediate when the time comes.
2. **Store the credential URI** in `credentialRef` once a delegation credential is issued. This links the estate record to the verifiable proof of delegation.
3. **Use `trustLevel`** to record the quality of death verification. Downstream systems can use this to determine whether additional verification is needed.

### For identity providers issuing delegation credentials

If you are building a delegation credential issuer:

1. **Read the INHERIT document** to source claim values: subject identity from `testatorPersonId` → `person.json`, delegate identity from `proxyPersonId` → `person.json`, scope from `proxyAuthorisation.scope`, death evidence from `estate.deathVerification`.
2. **Write the credential URI** back to the INHERIT document's `credentialRef` field, creating a verifiable link.
3. **Respect `subDelegation`** — if the INHERIT proxy authorisation permits sub-delegation, the issued credential should include a claim allowing the delegate to further delegate.

## Relationship to Other Standards

| Standard | Relationship to INHERIT |
|---|---|
| **W3C Verifiable Credentials (VC Data Model 2.0)** | Likely envelope format for delegation credentials. INHERIT's `credentialRef` can point to a VC. |
| **OAuth 2.0 Token Exchange (RFC 8693)** | Delegation protocols may use the `act` claim for delegation. INHERIT's `delegationType` aligns with the on-behalf-of vs impersonation distinction in RFC 8693. |
| **UMA 2.0 (User-Managed Access)** | Delegation protocols may adopt UMA-style permission tickets for requesting delegated access. INHERIT's scope values could map to UMA resource scopes. |
| **FHIR R5** | INHERIT's `fhirPatientRef` and `externalConsentRef` enable healthcare interoperability. Delegation credentials for medical record access would reference these fields. |
| **RUFADAA** | US state law governing fiduciary access to digital assets. INHERIT's `executor.appointmentType` and `proxy-authorisation.scope` model RUFADAA-granted authority. |

## Status

This document reflects INHERIT v4.0 fields and the delegation credential patterns visible across the ecosystem today. It will be updated as delegation protocols publish formal specifications.

INHERIT's delegation-ready fields (`credentialRef`, `subDelegation`, `activationTrigger`, `trustLevel`) are shipping today. The `credentialRef` field is a protocol-agnostic URI — it will work with W3C Verifiable Credentials (VC Data Model 2.0), OpenID Foundation delegation credentials, or any other delegation credential format without schema changes.
