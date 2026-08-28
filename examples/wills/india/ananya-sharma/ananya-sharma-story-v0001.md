---
title: "Last Will and Testament of Dr. Ananya Sharma"
version: "1.0"
status: draft
date: 2026-04-12T23:55
lastmod: 2026-04-12T23:55
author: "Rich Davies"
source: "examples/wills/india/ananya-sharma/ananya-sharma-story-v0001.md"
---

# Last Will and Testament of Dr. Ananya Sharma

**Jurisdiction:** India — Hindu Succession Act 1956 (as amended 2005); Indian Succession Act 1925 Part V (Parsi succession — downstream relevance)
**Date of execution:** Saturday 9 March 2024
**Complexity:** Complex (HUF coparcenary, stridhan, mixed-faith downstream succession, multi-property-type estate)
**Fixture:** `ananya-sharma-inherit-v0001.json` (to be created in this folder)

## What this will tests

This will exercises the following INHERIT capabilities:

- **Hindu succession extension** (`hindu-succession`): `applicableLaw: hindu_succession_act_1956`, `school: mitakshara`, coparcenary modelling post-2005 Amendment, `heirClassifications` with `class_I` heirs
- **India geographic extension** (`india`): `personalLaw: hindu_succession_act_1956`, `state: Maharashtra`, `probateRequired` (Mumbai was formerly a mandatory probate city under s.213), `propertyClassification` distinguishing ancestral (HUF) from self-acquired, `coparcenaryDetails` with `amendment2005Applies: true`
- **HUF coparcenary property** — Pune ancestral home held as joint Hindu family property; testator is a coparcener (daughter, post-2005 Amendment); exercises testamentary right over coparcenary share per s.30 of the Hindu Succession Act
- **`hufDetails`** — `kartaPersonId` (brother Vikram), `coparceners` array with testator and brother, `coparcenaryShareFraction` modelling
- **Stridhan assets** — gold jewellery classified as `stridhanAssets` with `description` and `notes` explaining exclusive female ownership under Hindu law; bequeathed as stridhan-to-stridhan (mother to daughter)
- **Mixed-faith downstream succession** — daughter Priya married to a Parsi man; acknowledgement that Priya's own estate (if she predeceases her husband) would be governed by the Indian Succession Act 1925 Part V (Parsi succession), not Hindu succession — creates a modelling challenge for `parsiSuccessionRules` downstream
- **`parsiSuccessionRules`** — referenced prospectively: daughter's marriage to a Parsi man raises the question of which personal law governs Priya's children's inheritance; the will explicitly addresses this
- **Self-acquired vs ancestral property distinction** — Malabar Hill flat (self-acquired, full testamentary freedom) vs Pune HUF property (coparcenary share, testamentary freedom only post-2005 Amendment); `propertyClassification` with `type: mixed`
- **Life interest with remainder** — Malabar Hill flat to husband for life, remainder to children equally; tests `conditionType: life_interest` and remainder beneficiary modelling
- **`heirClassifications`** — Class I heirs: husband (`spouse`), daughter, son, mother; each with `scheduleEntry` reference
- **Specific bequests with cultural context** — stridhan gold with provenance (family jewellery), medical equipment to charitable trust
- **Charitable bequest** — medical practice equipment to Mumbai Medical Trust
- **Pecuniary legacy for care** — INR 10 lakhs to elderly mother for maintenance
- **30-day survivorship clause** with `conditionType: survival_period`
- **Hindu funeral wishes** — cremation with Hindu rites, specific ghat preference
- **`administrationPhases`** — debts → funeral → specific bequests (stridhan, charity, mother's care) → HUF share distribution → life interest → residue
- **`instrumentType: probate`** — Mumbai estate, probate historically mandatory (s.213, now repealed but advisable in practice)
- **`probateAdvisable: true`** — post-2025 repeal of mandatory probate, but banks and housing societies still request it
- **`kinship`** — parent-child biological (two children), spousal (marriage), parent-child biological (testator's mother), sibling (testator's brother as coparcener)
- **`asset-categories`** — real property (two properties, different tenure: freehold vs HUF coparcenary), financial assets (fixed deposits, mutual funds), personal property (gold jewellery as stridhan), professional goodwill
- **Cross-faith marriage acknowledgement** — explicit clause that Priya's intermarriage does not affect her Hindu succession rights under the testator's estate, while noting downstream implications

## People

| Person | Role | Relationship to testator |
|--------|------|--------------------------|
| Dr. Ananya Sharma | Testator | — |
| Dr. Rajesh Sharma | Executor (primary), beneficiary (life interest, residue) | Husband |
| Vikram Devi | Executor (substitute), coparcener (HUF) | Brother |
| Priya Sharma | Beneficiary (stridhan, HUF share, remainder, residue) | Daughter |
| Arjun Sharma | Beneficiary (HUF share, remainder, residue) | Son |
| Kamala Devi | Beneficiary (pecuniary legacy) | Mother |
| Mumbai Medical Trust | Beneficiary (charitable bequest) | Charity |
| Dr. Meera Iyer | Witness | Colleague (physician) |
| Mr. Suresh Nair | Witness | Neighbour |

---

## Full will text

<br>

<div style="text-align: centre;">

# ॐ

**SHRI GANESHAYA NAMAH**

*In the name of Lord Ganesha, remover of obstacles*

</div>

---

# LAST WILL AND TESTAMENT

# OF

# DR. ANANYA SHARMA

---

**THIS IS THE LAST WILL AND TESTAMENT** of me, **DR. ANANYA SHARMA** (PAN No. ABCPS1234A; Aadhaar No. XXXX XXXX 5678), a Hindu woman, citizen of the Republic of India, of legal age and of sound and disposing mind and memory, currently residing at 14B Malabar Hill Road, Mumbai 400006, Maharashtra, India (hereinafter called "the Testator").

---

## 1. PREAMBLE

1.1 I make this Will in full consciousness of my duties and obligations to my family and in accordance with the traditions of Hindu dharma. I invoke the blessings of Lord Ganesha, Lord Shiva, and Goddess Lakshmi upon this instrument and upon my family.

1.2 I am a Hindu by religion, having been raised in the Hindu faith by my mother, **KAMALA DEVI**. My late father, **RUSTOM DEVI** (deceased), was of Parsi (Zoroastrian) faith. I declare that for the purposes of personal law, I am governed by the Hindu Succession Act 1956 (as amended by the Hindu Succession (Amendment) Act 2005) and that I am a Hindu within the meaning of section 2 of that Act.

1.3 I am a retired physician (cardiologist) formerly practising at Kokilaben Dhirubhai Ambani Hospital, Mumbai, and at my private clinic at 22 Pedder Road, Mumbai 400026.

1.4 I declare that I am making this Will freely and voluntarily, without any coercion, undue influence, fraud, or misrepresentation from any person whatsoever.

---

## 2. REVOCATION OF FORMER WILLS

2.1 I hereby revoke all former Wills, Codicils and Testamentary Dispositions heretofore made by me, whether in India or any other jurisdiction, and declare this to be my last Will and Testament.

---

## 3. DECLARATIONS

3.1 I am married to **DR. RAJESH SHARMA** (PAN No. DEFPS5678B), a cardiologist, residing with me at 14B Malabar Hill Road, Mumbai 400006, Maharashtra.

3.2 I have two (2) living children, namely:

   (a) **PRIYA SHARMA**, born 15 June 1994, currently residing at 45 Cuffe Parade, Mumbai 400005, married to **DARIUS MEHTA** (a Parsi gentleman); and

   (b) **ARJUN SHARMA**, born 3 November 1997, currently residing at 78 Koramangala 4th Block, Bangalore 560034, Karnataka, employed as a software engineer.

3.3 My mother, **KAMALA DEVI** (Aadhaar No. XXXX XXXX 9012), aged approximately 82 years, resides at 9 Model Colony, Shivajinagar, Pune 411016, Maharashtra.

3.4 My brother, **VIKRAM DEVI** (PAN No. GHIPD3456C), aged approximately 55 years, resides at 11 Model Colony, Shivajinagar, Pune 411016, Maharashtra. Vikram and I are coparceners in the Hindu Undivided Family property described in Clause 8 below.

---

## 4. APPOINTMENT OF EXECUTOR

4.1 I appoint my husband **DR. RAJESH SHARMA** of 14B Malabar Hill Road, Mumbai 400006, as the sole Executor and Trustee of this my Will (hereinafter called "my Executor").

4.2 If my said husband shall predecease me, or shall be unwilling or unable to act as Executor, I appoint my brother **VIKRAM DEVI** of 11 Model Colony, Shivajinagar, Pune 411016, as substitute Executor and Trustee.

4.3 My Executor shall have all powers necessary for the proper administration of my estate, including but not limited to the power to sell, mortgage, lease, exchange, or otherwise dispose of any property forming part of my estate, and to invest, manage and apply the proceeds thereof, as permitted by the Indian Trusts Act 1882 and the Indian Succession Act 1925.

4.4 I direct my Executor to apply to the High Court of Judicature at Bombay (or such other court of competent jurisdiction) for a Grant of Probate in respect of this Will. I acknowledge that following the repeal of section 213 of the Indian Succession Act 1925 by the Repealing and Amending Act 2025, probate is no longer mandatory in Mumbai. However, I strongly recommend that my Executor obtain probate, as banks, housing societies, and the Sub-Registrar's Office may require it in practice for the transfer of immovable property and financial assets.

---

## 5. PAYMENT OF DEBTS AND EXPENSES

5.1 I direct my Executor to pay all my just debts, funeral expenses, testamentary expenses, and all taxes (including any income tax liability arising on deemed transfer under section 45 of the Income Tax Act 1961) from my estate before any distribution or bequest takes effect.

5.2 The order of priority for the discharge of obligations from my estate shall be:

   (a) Funeral expenses;

   (b) Testamentary expenses and costs of obtaining probate;

   (c) Payment of debts; and

   (d) Payment of specific bequests and legacies as set out below.

---

## 6. SPECIFIC BEQUESTS

### (a) Stridhan — Gold Jewellery to My Daughter Priya

6.1 I bequeath the whole of my collection of gold jewellery, which constitutes my stridhan (exclusive property of a Hindu woman) under Hindu law, and which is currently kept in safe deposit locker No. 247 at the State Bank of India, Malabar Hill Branch, Mumbai, and which is valued at approximately **INDIAN RUPEES FIFTY LAKHS (INR 50,00,000)**, to my daughter **PRIYA SHARMA** of 45 Cuffe Parade, Mumbai 400005.

6.2 I declare that this gold jewellery is my stridhan within the meaning of Hindu law, being property received by me from my mother and mother-in-law at the time of my marriage and thereafter, and over which I have absolute and unfettered rights of disposal. No person, including my husband, has any claim over this property.

6.3 I bequeath this jewellery to Priya as her own stridhan, continuing the tradition of mother-to-daughter transmission. I express the wish — which I acknowledge is precatory and not binding — that Priya shall keep these ornaments within the family and in due course pass them to her own daughter or daughters.

6.4 For the avoidance of doubt, this bequest to Priya is a testamentary disposition of my separate stridhan property and is not subject to the rules of coparcenary or Hindu Undivided Family property.

### (b) Medical Equipment to Mumbai Medical Trust

6.5 I bequeath all my medical practice equipment, instruments, diagnostic devices, and professional library, currently held at my former clinic at 22 Pedder Road, Mumbai 400026, and valued at approximately **INDIAN RUPEES THIRTY LAKHS (INR 30,00,000)**, to the **MUMBAI MEDICAL TRUST** (registration number E-12345/Mumbai), a public charitable trust registered under the Bombay Public Trusts Act 1950, for the purpose of equipping charitable clinics serving underprivileged communities in Mumbai.

6.6 I direct that the said equipment shall be used exclusively for charitable medical purposes and shall not be sold or disposed of within five (5) years of my death, save with the written consent of my Executor.

### (c) Pecuniary Legacy for My Mother's Care

6.7 I bequeath the sum of **INDIAN RUPEES TEN LAKHS (INR 10,00,000)** to my brother **VIKRAM DEVI** of 11 Model Colony, Shivajinagar, Pune 411016, to be held by him on trust for the maintenance, medical care, and personal comfort of my mother **KAMALA DEVI** for the remainder of her natural life.

6.8 I direct Vikram to apply the said sum towards my mother's daily care, medical expenses, household expenses, and such other purposes as are necessary for her comfort and dignity. Vikram shall not be required to render formal accounts but shall act in good conscience and in the best interests of our mother.

6.9 Upon the death of my mother, any unexpended balance of the said sum shall be divided equally between my two children, Priya and Arjun.

---

## 7. GOODWILL OF MEDICAL PRACTICE

7.1 I record that the goodwill of my medical practice as a cardiologist is valued at approximately **INDIAN RUPEES THIRTY LAKHS (INR 30,00,000)**. I direct my Executor to realise this goodwill (whether by sale of the practice name, patient records in accordance with the Medical Council of India guidelines, or otherwise) and to add the proceeds to my residuary estate for distribution as provided in Clause 10 below.

7.2 I direct my Executor to ensure that the disposal of any patient records complies with the Indian Medical Council (Professional Conduct, Etiquette and Ethics) Regulations 2002 and any applicable data protection legislation.

---

## 8. HINDU UNDIVIDED FAMILY PROPERTY — PUNE ANCESTRAL HOME

### The Property

8.1 I record that the property known as "Devi Nivas", 9-11 Model Colony, Shivajinagar, Pune 411016, Maharashtra (the "Pune Property"), registered in the name of the Devi Hindu Undivided Family, is held as joint Hindu family coparcenary property under the Mitakshara school of Hindu law.

8.2 The Pune Property was originally acquired by my late grandfather, **SHRI GOVIND DEVI**, and has descended through the family as ancestral property. The property is valued at approximately **INDIAN RUPEES THREE CRORE (INR 3,00,00,000)**.

### My Coparcenary Rights

8.3 I am a coparcener in the Devi Hindu Undivided Family by virtue of being the daughter of the late **RUSTOM DEVI** (my father, who was the Karta of the HUF until his death). My coparcenary rights arise under section 6 of the Hindu Succession Act 1956 as substituted by section 3 of the Hindu Succession (Amendment) Act 2005, which conferred upon daughters the same rights as sons in the coparcenary property.

8.4 I acknowledge and record that my brother **VIKRAM DEVI** is the surviving coparcener and the current Karta of the Devi Hindu Undivided Family. The coparceners in the Devi HUF are myself and Vikram, each holding an undivided one-half (1/2) share in the coparcenary property.

### Testamentary Disposition of Coparcenary Share

8.5 I exercise my right under section 30 of the Hindu Succession Act 1956 (as interpreted by the Supreme Court of India in *Vineeta Sharma v. Rakesh Sharma* (2020) 9 SCC 1 and *Prakash v. Phulavati* (2016) 2 SCC 36) to dispose of my undivided one-half (1/2) share in the Pune Property by testamentary succession.

8.6 I give, devise and bequeath my undivided one-half (1/2) coparcenary share in the Pune Property to my two children — **PRIYA SHARMA** and **ARJUN SHARMA** — in equal shares (that is, one-quarter (1/4) of the entire property to each child).

8.7 For the avoidance of doubt:

   (a) This bequest relates only to my undivided coparcenary share in the Pune Property and does not affect Vikram's share in any manner whatsoever;

   (b) My coparcenary share devolves by testamentary succession under this Will and not by survivorship, in accordance with the proviso to section 6 of the Hindu Succession Act 1956 as amended;

   (c) If either Priya or Arjun shall predecease me, the share of the predeceased child shall pass to the surviving child absolutely; and

   (d) I direct Priya, Arjun, and Vikram to maintain the Pune Property as a family home and to make no disposition of the property to any person outside the Devi and Sharma families without the unanimous consent of all co-owners.

---

## 9. MALABAR HILL FLAT — LIFE INTEREST AND REMAINDER

### The Property

9.1 I give, devise and bequeath my freehold flat at 14B Malabar Hill Road, Mumbai 400006, Maharashtra (the "Mumbai Flat"), registered in my sole name at the office of the Sub-Registrar, Mumbai City (Document No. MUM/2008/XXXX), to my Executor upon trust as set out below.

9.2 The Mumbai Flat is my self-acquired property, purchased from the proceeds of my medical practice, and is not part of any Hindu Undivided Family property. I have absolute and unfettered testamentary freedom over this property. The property is valued at approximately **INDIAN RUPEES EIGHT CRORE (INR 8,00,00,000)** (approximately GBP 750,000).

### Life Interest for My Husband

9.3 I direct my Executor to hold the Mumbai Flat upon trust to permit my husband **DR. RAJESH SHARMA** to reside therein for the remainder of his natural life, or until he voluntarily surrenders this right in writing (hereinafter the "Life Interest").

9.4 During the subsistence of the Life Interest:

   (a) My husband shall be entitled to reside in the Mumbai Flat without payment of rent or occupation charges;

   (b) My husband shall be responsible for the payment of municipal taxes, society maintenance charges, electricity, water, and all outgoings pertaining to the flat;

   (c) My husband shall keep the flat in reasonable repair and shall not make structural alterations without the written consent of both Priya and Arjun;

   (d) My husband shall not sell, mortgage, charge, sublet, or otherwise encumber the Mumbai Flat without the written consent of my Executor (if still acting) or, failing that, the written consent of both Priya and Arjun; and

   (e) My husband may, with the written consent of Priya and Arjun, vacate the Mumbai Flat and let it on a leave-and-licence basis under the Maharashtra Rent Control Act 1999, receiving the licence fee as income during the Life Interest.

### Remainder to Children

9.5 Upon the death of my husband, or upon his voluntarily surrendering the Life Interest in writing, the Mumbai Flat shall pass absolutely to my two children — **PRIYA SHARMA** and **ARJUN SHARMA** — in equal shares as tenants in common.

9.6 If either Priya or Arjun shall predecease my husband leaving issue, the share of the predeceased child shall pass to his or her issue per stirpes. If either Priya or Arjun shall predecease my husband without leaving issue, the share of the predeceased child shall pass to the surviving child absolutely.

---

## 10. RESIDUARY ESTATE

10.1 Subject to the payment of all debts, funeral expenses, testamentary expenses, and the specific bequests and devises set out in Clauses 6 through 9 above, I give, devise and bequeath all the rest, residue and remainder of my estate, both movable and immovable, of whatever kind and wherever situated, to my two children — **PRIYA SHARMA** and **ARJUN SHARMA** — in equal shares absolutely.

10.2 Without limiting the generality of the foregoing, my residuary estate includes:

   (a) **Fixed deposits** with the State Bank of India (Malabar Hill Branch and other branches), currently valued at approximately **INDIAN RUPEES ONE CRORE AND FIFTY LAKHS (INR 1,50,00,000)**;

   (b) **Mutual fund investments** with ICICI Prudential Asset Management Company Limited, currently valued at approximately **INDIAN RUPEES TWO CRORE (INR 2,00,00,000)**, held in my single name under folio numbers registered with my PAN;

   (c) The proceeds of the goodwill of my medical practice as described in Clause 7;

   (d) Any balance in my savings and current accounts;

   (e) Any life insurance policies payable to my estate (as distinct from policies with nominated beneficiaries, which shall pass outside this Will); and

   (f) All other assets of whatever nature not otherwise specifically disposed of under this Will.

10.3 If either Priya or Arjun shall predecease me leaving issue, the share of the predeceased child in the residuary estate shall pass to his or her issue per stirpes. If either child shall predecease me without leaving issue, the share of the predeceased child shall pass to the surviving child absolutely.

---

## 11. SURVIVORSHIP CLAUSE

11.1 If any beneficiary named in this Will shall die within thirty (30) days of the date of my death, or if we die in circumstances rendering it uncertain which of us survived the other, then for all purposes of this Will that beneficiary shall be deemed to have predeceased me, and the bequest to that beneficiary shall be dealt with as if that beneficiary had predeceased me.

---

## 12. PRIYA'S MARRIAGE — MIXED-FAITH SUCCESSION

12.1 I record that my daughter **PRIYA SHARMA** is married to **DARIUS MEHTA**, a Parsi (Zoroastrian) gentleman. I make the following declarations for the avoidance of doubt and for the guidance of my Executor, my family, and any court of competent jurisdiction:

   (a) **Priya's rights under this Will are unaffected by her marriage.** Under the Hindu Succession Act 1956, a Hindu woman does not cease to be a Hindu, or lose her rights of inheritance from her Hindu parents, by reason of her marriage to a person of another faith. Priya remains a Class I heir under the Schedule to the Hindu Succession Act and is entitled to inherit from me in accordance with this Will without any diminution;

   (b) **Priya's own succession.** I acknowledge that if Priya, having married a Parsi man, should predecease her husband Darius leaving children, the succession to Priya's own estate may be governed by the Indian Succession Act 1925 Part V (Parsi intestate succession), under which daughters receive half the share of sons, and the widow or widower receives a share equal to half a child's share. This is a matter for Priya's own testamentary planning and does not affect the provisions of this Will;

   (c) **Stridhan passes as stridhan.** The gold jewellery bequeathed to Priya in Clause 6.1 shall be her stridhan under Hindu law, irrespective of her husband's faith. I express the wish that, should questions arise about the characterisation of this jewellery upon Priya's death, it be treated as Hindu stridhan for succession purposes; and

   (d) **I urge Priya** to make her own Will addressing the mixed-faith succession question, so that her wishes are clearly recorded and her children (whether they follow the Hindu or Parsi faith) are provided for in accordance with her intentions.

---

## 13. CLASSIFICATION OF MY PROPERTY

13.1 For the avoidance of doubt and for the guidance of my Executor and the court, I classify my property as follows:

| Property | Classification | Governing law | Testamentary freedom |
|----------|---------------|---------------|---------------------|
| Mumbai Flat (14B Malabar Hill Road) | Self-acquired | Hindu Succession Act s.30 | Full |
| Pune Property (Devi Nivas, Model Colony) | Ancestral / HUF coparcenary | Hindu Succession Act s.6 (as amended 2005) | Over coparcenary share only |
| Gold jewellery | Stridhan | Hindu law (stridhan rules) | Full |
| Fixed deposits (SBI) | Self-acquired | Hindu Succession Act s.30 | Full |
| Mutual funds (ICICI Prudential) | Self-acquired | Hindu Succession Act s.30 | Full |
| Medical equipment | Self-acquired | Hindu Succession Act s.30 | Full |
| Medical practice goodwill | Self-acquired | Hindu Succession Act s.30 | Full |

---

## 14. ADMINISTRATIVE POWERS

14.1 Without prejudice to the powers conferred upon my Executor by law, I expressly grant to my Executor the following additional powers:

   (a) To sell, lease, mortgage, exchange, partition, or otherwise deal with any movable or immovable property forming part of my estate, by public auction or private treaty, at such price and upon such terms as my Executor shall think fit;

   (b) To invest and reinvest the proceeds of my estate in such investments as my Executor shall think fit, whether or not they are investments authorised by the Indian Trusts Act 1882;

   (c) To operate, continue, wind up, or dispose of my medical practice and the goodwill thereof;

   (d) To compromise, settle, or submit to arbitration any claim or dispute relating to my estate;

   (e) To employ solicitors, advocates, chartered accountants, and other professionals and to pay their fees from my estate;

   (f) To execute all deeds, documents, and instruments necessary or desirable for the proper administration and distribution of my estate, including applications to the Sub-Registrar's Office, the housing society, banks, and mutual fund companies;

   (g) To claim and receive all sums of money, dividends, interest, and other income due to me or to my estate; and

   (h) To pay from my estate all taxes, duties, and levies (including income tax, capital gains tax, stamp duty, and registration fees) arising from or in connection with the administration and distribution of my estate.

---

## 15. FUNERAL WISHES

15.1 I direct that upon my death, my body shall be cremated in accordance with Hindu rites and rituals. Specifically:

   (a) My body shall be bathed and prepared in accordance with Hindu tradition;

   (b) My body shall be draped in a white sari and adorned with flowers;

   (c) The antim sanskar (last rites) shall be performed in accordance with Hindu tradition, including the recitation of appropriate mantras and the lighting of the funeral pyre (or the pressing of the button at an electric crematorium);

   (d) I wish to be cremated at the **Banganga Crematorium**, Walkeshwar, Mumbai 400006, or if that is not available, at such other crematorium in Mumbai as my family shall determine;

   (e) My ashes (asthi) shall be immersed in the River Ganga at Haridwar, Uttarakhand, or at Nashik on the banks of the River Godavari, as my family shall determine; and

   (f) A shraadh (memorial ceremony) shall be performed on the thirteenth day after my death, in accordance with Hindu tradition.

15.2 These wishes are expressions of my desire and I trust my family to honour them, but I acknowledge that they are not legally binding.

---

## 16. GENERAL PROVISIONS

16.1 This Will shall be governed by and construed in accordance with the laws of the Republic of India, and in particular the Hindu Succession Act 1956 (as amended), the Indian Succession Act 1925, and the Indian Trusts Act 1882.

16.2 Words importing the singular shall include the plural and vice versa, and words importing any gender shall include every gender.

16.3 If any provision of this Will shall be held to be invalid or unenforceable by any court of competent jurisdiction, the remaining provisions shall continue in full force and effect.

16.4 References to any Act of Parliament or statutory provision shall include that Act or provision as from time to time amended, extended, re-enacted, or consolidated, and shall include any statutory instrument, rule, regulation, order, notification, or circular made thereunder.

16.5 All monetary amounts in this Will are expressed in Indian Rupees (INR) and are approximate values as at the date of execution. The actual values at the date of my death may differ and the bequests shall take effect regardless of changes in value.

---

## 17. ATTESTATION

**IN WITNESS WHEREOF** I, **DR. ANANYA SHARMA**, the Testator, have hereunto set my hand to this my last Will and Testament on this **9th day of March 2024**, at 14B Malabar Hill Road, Mumbai 400006, Maharashtra, India.

&nbsp;

**SIGNED** by the above-named Testator )

**DR. ANANYA SHARMA** )

as and for her last Will and Testament )

in the presence of us both present at the )

same time who at her request in her )

presence and in the presence of each ) ________________________

other have hereunto subscribed our ) Signature of Testator

names as witnesses: )

&nbsp;

---

**FIRST WITNESS:**

Signed: ________________________

Name: **DR. MEERA IYER**

Address: 18 Napean Sea Road, Mumbai 400006

Occupation: Physician (Nephrologist), Breach Candy Hospital

PAN No.: JKLPI7890D

&nbsp;

**SECOND WITNESS:**

Signed: ________________________

Name: **MR. SURESH NAIR**

Address: 14A Malabar Hill Road, Mumbai 400006

Occupation: Retired banker (State Bank of India)

PAN No.: MNOPN1234E

&nbsp;

---

*This is a demonstration document prepared for INHERIT schema testing. It does not constitute a valid legal instrument and should not be relied upon as legal advice. The Hindu Succession Act 1956, the Hindu Succession (Amendment) Act 2005, the Indian Succession Act 1925, and the laws governing Hindu Undivided Family property, stridhan, coparcenary rights, and mixed-faith succession are exceptionally complex. Any person in a similar situation should seek independent legal advice from a practitioner qualified in Indian succession law, with specific expertise in Hindu personal law and the implications of inter-faith marriage for downstream succession.*
