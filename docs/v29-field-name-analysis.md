---
title: "INHERIT v2.9 — Field Name Analysis"
version: "1.0"
status: draft
date: 2026-04-02T19:00
lastmod: 2026-04-15T23:27
author: "Rich Davies"
supersedes: null
source: "docs/v29-field-name-analysis.md"
---

# INHERIT v2.9 — Field Name Analysis

Systematic derivation of field names for new v2.9 schema additions. Each name is cross-referenced against established standards (schema.org, FHIR, W3C VC, RUFADAA, RDAP, platform APIs) and checked for consistency with INHERIT's existing naming patterns.

## Methodology

1. Extract candidate names from all researched sources
2. Check for prior art in established standards
3. Verify consistency with INHERIT's existing camelCase conventions
4. Prefer names that are self-documenting to a non-native English speaker
5. Reject names that are ambiguous, too terse, or collision-prone

## Naming conventions (existing INHERIT patterns)

- **Case:** lowerCamelCase throughout (matches schema.org, FHIR, W3C VC)
- **IDs:** `id` for internal UUID; `xPersonId` / `xOrganisationId` for foreign key references
- **Dates:** `dateX` for point-in-time events; no `createdAt`/`updatedAt` (schema.org alignment)
- **Enums:** snake_case values (`grant_of_probate`, `hardware`, `in_person`)
- **Booleans:** plain adjective or past participle (`monetised`, `legacyContactConfigured`)
- **Monetary:** object with `amount` (integer minor units) + `currency` (ISO 4217)

---

## 1. Digital Asset Subtypes

### 1.1 Domain Names

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `domainName` | string (hostname) | RDAP: `ldhName`; GoDaddy: `domain` | The actual registrable domain string, e.g. `"openinherit.org"`. Distinct from `asset.name` which is the human-readable label. Pattern: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$` |
| `registrar` | string | RDAP: `entities[role=registrar]`; GoDaddy: implicit | Industry-standard term |
| `registrantOrganisationId` | uuid | RDAP: `entities[role=registrant]` | INHERIT pattern: foreign key to organisation |
| `expiryDate` | date | RDAP: `events[eventAction=expiration].eventDate`; GoDaddy: `expires` | INHERIT already uses `expiryDate` on wish.json |
| `autoRenew` | boolean | GoDaddy: `renewAuto` | Simpler than `renewAuto`; self-documenting |
| `transferLocked` | boolean | GoDaddy: `locked`, `transferProtected` | Combines two GoDaddy fields; clearer intent |
| `authCodeLocation` | string | GoDaddy: `authCode` | INHERIT pattern: store reference to secret, never the secret itself (like `privateKeyLocation`) |
| `nameservers` | string[] | RDAP: `nameservers`; GoDaddy: `nameServers` | RDAP form (lowercase s) is more standard |

**Rejected alternatives:**
- `ldhName` → RDAP's term but obscure; `domainName` is universally understood
- `whoisPrivacy` → GoDaddy uses `privacy` but this is an implementation detail, not estate-relevant
- `renewAuto` → GoDaddy convention but reads unnaturally in English

### 1.2 NFTs / Digital Collectibles

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `blockchain` | enum | INHERIT existing: `cryptoAccess.blockchain` | Already established in INHERIT |
| `contractAddress` | string | ERC-721/1155: `contract_address`; Coinbase: `contract_address` | CamelCase per INHERIT convention |
| `tokenId` | string | ERC-721: `tokenId`; OpenSea: implied by URI | String not integer — token IDs can be very large |
| `tokenStandard` | enum | Values: `erc_721`, `erc_1155`, `other` | Identifies which standard governs the token |
| `marketplace` | string | OpenSea: `external_link`; general | Platform where the NFT is listed/traded |
| `marketplaceUrl` | uri | OpenSea: `external_url` | Direct link to the listing |
| `metadataUri` | uri | ERC-721: `tokenURI`; ERC-1155: `uri` | Points to the off-chain metadata JSON |

**Rejected alternatives:**
- `tokenURI` → standard in ERC-721 but `metadataUri` is clearer about what it points to
- `collectionName` → OpenSea concept but overloaded with INHERIT's `asset-collection.json`
- `nftId` → too specific; `tokenId` is the universal term

### 1.3 Monetised Content Accounts

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `platform` | enum | INHERIT existing: `socialMedia.platform` | Already established |
| `channelUrl` | uri | YouTube API: `channel.url` | Direct link to the content channel |
| `channelName` | string | YouTube API: `channel.snippet.title` | Human-readable channel name |
| `subscriberCount` | integer | YouTube API: `statistics.subscriberCount` | Metric for valuation |
| `monthlyRevenue` | money | No standard — domain-specific | Uses INHERIT `common/money.json` pattern |
| `monetisationStatus` | enum | Values: `active`, `suspended`, `demonetised`, `pending`, `none` | Reflects platform monetisation state |
| `contentType` | enum | Values: `video`, `audio`, `written`, `mixed`, `other` | What kind of content generates revenue |
| `revenueModel` | enum | Values: `advertising`, `subscription`, `tips`, `affiliate`, `merchandise`, `mixed` | How the revenue is generated |

**Rejected alternatives:**
- `monetized` → American spelling; INHERIT uses British English (`monetised`)
- `followerCount` → INHERIT already uses this on `socialMedia`; avoid duplication
- `incomeStream` → too informal for a standard

### 1.4 Loyalty Points / Gift Cards

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `programme` | string | British English for "program" | The loyalty scheme name |
| `programmeProvider` | string | Provider/issuer of the programme | e.g. "Tesco", "Avios", "Nectar" |
| `pointsBalance` | integer | Industry standard term | Current balance in points |
| `cashEquivalent` | money | No standard — domain-specific | Uses INHERIT `common/money.json` |
| `expiryDate` | date | INHERIT existing pattern | When points expire |
| `transferable` | boolean | DGLegacy concept | Whether points can be transferred on death |
| `transferUrl` | uri | Platform-specific | URL for initiating transfer |

**Rejected alternatives:**
- `program` → American spelling
- `loyaltyPoints` → redundant when inside a subcategory
- `rewardsBalance` → less precise than `pointsBalance`

### 1.5 Gaming / Metaverse Assets

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `platform` | enum | INHERIT existing pattern | Gaming platform (Steam, Xbox, PlayStation, etc.) |
| `accountName` | string | Platform convention | Username/gamertag/PSN ID |
| `virtualCurrencyBalance` | integer | Industry term | In-game currency balance |
| `virtualCurrencyName` | string | Varies per game | e.g. "V-Bucks", "Gold", "ISK" |
| `transferable` | boolean | Varies per platform ToS | Whether the account/assets can be transferred |
| `estimatedRealValue` | money | No standard | Real-world monetary equivalent |

**Rejected alternatives:**
- `characterName` → too specific; not all gaming assets are character-based
- `gamertag` → Xbox-specific term
- `inGameCurrency` → less formal than `virtualCurrencyBalance`

---

## 2. Platform Delegation

A structured replacement for the current free-text `postDeathAction` field. This object applies to ALL digital asset types, not just social media.

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `action` | enum | INHERIT existing: `postDeathAction` values | Values: `memorialise`, `delete`, `transfer`, `archive`, `deactivate`, `preserve` |
| `delayDuration` | string (ISO 8601 duration) | W3C: duration format; schema.org: `validThrough` | e.g. `"P5Y"` = delete after 5 years. ISO 8601 duration is the standard |
| `transferToPersonId` | uuid | INHERIT existing: `transferToPersonId` | Already established in INHERIT |
| `specificInstructions` | string (max 500) | No standard — domain-specific | Free text for anything not covered by structured fields |
| `platformToolConfigured` | boolean | INHERIT existing: `legacyContactConfigured` | Whether the user has configured the platform's own tool |
| `platformToolType` | enum | Google: "Inactive Account Manager"; Facebook: "Legacy Contact"; Apple: "Digital Legacy" | Values: `inactive_account_manager`, `legacy_contact`, `digital_legacy`, `memorialisation_request`, `none`, `other` |
| `configuredDate` | date | schema.org: `dateCreated` pattern | When the platform tool was set up |

**Object name: `platformDelegation`**

Rationale: `delegation` aligns with RUFADAA terminology ("designated recipient") and OAuth vocabulary (`act`, `may_act`). `platform` scopes it to the platform-specific context. Preferred over `postDeathAction` (which is an enum, not an object) and `legacyInstructions` (which implies only post-death, but pre-death incapacity is also relevant).

**Rejected alternatives:**
- `deathAction` → too morbid; delegation covers incapacity too
- `legacyContact` → Apple-specific term
- `accountDisposition` → too formal/legal for a field name

---

## 3. Fiduciary Access Metadata

Per-platform record of how a fiduciary (executor/administrator) can access the account after death or incapacity.

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `accessMethod` | enum | RUFADAA hierarchy concept | Values: `designated_recipient`, `legacy_contact`, `inactive_account_manager`, `court_order`, `rufadaa_request`, `platform_form`, `credential_sharing`, `none` |
| `accessConfigured` | boolean | Pattern from `legacyContactConfigured` | Whether access has been set up |
| `designatedRecipientPersonId` | uuid | RUFADAA: `designated recipient` | Exact RUFADAA terminology, applied as INHERIT foreign key |
| `accessScope` | enum | RUFADAA: catalogue vs content distinction | Values: `catalogue_only`, `full_content`, `restricted`, `unknown` |
| `termsOfServiceUrl` | uri | RUFADAA: `terms-of-service agreement` | Link to the platform's ToS governing access |
| `termsOfServiceConstraints` | string (max 500) | No standard — domain-specific | What the ToS prohibits (e.g. "prohibits credential sharing") |

**Object name: `fiduciaryAccess`**

Rationale: `fiduciary` is the RUFADAA term for executor/administrator/trustee/agent. `access` is unambiguous. This aligns with the statutory language used in 49 US states + DC.

**Rejected alternatives:**
- `executorAccess` → executor is only one type of fiduciary
- `digitalAccess` → already used in INHERIT for a different purpose
- `accountAccess` → too generic

---

## 4. E-Will Execution Metadata (attestation.json additions)

Fields for recording electronic will execution, remote online notarisation, and video witnessing.

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `executionType` | enum | Florida/Nevada/UEWA distinction | Values: `physical`, `electronic`, `hybrid` |
| `qualifiedCustodianOrganisationId` | uuid | Florida F.S. 732.524: `qualified custodian` | Exact Florida statutory term |
| `custodianSystemName` | string | Florida F.S. 732.524: `secure system` | Name of the e-will storage platform |
| `authoritativeCopyHolder` | string | Nevada NRS 133.085: `authoritative copy` | Who holds the tamper-evident original |
| `tamperEvidenceMethod` | string | Nevada: detect "any change to an electronic record" | e.g. "SHA-256 hash", "blockchain notarisation" |
| `tamperEvidenceValue` | string | No standard for field name | The hash/signature value itself |
| `ronSessionId` | string | Florida F.S. 117.245: journal entry | Unique identifier for the RON session |
| `ronPlatform` | string | Industry term | e.g. "Notarize", "DocVerify", "SignNow" |
| `ronRecordingUrl` | uri | Florida F.S. 117.265: video recording | Link to the stored RON recording |
| `ronRecordingRetentionYears` | integer | Florida: minimum 10 years | How long the recording must be kept |
| `identityVerificationMethod` | enum | Florida F.S. 117.245: evidence of identity | Values: `government_id`, `credential_analysis`, `knowledge_based_authentication`, `biometric`, `personal_knowledge` |
| `authenticationCharacteristic` | string | Nevada NRS 133.085: exact term | Biometric/physical act used for authentication |
| `selfProvingAffidavit` | boolean | Florida F.S. 732.503 | Whether a self-proving affidavit was executed |

---

## 5. Video Witnessing Session (attestation.json additions)

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `videoRecordingUrl` | uri | Florida: RON video requirement | Link to the video recording |
| `videoRecordingMediaType` | string | INHERIT existing: `common/media.json` pattern | MIME type (e.g. `video/mp4`) |
| `videoRecordingDuration` | string (ISO 8601 duration) | W3C standard | e.g. `"PT45M"` = 45 minutes |
| `videoUninterrupted` | boolean | Florida F.S. 117.265: "uninterrupted and unedited" | Statutory requirement |
| `videoPlatform` | string | No standard | e.g. "Zoom", "Teams", "Notarize" |
| `videoParticipantPersonIds` | uuid[] | INHERIT pattern | Who was visible in the video |
| `videoLive` | boolean | No standard | Whether the video was live (not pre-recorded) |
| `videoJurisdictionValidFrom` | date | Jurisdiction-specific | Start of the period when video witnessing was legal |
| `videoJurisdictionValidUntil` | date | W3C VC: `validUntil` | End of validity period (null = still valid) |

---

## 6. Video Declaration (new concept)

A person recording themselves on video declaring that the will is correct — distinct from witnessing.

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `declarantPersonId` | uuid | INHERIT pattern | The person making the declaration |
| `declarationType` | enum | No standard — new concept | Values: `testamentary_intent`, `codicil_confirmation`, `capacity_demonstration`, `other` |
| `recordingUrl` | uri | INHERIT media pattern | Link to the video |
| `recordingMediaType` | string | MIME type | e.g. `video/mp4` |
| `recordingDate` | date | schema.org: `dateCreated` | When the recording was made |
| `recordingDuration` | string (ISO 8601 duration) | W3C standard | Length of the recording |
| `transcript` | string | No standard | Text transcript of what was said |
| `transcriptVerified` | boolean | No standard | Whether the transcript has been verified against the recording |
| `legalWeight` | enum | No standard — domain-specific | Values: `evidential`, `supplementary`, `non_binding`, `unknown` |

---

## 7. Document Integrity (schema.json / document.json additions)

JWS envelope and integrity fields for the INHERIT document itself.

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `integrity` | object | W3C VC: `proof` object pattern | Container for integrity metadata |
| `integrity.algorithm` | string | JWS (RFC 7515): `alg` header | e.g. `"RS256"`, `"ES256"` |
| `integrity.canonicalisationMethod` | string | RFC 8785 | e.g. `"JCS"` (JSON Canonicalization Scheme) |
| `integrity.hash` | string | Nevada: tamper detection | The computed hash value |
| `integrity.signature` | string | JWS: detached payload | The JWS signature value |
| `integrity.signedAt` | datetime | schema.org: `dateCreated` | When the signature was created |
| `integrity.signedBy` | string | W3C VC: `verificationMethod` | Who/what created the signature |
| `integrity.certificateUrl` | uri | W3C VC: `verificationMethod` | URL to the signing certificate |

**Object name: `integrity`**

Rationale: W3C VC uses `proof` but that implies a specific VC context. `integrity` is more general and self-documenting. FHIR uses `meta.security` for a similar concept but that's too broad.

**Rejected alternatives:**
- `proof` → W3C VC specific; might confuse with legal "proof" (probate)
- `signature` → too narrow; covers both hashing and signing
- `seal` → too domain-specific (notarial seal is a different concept)

---

## 8. Transmission Metadata (schema.json additions)

Recording how an INHERIT document was transmitted and received.

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `transmissions` | array | No standard — new concept | Array of transmission events |
| `transmissions[].sentAt` | datetime | schema.org: `dateSent` (on Message) | When the document was sent |
| `transmissions[].sentBy` | string | schema.org: `sender` | Who sent it (name or organisation) |
| `transmissions[].receivedAt` | datetime | schema.org: `dateReceived` (on Message) | When it was received |
| `transmissions[].receivedBy` | string | schema.org: `recipient` | Who received it |
| `transmissions[].method` | enum | No standard | Values: `encrypted_email`, `secure_portal`, `api`, `physical_media`, `registered_post`, `other` |
| `transmissions[].encryptionMethod` | string | No standard for field name | e.g. `"AES-256-GCM"`, `"PGP"`, `"age"` |
| `transmissions[].verified` | boolean | No standard | Whether the recipient verified the integrity |
| `transmissions[].verifiedAt` | datetime | Pattern from schema.org | When verification was performed |

---

## 9. Posthumous AI / Digital Likeness (wish.json additions)

New `wishType` value: `digital_likeness`. Models consent, scope, permitted/prohibited uses, time limits, and existing AI model inventory.

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `likenessConsent` | enum | No standard — new territory | Values: `permitted`, `prohibited`, `restricted`, `not_stated`. Core consent decision |
| `likenessScope` | enum[] | No standard | Multi-select: `voice`, `visual_appearance`, `writing_style`, `personality_model`, `full_avatar` |
| `likenessPermittedUses` | enum[] | No standard | Values: `memorial`, `family_private`, `educational`, `commercial`, `legal_proceedings`, `artistic` |
| `likenessProhibitedUses` | enum[] | Same values as above | Explicit prohibitions (may overlap with permitted for granularity) |
| `likenessControllerPersonId` | uuid | INHERIT pattern | Who has authority over likeness decisions after death |
| `likenessTimeLimit` | string (ISO 8601 duration) | W3C standard | e.g. `"P25Y"` = 25 years. How long consent/prohibition lasts |
| `likenessRevocationConditions` | string (max 500) | No standard | Free text for edge cases |
| `syntheticMediaPolicy` | enum | No standard | Values: `allow_with_attribution`, `allow_without_attribution`, `prohibit_all`, `family_decision`, `not_stated` |
| `existingDigitalModels` | object[] | No standard | Known AI models/datasets trained on the person |
| `existingDigitalModels[].platform` | string | No standard | e.g. "HereAfter", "StoryFile" |
| `existingDigitalModels[].modelType` | enum | No standard | Values: `chatbot`, `voice_clone`, `visual_avatar`, `full_replica`, `other` |
| `existingDigitalModels[].action` | enum | INHERIT `platformDelegation.action` pattern | Values: `preserve`, `delete`, `transfer`, `restrict` |
| `existingDigitalModels[].controllerPersonId` | uuid | INHERIT pattern | Who inherits control of this model |

---

## 10. Delegation Protocol Enhancements (proxy-authorisation.json additions)

### 10.1 Structured audit log (replaces `auditTrailEnabled` boolean)

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `auditLog` | object[] | FHIR: `AuditEvent` pattern | Array of logged delegation actions |
| `auditLog[].action` | enum | OAuth: `grant_type` pattern | Values: `granted`, `exercised`, `revoked`, `challenged`, `modified`, `expired` |
| `auditLog[].performedBy` | string | schema.org: `agent` | Who performed the action |
| `auditLog[].performedAt` | datetime | schema.org: `startTime` | When |
| `auditLog[].detail` | string (max 500) | No standard | What specifically was done |
| `auditLog[].evidenceUrl` | uri | W3C VC: `evidence` | Link to supporting evidence |

### 10.2 Delegation type and constraints

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `delegationType` | enum | OAuth: `act` vs impersonation distinction | Values: `on_behalf_of`, `impersonation`, `co_equal`, `supervised`. The OpenID report's core distinction |
| `delegationConstraints` | object | OAuth: `scope` concept | Structured limits on the delegation |
| `delegationConstraints.maxTransactionValue` | money | INHERIT `common/money.json` | Financial limit per action |
| `delegationConstraints.requiresCoApproval` | boolean | Kantara UMA: co-equal authority | Must another person approve actions |
| `delegationConstraints.coApproverPersonId` | uuid | INHERIT pattern | Who must co-approve |
| `delegationConstraints.excludedAssetIds` | uuid[] | No standard | Assets this delegate cannot touch |

### 10.3 Conditional activation

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `activationTrigger` | enum | Sovrin guardianship: conditional delegation | Values: `immediate`, `on_death`, `on_incapacity`, `on_court_order`, `on_date`, `manual` |
| `activationDate` | date | schema.org: `validFrom` | For `on_date` trigger |
| `activationVerificationMethod` | enum | MOSIP death registration model | Values: `death_certificate`, `medical_certificate`, `court_order`, `community_declaration`, `platform_detection`, `none` |
| `activationVerifiedBy` | string | schema.org: `agent` | Who verified the trigger condition |
| `activationVerifiedAt` | datetime | schema.org: `dateCreated` pattern | When verification occurred |

---

## 11. Informal / Substantial Compliance (document.json addition)

Courts in Australia (QLD s.18, NSW s.8), Canada (BC WESA s.58), and potentially the UK (Law Commission recommendation) admit documents that don't meet strict formalities — iPhone notes, text messages, unsent emails — if the court is satisfied the deceased intended them as a will. INHERIT currently assumes formal execution.

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `formalityStatus` | enum | Australian Succession Act s.18; BC WESA s.58 | Values: `formal`, `informal_admitted`, `informal_contested`, `holographic`, `nuncupative`, `unknown`. Whether the document meets strict formalities or was admitted under a curative/dispensing power |
| `formalityAdmittedBy` | string | Court practice | Name of the court or authority that admitted the informal document |
| `formalityAdmittedAt` | date | schema.org: `dateCreated` pattern | Date the document was admitted |
| `formalityJurisdiction` | object | INHERIT `common/jurisdiction.json` | Which jurisdiction's curative provision was invoked |
| `formalityNotes` | string (max 500) | No standard | Circumstances of the informal execution (e.g. "written on iPhone Notes app while in hospital") |

---

## 12. Government Registry References (document.json addition)

Every leading jurisdiction has a government registry for wills, probate, or estate documents. INHERIT's `document.json` has a `registrations` array but it lacks structured fields for specific registry systems.

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `registryReference` | object | Multiple jurisdictions | Structured reference to a government registry entry |
| `registryReference.registryName` | string | No standard | e.g. "Legal Affairs Bureau" (Japan), "FCDDV" (France), "HMCTS Probate Registry" (UK), "National Will Register" (UK) |
| `registryReference.registryType` | enum | No standard | Values: `will_registry`, `probate_court`, `notarial_registry`, `death_registry`, `lpa_registry`, `seal_registry`, `other` |
| `registryReference.referenceNumber` | string | Varies by jurisdiction | The registry's unique reference/case number |
| `registryReference.registeredAt` | date | schema.org: `dateCreated` pattern | When the document was registered |
| `registryReference.registryJurisdiction` | object | INHERIT `common/jurisdiction.json` | Which jurisdiction's registry |
| `registryReference.verificationUrl` | uri | schema.org: `url` | URL to verify the registration online (where available) |
| `registryReference.registryOrganisationId` | uuid | INHERIT pattern | Foreign key to organisation entity for the registry body |

**Note:** This complements the existing `registrations` array on `document.json` — the new `registryReference` provides a more structured, typed alternative. The existing array can be deprecated in v3.0.

---

## 13. Death Notification Tracking (schema.json addition)

When someone dies, dozens of institutions must be notified — banks, pension providers, HMRC, utilities, social media platforms. The UK's "Tell Us Once" service and platforms like Settld automate this. INHERIT should track which notifications have been sent and their status.

| Field | Type | Source alignment | Rationale |
|---|---|---|---|
| `deathNotifications` | object[] | UK Tell Us Once; Settld model; Estonia X-Road | Array of notification events |
| `deathNotifications[].institution` | string | No standard | Name of the institution notified (e.g. "HMRC", "Barclays", "Facebook") |
| `deathNotifications[].institutionType` | enum | INHERIT `organisation.json` types | Values: `bank`, `pension_provider`, `insurance`, `tax_authority`, `utility`, `social_media`, `email_provider`, `government`, `employer`, `other` |
| `deathNotifications[].institutionOrganisationId` | uuid | INHERIT pattern | Foreign key to organisation entity |
| `deathNotifications[].notifiedAt` | datetime | schema.org: `dateSent` | When notification was sent |
| `deathNotifications[].notifiedBy` | string | schema.org: `sender` | Who sent the notification (executor name or service name) |
| `deathNotifications[].method` | enum | No standard | Values: `tell_us_once`, `settld`, `direct_letter`, `direct_email`, `direct_phone`, `platform_form`, `api`, `solicitor`, `other` |
| `deathNotifications[].status` | enum | FHIR: `status` pattern | Values: `pending`, `sent`, `acknowledged`, `actioned`, `rejected`, `unknown` |
| `deathNotifications[].referenceNumber` | string | No standard | Reference number from the institution or notification service |
| `deathNotifications[].responseDate` | date | No standard | When the institution responded |
| `deathNotifications[].notes` | string (max 500) | No standard | Any additional context |

---

## Cross-reference summary

| Convention | schema.org | FHIR | W3C VC | RUFADAA | RDAP | INHERIT existing | v2.9 proposal |
|---|---|---|---|---|---|---|---|
| Case | camelCase | camelCase | camelCase | n/a | camelCase | camelCase | camelCase ✓ |
| ID references | inline object | Reference type | URI | n/a | handle | `xPersonId` | `xPersonId` ✓ |
| Dates | `dateCreated` | `issued` | `validFrom` | n/a | `eventDate` | `dateX` / bare dates | `dateX` for events, bare for attributes ✓ |
| Enums | PascalCase | lowercase | n/a | n/a | lowercase | snake_case | snake_case ✓ |
| Money | value + currency | value + currency | n/a | n/a | n/a | amount + currency | amount + currency ✓ |
| Booleans | varies | varies | varies | n/a | n/a | adjective/participle | adjective/participle ✓ |
