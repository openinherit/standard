---
title: "INHERIT Concept Map"
version: "1.0"
status: draft
date: 2026-04-07T12:00
lastmod: 2026-04-07T18:00
author: "Rich Davies"
source: "docs/implement/concept-map.md"
supersedes: null
---

# INHERIT Concept Map

## What Is INHERIT?

INHERIT is a **data product for estate planning**. It packages the structure, meaning, and context of an estate plan into a single, portable format — one that can move between solicitors, probate practitioners, financial advisers, and technology platforms without losing anything in translation. Where a standalone schema set tells a computer *how* data is shaped, a data product also tells it *what* the data means, *why* it is structured that way, and *where* it came from. That completeness is what makes INHERIT useful in professional practice, not just in software development.

This document maps familiar estate planning concepts to the INHERIT schemas that represent them. It is written for legal professionals, estate planners, and probate practitioners — not for software developers. Technical field names are shown in `code format` where precise reference is needed, but the explanations are in plain English.

---

## Core Concepts

### People

Everyone involved in an estate — whether they are giving, receiving, managing, or witnessing — is represented as a record in the `people` list. A single person can hold multiple roles at once. For example, a spouse who is both a beneficiary and an executor appears once, with both roles listed.

| Real-world concept | Schema | How it works |
|--------------------|--------|-------------|
| The person whose estate this is (the testator, deceased, or will-maker) | `person.json` | The person has role `testator` in the `roles` field. The estate record links to them via `testatorPersonId` on `estate.json` |
| An executor (personal representative named in the will) | `executor.json` + `person.json` | An `executor.json` record references the `personId` of the executor. The person also carries role `executor` in `person.json` |
| A beneficiary (anyone who receives a gift or a share of the estate) | `person.json` | The person has role `beneficiary`. Bequests then reference them by their unique identifier (`beneficiaryId`) |
| A witness (someone who attested the signing of the will) | `person.json` | The person has role `witness`. Will execution details — including witnesses — are recorded in the `attestation` field on `estate.json` |
| A legal representative, solicitor, or agent acting on someone's behalf | `proxy-authorisation.json` | A proxy authorisation records who is acting, for whom, with what scope, and on what basis |
| A guardian for minor children | `guardian.json` + `person.json` | A `guardian.json` record references the guardian's person record. The person carries role `guardian` |
| A trustee managing trust assets | `person.json` | The person carries role `trustee`. They are referenced by trust records |

---

### Assets

INHERIT distinguishes between **property** (land and buildings, which carry their own legal complexity) and **assets** (everything else). The `asset.json` schema uses a `category` field to group assets by type, with more detailed fields available for each category.

| Real-world asset | Schema | Category / notes |
|-----------------|--------|-----------------|
| House, flat, or land | `property.json` | Has its own schema — covers tenure type (freehold/leasehold), address, title number, mortgage, and co-ownership |
| Bank account, savings account, ISA | `asset.json` | Category: `financial` |
| Pension, investment bond, shares portfolio | `asset.json` | Category: `financial` |
| Cryptocurrency, crypto wallet | `asset.json` | Category: `digital` |
| Domain names, social media accounts, digital subscriptions | `asset.json` | Category: `digital` |
| Car, motorcycle, boat, caravan | `asset.json` | Category: `vehicle` |
| Business interest, partnership share, intellectual property | `asset.json` | Category: `business` |
| Jewellery, watches, precious stones | `asset.json` | Category: `jewellery_watches` |
| Paintings, sculptures, prints | `asset.json` | Category: `art` |
| Antique furniture, ceramics, silverware | `asset.json` | Category: `antiques` |
| Stamp collection, coins, memorabilia, vinyl records | `asset.json` | Category: `collectibles` |
| Furniture, household contents, electronics | `asset.json` | Category: `property_contents` |
| Musical instruments | `asset.json` | Category: `musical_instruments` |
| Rare books, manuscripts, maps | `asset.json` | Category: `books_manuscripts` |
| Wine cellar, whisky collection | `asset.json` | Category: `wine_spirits` |
| Firearms, sporting equipment | `asset.json` | Category: `firearms_sporting` |

All monetary values in INHERIT — whether an estimated value, a pecuniary bequest amount, or a debt — are recorded as **integer minor units** (pence in the UK, cents in the US). A value of £450,000 is stored as `45000000`. This avoids floating-point rounding errors that can cause problems when amounts are processed by multiple systems.

---

### Wishes and Distributions

A testator's instructions fall into two categories: **legally binding dispositions** (what the will actually says must happen) and **non-binding wishes** (guidance to executors and family). INHERIT records both.

| Real-world instruction | Schema | How it works |
|-----------------------|--------|-------------|
| "I leave my house to my daughter" — a specific gift | `bequest.json` | `bequestType: "specific"`. References the beneficiary's person ID and the property or asset being given |
| A cash sum to a named person — "I give £10,000 to my nephew" | `bequest.json` | `bequestType: "pecuniary"`. The `amount` field holds the sum in minor units |
| The remainder of the estate after specific gifts | `bequest.json` | `bequestType: "residuary"`. The residuary beneficiary receives whatever is left after all other gifts and debts |
| A gift to a class of people — "equally among my grandchildren" | `bequest.json` | `bequestType: "class"`. The `classDefinition` field describes the group in plain English |
| A life interest — spouse uses the property during their lifetime, then it passes to children | `bequest.json` | `bequestType: "life_interest"`. The `lifeInterest` object records who holds the interest, who receives it afterwards, and the type of interest (use, income, or residence rights) |
| A trust for minor children | `trust.json` | Records the trust type, trustees, beneficiaries, and any conditions |
| Funeral wishes (burial vs cremation, ceremony preferences, music) | `wish.json` | `wishType: "funeral"`. Non-binding in law but frequently culturally or religiously significant |
| A letter of wishes to executors — guidance on how to exercise discretion | `wish.json` | `wishType: "letter"`. Addressed to a named executor or family member |
| Substitute beneficiary — "if my daughter predeceases me, to her children" | `bequest.json` | The `substitutions` array lists who inherits instead, and under what condition |

---

### Legal and Administrative

| Real-world concept | Schema | How it works |
|--------------------|--------|-------------|
| The estate itself — the complete record linking all people, assets, and wishes | `estate.json` | The root record. Everything else is connected to it. The `testatorPersonId` field links to the testator's person record |
| Verification of death — confirmation the testator has died | `estate.json` | The `deathVerification` field records the method of verification, by whom, and when — aligned with OpenID Foundation standards for delegation triggers |
| Jurisdiction — which country's law applies | `common/jurisdiction.json` | A common type used throughout the standard. Combines an ISO country code with an optional subdivision code (e.g. `GB-ENG` for England, `US-CA` for California) |
| The testator's legal domicile | `estate.json` | The `domicile` field determines which succession law governs moveable property |
| Tax position | `common/tax-position.json` | A common type for recording the tax treatment and relevant exemptions of an asset or transfer |
| Valuation of an asset or the estate | `valuation.json` | Records who valued it, when, for what purpose, and the figure arrived at |
| A document — the will, a codicil, a grant of probate | `document.json` | Records the document type, execution date, and any associated file |

---

### Delegation and Access

One of INHERIT's distinctive features is its treatment of **delegation** — who is authorised to act, and how far that authority extends. This matters both during life (when a testator may need someone to act on their behalf) and after death (when executors, solicitors, and other professionals need documented authority to access accounts and information).

| Real-world concept | Schema | How it works |
|--------------------|--------|-------------|
| Granting authority to a solicitor or family member to act on your behalf | `proxy-authorisation.json` | Records who is authorised (`proxyPersonId`), who granted the authority (`testatorPersonId`), and the scope — from information gathering to full decision-making |
| An AI agent authorised to assist with the estate | `proxy-authorisation.json` | Uses `delegateType: "agent"`. The `agentId` and `agentCapabilities` fields define what the agent may do |
| Delegation chains — executor authorising a solicitor, who authorises a paralegal | `proxy-authorisation.json` | The `subDelegation` object records whether re-delegation is permitted and how deep the chain may go |
| An external credential proving authority — a Verifiable Credential or other delegation document | `proxy-authorisation.json` | The `credentialRef` field holds a URI pointing to the credential |
| Consent record — how and when consent was obtained | `proxy-authorisation.json` | The `consentRecord` object records the consent method, date, and any witnesses. Methods include in-person written, witnessed verbal, video-recorded, and culturally assumed consent |

---

## Jurisdiction Extensions

INHERIT's core schemas work for any legal tradition. Extensions add jurisdiction-specific fields — without modifying or overriding the core. An INHERIT document is always valid against the core schemas, whether or not any extensions are present.

Extensions never remove or change the meaning of core fields. They only add. This means a system that does not recognise a particular extension can safely ignore it.

| Legal tradition | Extension | What it adds |
|----------------|-----------|-------------|
| English common law (England & Wales) | `uk-england-wales` | Inheritance Tax nil-rate band and residence nil-rate band; intestacy distribution under the Administration of Estates Act 1925; IFPA 1975 eligibility; temporal legislation tracking |
| Scotland | `scotland` | Prior rights, legal rights (legitim, jus relictae/relicti), confirmation procedure, Sheriff Court jurisdiction, cohabitation rights |
| Ireland | `ireland` | Spouse's legal right share; Section 117 moral duty claims; Capital Acquisitions Tax thresholds; Irish probate process |
| United States | `us-estate` | Community versus separate property; elective share; homestead exemptions; per stirpes variants; no-contest clauses; pretermitted heir statutes |
| European Union (cross-border) | `eu-succession` | Brussels IV choice-of-law declarations; European Certificate of Succession; forced heirship variants across member states |
| Australia and New Zealand | `australia-nz` | Superannuation binding death benefit nominations; family provision claims; Aboriginal and Torres Strait Islander customary land; New Zealand testamentary promise claims |
| Canada | `canada` | Quebec civil law patrimony; Ontario equalisation payments; British Columbia WESA variation orders; Alberta dower rights; Indigenous land succession |
| Islamic succession | `islamic-succession` | Faraid fixed shares (including son/daughter ratios, spouse shares, parents); wasiyya (one-third bequest limit); waqf; mahr; iddah period; awl and radd adjustments |
| Jewish succession | `jewish-succession` | Halachic heir classification; bekhor double share for the firstborn; mezonot maintenance obligations; kinyan acquisition requirements; religious bequest classification |
| Hindu succession | `hindu-succession` | Mitakshara and Dayabhaga schools; Hindu Undivided Family coparcenary property; stridhan (women's self-acquired property); agricultural land ceiling rules |
| Japan | `japan` | Koseki family registry; iryubun (forced heirship) claims; yōshi adoption succession; spousal right of residence; saishi (ritual objects) succession |
| UAE (dual-track) | `uae` | Sharia default rules for Muslims; DIFC common law for non-Muslims; DWSC registered wills for expatriates |
| African customary law | `africa-customary` | Patrilineal and matrilineal systems; family council decisions; communal property; widow rights; lobola; customary land tenure |
| India (multi-personal-law) | `india` | Hindu, Muslim, Christian, and Parsi personal law systems; state-level variations; NRI complications; Goa exception |
| Singapore and Malaysia | `singapore-malaysia` | Intestate Succession Act distribution; AMLA Islamic distribution; CPF and EPF nominations; Malaysian Distribution Act; Shariah court jurisdiction |

---

## How It All Fits Together

A complete INHERIT document is a single JSON file that brings together all of these pieces. Every entity — every person, asset, bequest, and authorisation — has a unique identifier (a UUID). Relationships between entities are recorded by referencing these identifiers. A bequest does not duplicate the beneficiary's details; it references the beneficiary's person ID. A proxy authorisation does not repeat the testator's information; it references the testator's person ID.

This means:

- **One estate** → one root `estate.json` record, with `testatorPersonId` pointing to the testator
- **People** → one `person.json` record each, carrying their roles, contact details, and any identifiers needed for probate
- **Assets** → one record each in `asset.json` or `property.json`, with a category and estimated value
- **Wishes and distributions** → `bequest.json` records (legally binding gifts) and `wish.json` records (guidance to executors)
- **Administration** → `executor.json`, `trust.json`, and `proxy-authorisation.json` records covering who is responsible and what authority they hold
- **Extensions** → additional fields embedded within each entity record, prefixed with `x-inherit-`, adding jurisdiction-specific information without breaking core validation

If a system needs to find all assets being left to a particular beneficiary, it looks for `bequest.json` records where `beneficiaryId` matches that person's `id`. If a system needs to verify who has authority to act, it looks for `proxy-authorisation.json` records linked to the relevant `testatorPersonId`. The UUID-based cross-reference system makes this straightforward and reliable, regardless of which platform originally produced the document.

This portability — the ability to move a complete, self-describing estate record between systems without loss — is what INHERIT means by being a data product rather than a schema set.
