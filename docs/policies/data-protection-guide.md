# INHERIT Data Protection Guide

**Version:** 1.0
**Last reviewed:** 28 March 2026
**Status:** Published

---

## Purpose

This guide helps INHERIT implementers understand the data protection implications of processing estate planning data. It maps INHERIT fields to their data protection categories, identifies required legal bases, and provides a Data Protection Impact Assessment (DPIA) template.

**INHERIT is a data interchange FORMAT — it does not process, store, or transmit personal data.** Applications that use INHERIT are data controllers/processors and must conduct their own DPIAs. This guide provides the framework.

---

## 1. Why Estate Data Is Exceptionally Sensitive

An INHERIT document can contain:

- Full names, dates of birth, addresses, contact details
- Financial information (assets, valuations, debts, income)
- Family relationships (kinships, marriages, divorces)
- Religious affiliation (implied by choice of succession law extension)
- Health information (date of death, testamentary capacity assessment)
- Genetic relationships (parent-child, sibling bonds)
- Sexual orientation (implied by relationship types)
- Ethnic origin (clan or lineage membership in customary law jurisdictions)
- Criminal record (firearms licensing implies police checks)

This combination makes an INHERIT document **one of the most sensitive personal data collections a person can create**. Treat it accordingly.

---

## 2. GDPR Field Classification

Under GDPR Article 9, "special category data" requires explicit consent or a specific legal basis. The following table maps INHERIT entities and fields to their data protection categories.

### 2.1 Standard Personal Data (GDPR Article 6)

Requires a lawful basis (consent, contract, legitimate interest, legal obligation, vital interest, or public task).

| Entity | Fields | Lawful Basis for Estate Planning |
|--------|--------|--------------------------------|
| **Person** | givenName, familyName, additionalName, preferredName, dateOfBirth, contact (email, phone, address) | Legitimate interest (estate administration) or contract (MFI subscription) |
| **Estate** | testatorPersonId, jurisdiction, status, executionDate | Legitimate interest or contract |
| **Property** | name, address, estimatedValue | Legitimate interest |
| **Asset** | name, category, brand, model, estimatedValue, identifiers | Legitimate interest |
| **Bequest** | beneficiaryId, description, amount | Legitimate interest |
| **Executor** | personId, role | Legitimate interest |
| **Valuation** | value, provider, date | Legitimate interest |
| **Lifetime Transfer** | transferDate, value, donorPersonId, doneePersonIds | Legitimate interest or legal obligation (tax reporting) |
| **Import Source** | importedBy name/role, previousFirm | Legitimate interest |

### 2.2 Special Category Data (GDPR Article 9)

Requires explicit consent OR a specific exemption (substantial public interest, legal claims, etc.).

| Entity | Field | Special Category | Why | Recommended Legal Basis |
|--------|-------|-----------------|-----|------------------------|
| **Person** | `gender` | No (not special category per se) | BUT: combined with relationship data, can reveal sexual orientation | Legitimate interest — only collect where succession law requires it |
| **Person** | `clanOrLineage` | **Racial/ethnic origin** | Used in African customary succession law to determine inheritance rights | Explicit consent + substantial public interest (administration of justice). Only collect in jurisdictions where customary law applies. |
| **Person** | `dateOfDeath` | **Health data** (by inference) | Implies the person has died, which is health-related | Legitimate interest for estate administration. Public record in most jurisdictions. |
| **Estate** | `testamentaryCapacity` | **Health data** | Records mental capacity assessment — directly health-related | Explicit consent from the testator (or legal representative). May be required by law for will validity. |
| **Relationship** | `type` (various) | **Sexual orientation** (by inference) | Same-sex partnership types reveal sexual orientation | Explicit consent. Only record relationship type where succession law requires it (spousal rights, intestacy shares). |
| **Kinship** | `type`, `legitimacy` | **Genetic data** (by inference) | Parent-child and sibling relationships imply genetic connections. The `legitimacy` field is particularly sensitive. | Legitimate interest for succession (determining legal heirs). The `legitimacy` field should ONLY be used where succession law distinguishes between legitimate and illegitimate children — it should not be collected routinely. |
| **Extension choice** | Which extension is active | **Religious belief** (by inference) | Choosing the `islamic-succession` or `jewish-succession` extension could imply religious affiliation | The extension choice should be framed as "Which succession law applies?" NOT "What is your religion?" The legal system determines the extension, not personal faith. A non-Muslim in the UAE may still need the islamic-succession extension because Shariah applies to their estate. Extension names reference legal traditions, not personal beliefs. |
| **Attestation** | `method` (kinyan_sudar, seal_based, inkan_registered) | **Religious belief** (by inference) | Religious attestation methods reveal religious practice | Only record where the will was actually attested using this method. Do not ask users to choose a religious attestation method — record what was used. |
| **Asset** | firearms category + identifiers | **Criminal record** (by inference) | Firearm ownership implies the person has passed background checks and holds a valid certificate | Legitimate interest. Firearm data should be handled with particular care — it reveals both the existence of weapons and the owner's licence status. |

### 2.3 Deceased Persons

GDPR does not apply to deceased persons in most jurisdictions. However:

- **UK:** The Data Protection Act 2018 does not protect deceased persons' data, but the common law duty of confidentiality survives death.
- **EU:** Some member states extend protection (e.g. France — 80-year protection for certain personal data of deceased persons).
- **Japan:** APPI does not apply to deceased persons.
- **US:** No federal data protection for deceased persons, but state laws vary.

**Critical point:** An INHERIT document contains data about LIVING people (beneficiaries, executors, witnesses) as well as the deceased testator. The living people's data IS protected. Applications must distinguish between deceased testator data and living participant data.

---

## 3. Data Minimisation Principles

INHERIT follows data minimisation by design:

1. **Every field is optional** (except `id`). Applications should only collect what is necessary for the specific use case.
2. **Gender** should only be collected where succession law requires it (Shariah inheritance shares differ by gender).
3. **ClanOrLineage** should only be collected in customary law jurisdictions.
4. **Legitimacy** should only be collected where the law distinguishes between legitimate and illegitimate children.
5. **Religious attestation methods** should only be recorded when the will was actually attested using that method.
6. **Testamentary capacity** should only be recorded when a formal assessment has been conducted.

**Implementer guidance:** If in doubt, don't collect it. An empty field is always safer than an unnecessary one.

---

## 4. Retention Periods

| Data Category | Recommended Retention | Rationale |
|---|---|---|
| **Estate planning data (testator alive)** | Duration of the subscription/service + 1 year | User controls their own data |
| **Estate administration data (post-death)** | 12 years from completion of administration | HMRC can open enquiries up to 12 years after the relevant tax year |
| **Tax-related data** (lifetime transfers, valuations, tax position) | 12 years from the relevant tax year | Same as above |
| **Completed and distributed estates** | 12 years from final distribution | Limitation period for most claims |
| **Disputed estates** | Until dispute resolution + 6 years | Limitation Act 1980 (UK) — 6 years for most claims |
| **Import source metadata** | Same as the estate it relates to | Operational metadata, not independently retained |
| **Valuation comparables and screenshots** | 7 years from valuation date | Evidence for tax enquiries |
| **Deleted/withdrawn data** | Purge within 30 days of deletion request | GDPR right to erasure |

**Note:** These are UK-centric defaults. Each jurisdiction may have different limitation periods. Applications should configure retention per jurisdiction.

---

## 5. Cross-Border Data Transfers

An INHERIT document may involve people and assets across multiple jurisdictions. Common scenarios:

- A UK testator with property in France and beneficiaries in Australia
- A Singapore estate with CPF assets and a DIFC will for Dubai property
- A Japanese testator with a US brokerage account

Each jurisdiction has its own data protection regime:

| Jurisdiction | Regime | Key Requirement |
|---|---|---|
| UK | UK GDPR + DPA 2018 | Adequate safeguards for transfers outside the UK |
| EU | GDPR | Standard Contractual Clauses or adequacy decision |
| US | Sectoral (no federal privacy law for estates) | State laws vary — California CCPA, New York SHIELD Act |
| Singapore | PDPA | Consent + comparable protection in receiving country |
| Japan | APPI | Consent + adequate protection |
| UAE | DIFC Data Protection Law | Adequate level of protection |
| India | DPDP Act 2023 | Government-notified countries only |
| Australia | Privacy Act 1988 | Reasonable steps to ensure comparable protection |
| Canada | PIPEDA | Comparable protection |
| Ireland | GDPR (EU member) | Same as EU |

**Implementer guidance:** If an INHERIT document will be shared across borders (e.g., exported from a UK application to a Singapore law firm), ensure adequate transfer safeguards are in place. INHERIT as a format does not facilitate or prevent transfers — the application is responsible.

---

## 6. Marketplace / Selling Considerations

When estate data is used for item disposal through LegacyLists dealer tools or external channels:

1. **Strip estate-level data.** The selling listing should receive ONLY: asset descriptions, categories, brands, models, conditions, photos, and valuations. NOT: testator name, beneficiary details, estate value, or jurisdiction.
2. **Anonymise the seller.** The listing should be "47 Hornby OO gauge locomotives, good condition" — NOT "The late John Smith's collection from 13 Park Avenue."
3. **Obtain explicit consent.** The executor or family member must explicitly choose to list items. No automatic export from estate data to selling channels.
4. **Data controller boundaries.** The estate planning application (MFI) and the collection/selling platform (LegacyLists) should have clear data boundaries with separate privacy policies. Data flows between them only via explicit user action (INHERIT JSON export/import).

---

## 7. Right to Erasure (Right to Be Forgotten)

GDPR Article 17 gives individuals the right to have their data erased. For INHERIT:

- **Testator (alive):** Can request deletion of their entire estate document at any time. Application must comply within 30 days.
- **Beneficiary/executor/witness:** Can request removal of THEIR data from an estate document they're named in. This is complex — removing a beneficiary from a will may affect legal validity. Applications should seek legal advice before erasure.
- **Deceased testator:** GDPR does not apply, but applications should honour family requests where reasonable.
- **Soft deletes:** INHERIT's soft-delete pattern (deleted_at + deleted_by) is appropriate for estate data where hard deletion could affect legal validity. But soft-deleted data must still be purged after the retention period expires.

---

## 8. Data Protection Impact Assessment (DPIA) Template

Any application processing INHERIT data with real personal information should complete a DPIA. Here is a template:

### 8.1 Description of Processing

| Question | Answer |
|----------|--------|
| What personal data is collected? | [List INHERIT entities used: people, relationships, kinships, assets, etc.] |
| Why is it collected? | [Estate planning / estate administration / item disposal] |
| Who are the data subjects? | [Testator, beneficiaries, executors, witnesses, guardians, dealers] |
| How is data collected? | [Manual entry / will scanning / import from another system] |
| Where is data stored? | [Cloud provider, jurisdiction of servers] |
| Who has access? | [Testator, invited family members, solicitor, executor] |
| How long is data retained? | [See retention periods above] |
| Is data shared with third parties? | [Solicitor, dealer, marketplace, tax authority] |

### 8.2 Necessity and Proportionality

| Question | Answer |
|----------|--------|
| Is all collected data necessary? | [Audit against data minimisation principles above] |
| Could the purpose be achieved with less data? | [Consider which optional fields are actually needed] |
| What is the lawful basis? | [Consent / contract / legitimate interest / legal obligation] |
| For special category data, what is the additional basis? | [Explicit consent / administration of justice / legal claims] |

### 8.3 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Unauthorised access to estate data | [Low/Medium/High] | High | [Encryption, access controls, MFA] |
| Data breach exposing financial information | [Low/Medium/High] | High | [Encryption at rest and in transit, incident response plan] |
| Inappropriate disclosure to marketplace | [Low/Medium/High] | Medium | [Strip estate data before marketplace export, explicit consent] |
| Stale data leading to incorrect tax calculations | [Medium] | Medium | [Reference data verification, disclaimers on calculations] |
| Cross-border transfer without safeguards | [Low/Medium/High] | High | [SCCs, adequacy decisions, transfer impact assessments] |
| Erasure request affecting will validity | [Low] | High | [Legal advice before erasure, soft delete, audit trail] |

### 8.4 Sign-Off

| Role | Name | Date | Decision |
|------|------|------|----------|
| Data Protection Officer | | | Approved / Approved with conditions / Rejected |
| Application Owner | | | Acknowledged |

---

## 9. For INHERIT Standard Contributors

If you contribute to the INHERIT schema (new fields, new entities, new extensions):

1. **Assess every new field** against the categories in §2. If it could reveal special category data, document the legal basis in a `$comment`.
2. **Default to optional.** Never make a field `required` if it contains or implies special category data.
3. **Add examples that don't use real people.** All fixture data must be entirely fictitious. Names should be obviously fictional or common enough to be non-identifiable.
4. **Consider the inference risk.** A field might not be special category on its own, but combined with other fields, it could reveal sensitive information. Document these combinations.
5. **Use `$comment` annotations** to explain when a field should and should not be collected.

---

## 10. Disclaimer

This guide is provided for informational purposes only. It does not constitute legal advice. Data protection law varies by jurisdiction and changes over time. Applications using INHERIT should seek independent legal advice on their specific data protection obligations.

INHERIT and Testate Technologies Ltd accept no liability for data protection decisions made based on this guide.

---

*Published by the INHERIT project. Maintained at [github.com/openinherit/standard](https://github.com/openinherit/standard).*
