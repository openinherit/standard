# Changelog

All notable changes to the INHERIT standard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [6.6.0] — 2026-04-14

## [6.5.0] — 2026-04-14

### Added

- `marriageRevocation` optional property on three extensions — `uk-england-wales` (Wills Act 1837 s.18), `singapore-malaysia` (Wills Act (Cap 352) s.13 — non-Muslim testators), and `uae` (DIFC/ADGM non-Muslim wills, no general revocation rule). Same shape across all three so tools can handle them uniformly: `revokesPriorWill`, `statute`, `statuteUrl`, `contemplationException`, `contemplationRule`, `notes`. Backwards-compatible — all existing documents remain valid. Drives the marriage-impact scenario in the INHERIT Companion talk demo at openinherit.org/talk/companion.
- Test fixtures for `marriageRevocation` on all three extensions (valid + invalid cases).

### Changed

- Bumped `version` field in extension manifests for `uk-england-wales`, `singapore-malaysia`, `uae` from `1.0.0` to `1.1.0` (semver minor — additive only). Updated `lastVerified` to `2026-04-14` and added `marriageRevocation` to each extension's `keyFeatures` string.
- Resynced website bundled-schema mirrors (`website/static/schemas/inherit-v3-bundled.json`, `catalogue-v3-bundled.json`) so dev.openinherit.org serves the new schema.

## [6.4.2] — 2026-04-12

### Fixed

- SDK package size reduced by 45% (1.7MB → 932KB) — removed source maps and declaration maps from published package. Reported by Jared.
- Conformance package version aligned to 6.4.1

### Changed

- Extensions registry updated to v3.0.0 — keyFeatures, maturity, and successionCoverage updated for all 14 enriched extensions. 7 extensions promoted from draft to candidate.
- npm package metadata enriched for all three packages (schema, SDK, conformance) — author, contributors, funding, bugs, engines, 20+ keywords, comprehensive README files

## [6.4.1] — 2026-04-12

### Added

- npm README files for @openinherit/schema and @openinherit/sdk — displayed on npmjs.com with install instructions, usage examples, extension tables, and cross-references
- Enriched package.json metadata for all three npm packages — author, contributors, bugs, funding, engines, sideEffects: false, 20+ keywords for search discoverability

### Fixed

- Conformance package version aligned to 6.4.0

## [6.4.0] — 2026-04-12

### Added

**Practitioner polish (14 improvements from Katrina Tan's will)**
- `religion` on person — 14-value faith enum as jurisdictional legal status (Singapore AMLA, Malaysian faraid, Israeli rabbinical courts)
- `connections` on estate — directed non-familial links between people (solicitor, friend, carer, etc.)
- `constructionClauses` on estate — gender neutrality, severability, interpretation rules
- `validityStatus` on estate — tracks life events that may invalidate the will (marriage, conversion, domicile change)
- `administrationPhases` on estate — universal priority ordering (funeral > debts > distribution)
- `priority` and `clauseReference` on bequest — preserves ordering from the will
- `failureConsequence` and `failureDescription` on bequest conditions — what happens when a condition fails
- `executorDirections` on bequest — administrative instructions with binding status
- `mentionedAssetIds` and `mentionedPropertyIds` on bequest — residuary clauses naming specific assets for clarity
- `significance` on asset — cultural, religious, sentimental, professional value with disposal restrictions
- `pageCount`, `pagesSignedByTestator`, `pagesSignedByWitnesses`, `allPagesSigned` on attestation — formality verification
- `schemaVersion` aligned to package version (6.3.0 → 6.4.0) across all 19 fixtures
- CPF nomination enrichment — sub-account allocations, nomination form version, marriage-triggered revocation

**Final three gaps (from Mark Richardson's English will)**
- `executorPowers` on estate — 8-value enum for statutory authority grants (Trustee Act 2000, sale/postpone/appropriate/insure)
- `statutoryExclusions` on estate — disapplied legislation (Apportionment Act 1870, Trustee Act defaults)
- `precatoryWishes` on bequest — non-binding beneficiary guidance on specific bequests

**Internationalisation**
- `guardianshipModel` on guardian — cross-cultural patterns (individual, family_council, collective, extended_family, rotating, court_appointed)

**Test wills collection**
- 10 mock wills in `docs/wills/` spanning 8 jurisdictions — Singapore, England, Singapore AMLA, France+England, New York, Michigan, Taiwan+England, Philippines+USA, Australia, India, Nigeria+England

### Changed

- **BREAKING:** `attestationDate` changed from `format: date` to `format: date-time`. Use `T00:00:00Z` suffix for date-only precision.
- Release script improved — now builds 6 download assets (bundled schema, OpenAPI, SDK, conformance, examples, checksums) and generates structured release notes automatically

### Fixed

- SDK ESM module resolution — build switched from `tsc` to `tsup`. Fixes `ERR_MODULE_NOT_FOUND` when consuming `@openinherit/sdk` with Node ESM. Reported by Jared.

## [6.3.0] — 2026-04-12

### Added

**Phase 1 — Foundation**
- `propertyIds`, `liabilityIds`, `insurancePolicyIds` on bequests — programmatic estate distribution is now computable
- Person `roles` array no longer requires `minItems: 1` — deceased relatives and kinship-only nodes can appear in the people array

**Phase 2 — Entity additions**
- New `PowerOfAppointment` entity (general, special, hybrid) with appointor, appointee, class of beneficiaries, scope, and exercise tracking
- `disinheritedPersons` on estate — distinguishes deliberate exclusion from oversight
- `witnesses` array on attestation — name, address, occupation per witness (what probate courts require)
- `debt_forgiveness` bequest type — combined with `liabilityIds` for structured loan remission
- Codicil clause linking — `amendsClauseIds`, `revokesClauseIds`, `priorDocumentId`, `effectiveDate`
- Specialist executor roles — `literary`, `digital`, `specialist` with optional `scope`
- `powerOfAppointmentId` reference on bequests

**Phase 3 — Cross-cutting enrichment**
- `governingJurisdictions` on estate — multi-jurisdiction asset coordination (lex situs)
- `mutualWillAgreement` on estate — binding mutual will obligations
- `generationSkipping` on trust + `generationLevel` on beneficiaries — US GST classification
- `parallelSuccessionConflicts` on estate — irreconcilable customary vs statutory rights
- `designationConflict` and `revocationDetails` on nonprobate-transfer — beneficiary designation conflicts
- `letterOfWishesDocumentId` and `letterOfWishesStatus` on trust, `relatedTrustIds` on wish

**Phase 4 — Edge cases and tax**
- `charitableRemainderDetails` on trust — CRAT/CRUT income/remainder split modelling
- `taxPlanningDetails` on trust + new trust types (`residence_nil_rate_band`, `a_b_marital`, `bypass`)
- `taxReliefEligibility` on property and asset — APR, BPR, woodland, heritage, charitable
- `variationDetails` on PostDeathAction — who redirected what to whom in deeds of variation
- `classSubstitution` on bequest — per stirpes/per capita with predecease handling
- Extended `legacyPledge` — revocable, fundingMechanism, fundingAssetId
- Extended `commorientesRule` — affectedPersonIds, provedSurvivalOrder, statute
- `dependantType` on guardian — minor, adult_with_disability, adult_with_incapacity
- `careProvisions` on estate — linking dependant, trust, guardian, and annual cost
- `familyProvisionClaims` on estate — potential and actual claims with claimType and status
- `parentalOrderDetails` on kinship — surrogacy parental order court/date/surrogate
- `conflictsOfInterest` on executor and trust — beneficiary/drafter/family conflicts with disclosure tracking
- `identifiers` on organisation — structured registration numbers (charity number, UEN, company number)

**Fixtures**
- New `katrina-tan-singapore.json` — Singapore will demonstrating kinship redesign (uncle_aunt) and Phase 1 capabilities

### Changed

- **BREAKING:** Bequest `conditions` changed from string array to typed condition objects with `conditionType` enum (`survival_period`, `age_attainment`, `event`, `marriage`, `residence`, `employment`, `custom`) and optional `survivalDays`/`attainmentAge`/`personId`. Migrate existing string conditions to `{ "conditionType": "custom", "description": "<original>" }`.

### Fixed

- SDK ESM module resolution — switched build from `tsc` to `tsup` to fix `ERR_MODULE_NOT_FOUND` when consuming `@openinherit/sdk` with Node ESM. Reported by Jared.

## [6.2.0] — 2026-04-12

### Added

**Core kinship harmonisation**
- `uncle_aunt` and `cousin` kinship types — replacing gendered/split variants
- `lineage` composable property (paternal/maternal/bilateral) on kinship records
- `bloodDegree` composable property (whole/half) on kinship records
- `customary_adoption` added to `legalBasis` enum (Maori whangai, Aboriginal kupai omasker, Japanese yoshi)

**Tier 1+2 extension enrichment (7 extensions)**
- **islamic-succession**: 5 new heirClass values (uncle_paternal_half, nephew/cousin variants), `asabaRank` integer (1–15), full asaba hierarchy documentation
- **hindu-succession**: `scheduleEntry` on IndianHeirClassification, Class I/II and agnate/cognate kinship mappings
- **jewish-succession**: 4 new halachicClass values (av_av, ach_av, ben_ach, ben_ach_av), full Numbers 27 + Bava Batra hierarchy, bekhor patrilineal restriction
- **singapore-malaysia**: `relationshipCategory` enum on ISA and Malaysian Distribution Act share schedules, ISA Schedule 2 rules
- **australia-nz**: `relationshipCategory` on FamilyProvisionClaim (7 categories), whangai fields on MaoriLandDetails, `customaryAdoptionRecognised` on AboriginalLandDetails
- **japan**: `relationshipCategory` on IryubunClaim, yoshi adoption → core kinship mapping, saishi custodial succession clarification
- **prc-china**: `relationshipCategory` on first/second order forced heirship heirs, `contributingInLaws` (Article 1129), Article 1128 per stirpes documentation

**Tier 3 extension enrichment (10 extensions)**
- **uk-england-wales**: `intestacyHierarchy` (9 AEA 1925 s.46 tiers with blood requirement), `statutoryLegacy` (£322k SI 2023/877)
- **hong-kong**: `intestacyHierarchy` (Cap. 73 mirrors AEA), `newTerritoriesCustomaryLaw` (tso/tong Cap. 97), `preReformCustomaryLaw` (pre-1971 MRO)
- **us-estate**: `intestacyDepth` (UPC compliance, parentele limit, laughing heir cutoff), `collateralHeirRules` (cousin inheritance, representation)
- **ireland**: 4 new `distributionOrder` values (nephews_nieces, grandparents, uncles_aunts, first_cousins)
- **canada**: Province enum (13 CA-XX ISO 3166-2 codes), `intestacyRules` with `distributionOrder` and `preferentialShare`, `quebecCivilLaw` (family patrimony)
- **india**: `parsiSuccessionRules` (ISA 1925 Part V), `christianSuccessionRules` (ISA compliance)
- **uae**: `homeCountryLawElection` (Decree Law 41/2022, country code + registration)

**Extension deepening**
- Scotland and US Estate extensions deepened to comprehensive coverage
- 5 foundation extensions deepened to functional coverage
- Extension test suites expanded: 7 suites from 4 tests each to 14–20 tests each

**Documentation**
- 13 `$comment` updates across 10 extensions documenting kinship type mappings, blood degree relevance, forced heir categories, parentele limits, and cross-references between extensions
- Coparcenary deprecation note on india extension pointing to hindu-succession

**Infrastructure**
- Dev site: favicon, CTA hierarchy, SDK maturity labels
- CI: auto-sync extensions registry and schemas to www repo
- CI: upgraded GitHub Actions to Node.js 24 compatible versions

### Changed

- **kinship.json**: Replaced gendered/split kinshipType enum with harmonised values (uncle_aunt replaces uncle_paternal/uncle_maternal/aunt_paternal/aunt_maternal; cousin replaces first_cousin)
- **extensions-registry.json**: Replaced `depth` with `successionCoverage` and `taxCoverage`; sorted extensions by coverage level

## [6.1.1] — 2026-04-11

## [6.1.0] — 2026-04-11

### Changed

- **catalogue.json**: Raised array limits — assets (100→10,000), valuations (100→10,000), assetCollections (100→500), organisations (100→200), spaces (50→200), assetInterests (500→5,000), dealerInterests (200→2,000), wishes (50→200), insurancePolicies (50→100), fulfilledItems (500→5,000)
- **schema.json**: Added maxItems to all previously uncapped arrays — people (500), assets (2,000), bequests (500), properties (200), organisations (500), valuations (5,000), trusts (50), liabilities (200), documents (200), wishes (100), and 21 other arrays. Existing limits (executors 20, guardians 20, extensions 30) unchanged.

## [6.0.1] — 2026-04-11

## [6.0.0] — 2026-04-06

### Added

**Catalogue & dealer marketplace** (schema v6)
- `catalogue.json` — root schema for collection cataloguing (LegacyLists mode)
- `dealer-interest.json` — dealer expressions of interest with verification results
- `asset-interest.json` — renamed `estateId` → `rootDocumentId` for catalogue compatibility
- `asset-collection.json` — renamed `estateId` → `rootDocumentId`
- `organisation.json` — dealer profile, VAT configuration, international shipping
- `asset.json` — owner intent, listings, service history, insurance cover, shipping class, included documents, 3 new condition systems
- `space.json` — portable space type
- `valuation.json` — `validUntil` date field

**Agent delegation for the agentic economy**
- `proxy-authorisation.json` — `delegateType` discriminator (person/agent/organisation), agent capabilities, authentication methods
- Tagged union pattern with conditional validation for delegate-type-specific fields

**Document versioning & audit trail** (v7 preview)
- `documentVersion`, `versionedAt`, `previousVersionId`, `changeDescription` on `schema.json` and `catalogue.json`
- `common/audit-event.json` — new reusable type with GDPR-compliant person ID references, field-level change tracking, redaction support
- `auditLog[]` on `schema.json` and `catalogue.json`
- `conformance-declaration.json` — validation disclaimer

**Reference data metadata**
- `_metadata` objects on all 10 reference data files with `lastVerified`, `source`, `jurisdiction`, `disclaimer`
- Per-entry deprecation support (`deprecated`, `supersededBy` fields)
- `common/field-provenance.json` — `dataSource` object for third-party attribution

**Governance**
- Founding Steward governance model (replacing "Benevolent Dictator")
- Published governance charter
- Ecosystem invitation wording (neutral, no specific standards bodies)

### Changed

- Neutralised protocol-specific references — `dade_credential` → `delegation_protocol`
- Integration guides moved from `docs/implement/platforms/` to `docs/integrations/`

## [5.0.0] — 2026-04-13

### Added

**Platform integration guides** (docs/integrations/)
- Wealth.com full integration guide — REST API, SFTP bulk, webhook, and Ester AI field mappings with TypeScript code examples
- Clio full integration guide — Contacts, Matters, Wills & Estates Custom Field Sets (13 sets), webhook and rate limit guidance
- Actionstep full integration guide — Actions, Participants, Data Collections, estate planning and probate workflow template mappings
- Addepar full integration guide — entity hierarchy, position/ownership mapping, attribute mapping, caching strategy for tight rate limits
- Estateably partial guide — conceptual mapping, Clio intermediary integration, court form data mapping, partnership pathway
- Settld partial guide — proposed Bereavement API data format, death verification mapping, Bereavement Standard alignment
- LegalZoom partial guide — Embedded Legal Services Flow integration concept, questionnaire field mapping, partnership pathway

**Delegation credential claims mapping** (docs/implement/delegation-credential-mapping.md)
- Maps anticipated delegation credential claims to INHERIT v4 fields
- Integration flow showing how INHERIT and delegation protocols interlock as complementary layers
- Implementer guidance for platforms, estate tools, and identity providers

### Summary

7 platform integration guides (4 full, 3 partial) and delegation credential claims mapping document. Positions INHERIT as the data layer for enterprise estate platforms and emerging delegation protocols.

## [4.0.0] — 2026-04-04

### Added

**4 new jurisdiction extensions** (total 21)
- Brazil — meação (community property split), legítima (forced heirship), inventário (judicial/extrajudicial), cartório notarial system, stable union (união estável)
- Hong Kong — Letters of Administration vs Probate Grant, MPF death benefits, cross-border PRC estates, small estate grants
- Switzerland — canton-level variation, Pflichtteil (reserved portions, 2023 reform), matrimonial property regimes, Certificate of Inheritance (Erbschein)
- Israel — Inheritance Law 1965, parallel court systems (rabbinical/Sharia/civil), kibbutz/moshav communal property, Holocaust restitution assets

**Delegation-readiness fields**
- `trustLevel` on `estate.deathVerification` — 5-tier trust framework (government_certified through self_reported)
- `subDelegation` on `proxy-authorisation.json` — delegation chain support (executor → solicitor → paralegal)
- `activationTrigger` additions — `on_inactivity` (Google IAM pattern), `on_date` (scheduled)
- `credentialRef` on `proxy-authorisation.json` — URI to external delegation credential (VC, OAuth, or other)
- Community witness roles on `attestation.json` — family_elder, community_leader, imam, rabbi, priest, notary, court_officer

**Enterprise-requested fields**
- `claimStatus` on `insurance-policy.json` — insurance claim lifecycle (active through claim_disputed)
- `beneficiaryVerificationStatus` on `insurance-policy.json` — per-beneficiary identity/entitlement verification
- Auction data on `valuation.json` — lotNumber, estimateRange, hammerPrice, buyersPremium, saleDate, saleHouse
- `provenanceChain` on `valuation.json` — prior ownership records with dates and source
- `nominationLifecycle` on `insurance-policy.json` — nomination status tracking (CPF Board pattern)
- `escheatment` on `estate.json` — unclaimed property tracking (jurisdiction, dormancy period, claiming authority)
- `partialDocument` on `schema.json` — signals intentionally incomplete document for incremental onboarding
- `mahr` on Islamic succession extension — Islamic marriage gift obligation as liability

**FHIR interoperability fields**
- `fhirPatientRef` on `estate.deathVerification` — URI to FHIR Patient resource
- `externalConsentRef` on `proxy-authorisation.json` — URI to FHIR Consent resource
- `externalPolicyRef` on `insurance-policy.json` — URI to FHIR Coverage resource
- `healthcareRecordAccess` on `proxy-authorisation.json` — medical record delegation authority
- `display` on all FK reference fields — human-readable labels alongside UUID references
- `bundleType` on `schema.json` — document, collection, or transaction bundle types

**Documentation**
- FHIR maturity mapping (docs/releases/) — INHERIT maturity levels mapped to FHIR FMM
- Field name audit — 23 new fields cross-referenced against 7 standards (schema.org, JSON-LD, FHIR R5, W3C VC, RUFADAA, RDAP, platform APIs)

### Summary

21 jurisdiction extensions, delegation/enterprise/FHIR field additions, 72 test suites passing. Schema credibility release ahead of Singapore announcement.

## [3.0.0] — 2026-04-04

### Breaking Changes

- **Schema directory restructure**: all schemas now live under `v3/` (v1 and v2 directories removed)
- **`domicile` replaces `jurisdiction`** at entity level — clearer semantics for conflict-of-laws
- **Money bounds**: monetary amount fields now enforce integer minor-unit constraints
- **Asset decomposition**: assets split into 5 category-specific sub-schemas

### Added

- 13 new entity schemas (total 31 core entities) including notification, pet, acknowledgement, organisation, space, subscription, insurance-policy, and more
- 9 new common types (total 14) including ai-provenance, field-provenance, and domicile
- 5 asset category schemas for structured category-specific validation
- 4 new jurisdiction/cultural extensions: scotland, ireland, india, uae (total 17)
- `applicationState` on root schema — client-side state tracking
- `referentialIntegrity` on root schema — cross-entity reference validation
- `@openinherit/sdk` v3.0.0 with full v3 TypeScript types
- `@openinherit/schema` v3.0.0 with v3 JSON Schema bundle

### Summary

Major schema upgrade. 13 new entities, 9 new common types, 5 asset categories, 4 new extensions. Complete v3 directory restructure with v1/v2 removed.

## [2.9.1] — 2026-04-02

## [2.9.0] — 2026-04-02

### Added

**Digital asset subtypes** (asset.json)
- `domainNameAccess` — domain name registration data (registrar, expiry, auth code location)
- `nftAccess` — NFT/digital collectible data (blockchain, contract address, token ID, metadata URI)
- `monetisedContentAccess` — revenue-generating content accounts (YouTube, Substack, Etsy)
- `loyaltyAccess` — loyalty points and gift cards (programme, balance, cash equivalent)
- `gamingAccess` — gaming and metaverse accounts (platform, virtual currency, transferability)
- `platformDelegation` — structured per-platform delegation instructions (action, delay, platform tool)
- `fiduciaryAccess` — RUFADAA-aligned fiduciary access metadata (method, scope, designated recipient)

**E-will execution and video witnessing** (attestation.json)
- Electronic will execution metadata (Florida F.S. 732.524, Nevada NRS 133.085, UEWA 2019)
- Remote Online Notarisation (RON) session tracking
- Video witnessing session metadata (recording, platform, participants, jurisdiction validity)
- Video declaration — person recording testamentary intent on video

**Document integrity and exchange** (schema.json)
- `integrity` — JWS-based tamper evidence (algorithm, hash, signature, verification method)
- `transmissions` — audit trail of document exchanges (sender, recipient, encryption, verification)
- `deathNotifications` — institution notification tracking (Tell Us Once, Settld model)
- `@context` and `@type` — JSON-LD support for linked data interoperability

**Informal compliance and registries** (document.json)
- `formalityStatus` — substantial compliance for jurisdictions admitting informal wills (AU, CA)
- `registryReference` — government registry references (Japan, France, UK, Singapore)

**Posthumous AI / digital likeness** (wish.json)
- Likeness consent, scope, permitted/prohibited uses, time limits
- Synthetic media policy
- Existing digital model inventory (chatbots, voice clones, avatars)

**Delegation enhancements** (proxy-authorisation.json)
- `delegationType` — on-behalf-of vs impersonation distinction
- `delegationConstraints` — financial limits, co-approval, excluded assets
- `activationTrigger` — conditional delegation (on death, incapacity, court order)
- `auditLog` — structured log of delegation actions

**Linked data** (person.json, organisation.json, inherit-v2.jsonld)
- `sameAs` — URI array for cross-system identity (Wikidata, LinkedIn)
- JSON-LD context additions for schema.org and W3C Security vocabulary

### Summary

153 new fields across 6 schemas. Zero new entities. Zero breaking changes.
OpenID "Unfinished Digital Estate" scorecard: 3.5/10 → 6.9/10.

## [2.8.0] — 2026-04-01

### Added

- `probateReadiness` array on `estate.json` — machine-generated completeness assessment against jurisdiction-specific probate form requirements (jurisdiction, targetForm, requiredFieldsPresent/Total, missingFields, assessedAt, assessedBy)
- `externalReferences` array on `estate.json` — references to this estate in external systems (PMS, court filings, government portals) for round-trip synchronisation (system, referenceId, referenceType, referenceUrl, syncedAt)
- `sourceDocumentId`, `sourcePageNumber`, `sourceRegion`, `originalText`, `originalScript` (15-value enum), `ocrEngine` fields on `common/field-provenance.json` — extraction provenance for OCR/AI tools (WillScan, etc.)
- Singapore (SG) form mappings in `reference-data/form-requirements.json` — Originating Summons for Probate, OS Admin, Schedule of Assets and Liabilities
- Canada Ontario (CA-ON) form mappings — Form 74A (2025 consolidation), Form 74.1A (small estate), Estate Information Return, T1 Final Return
- Canada Quebec (CA-QC) form mappings — Verification of Will, Register of Testamentary Dispositions search, Inventory of Succession Property, T1 Final Return, TP-1 Provincial Return
- Australia NSW (AU-NSW) form mappings — Form 107 (Inventory), Form 109 (Summons for Probate), Form 110 (Summons for Administration), Form 111 (Affidavit of Executor), ATO Final Return
- India Maharashtra (IN-MH) form mappings — Petition for Probate (s.276), Petition for Letters of Administration (s.278), Petition for Succession Certificate (s.372). Includes religion-based succession law routing notes and Dec 2025 repeal of mandatory probate (s.213).
- `reference-data/pms-role-mappings.json` — maps 13 INHERIT person roles to role taxonomies in 5 Practice Management Software systems (Clio, Actionstep, LEAP, MyCase, PracticePanther)

## [2.7.0] — 2026-03-31

### Added

- `liveCheck` object on `organisation.json` `registrations[]` items — live API check results from Companies House (company status, SIC codes, insolvency flag), FCA (authorisation status, permissions), and Charity Commission/OSCR (charity status, income, reporting status). Supports agent filtering, user decision-making, and risk detection
- `epc` object on `property.json` — Energy Performance Certificate data (rating, score, expiry, floor area, heating type). Maps to `schema:EnergyConsumptionDetails` in JSON-LD
- `landRegistry` object on `property.json` — HM Land Registry data (title number, title class, last sale price, tenure, registered owners, charges). Maps to `schema:PropertyValue` in JSON-LD
- `floodRisk` object on `property.json` — Environment Agency flood risk data (river/sea risk, surface water risk, flood zone, historical flooding)
- `leasehold` object on `property.json` — leasehold-specific data (lease term, years remaining, ground rent, service charge, freeholder, management company)
- `vehicle` sub-object on `asset.json` — structured vehicle identity and estate administration tracking (registration, VIN, make, model, fuel type, vehicle type, classic flag, keeper/V5C status, finance type, SORN, death actions with DVLA/insurer/finance notification tracking). Maps to `schema:Vehicle` in JSON-LD
- `vehicleCheck` object on `asset.json` — live DVLA VES, DVSA MOT history, and HPI check results (MOT status/expiry, mileage, tax status, insurance status, finance outstanding, write-off category, stolen status, keeper count, mileage anomaly)
- `stolenArtCheck` object on `asset.json` — Art Loss Register check result (clear/flagged/inconclusive, certificate reference)
- `gemologicalCertificate` object on `asset.json` — GIA/AGS/other lab certificate data (stone type, carat weight, colour/clarity/cut grades, verification URL)
- `cancellationInfo` object on `subscription.json` — cancellation difficulty, URL, phone, notice period, death certificate requirement, refund availability
- `depositorProtection` object on `insurance-policy.json` — FSCS/MIB protection status, protection limit, claim process URL
- `studentLoanInfo` object on `liability.json` — student loan plan type, write-off-on-death confirmation, outstanding balance, repayment threshold

## [2.6.1] — 2026-03-31

### Added

- `ratings` array on `organisation.json` — aggregate review platform data (Trustpilot, Google, Feefo, Reviews.io, Funeral Guide, Checkatrade, extensible). Supports user decision-making, agent filtering/ranking, and point-in-time audit trails. Maps to `schema:AggregateRating` in JSON-LD

## [2.6.0] — 2026-03-30

### Added

- **Universal Interest Model** — `asset-interest.json` transformed from beneficiary preferences into a universal expression of interest
  - `expressedByRole` field qualifying who is expressing interest (testator, beneficiary, executor, proxy, extensible)
  - `intentType` field expressing the nature of interest (acquire, receive, allocate, sell, admire, extensible)
  - `productMatch` object for product-level matching (identifier, brand, category, condition)
  - `quantity` field for wishlist quantities
  - `expressedAt` timestamp for when interest was recorded
- `assetInterests[]` and `wishes[]` arrays on `catalogue.json` — wishlists and personal letters alongside assets
- `registrations[]` array on `document.json` — will registration tracking (National Will Register, Register of Deeds, etc.)
- `invoice` and `receipt` document types on `document.json`
- **`v2/reference-data/identifier-systems.json`** — 15 standardised product identifier systems for cross-system matching
- Reference data migrated to `v2/reference-data/` (34 files) — v2 becomes self-contained
- **JSON-LD completeness** — coverage from 36% to 100% (28/28 root-level entities mapped)
  - 19 new entity mappings: assetInterests, bequests (updated), lifetimeTransfers, nonprobateTransfers, proxyAuthorisations, importSources, trusts, relationships, kinships, pets, insurancePolicies, wishes, notifications, acknowledgements, subscriptions, dealerInterests, events, assetCollections, guardians
  - 2 new namespaces: FIBO Trusts (`fibo-trust:`), REL Vocabulary (`rel:`)
  - Three-tier mapping strategy: direct Schema.org, Schema.org + external ontology, INHERIT-owned vocabulary
- **Estate vocabulary specification** (`v2/vocab/estate/spec.md`) — human-readable spec for all 10 custom vocabulary keywords
- **Extension composition guide** (`docs/extension-composition.md`) — 7 validated multi-extension combinations with worked examples
- **`$dynamicRef` documentation** (`docs/dynamic-extension-points.md`) — advanced extension point mechanism (planned for v3.0)
- **Contributor guide** (`docs/json-schema-patterns.md`) — JSON Schema 2020-12 patterns for INHERIT contributors

### Changed

- Updated `asset-interest.json` entity description to reflect universal interest model
- Updated `personId` description — no longer restricted to beneficiary role
- Updated `interestLevel` `$comment` with role-specific guidance for testator directive weight
- Updated `bequests` JSON-LD mapping from `inherit:Bequest` to `schema:AllocateAction`

### Quality

- Audited all 48 v2 schemas for `unevaluatedProperties` placement — all correct (parent level, never inside `allOf` siblings)
- Audited all conditional validation blocks for `if`/`then`/`else` `required` guards — all correct

## [2.5.0] — 2026-03-30

### Added

- **`reference-data/insurance-death-benefit-rules.json`** — reference data for death benefit rules by type and jurisdiction (UK, US, Singapore, UAE)
- **`reference-data/charity-mergers.json`** — charity merger tracker for identifying successor organisations
- **`reference-data/subscription-cancellation-guide.json`** — cancellation guide for top 30 UK subscription services
- Cloud storage inventory: `cloudStorage` object on `asset.json` (provider, storage used, important folders, family photo access)
- Annuity continuation: `annuityContinuation` on `asset.json` pension sub-object (annuity amount, continuation on death, beneficiary)
- Insurance vs dealer value comparison: `valuationComparison` on `asset-collection.json`
- Accessibility needs: `accessibilityNeeds` on `person.json` (preferred format, screen reader, communication preference)
- `splitFrom` verification — confirmed present from v2.1.0
- Estate administration deadline: `administrationDeadline` and `administrationDeadlineSource` on `estate.json`

## [2.4.0] — 2026-03-30

### Added

- **`subscription.json`** — new entity for recurring subscriptions (streaming, utilities, memberships) with cancel/transfer actions
- **`common/field-provenance.json`** — new common type for per-field provenance tracking (method, confidence, verification)
- **`reference-data/funeral-providers.json`** — Phase 1 UK funeral provider registry
- `subscriptions[]` array on `schema.json`
- Gift Aid registration fields on `bequest.json`: `giftAidRegistrationNumber`, `giftAidVerificationUrl`, `giftAidVerifiedAt`
- `fieldProvenance` array on `asset.json`, `property.json`, `person.json`, `valuation.json`
- `agentTaskId` on all entity schemas — links entities to agent orchestration tasks
- `comments[]` array on `asset.json`, `bequest.json`, `property.json`, `person.json`
- `disposalHistory[]` on `asset-collection.json` — collection breakup tracking
- `auctionData` object on `valuation.json` — auction house estimates, lot numbers, hammer prices
- `deathCertificateDate` and `deathCertificateReference` on `estate.json`
- `mergedInto` object on `asset.json` and `asset-collection.json` — merge history tracking
- `metadata` object on `event.json` — type-specific event metadata (probate granted, asset valued, distribution made)
- `rentalIncome` object on `property.json` — monthly amount, tenant, lease end, managing agent

## [2.3.0] — 2026-03-30

### Added

- **`notification.json`** — new entity for notification history (beneficiary, executor, probate, document request notifications with channel, status, template tracking)
- **`pet.json`** — new entity for pet care arrangements (species, health, caregivers, vet, insurance, funding, transport)
- **`acknowledgement.json`** — new entity for user consent/acknowledgement (executor appointments, guardian appointments, bequests)
- `notifications[]`, `pets[]`, `acknowledgements[]` arrays on `schema.json`
- Legacy pledge tracking on `bequest.json`: `legacyPledge` object (pledgedDate, pledgeAmount, pledgeDocumentId, pledgeStatus)
- Generalised agent feedback loop: `humanVerdict`, `rejectionReason`, `verdictAt` on all entity schemas
- Funeral plan insurance: `funeralPlanDetails` on `insurance-policy.json` (covered provider, transferable, advance payments)
- Pension valuation at death: `pensionValuationAtDeath` on `asset.json` pension sub-object
- Post-death immediate care on `wish.json`: `organDonation`, `medicalResearchDonation`, `autopsyPreference`
- Social media inventory: `socialMedia` object on `asset.json` (platform, username, followers, monetised, post-death action)
- Cryptocurrency wallet tracking: `cryptoAccess` object on `asset.json` (blockchain, wallet type, key/seed locations, exchange, cost basis)
- Funeral budget notes: `funeralBudgetNotes` on `wish.json`

## [2.2.0] — 2026-03-30

### Added

- **`common/ai-provenance.json`** — new common type for AI provenance metadata (model family, confidence, human review). Added as optional `aiProvenance` on all 25 entity schemas
- **`insurance-policy.json`** — new first-class entity for insurance policies (life, home, health, motor, travel, pet, professional indemnity) with death benefit, trust, claim, and condition tracking
- `insurancePolicies[]` array on `schema.json` (maxItems: 100) and `catalogue.json` (maxItems: 50)
- Charity bequest conditions on `bequest.json`: `charityPurposeRestriction`, `charityNonMergingClause`, `charityReportingRequired`, `charityGiftAidEligible`, `charityRegistrationVerifiedAt`
- Funeral planning structure on `wish.json`: `funeralArrangementType` (extensible enum), `funeralCeremonyType`, `funeralCeremonyReligion`, `funeralProviderOrganisationId`, `funeralPrePaid`, `funeralPrePaidPolicyNumber`, `funeralBudgetMaximum`, `funeralBudgetSource`, `funeralLocationPreference`, `funeralMusicWishes`, `funeralReadingWishes`
- Person to Organisation field consistency: `organisationId` on `executor.json`, `guardian.json`, `trust.json` (TrustAppointee), `dealer-interest.json` (InterestedParty), `asset-interest.json`, `lifetime-transfer.json` (doneeOrganisationIds) with mutual exclusivity where appropriate
- Dealer offer tracking: `offerTerms`, `inspectionRequired`, `inspectionDate` on `dealer-interest.json` OfferDetails
- Digital account access: `digitalAccess` object on `asset.json` with username, password storage, 2FA, recovery methods, platform death policy, legacy contact
- Charitable tax relief on `common/tax-position.json`: `charitableReliefApplicable`, `charitableReliefPercentage`, `charitableReliefBasis`, `charitableReliefJurisdiction`, `charitableGiftsTotal`, `charitableGiftsAsPercentage`
- Pension death benefit nominations on `asset.json` pension sub-object: `pensionType` (extensible enum), `pensionProviderOrganisationId`, `pensionMemberNumber`, `deathBenefitNomination` (structured nomination with nominee, dates, benefit type), `drawdownStartDate`

## [2.1.0] — 2026-03-30

### Added

- **`organisation.json`** — new first-class entity for organisations that interact with estates (21 types, Schema.org Organization mapping, Wikidata identifiers, conditional registration validation)
- **`space.json`** — new first-class entity for spaces within properties (~80 locale-aware space types in 4 tiers, Schema.org Place mapping)
- **`well-known-organisations.json`** — Phase 1 reference data (UK + Ireland, ~26 regulatory and institutional bodies with registration formats and verification URLs)
- **`space-types.json`** — reference data for ~100 space types with tier, locale, category, and urgency metadata
- `organisations[]` and `spaces[]` arrays on `schema.json` and `catalogue.json`
- `assetCollectionId` on `asset.json` — link assets to their parent collection
- `spaceId` on `asset.json` — link assets to their location within a property
- `splitFrom` on `asset.json` and `asset-collection.json` — provenance tracking for split operations
- `assetCollectionId` on `bequest.json` — bequeath entire collections (mutually exclusive with `assetIds`)
- `mirrorWillId` on `estate.json` — explicit mirror will tracking for companion estates
- JSON-LD context mappings for organisations (schema:Organization) and spaces (schema:Place)
- Level 2 conformance checks for all new UUID references (`assetCollectionId`, `spaceId`, `mirrorWillId`, `splitFrom.entityId`, space `propertyId`)

### Deprecated

- `reference-data/regulatory-bodies.json` — replaced by `well-known-organisations.json`
- `reference-data/body-activity-map.json` — activities merged into `well-known-organisations.json`

## [2.0.1] — 2026-03-30

### Fixed

- `@openinherit/schema` npm package now includes v2/ schemas (was missing from 2.0.0)
- `@openinherit/sdk` npm package now includes v2 TypeScript types via `@openinherit/sdk/v2`
- Sync `packages/schema/v1/` with latest v1 schemas (duplicate key fix)

### Added

- `generate:v2` npm script for v2 TypeScript type generation
- v2 SDK types generated from v2 OpenAPI spec (9,474 lines)

## [2.0.0] — 2026-03-30

### Breaking Changes

- **Cultural type extraction**: Remove `nikah_nama`, `ketubah_document`, `shtar_chov`, `waqfiyyah` from `document.type` enum; remove `waqf` from `trust.trustType`; remove `halachic_yerusha` from `bequest.distributionMethod`. Use `x-inherit-` prefixed values via extension schemas.
- **Enum discipline**: All extensible type fields now use `anyOf [core enum, x-inherit- string]` pattern. Remove `extensionType` field from `bequest.json`. Remove `extensionWillType` from `estate.json`. Promote core event types into `event.eventType` enum.
- **Date suffix convention**: 18 field renames/format changes — 5 bare `date` fields renamed to `*Date`, 9 `*At` fields promoted from `date` to `date-time`, 2 `createdDate` → `createdAt` (date-time), 1 `reviewedAt` → `reviewedDate`, 1 `timestamp` → `occurredAt`. See migration guide.
- **Custom vocabulary**: New INHERIT estate vocabulary with 10 schema-level annotation keywords (`jurisdiction`, `successionRegime`, `maturity`, `extensionType`, `applicableJurisdictions`, `inheritVersion`, `legalSystems`, `dataProvenance`, `maintainers`, `compatibleWith`).

### Added

- INHERIT estate vocabulary specification (`v2/vocab/estate/spec.md`)
- INHERIT estate vocabulary meta-schema (`v2/vocab/estate/meta.json`)
- Hyperjump vocabulary implementation (`src/vocab-estate.mjs`)
- v2 dialect meta-schema extending JSON Schema 2020-12 (`v2/dialect.json`)
- v1 → v2 migration guide (`docs/migration/v1-to-v2.md`)
- v2 test suite (copied from v1 and updated for all breaking changes)

## [1.9.0] — 2026-03-29

## [1.8.0] — 2026-03-29

## [1.7.1] — 2026-03-29

## [1.7.0] — 2026-03-29

## [1.6.0] — 2026-03-29

### Added (Schema Hardening — Constraints, Annotations, Hybrid Content)
- `maxLength` on ~478 string fields across all 48 schemas (255 names, 2000 notes, 2048 URIs, 5000 content, 500 references, 100 codes)
- `maxItems` on ~100 array fields with domain-appropriate limits (20–100)
- `uniqueItems: true` on ~30 ID/identifier arrays (prevents duplicate UUIDs)
- `pattern` backup on all 261 `format` fields — schemas now self-enforce uuid, date, date-time, email, and uri validation regardless of validator config
- `readOnly: true` on 12 system-generated fields (timestamps, computed scores, generator metadata)
- `writeOnly: true` on 3 PII fields (identifier.value, contact.email, contact.phone)
- `dependentRequired` on executor (grantReference → grantDate + issuingCourt), document (entityId ↔ entityType), estate (companionEstateId → companionLinkStatus), valuation comparable (rejectionReason → humanVerdict)
- `propertyNames` constraint on all 38 schemas with extension blocks — enforces camelCase naming convention
- `default` values for `completeness.score` (0) and `estate.status` ("planning")
- Optional `content` field on `document.json` — base64-encoded embedded file content with `contentEncoding` and `contentMediaType`
- Optional `content` field on `common/media.json` — base64-encoded embedded media for self-contained documents
- `$comment` on `dialect.json` documenting `deprecated`, `readOnly`, and `writeOnly` annotation availability
- 8 new test cases for `dependentRequired` validation (executor, document, estate, valuation)
- 3 new test cases for hybrid embedded content (document + media)
- JSON Schema 2020-12 keyword coverage: 36/50 → 45/50

### Added (AI-Native + #34)
- JSON-LD context file (`v1/context/inherit-v1.jsonld`) — Schema.org, FIBO, Wikidata, GS1 linked data
- `@context` optional property on root schema — enables JSON-LD processing
- `legacyContacts` array on root schema (#34) — digital inheritance for living collectors
- `v1/catalogue.json` — catalogue-only root schema for living collectors (#34)
- Agent decomposition: `searchTerms`, `comparableSearchProfile`, `suggestedSubcategory` on assets
- Per-field `confidenceScores` on assets and people — AI extraction confidence 0-100
- `valuationReliability` on assets — numeric trustworthiness companion to categorical enum
- `lastVerifiedAt` and `verifiedBy` on assets — verification tracking
- `matchScore` on valuation comparables — numeric 0-100 companion to matchConfidence enum
- `humanVerdict` and `rejectionReason` on valuation comparables — agent feedback loop
- `reference-data/enum-descriptions.json` — structured enum descriptions with agent hints
- `reference-data/agent-task-definitions.json` — multi-agent task protocol
- `reference-data/agent-output-schema.json` — standardised agent output format
- `docs/cultural-sensitivity.md` — cultural sensitivity statement
- `examples/fixtures/catalogue-only.json` — Bill Frith model railway catalogue fixture

### Added (Steps 1-3: Product Taxonomy & Category Infrastructure)
- INHERIT Product Taxonomy — 16 top-level categories replacing 33 ad-hoc values (step 1)
- `subcategory` field on asset.json — freeform finer classification within top-level category (step 1)
- `reference-data/category-guidance.json` — per-category subcategories, recommended identifiers, viewTypes, brands, urgency, disposal complexity (step 3)
- `docs/identifier-systems.md` — per-domain identifier guidance for 12+ item categories (step 2)
- `docs/photography-guide.md` — per-category viewType recommendations and photography tips (step 2)
- `docs/category-migration.md` — migration mapping from 33 old categories to 16 new (step 1)
- `THIRD-PARTY-NOTICES` — MIT licence attribution for Standard Product Taxonomy (step 1)
- `docs/legal/taxonomy-provenance.md` updated — reframed as INHERIT Product Taxonomy with snapshot-and-diverge approach (step 1)

### Added (Steps 15-20: Intelligence Layer)
- `common/completeness.json` — reusable completeness scoring with jurisdiction-aware checklist (step 15)
- `common/tax-position.json` — tax position summary with mandatory disclaimer (step 16)
- `completeness` property on root schema — estate completeness score (step 15)
- `taxPosition` property on root schema — estimated tax position (step 16)
- `recommendedActions` array on root schema — data-driven next actions (step 17)
- `conformance` object on root schema — machine-readable validation certificate (step 18)
- `preferredChannel` on person contact — email, phone, post, in_person, video_call, messaging (step 19)
- `hotchpotTransferIds` on bequest — links bequests to lifetime transfers for advancement accounting (step 19)
- `reference-data/completeness-rules.json` — jurisdiction-aware completeness checklist rules (step 15)
- `reference-data/action-rules.json` — declarative rules for generating recommended actions (step 17)
- `reference-data/validation-rules.json` — declarative Level 2+ cross-reference validation rules (step 20)
- `docs/narrative-template.md` — template for generating human-readable estate summaries with worked example (step 20)

### Added (Steps 3.5-14: Foundation + Territory Neutrality)
- `valuation.json` — new entity for multiple valuations per asset/property/collection with comparables array (step 5)
- `lifetime-transfer.json` — new entity for gift/transfer tax calculations across 10 jurisdictions (step 6)
- 8 intangible asset sub-objects on `asset.json`: shareholding, businessInterest, pension, insurancePolicy, coOwnership, intellectualProperty, stockCompensation, debtReceivable (step 5.5)
- `urgency` and `urgencyReason` fields on `asset.json` — executor priority (step 8)
- `containedInAssetId` on `asset.json` — hierarchical asset nesting (#26)
- `insurance` object on `asset.json` — coverage details (#19)
- `purchasedFrom` on `asset.json` — provenance tracking (#34)
- `dataProvenance` and `importSources` on root schema — data origin tracking (step 4)
- Per-entity `dataProvenance` and `importSourceId` overrides on `asset.json` (step 4)
- `disposalStrategy`, `minimumAcceptableValue`, `preferredDisposalMethod`, `specialistDealerNotes` on `asset-collection.json` (step 7)
- `executionDate` on `estate.json` — will execution date (step 9)
- `administration` object on `estate.json` — full administration tracking with distributions, tax clearance (step 14)
- `valuations` and `lifetimeTransfers` arrays on root schema
- `localPropertyTypes`, `localTenureTypes`, `localGrantTypes` arrays on UK extension (step 11)
- `succession_certificate`, `certificate_of_inheritance`, `court_appointment` grant types on executor (step 12)
- 7 companion reference datasets: tax-thresholds, tax-rates, gift-exemptions, relief-rules, pension-types, form-requirements, local-term-mappings (step 3.5 + 13)

### Changed
- Estate `status` enum: `draft`/`active`/`locked`/`archived` replaced with `planning`/`confirmed`/`pre_probate`/`in_administration`/`distributed`/`closed` (step 14)
- `propertyType` slimmed from 15 UK-specific values to 10 territory-neutral universals (step 10)
- `tenureType` slimmed from 8 UK-specific values to 6 territory-neutral universals (step 10)
- `valuationConfidence` renamed `probate` to `official` (step 10)
- `solicitor_firm` renamed to `legal_practice` in dealer-interest (step 12)
- Renamed `islamic` extension to `islamic-succession` — references legal tradition, not personal religious belief
- Renamed `jewish` extension to `jewish-succession` — references legal tradition, not personal religious belief
- Renamed `india-hindu` extension to `hindu-succession` — references the Hindu Succession Act, not personal religious belief
- Each renamed extension now carries a `$comment` explaining the naming rationale
- Added `docs/legal/taxonomy-provenance.md` documenting taxonomy sources and licence decisions

## [1.1.0] — 2026-03-27

### Added
- `common/media.json` — new common type for media attachments (photographs, videos, document scans) with `viewType` enum for structured visual documentation
- `images` property on `asset.json` — replaces `photos`, now references `common/media.json` with full media support
- `images` property on `property.json` — photographs and videos of properties
- `images` property on `asset-collection.json` — overview media for collections
- `images` property on `document.json` — scans and photographs of physical documents
- `description` field on `asset.json` — structured description distinct from free-form notes
- `purchaseDate` field on `asset.json` — acquisition date for CGT, insurance, and provenance
- `originalPackaging` field on `asset.json` — packaging completeness enum (affects value 20-40%)
- `custodian` object on `asset.json` — third-party holder details (bank, storage, repairer, gallery)
- `conditionSystem` and `conditionGrade` fields on `asset.json` — domain-specific grading (Goldmine, Sheldon, GIA, etc.)
- `entityType` and `entityId` fields on `document.json` — contextual linking of documents to their subject entities

### Removed
- `$defs.Photo` from `asset.json` — replaced by `common/media.json`
- `photos` property from `asset.json` — replaced by `images`

- Companion estate design document (`docs/companion-estates.md`) — vocabulary, lifecycle, sync rules, decoupling semantics, malicious deletion protection (#10)
- `companionLinkStatus`, `linkedAt`, `decoupledAt` fields on `estate.json` — companion link lifecycle tracking (#10)
- `ownershipCategory` field on `asset.json` — joint/sole/partner-interest classification for companion estates (#10)
- `sharedWithCompanion` field on `person.json` — marks people shared between companion estates (#10)
- Canonical field ordering convention (`docs/canonical-ordering.md`) — advisory ordering for entities, root document, and entity arrays (#17)
- Asset location classes reference (`docs/asset-location-classes.md`) — maps asset categories to physical/financial/digital/intangible with `propertyId` guidance (#11)
- Enum reference (`docs/enum-reference.md`) — complete catalogue of every enum field across all v1 schemas (#4)
- Person roles reference (`docs/person-roles.md`) — all 10 roles with descriptions, related entities, and examples (#3)
- Error guide expansion — 5 new error scenarios: wrong date format, missing entity arrays, invalid UUID, decimal monetary amounts, unknown enum values (#5)
- Developer examples in `examples/` — 4 TypeScript examples (create-estate, validate-document, import-export, extract-entities) and 1 Python example (validate)
- 9 global example fixtures covering 7 jurisdictions (GB-ENG, GB-SCT, US-NY, SG, JP, IN-MH, AE) plus an intentionally invalid fixture for testing
- AI integration guide (`docs/ai-guide.md`) with extraction prompts, tool schemas, and guardrails
- Agent configuration files for Claude Code, OpenAI Codex, GitHub Copilot, and Cursor
- Error guide (`docs/error-guide.md`) — validation errors explained with fixes
- Migration guide (`docs/migration-guide.md`) — migrating from databases, spreadsheets, and other formats
- `ROADMAP.md` — v1.0 through v2.0 roadmap
- Swagger UI API explorer at `swagger/index.html` (served via GitHub Pages)
- README overhaul: npm badges, "What Next?" navigation, conformance testing guide, data handling statement, contributors section, learning resources
- TypeScript code blocks added to the primer alongside existing JSON examples
- 5 good-first-issue GitHub issues for community contributors
- Self-hosted scanner guide (`docs/self-hosted-scanner.md`) — run extraction on your own infrastructure
- `formattedAddress` field on `common/address.json` — preserves original address text alongside structured fields (#19)
- `schemaVersion` field on root schema — enables version detection and graceful degradation (#16)
- Versioning and compatibility policy (`docs/versioning.md`) — maturity levels, breaking change definitions, forward/backward compatibility guidance (#16)
- Concrete partnership expectations in `docs/partners/becoming-a-partner.md` — time commitment, exclusivity, marketing, consulting support
- Legal review status section in `docs/extension-guide.md` — Reviewed / Legislation-based / Community tiers
- Legal tech integration guide (`docs/legal-tech-integration.md`) — field mappings for Clio, LEAP, Actionstep, PracticePanther
- Concrete partnership expectations in `docs/partners/becoming-a-partner.md` — time commitment, exclusivity, marketing, consulting support
- Legal review status section in `docs/extension-guide.md` — Reviewed / Legislation-based / Community tiers
- Legal tech integration guide (`docs/legal-tech-integration.md`) — field mappings for Clio, LEAP, Actionstep, PracticePanther

## [1.0.0] — 2026-03-26

### Added
- 18 core entity schemas
- 5 common type schemas
- 13 jurisdiction/cultural extension schemas
- Extension manifests and registry
- OpenAPI 3.1 schema bundle with validate endpoint
- Language-agnostic test suite (33 test cases)
- SDK generation pipeline (TypeScript + API client)
- Governance, contributing, and security documentation
- Developer documentation (primer, maturity model, conformance levels, extension guide)
- Partner onboarding documentation
- Reference REST API spec (`reference-api.yaml`) — 109 endpoints covering CRUD, import/export, couples, validation
- Reference data (regulatory bodies, practitioner activities, data protection rules)
- CI pipelines (schema validation, OpenAPI lint, test suite, type generation)
- Issue and PR templates
- RFC-style proposal template
