# Enum Reference

A complete catalogue of every enum field across all INHERIT v3 schemas. Extracted directly from the JSON Schema source files.

---

## Common Schemas

### common/address.json

#### `addressOrder`
Controls the display order of address components for different cultural conventions.

| Value | Description |
|-------|-------------|
| `western` | Street, city, region, postcode, country (UK/US/EU standard) |
| `japanese` | Country, prefecture, city, ward, street, building (largest to smallest) |
| `indian` | Locality-first ordering common in Indian addresses |
| `arabic` | Arabic address conventions |
| `custom` | Non-standard ordering — use `formattedAddress` for display |

### common/jurisdiction.json

#### `legalSystems` (items)
The legal traditions governing succession in this jurisdiction. An array to support jurisdictions where multiple legal systems operate simultaneously.

| Value | Description |
|-------|-------------|
| `common_law` | English-derived common law (UK, US, AU, NZ, SG, etc.) |
| `civil_law` | Codified civil law (France, Germany, Japan, etc.) |
| `mixed` | Hybrid of common law and civil law (Scotland, South Africa, Quebec) |
| `customary_law` | African customary or indigenous law systems |
| `islamic_law` | Islamic Shariah law governing succession |
| `hindu_law` | Hindu succession law |
| `jewish_law` | Halachic (Jewish) law governing succession |
| `canon_law` | Canon (Catholic Church) law |


### common/temporal-rule.json

#### `status`
Legislative status of a temporal rule (law reform tracking).

| Value | Description |
|-------|-------------|
| `enacted` | Law is in force |
| `royal_assent` | Passed legislature, awaiting commencement |
| `bill_stage` | Bill is before parliament/legislature |
| `consultation` | Government consultation in progress |
| `announced` | Policy announced but no bill yet |

### common/visibility.json

#### (root enum — not a named field)
Controls which parties can see an entity.

| Value | Description |
|-------|-------------|
| `testator_only` | Only the testator can see this record |
| `proxy_visible` | Testator and their authorised proxies |
| `companion_visible` | Testator, proxies, and companions (e.g. spouse) |
| `executor_visible` | Visible to named executors as well |
| `beneficiary_visible` | Visible to named beneficiaries |
| `all_parties` | No restriction — visible to all parties with estate access |

### common/cultural-disposition.json

Captures cultural and religious significance, disposal restrictions, and export controls for assets and properties.

#### `sacredStatus`
Whether the item has religious or ritual significance.

| Value | Description |
|-------|-------------|
| `secular` | No religious or ritual significance |
| `consecrated` | Formally consecrated by a religious authority |
| `ritually_significant` | Significant in ritual practice but not formally consecrated |
| `inalienable_endowment` | Endowed as an inalienable religious asset (e.g. waqf property) |

#### `culturalSignificance`
The cultural importance of the item.

| Value | Description |
|-------|-------------|
| `personal` | Personal significance only |
| `family_heirloom` | Family heirloom passed through generations |
| `community` | Significant to a community or congregation |
| `national_heritage` | National heritage or cultural treasure |

#### `disposalRestrictions[].authorityType`
The type of authority that must approve disposal of the item.

| Value | Description |
|-------|-------------|
| `religious_body` | Religious organisation or court |
| `family_council` | Extended family decision-making body |
| `clan_association` | Clan or lineage association |
| `tribal_council` | Tribal council or indigenous authority |
| `government` | Government authority or heritage department |
| `heritage_authority` | Specialist heritage or antiquities authority |

#### `exportRestrictions[].restrictionType`
The type of export restriction applying to the item.

| Value | Description |
|-------|-------------|
| `cultural_property` | Protected cultural property under national law |
| `national_treasure` | Designated national treasure — export prohibited or restricted |
| `antiquity` | Antiquity subject to export controls |
| `protected_species` | Item made from protected species (ivory, tortoiseshell, etc.) |
| `controlled_goods` | Controlled goods requiring export licence |

---

## Person (person.json)

#### `gender`
Optional. Needed for gender-dependent inheritance (Islamic faraid, Hindu succession pre-2005).

| Value | Description |
|-------|-------------|
| `male` | Male |
| `female` | Female |
| `non_binary` | Non-binary |
| `other` | Other gender identity |
| `prefer_not_to_say` | Person declined to specify |
| `unknown` | Gender not recorded |

#### `roles` (items)
Core roles defining the person's function in the estate.

| Value | Description |
|-------|-------------|
| `testator` | The person whose estate this is |
| `beneficiary` | Someone who receives something from the estate |
| `executor` | Appointed to administer the estate after death |
| `guardian` | Appointed to care for minor children |
| `trustee` | Manages assets held in trust |
| `witness` | Witnessed the signing of the will |
| `attorney` | Holds power of attorney for the testator |
| `proxy` | Authorised to act on behalf of the testator (broader than attorney) |
| `protector` | Oversees trustees in a trust arrangement |
| `enforcer` | Enforces the terms of a purpose trust or waqf |

#### `titles[].type`
Type of title or honorific.

| Value | Description |
|-------|-------------|
| `chieftaincy` | Nigerian/West African chieftaincy title |
| `traditional` | Traditional cultural title |
| `religious` | Religious title (Rabbi, Imam, Reverend, etc.) |
| `professional` | Professional qualification (Dr, Prof, etc.) |
| `honorific` | Social honorific (Sir, Dame, etc.) |
| `clan` | Clan or caste identifier |
| `academic` | Academic degree (PhD, MSc, etc.) |
| `military` | Military rank |
| `other` | Other title type |

#### `legalPersonalities[].system`
The legal system under which this personality operates.

| Value | Description |
|-------|-------------|
| `statutory` | Formal statutory law |
| `customary` | Customary/traditional law |
| `religious` | Religious legal system |
| `traditional` | Traditional authority system |

#### `taxResidency[].fatcaStatus`
FATCA (Foreign Account Tax Compliance Act) classification.

| Value | Description |
|-------|-------------|
| `us_person` | US citizen or resident — worldwide reporting obligations |
| `non_us_person` | Not a US person for FATCA purposes |
| `exempt` | Exempt from FATCA reporting |
| `unknown` | FATCA status not determined |

---

## Estate (estate.json)

#### `status`
Current state of the estate plan.

| Value | Description |
|-------|-------------|
| `planning` | Estate planning in progress |
| `confirmed` | Estate plan confirmed and finalised |
| `pre_probate` | Testator deceased, pre-probate preparation |
| `in_administration` | Estate is being administered |
| `distributed` | Estate assets distributed |
| `closed` | Estate administration closed |

#### `willType`
The form of testamentary instrument.

| Value | Description |
|-------|-------------|
| `secular` | Standard secular will |
| `religious` | Will made under religious law |
| `dual` | Parallel secular and religious wills |
| `composite` | Single will addressing both secular and religious obligations |
| `oral_witnessed` | Oral will with witnesses (valid in some jurisdictions) |
| `oral_customary` | Oral will under customary law |
| `holographic` | Handwritten will (no witnesses required in some jurisdictions) |
| `notarised` | Will executed before a notary (civil law jurisdictions) |
| `privileged_will` | Military/mariner's will with relaxed formality requirements |

#### `primaryInstrument`
The primary vehicle for estate distribution.

| Value | Description |
|-------|-------------|
| `will` | Distribution governed by a will |
| `revocable_trust` | Distribution governed by a revocable trust |
| `both` | Both will and trust operate together |
| `intestacy` | No will — distribution by intestacy rules |

#### `defaultPropertyRegime`
The default matrimonial property regime affecting asset classification.

| Value | Description |
|-------|-------------|
| `community_property` | All property acquired during marriage is jointly owned |
| `separate_property` | Each spouse retains ownership of their own property |
| `equitable_distribution` | Court divides property equitably (not necessarily equally) |
| `deferred_community` | Separate during marriage, community on dissolution |
| `universal_community` | All property (including pre-marriage) is jointly owned |
| `participation_in_acquisitions` | Separate ownership with equalisation claim on dissolution |
| `islamic_dower` | Islamic mahr-based property regime |

#### `forcedHeirship.claimNature`
How the forced heir's entitlement is expressed.

| Value | Description |
|-------|-------------|
| `property_share` | Heir receives a share of the physical estate |
| `cash_claim` | Heir has a monetary claim against the estate |
| `usufruct` | Heir receives use/income rights (not ownership) |
| `court_discretion` | Court determines the nature of the provision |

#### `forcedHeirship.calculationBasis`
How the reserved portion is calculated.

| Value | Description |
|-------|-------------|
| `fixed` | Fixed percentage regardless of family size |
| `per_child_sliding` | Percentage varies with number of children |
| `court_discretion` | Court determines the amount |
| `conditional` | Depends on other conditions (e.g. financial need) |

#### `forcedHeirship.applicableTo`
Which heirs the forced heirship rules apply to.

| Value | Description |
|-------|-------------|
| `children_only` | Only children of the testator |
| `children_and_spouse` | Children and surviving spouse |
| `all_descendants` | All descendants (children, grandchildren, etc.) |
| `all_heirs` | All legal heirs including ascendants and collaterals |

#### `adjudicatingBodies[].type`
Type of court or body with jurisdiction over succession disputes.

| Value | Description |
|-------|-------------|
| `secular_court` | Ordinary civil court |
| `religious_court` | General religious court |
| `beth_din` | Jewish rabbinical court |
| `shariah_court` | Islamic Shariah court |
| `tribal_court` | Tribal/indigenous court |
| `family_court` | Specialist family court |
| `family_council` | Extended family decision-making body |
| `community_elders` | Community elder council |
| `partition_meeting` | Hindu undivided family partition meeting |
| `karta_decision` | Decision by the karta (Hindu joint family manager) |
| `maori_land_court` | New Zealand Maori Land Court |
| `high_court` | High Court or equivalent superior court |

#### `successionConflicts[].resolutionStatus`
Current status of a succession law conflict.

| Value | Description |
|-------|-------------|
| `unresolved` | Conflict identified, no resolution yet |
| `resolved` | Conflict resolved |
| `pending_court` | Awaiting court determination |
| `pending_arbitration` | Awaiting arbitration |

#### `ancillaryProbate[].status`
Status of probate proceedings in a secondary jurisdiction.

| Value | Description |
|-------|-------------|
| `not_started` | No application filed |
| `applied` | Application submitted |
| `granted` | Grant issued |
| `completed` | Administration complete |
| `waived` | Probate not required in this jurisdiction |

#### `religiousConsideration.tradition`
The religious tradition governing estate administration. Uses the same values as `legalSystems` on jurisdiction.json.

| Value | Description |
|-------|-------------|
| `common_law` | Common law tradition |
| `civil_law` | Civil law tradition |
| `mixed` | Mixed legal tradition |
| `customary_law` | Customary law tradition |
| `islamic_law` | Islamic Shariah law |
| `hindu_law` | Hindu law |
| `jewish_law` | Halachic (Jewish) law |
| `canon_law` | Canon (Catholic Church) law |

#### `successionRegime.determinedBy`
How the applicable succession regime is determined for the estate. Same values as asset — see [asset.successionRegime.determinedBy](#successionregimedeterminedby).

#### `successionRegime.governingLaw.legalTradition`
Same values as asset — see [asset.successionRegime.governingLaw.legalTradition](#successionregimegoverninglawlegaltradition).

---

## Asset (asset.json)

#### `category`
The type of non-property asset. See [Asset Location Classes](./asset-location-classes.md) for groupings.

| Value | Description |
|-------|-------------|
| `financial` | Bank accounts, investments, pensions, shares, insurance, premium bonds |
| `vehicle` | Cars, motorcycles, boats, caravans |
| `digital` | Cryptocurrency, domains, social media, digital subscriptions |
| `business` | Business ownership stakes, partnerships, intellectual property |
| `property_contents` | Furniture, electronics, kitchenware, tools, garden equipment |
| `jewellery_watches` | Jewellery, watches, and precious items |
| `art` | Paintings, sculptures, prints |
| `antiques` | Antique furniture, ceramics, silverware |
| `collectibles` | Stamps, coins, trading cards, memorabilia |
| `musical_instruments` | Pianos, guitars, violins |
| `books_manuscripts` | Physical book collections and manuscripts |
| `wine_spirits` | Wine cellars, whisky collections |
| `clothing_textiles` | High-value clothing, textiles, and accessories |
| `firearms_sporting` | Licensed firearms and sporting equipment |
| `islamic_financial` | Sukuk, takaful, Shariah-compliant deposits |
| `other` | Catch-all for unclassified assets |

#### `valuationConfidence`
Confidence level of the asset's estimated value.

| Value | Description |
|-------|-------------|
| `estimated` | Testator's or proxy's estimate |
| `professional` | Valued by a qualified professional |
| `official` | Official valuation (e.g. probate, HMRC-accepted) |
| `unknown` | No basis for the figure |

#### `condition`
Physical condition of the asset.

| Value | Description |
|-------|-------------|
| `excellent` | As-new or pristine condition |
| `good` | Minor wear, fully functional |
| `fair` | Noticeable wear, functional |
| `poor` | Significant wear or damage |
| `unknown` | Condition not assessed |
| `not_applicable` | Use for financial/digital/intangible assets |

#### `possessionStatus`
Whether the asset is held at death or receivable afterwards.

| Value | Description |
|-------|-------------|
| `possessed_at_death` | Asset held by the testator at death (muchzak in halachic terms) |
| `receivable` | Asset receivable after death (insurance payout, debt owed) |
| `contingent` | Asset subject to a contingency |

#### `mobilityType`
Whether the asset is moveable or immoveable (relevant for conflict-of-laws).

| Value | Description |
|-------|-------------|
| `immoveable` | Fixed to land (governed by lex rei sitae) |
| `moveable` | Portable (governed by domicile law) |
| `mixed` | Contains both moveable and immoveable elements |

#### `acquisitionType`
How the asset was acquired (relevant for Hindu/customary succession).

| Value | Description |
|-------|-------------|
| `self_acquired` | Acquired by the testator through their own efforts |
| `ancestral_joint` | Inherited and held jointly with family (HUF coparcenary) |
| `ancestral_severed` | Ancestral property after partition |
| `inherited` | Inherited from another person |
| `gifted` | Received as a gift |
| `stridhan` | Hindu woman's personal property |
| `communal` | Communally owned (tribal/customary) |
| `waqf_endowed` | Endowed as Islamic waqf |

#### `registrationStatus`
Formal registration status of the asset.

| Value | Description |
|-------|-------------|
| `formally_registered` | Registered with relevant authority |
| `informally_held` | Held without formal registration |
| `community_acknowledged` | Recognised by community but not formally registered |
| `disputed` | Ownership disputed |
| `undocumented` | No documentation exists |

#### `ownershipEvidence`
Type of evidence supporting ownership.

| Value | Description |
|-------|-------------|
| `title_deed` | Formal title deed |
| `certificate_of_occupancy` | Government-issued occupancy certificate |
| `family_recognition` | Family acknowledges ownership |
| `community_testimony` | Community members attest to ownership |
| `receipts_only` | Only purchase receipts exist |
| `none` | No evidence of ownership |

#### `communalAuthority.authorityType`
The type of communal authority with jurisdiction over this asset. 
| Value | Description |
|-------|-------------|
| `family_council` | Extended family decision-making body |
| `clan_association` | Clan or lineage association |
| `religious_body` | Religious organisation or court |
| `tribal_council` | Tribal council or indigenous authority |
| `government` | Government authority |

#### `successionRegime.determinedBy`
How the applicable succession regime is determined for this asset. Also appears on property.json and estate.json.

| Value | Description |
|-------|-------------|
| `domicile` | Determined by the testator's domicile |
| `situs` | Determined by the location of the asset (lex rei sitae) |
| `nationality` | Determined by the testator's nationality |
| `personal_status` | Determined by the testator's personal status (religious/customary) |
| `choice_of_law` | Determined by an express choice-of-law clause |
| `treaty` | Determined by an international treaty (e.g. EU Succession Regulation) |

#### `successionRegime.governingLaw.legalTradition`
The legal tradition of the governing law. Uses the same values as `legalSystems` on jurisdiction.json.

| Value | Description |
|-------|-------------|
| `common_law` | English-derived common law |
| `civil_law` | Codified civil law |
| `mixed` | Hybrid of common law and civil law |
| `customary_law` | African customary or indigenous law systems |
| `islamic_law` | Islamic Shariah law |
| `hindu_law` | Hindu succession law |
| `jewish_law` | Halachic (Jewish) law |
| `canon_law` | Canon (Catholic Church) law |

#### `beneficiaryDesignation.designationType`
Type of beneficiary designation (assets passing outside probate).

| Value | Description |
|-------|-------------|
| `retirement_account` | 401(k), IRA, workplace pension with nomination |
| `life_insurance` | Life insurance policy nomination |
| `superannuation` | Australian/NZ superannuation nomination |
| `pod_account` | Payable-on-death bank account |
| `other` | Other beneficiary designation type |

#### `digitalAccessConsent.scope`
Scope of digital access consent under RUFADAA.

| Value | Description |
|-------|-------------|
| `full_access` | Fiduciary can access all digital content |
| `limited_access` | Fiduciary can access specified content only |
| `no_access` | No digital access granted |

---

## Asset Collection (asset-collection.json)

#### `category`
Type of specialist collection.

| Value | Description |
|-------|-------------|
| `model_railways` | Model railway collection |
| `vinyl_records` | Vinyl record collection |
| `art` | Art collection |
| `jewellery` | Jewellery collection |
| `wine` | Wine collection/cellar |
| `stamps` | Stamp collection |
| `coins` | Coin/numismatic collection |
| `books` | Book collection |
| `musical_instruments` | Musical instrument collection |
| `fishing_gear` | Fishing equipment collection |
| `handbags` | Designer handbag collection |
| `power_tools` | Power tool collection |
| `watches` | Watch collection |
| `ceramics` | Ceramics collection |
| `memorabilia` | Memorabilia/collectibles |
| `other` | Other collection type |

#### `valuationSource`
How the collection was valued.

| Value | Description |
|-------|-------------|
| `self_estimated` | Owner's estimate |
| `dealer_valuation` | Valued by a specialist dealer |
| `auction_estimate` | Estimated by an auction house |
| `insurance_value` | Insured value |

---

## Asset Interest (asset-interest.json)

#### `interestLevel`
How strongly a beneficiary has expressed interest in an asset.

| Value | Description |
|-------|-------------|
| `mentioned` | Came up in conversation, no strong feeling |
| `expressed_interest` | Person said they would like it |
| `strongly_wants` | Person has made it clear this matters to them |
| `agreed` | Testator and beneficiary have informally agreed |

#### `sourceType`
How the interest was communicated.

| Value | Description |
|-------|-------------|
| `family_conversation` | Mentioned during a family discussion |
| `written_request` | Beneficiary put it in writing |
| `chat_message` | Expressed via platform messaging |
| `platform_private_message` | Expressed via platform private message |
| `platform_group_message` | Expressed via platform group message |
| `proxy_reported` | Proxy relayed on behalf of the beneficiary |
| `testator_observed` | Testator noticed the person's attachment |
| `manual` | Entered directly by testator or proxy |

---

## Attestation (attestation.json)

#### `method`
How the document was attested/witnessed.

| Value | Description |
|-------|-------------|
| `in_person` | Physical presence attestation |
| `video` | Video-witnessed (permitted in some jurisdictions) |
| `remote` | Remote attestation (COVID-era provisions) |
| `none` | No attestation (holographic wills) |
| `kinyan_sudar` | Jewish: symbolic acquisition via cloth |
| `kinyan_agav` | Jewish: acquisition alongside land |
| `seal_based` | East Asian: personal seal (inkan/hanko) attestation |
| `inkan_registered` | Japanese: registered seal (jitsuin) attestation |

#### `attestationType`
Form of the attestation itself.

| Value | Description |
|-------|-------------|
| `written_signed` | Written and signed by witnesses |
| `oral_witnessed` | Oral declaration before witnesses |
| `oral_community` | Oral declaration before community |
| `seal_based` | Attested by application of personal seal |

#### `witnessConflictCheckScope`
Which legal tradition's witness conflict rules apply.

| Value | Description |
|-------|-------------|
| `english_law` | English law witness restrictions |
| `halachic_broad` | Broad halachic witness disqualifications |
| `shariah_standard` | Standard Shariah witness requirements |
| `civil_law_standard` | Civil law witness requirements |
| `customary_oral` | Customary oral tradition requirements |
| `community_testimony` | Community-based witness standards |

---

## Bequest (bequest.json)

#### `bequestType`
Type of testamentary gift.

| Value | Description |
|-------|-------------|
| `specific` | Named item or identified asset |
| `pecuniary` | Cash sum |
| `demonstrative` | Cash sum payable from a specific source |
| `general` | Gift from the general estate (not a named item) |
| `residuary` | Whatever remains after specific and pecuniary gifts |
| `life_interest` | Right to use/income during beneficiary's lifetime |
| `class` | Gift to a class of beneficiaries (e.g. "my grandchildren") |
| `debt_forgiveness` | Forgiveness of a debt owed to the testator — combined with `liabilityIds` |

#### `distributionMethod`
How a gift is divided among multiple beneficiaries.

| Value | Description |
|-------|-------------|
| `per_capita` | Equal shares to all living beneficiaries |
| `per_stirpes` | Deceased beneficiary's share passes to their descendants |
| `modified_per_stirpes` | Per stirpes starting at the first generation with living members |
| `per_capita_at_each_generation` | Equal division at each generational level |

#### `predeceaseRule`
What happens if the beneficiary dies before the testator.

| Value | Description |
|-------|-------------|
| `lapse` | Gift fails (lapses) |
| `per_stirpes` | Passes to the beneficiary's descendants |
| `substitution` | Named substitute beneficiary takes |
| `accrual` | Redistributed among surviving co-beneficiaries |
| `statutory_default` | Jurisdiction's default anti-lapse rule applies |

#### `constrainedBy`
What legal principle constrains this bequest.

| Value | Description |
|-------|-------------|
| `testamentary_freedom` | Testator has full freedom to bequeath |
| `customary_rule` | Customary law constrains the gift |
| `forced_heirship` | Forced heirship rules limit the gift |
| `religious_rule` | Religious law constrains the gift |
| `coparcenary_survivorship` | HUF coparcenary survivorship rules apply |

#### `beneficiaryOrganisation.type` (via $defs)

| Value | Description |
|-------|-------------|
| `charity` | Registered charity |
| `company` | Corporate entity |
| `unincorporated_association` | Unincorporated group |
| `trust` | Trust entity |
| `other` | Other organisation type |

#### `lifeInterest.interestType` (via $defs)

| Value | Description |
|-------|-------------|
| `use_and_income` | Right to use the asset and receive income |
| `income_only` | Right to income only |
| `use_only` | Right to use only (no income entitlement) |
| `protective` | Protective life interest (forfeited on certain events) |
| `right_of_residence` | Right to live in a property |

#### `postDeathAction.type` (via $defs)

| Value | Description |
|-------|-------------|
| `disclaimer` | Beneficiary disclaimed the gift |
| `deed_of_variation` | Gift varied by deed within 2 years (UK) |
| `appropriation` | Executor appropriated assets in satisfaction |
| `assent` | Executor's formal assent transferring property |

#### `inheritanceResponse.response` (via $defs)

| Value | Description |
|-------|-------------|
| `accepted` | Inheritance accepted |
| `renounced` | Inheritance renounced |
| `qualified_acceptance` | Accepted with conditions (civil law) |
| `pending` | Decision not yet made |

---

## Dealer Interest (dealer-interest.json)

#### `offerStatus`
Current status of a dealer's interest or offer.

| Value | Description |
|-------|-------------|
| `standing_interest` | General interest, no specific offer |
| `verbal_offer` | Verbal offer made |
| `written_offer` | Written offer submitted |
| `formal_valuation` | Formal valuation provided |
| `conditional_offer` | Offer subject to conditions |
| `accepted` | Offer accepted |
| `declined` | Offer declined |
| `expired` | Offer expired |
| `withdrawn` | Offer withdrawn |

#### `testatorDisposition`
Testator's attitude towards selling the asset.

| Value | Description |
|-------|-------------|
| `willing_to_sell` | Open to selling |
| `prefer_not_to_sell` | Would rather keep it |
| `hold_for_executor` | Let the executor decide after death |
| `deferred_to_family` | Family should decide |
| `promised_to_institution` | Promised to a museum/institution |
| `undecided` | Has not decided |

#### `privacyLevel`
Who can see this dealer interest record.

| Value | Description |
|-------|-------------|
| `testator_only` | Only the testator |
| `proxy_visible` | Testator and proxies |
| `executor_visible` | Visible to executors |
| `all_parties` | No restriction |

#### `communicationInitiatedBy`
Who started the conversation about this asset.

| Value | Description |
|-------|-------------|
| `buyer` | The dealer/buyer approached |
| `testator` | The testator initiated |
| `proxy` | A proxy initiated on behalf of the testator |
| `executor` | The executor initiated (post-death) |

#### `interestedParty.type` (via $defs)

| Value | Description |
|-------|-------------|
| `art_dealer` | Art dealer |
| `antique_dealer` | Antique dealer |
| `property_investor` | Property investor |
| `auction_house` | Auction house |
| `gallery` | Art gallery |
| `private_collector` | Private collector |
| `museum` | Museum |
| `institution` | Educational or cultural institution |
| `charity` | Charitable organisation |
| `developer` | Property developer |
| `fund_manager` | Investment fund manager |
| `family_office` | Family office |
| `estate_agent` | Estate agent |
| `legal_practice` | Legal practice/solicitor firm |
| `other` | Other party type |

#### `assetInterestItem.interestLevel` (via $defs)

| Value | Description |
|-------|-------------|
| `exploratory` | Initial enquiry |
| `moderate` | Genuine interest |
| `strong` | Strong interest, likely to proceed |
| `committed` | Committed to acquisition |

---

## Document (document.json)

#### `type`
The type of document.

See the schema for the full list of 19 standardised document types (e.g. `will`, `codicil`, `trust_deed`, `grant_of_probate`, `death_certificate`, etc.).

#### `clauses[].provenance.source`
How a clause was created. 
| Value | Description |
|-------|-------------|
| `ai_generated` | Generated by an AI system |
| `solicitor_drafted` | Drafted by a solicitor or legal professional |
| `imported` | Imported from another system or document |
| `template` | Based on a template |
| `scanned` | Extracted from a scanned document |

#### `clauses[].validatingAuthority.type`
The type of authority that validated a clause. 
| Value | Description |
|-------|-------------|
| `court` | Court or tribunal |
| `religious_body` | Religious organisation or court |
| `notary` | Notary public |
| `registrar` | Registrar or registry office |

---

## Executor (executor.json)

#### `role`
The executor's appointment type.

| Value | Description |
|-------|-------------|
| `primary` | First-choice executor |
| `secondary` | Second-choice (serves if primary cannot) |
| `substitute` | Named substitute |
| `administrator` | Court-appointed administrator (intestacy) |
| `administrator_with_will_annexed` | Court-appointed where no executor named in will |
| `literary` | Appointed to manage literary works, manuscripts, and intellectual property |
| `digital` | Appointed to manage digital assets, online accounts, and cryptocurrency |
| `specialist` | Appointed for a specific category of assets defined by the `scope` property |

#### `grantType`
Type of probate grant issued.

| Value | Description |
|-------|-------------|
| `grant_of_probate` | Standard grant where a valid will exists |
| `letters_of_administration` | Grant for intestate estates |
| `letters_of_administration_with_will_annexed` | Grant where will exists but no executor can act |
| `succession_certificate` | Succession certificate (Indian jurisdiction) |
| `certificate_of_inheritance` | Certificate of inheritance (civil law jurisdictions) |
| `court_appointment` | Court-appointed executor |
| `resealing` | Foreign grant recognised in another jurisdiction |
| `european_certificate_of_succession` | EU cross-border succession certificate |

---

## Event (event.json)

Tracks significant events in the estate timeline — court actions, executor decisions, legislative changes, and system-generated milestones.

#### `trigger`
What initiated this event.

| Value | Description |
|-------|-------------|
| `court_action` | Initiated by a court order or ruling |
| `executor_action` | Initiated by the executor or administrator |
| `beneficiary_action` | Initiated by a beneficiary |
| `institutional_action` | Initiated by a bank, insurer, or other institution |
| `calendar_deadline` | Triggered by a calendar deadline (e.g. IHT filing date) |
| `legislative_change` | Triggered by a change in legislation |
| `marketplace_action` | Initiated by a marketplace or auction |
| `system_generated` | Automatically generated by the system |

#### `actor.type`
The type of actor responsible for this event.

| Value | Description |
|-------|-------------|
| `court` | Court or tribunal |
| `executor` | Estate executor or administrator |
| `beneficiary` | Estate beneficiary |
| `bank` | Bank or financial institution |
| `insurer` | Insurance company |
| `tax_authority` | Tax authority (HMRC, IRS, etc.) |
| `religious_body` | Religious organisation or court |
| `valuer` | Professional valuer or surveyor |
| `marketplace` | Auction house or marketplace |
| `system` | Automated system |

---

## Guardian (guardian.json)

#### `role`
The guardian's appointment priority.

| Value | Description |
|-------|-------------|
| `primary` | First-choice guardian |
| `secondary` | Second-choice guardian |
| `substitute` | Named substitute |

#### `appointmentType`
How the guardian was appointed.

| Value | Description |
|-------|-------------|
| `testamentary` | Named in the will |
| `parental_responsibility` | Appointed via parental responsibility agreement |
| `court_appointed` | Appointed by a court |
| `shariah_court_appointed` | Appointed by a Shariah court |
| `community_appointed` | Appointed by the community |
| `religious_court_appointed` | Appointed by a religious court |

#### `guardianshipStructure`
How guardianship is structured.

| Value | Description |
|-------|-------------|
| `individual` | Single person as guardian |
| `collective` | Multiple people as co-guardians |
| `rotating` | Guardianship rotates between people |
| `family_council_determined` | Family council decides guardianship arrangements |

---

## Kinship (kinship.json)

#### `kinshipType`
The biological or legal relationship between two people.

| Value | Description |
|-------|-------------|
| `parent_child_biological` | Biological parent-child |
| `parent_child_adopted` | Legally adopted parent-child |
| `parent_child_step` | Step-parent to step-child |
| `parent_child_foster` | Foster parent-child |
| `parent_child_acknowledged` | Acknowledged parent-child (not adopted, not biological) |
| `sibling` | Full sibling (same parents) |
| `half_sibling` | Half-sibling sharing one parent — use `lineage` for paternal/maternal |
| `step_sibling` | Step-sibling |
| `grandparent_grandchild` | Grandparent-grandchild — use `lineage` for paternal/maternal |
| `uncle_aunt` | Parent's sibling to sibling's child — use `lineage` and `bloodDegree` |
| `cousin` | Child of a parent's sibling — use `lineage` and `bloodDegree` |

#### `lineage`
Paternal or maternal line. Applies to `half_sibling`, `grandparent_grandchild`, `uncle_aunt`, `cousin`.

| Value | Description |
|-------|-------------|
| `paternal` | Through the father's line |
| `maternal` | Through the mother's line |

#### `bloodDegree`
Whole-blood or half-blood. Applies to `uncle_aunt`, `cousin`.

| Value | Description |
|-------|-------------|
| `whole` | The relevant relative is a full sibling of the parent |
| `half` | The relevant relative is a half-sibling of the parent |

#### `legalStatus`
Legal recognition status of the kinship.

| Value | Description |
|-------|-------------|
| `recognised` | Legally recognised |
| `contested` | Recognition disputed |
| `pending` | Recognition pending |
| `unrecognised` | Not legally recognised |

#### `legitimacy`
Legitimacy status (relevant for some succession systems).

| Value | Description |
|-------|-------------|
| `legitimate` | Born within a recognised union |
| `illegitimate` | Born outside a recognised union |
| `legitimated` | Legitimated by subsequent marriage or court order |
| `not_applicable` | Legitimacy concept does not apply |

#### `legalBasis`
Legal basis for the family relationship.

| Value | Description |
|-------|-------------|
| `biological` | Natural biological relationship |
| `adoption_order` | Court-ordered adoption (severs biological ties) |
| `marriage` | Established through marriage |
| `civil_partnership` | Established through civil partnership |
| `treated_as_child` | Treated as own child without formal adoption |
| `surrogacy_order` | Parentage via surrogacy |
| `parental_order` | Court order transferring parentage |
| `customary_adoption` | Customary law adoption — biological ties preserved |

---

## Liability (liability.json)

#### `liabilityType`
Type of debt or financial obligation.

| Value | Description |
|-------|-------------|
| `mortgage` | Property mortgage |
| `personal_loan` | Personal/unsecured loan |
| `credit_card` | Credit card debt |
| `overdraft` | Bank overdraft |
| `student_loan` | Student loan |
| `car_finance` | Car finance/HP agreement |
| `hire_purchase` | Hire purchase agreement |
| `mahr` | Islamic mahr (deferred dower) obligation |
| `ketubah_debt` | Jewish ketubah financial obligation |
| `lobola` | Southern African bride price obligation |
| `tax_liability` | Outstanding tax debt |
| `funeral_costs` | Funeral expenses |
| `care_fees` | Care home or nursing fees |
| `mezonot` | Jewish maintenance obligation |
| `other` | Other liability type |

---

## Nonprobate Transfer (nonprobate-transfer.json)

#### `transferType`
Mechanism by which the asset passes outside probate.

| Value | Description |
|-------|-------------|
| `revocable_trust` | Transfer via revocable trust |
| `tod_deed` | Transfer-on-death deed |
| `pod_account` | Payable-on-death bank account |
| `jtwros` | Joint tenancy with right of survivorship |
| `tenancy_by_entirety` | Tenancy by the entirety (married couples) |
| `beneficiary_designation` | Named beneficiary on account/policy |
| `life_insurance_nomination` | Life insurance beneficiary nomination |
| `superannuation_nomination` | Australian/NZ super nomination |
| `cpf_nomination` | Singapore CPF nomination |
| `epf_nomination` | Malaysian EPF nomination |
| `mandatory_savings_nomination` | Other mandatory savings scheme nomination |

---

## Property (property.json)

#### `propertyType`
Type of real property.

| Value | Description |
|-------|-------------|
| `detached_house` | Detached house |
| `semi_detached_house` | Semi-detached house |
| `terraced_house` | Terraced/row house |
| `flat` | Flat/apartment |
| `maisonette` | Maisonette |
| `bungalow` | Bungalow |
| `cottage` | Cottage |
| `farmhouse` | Farmhouse |
| `barn_conversion` | Converted barn |
| `land` | Undeveloped land |
| `commercial` | Commercial property |
| `mixed_use` | Mixed residential/commercial |
| `houseboat` | Houseboat |
| `mobile_home` | Mobile home/static caravan |
| `other` | Other property type |

#### `valuationConfidence`
Same as asset — see [asset.valuationConfidence](#valuationconfidence).

#### `ownershipType`
Legal ownership structure.

| Value | Description |
|-------|-------------|
| `sole` | Sole ownership |
| `joint_tenants` | Joint tenants (right of survivorship) |
| `tenants_in_common` | Tenants in common (no survivorship) |
| `trust` | Held in trust |
| `tenancy_by_entirety` | Tenancy by the entirety (married couples, US) |

#### `ownershipModel`
Broader ownership model (beyond Western legal categories).

| Value | Description |
|-------|-------------|
| `individual` | Individual ownership |
| `joint` | Joint ownership (Western) |
| `communal_family` | Communal family ownership (African customary) |
| `huf_coparcenary` | Hindu Undivided Family coparcenary |
| `tribal` | Tribal/communal land |
| `government_vested` | Government-vested property |
| `trust_held` | Held in trust |

#### `acquisitionType`
Same as asset — see [asset.acquisitionType](#acquisitiontype).

#### `tenureType`
Land tenure classification.

| Value | Description |
|-------|-------------|
| `freehold` | Freehold (ownership in perpetuity) |
| `leasehold` | Leasehold (time-limited ownership) |
| `certificate_of_occupancy` | Government certificate of occupancy |
| `customary_right_of_occupancy` | Customary law right of occupancy |
| `communal` | Communal tenure |
| `government_allocated` | Government-allocated land |
| `traditional_authority_granted` | Granted by traditional authority |
| `informal_unregistered` | Informal/unregistered occupation |

#### `registrationStatus`
Same as asset — see [asset.registrationStatus](#registrationstatus).

#### `ownershipEvidence`
Same as asset — see [asset.ownershipEvidence](#ownershipevidence).

#### `successionRule`
How this property passes on death.

| Value | Description |
|-------|-------------|
| `testamentary` | Passes under the will |
| `intestacy` | Passes under intestacy rules |
| `customary_eldest_son` | Passes to eldest son under customary law |
| `customary_family_council` | Family council decides |
| `customary_matrilineal` | Passes through the maternal line |
| `survivorship` | Passes to surviving joint tenant |
| `not_individually_bequeathable` | Cannot be individually bequeathed (communal/tribal) |

#### `mobilityType`
Same as asset — see [asset.mobilityType](#mobilitytype).

#### `characterClassification`
Community property classification (US/civil law).

| Value | Description |
|-------|-------------|
| `community` | Community property |
| `separate` | Separate property |
| `quasi_community` | Quasi-community property (acquired in non-CP state) |
| `mixed` | Mixed character |
| `not_applicable` | Community property rules do not apply |

#### `communalAuthority.authorityType`
Same values as asset — see [asset.communalAuthority.authorityType](#communalauthorityauthoritytype).
#### `successionRegime.determinedBy`
Same values as asset — see [asset.successionRegime.determinedBy](#successionregimedeterminedby). 
#### `successionRegime.governingLaw.legalTradition`
Same values as asset — see [asset.successionRegime.governingLaw.legalTradition](#successionregimegoverninglawlegaltradition). 
---

## Proxy Authorisation (proxy-authorisation.json)

#### `scope`
What the proxy is authorised to do.

| Value | Description |
|-------|-------------|
| `full` | Full authority over all estate matters |
| `information_gathering` | Can gather information only |
| `communication` | Can communicate on behalf of the testator |
| `negotiation` | Can negotiate on behalf of the testator |
| `decision_making` | Can make decisions on behalf of the testator |

#### `consentRecord.consentMethod` (via $defs)

| Value | Description |
|-------|-------------|
| `in_person_verbal` | Verbal consent given in person |
| `in_person_written` | Written consent given in person |
| `video_recorded` | Consent recorded on video |
| `witnessed_verbal` | Verbal consent with witnesses |
| `phone_recorded` | Consent given and recorded by phone |
| `assumed_cultural_norm` | Consent assumed under cultural norms |

---

## Relationship (relationship.json)

#### `type`
Type of relationship between partners.

| Value | Description |
|-------|-------------|
| `marriage_civil` | Civil marriage |
| `marriage_religious` | Religious marriage |
| `marriage_customary` | Customary marriage |
| `marriage_common_law` | Common-law marriage |
| `civil_partnership` | Civil partnership |
| `civil_union` | Civil union |
| `domestic_partnership` | Domestic partnership |
| `de_facto` | De facto relationship (Australian) |
| `cohabitation` | Cohabiting but no formal union |
| `engagement` | Engaged to be married |

#### `currentStatus`
Current status of the relationship.

| Value | Description |
|-------|-------------|
| `ACTIVE` | Ongoing relationship |
| `SEPARATED_INFORMAL` | Informally separated |
| `SEPARATED_LEGAL` | Legally separated |
| `DIVORCED` | Divorced |
| `ANNULLED` | Marriage annulled |
| `DISSOLVED` | Civil partnership dissolved |
| `WIDOWED` | Partner deceased |
| `VOID` | Marriage declared void |
| `PUTATIVE` | Putative marriage (entered in good faith but invalid) |

#### `propertyRegime`
Matrimonial property regime governing the relationship.

| Value | Description |
|-------|-------------|
| `community_of_property` | Full community of property |
| `separation_of_property` | Complete separation |
| `community_of_acquests` | Community limited to property acquired during marriage |
| `deferred_community` | Separate during marriage, community on dissolution |
| `separate_as_modified` | Separation modified by agreement |
| `islamic_dower` | Islamic mahr-based regime |
| `us_community_property` | US community property state rules |
| `us_community_with_survivorship` | US community property with right of survivorship |
| `us_quasi_community` | US quasi-community property |
| `hindu_separate` | Hindu separate property |

#### `events[].type` (via $defs)

| Value | Description |
|-------|-------------|
| `CEREMONY` | Wedding/partnership ceremony |
| `REGISTRATION` | Legal registration |
| `engagement` | Engagement |
| `MARRIAGE_CONTRACT` | Signing of marriage contract |
| `PROPERTY_REGIME_CHANGE` | Change of property regime |
| `SEPARATION_INFORMAL` | Informal separation |
| `SEPARATION_LEGAL` | Legal separation |
| `DIVORCE_FILED` | Divorce proceedings filed |
| `DIVORCE_FINALISED` | Divorce finalised |
| `FINANCIAL_ORDER` | Financial order issued |
| `ANNULMENT` | Annulment granted |
| `DISSOLUTION` | Dissolution of civil partnership |
| `DEATH_OF_PARTNER` | Death of a partner |
| `RECONCILIATION` | Reconciliation after separation |
| `VOID_DECLARATION` | Marriage declared void |
| `MAHR_PAYMENT` | Islamic mahr payment |
| `LOBOLA_PAYMENT` | Southern African lobola payment |

#### `financialInstruments[].type` (via $defs)

| Value | Description |
|-------|-------------|
| `MAHR` | Islamic mahr (dower) |
| `KETUBAH` | Jewish ketubah (marriage contract) |
| `LOBOLA` | Southern African bride price |
| `PRENUPTIAL_AGREEMENT` | Prenuptial agreement |
| `POSTNUPTIAL_AGREEMENT` | Postnuptial agreement |
| `MARRIAGE_SETTLEMENT` | Marriage settlement/trust |

#### `financialInstruments[].status` (via $defs)

| Value | Description |
|-------|-------------|
| `AGREED` | Agreed/signed |
| `PAID` | Fully paid |
| `PARTIALLY_PAID` | Partially paid |
| `DEFERRED` | Payment deferred |
| `DISPUTED` | Payment disputed |
| `WAIVED` | Obligation waived |

#### `financialInstruments[].maharDetails.maharType` (via $defs)

| Value | Description |
|-------|-------------|
| `prompt` | Payable immediately on marriage |
| `deferred` | Payable on divorce or death |
| `combination` | Part prompt, part deferred |

#### `financialInstruments[].ketubahDetails.brideStatus` (via $defs)

| Value | Description |
|-------|-------------|
| `virgin` | First marriage (affects ketubah amount under halacha) |
| `widow` | Previously widowed |
| `divorcee` | Previously divorced |

---

## Trust (trust.json)

#### `trustType`
Type of trust.

| Value | Description |
|-------|-------------|
| `discretionary` | Trustee has discretion over distributions |
| `life_interest` | Beneficiary receives income/use for life |
| `bare` | Beneficiary has absolute entitlement |
| `accumulation_and_maintenance` | For minors — income accumulated until a set age |
| `disabled_persons` | Trust for a disabled beneficiary (IHT-favourable) |
| `charitable` | Trust for charitable purposes |
| `nil_rate_band` | UK IHT nil-rate band trust |
| `waqf` | Islamic endowment trust |
| `residence_nil_rate_band` | UK residence nil-rate band (RNRB) trust |
| `a_b_marital` | A/B marital trust for surviving spouse |
| `bypass` | Bypass trust — excludes assets from surviving spouse's estate |
| `other` | Other trust type |

#### `creationType`
How the trust was created.

| Value | Description |
|-------|-------------|
| `testamentary` | Created by the will (takes effect on death) |
| `inter_vivos_revocable` | Created during lifetime, can be revoked |
| `inter_vivos_irrevocable` | Created during lifetime, cannot be revoked |

#### `revocability`
Whether the trust can be revoked.

| Value | Description |
|-------|-------------|
| `revocable` | Can be revoked by the settlor |
| `irrevocable` | Cannot be revoked |
| `perpetual` | Designed to continue indefinitely |

#### `trustAppointee.role` (via $defs)

| Value | Description |
|-------|-------------|
| `trustee` | Manages trust assets |
| `protector` | Oversees trustees |
| `enforcer` | Enforces trust purposes |

#### `trustBeneficiary.interestType` (via $defs)

| Value | Description |
|-------|-------------|
| `income` | Entitled to income only |
| `capital` | Entitled to capital only |
| `both` | Entitled to income and capital |
| `discretionary` | Trustee has discretion |

#### `reservedPowers[].powerType` (via $defs)

| Value | Description |
|-------|-------------|
| `investment` | Power over investment decisions |
| `distribution` | Power over distributions |
| `amendment` | Power to amend trust terms |
| `revocation` | Power to revoke the trust |
| `addition_of_beneficiaries` | Power to add beneficiaries |
| `removal_of_trustees` | Power to remove trustees |
| `change_of_governing_law` | Power to change governing law |

#### `fleeClause.automaticOrDiscretionary` (via $defs)

| Value | Description |
|-------|-------------|
| `automatic` | Trust automatically flees to another jurisdiction on trigger |
| `discretionary` | Trustee decides whether to flee |

#### `protectorPowers[].powerType` (via $defs)

| Value | Description |
|-------|-------------|
| `consent_to_distribution` | Must consent to distributions |
| `remove_trustee` | Can remove trustees |
| `appoint_trustee` | Can appoint trustees |
| `change_governing_law` | Can change the trust's governing law |
| `veto_investment` | Can veto investment decisions |
| `add_beneficiary` | Can add beneficiaries |
| `exclude_beneficiary` | Can exclude beneficiaries |
| `enforce_purpose` | Can enforce the trust's stated purpose |

---

## Wish (wish.json)

#### `wishType`
Category of the testator's wish.

| Value | Description |
|-------|-------------|
| `funeral` | Funeral and burial/cremation wishes |
| `letter` | Letter of wishes to executors/family |
| `care` | Care wishes for dependants or pets |
| `distribution` | Non-binding distribution preferences |
| `digital` | Digital legacy wishes |
| `pets` | Specific pet care arrangements |
| `general` | General wishes |

#### `bindingNature`
Legal weight of the wish.

| Value | Description |
|-------|-------------|
| `non_binding` | Advisory only — executor may disregard |
| `culturally_obligatory` | Culturally expected (not legally enforceable) |
| `religiously_obligatory` | Religiously required (e.g. Islamic burial within 24 hours) |
| `legally_binding` | Legally enforceable in the relevant jurisdiction |

---

## Root Schema (schema.json)

#### `dataSharing.consentMethod`
How the testator gave consent for data sharing. 
| Value | Description |
|-------|-------------|
| `in_app` | Consent given through the application interface |
| `written` | Written consent (signed document) |
| `verbal` | Verbal consent (should be witnessed or recorded) |

---

## Extension Manifests

#### `extensionType`
The type of jurisdiction/cultural extension. 
| Value | Description |
|-------|-------------|
| `geographic` | Extension for a specific geographic jurisdiction (e.g. England & Wales, New South Wales) |
| `tradition` | Extension for a legal/religious tradition that spans jurisdictions (e.g. Islamic law, Hindu law) |
| `hybrid` | Extension combining geographic and tradition-specific rules |
