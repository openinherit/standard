---
title: "Last Will and Testament of Chief George Okafor"
version: "1.0"
status: draft
date: 2026-04-12T23:55
lastmod: 2026-04-12T23:55
author: "Rich Davies"
source: "examples/wills/nigeria/george-okafor/george-okafor-story-v0001.md"
---

# Last Will and Testament of Chief George Okafor

**Jurisdiction:** England & Wales (London assets); Federal Republic of Nigeria / Igbo customary law (Lagos assets)
**Date of execution:** Friday 7 June 2024
**Complexity:** Very complex (dual legal systems, customary law conflict, chieftaincy, geographic executor scope)
**Fixture:** `george-okafor-inherit-v0001.json` (to be created in this folder)

## What this will tests

This will exercises the following INHERIT capabilities:

- **`parallelSuccessionConflicts`** — irreconcilable conflict between English testamentary freedom and Igbo customary law giving the eldest son (Chukwuemeka) custodial rights over family land; the will attempts to override custom with a testamentary disposition but the testator himself acknowledges this may fail
- **Specialist executor scope (geographic)** — Nkechi as executor for English assets, Chukwuemeka as executor for Nigerian assets; dual executors with non-overlapping jurisdictions
- **Life interest trust (London property)** — London townhouse held on trust for Adaeze for life, remainder to four children equally
- **Chieftaincy title on person** — non-property cultural/ceremonial title passed to eldest son; not an asset but a `wish` with cultural significance
- **Dual funeral wishes** — traditional Igbo burial rites in Lagos, followed by memorial service in London; geographically split funeral arrangements
- **Multi-jurisdiction `governingJurisdictions`** — England & Wales for London assets, Nigeria (both statutory and customary) for Lagos assets
- **`connections`** — business relationships (Okafor Holdings Ltd), solicitor relationships
- **`constructionClauses`** — English and Nigerian statutory interpretation clauses
- **`disinheritedPersons`** — none disinherited, but explicit equal treatment despite customary law favouring the eldest son; the absence of disinheritance is itself a data point
- **`asset-categories`** — real property (two jurisdictions, different tenure types: freehold vs customary), business (company shares), vehicles, bank accounts (two currencies)
- **`kinship`** — parent-child biological (four children), spousal (marriage), sibling relationships among the children
- **`administrationPhases`** — debts → funeral → specific bequests → life interest → business transfer → residue
- **Customary tenure** — Lagos compound held under customary law (family land), not registered freehold
- **`conditionType: "restriction"`** — prohibition on sale of Lagos compound outside the Okafor family
- **`nonprobateTransfers`** — none (all assets pass through estate), but customary law creates a parallel claim outside the will
- **`taxReliefEligibility`** — potential Business Property Relief for Okafor Holdings Ltd shares (not a quoted company)
- **`wish`** — chieftaincy succession, funeral rites, family unity plea

## People

| Person | Role | Relationship to testator |
|--------|------|--------------------------|
| Chief George Okafor | Testator | — |
| Chief Mrs Adaeze Okafor | Beneficiary (life interest), life tenant | Wife |
| Chukwuemeka Okafor | Beneficiary, executor (Nigerian assets), chieftaincy heir | Eldest son |
| Nkechi Okafor | Beneficiary, executor (English assets) | Daughter |
| Obiora Okafor | Beneficiary, co-manager (business) | Son |
| Amara Okafor | Beneficiary | Daughter |
| Barrister Emeka Ibe | Legal adviser (Nigeria) | Solicitor (Lagos) |
| Mr James Whitfield | Legal adviser (England) | Solicitor (London) |
| Dr. Funke Adeyemi | Witness | Family friend |
| Mr. Colin Hartley | Witness | Neighbour (London) |

---

## Full will text

<br>

<div style="text-align: centre;">

# LAST WILL AND TESTAMENT

# OF

# CHIEF GEORGE CHUKWUDI OKAFOR

</div>

---

**THIS IS THE LAST WILL AND TESTAMENT** of me, **CHIEF GEORGE CHUKWUDI OKAFOR** (Nigerian passport number A12345678; British passport number 987654321), a dual national of the Federal Republic of Nigeria and the United Kingdom of Great Britain and Northern Ireland, domiciled in England, maintaining residences at:

- **London:** 28 Holland Park Avenue, London W11 3QU, England; and
- **Lagos:** Plot 15, Okafor Compound, Chief Okafor Close, off Adeola Odeku Street, Victoria Island, Lagos, Nigeria

(hereinafter called "the Testator").

---

## 1. REVOCATION

1.1 I hereby revoke all former Wills, Codicils and Testamentary Dispositions heretofore made by me, whether in England and Wales, the Federal Republic of Nigeria, or any other jurisdiction, and declare this to be my last Will.

---

## 2. GOVERNING LAW AND JURISDICTION

2.1 I direct that this Will shall be governed by and construed in accordance with the laws of England and Wales in respect of all assets situated in the United Kingdom (hereinafter "my English Estate").

2.2 In respect of all assets situated in the Federal Republic of Nigeria (hereinafter "my Nigerian Estate"), I direct that this Will shall, so far as practicable, be governed by the statutory laws of the Federal Republic of Nigeria, and in particular by the provisions of the Wills Act 1837 (as received into Nigerian law) and the Administration of Estates Law of Lagos State.

2.3 I acknowledge that the compound and family land at Plot 15, Okafor Compound, Chief Okafor Close, off Adeola Odeku Street, Victoria Island, Lagos (hereinafter "the Lagos Compound") is held under customary tenure and may be subject to the customary law of the Igbo people of south-eastern Nigeria, under which the eldest son traditionally has custodial and managerial rights over family land. I address this conflict in Clause 9 below.

2.4 In the event of any conflict between English law and Nigerian statutory law in respect of the Nigerian Estate, the laws of the Federal Republic of Nigeria shall prevail. In the event of any conflict between Nigerian statutory law and Igbo customary law in respect of the Lagos Compound, I express my testamentary intention in Clause 9, while acknowledging the limitations set out therein.

---

## 3. APPOINTMENT OF EXECUTORS

### English Estate

3.1 I appoint my daughter **NKECHI OKAFOR** of 14 Ladbroke Grove, London W11 3BG as the sole Executor and Trustee of my English Estate (hereinafter "my English Executor").

3.2 If Nkechi shall predecease me or shall be unwilling or unable to act, I appoint **MR. JAMES WHITFIELD** of Whitfield & Crane LLP, 22 Lincoln's Inn Fields, London WC2A 3ED as substitute Executor of my English Estate.

3.3 My English Executor shall have all the powers conferred upon personal representatives and trustees by the Trustee Act 2000 and by the laws of England and Wales.

### Nigerian Estate

3.4 I appoint my eldest son **CHUKWUEMEKA GEORGE OKAFOR** of Plot 15, Okafor Compound, Chief Okafor Close, off Adeola Odeku Street, Victoria Island, Lagos, Nigeria as the sole Executor and Trustee of my Nigerian Estate (hereinafter "my Nigerian Executor").

3.5 If Chukwuemeka shall predecease me or shall be unwilling or unable to act, I appoint my son **OBIORA OKAFOR** of No. 8, Akin Adesola Street, Victoria Island, Lagos, Nigeria as substitute Executor of my Nigerian Estate.

3.6 My Nigerian Executor shall apply to the Probate Registry of the High Court of Lagos State for a Grant of Probate in respect of my Nigerian Estate and shall have all the powers conferred upon personal representatives by the laws of Lagos State.

3.7 I direct that my English Executor and my Nigerian Executor shall co-operate with each other in the administration of my estate and shall each recognise the authority of the other within his or her respective jurisdiction. Neither executor shall have authority over the assets within the other's jurisdiction save with the written consent of that executor.

---

## 4. PAYMENT OF DEBTS AND EXPENSES

4.1 I direct my English Executor to pay all my debts, funeral expenses and testamentary expenses relating to my English Estate from the assets of my English Estate.

4.2 I direct my Nigerian Executor to pay all my debts, funeral expenses and testamentary expenses relating to my Nigerian Estate from the assets of my Nigerian Estate.

4.3 Any debt which is not clearly attributable to one jurisdiction shall be borne by my English Estate and my Nigerian Estate in proportion to their respective net values, as agreed between my two Executors.

---

## 5. FUNERAL WISHES

### Traditional Igbo Burial — Lagos

5.1 I wish that, upon my death, my body shall be conveyed to Lagos, Nigeria, for burial in accordance with Igbo traditional burial rites (ikwa ozu). Specifically:

   (a) My body shall be prepared and dressed in full traditional Igbo chief's regalia, including the red chieftaincy cap (fez) and the ceremonial wrapper;

   (b) A lying-in-state shall be held at the Lagos Compound for a period of three (3) days, during which family members, friends, associates, and members of the Okafor kindred (umunna) shall pay their respects;

   (c) Traditional rites appropriate to a titled Igbo chief shall be observed, including the firing of the cannon (where local regulations permit) and the breaking of kola nut (igo ofo);

   (d) I shall be buried in the grounds of the Lagos Compound, beside the graves of my father **CHIEF MAZI OKAFOR** and my mother **LOLO NGOZI OKAFOR**, at the family burial ground;

   (e) A Christian thanksgiving service shall be held at the Chapel of Christ the King, Victoria Island, Lagos, on the day following the burial; and

   (f) Funeral expenses shall be borne by my Nigerian Estate.

### Memorial Service — London

5.2 I wish that, following the burial in Lagos, a memorial service shall be held at **St John's Church, Holland Park, London W11**, at a time convenient to my family in London.

5.3 These wishes are expressions of my desire and are not binding upon my Executors, save that I express the strongest possible wish that my body be buried in Lagos in accordance with paragraph 5.1 above and not cremated.

---

## 6. LONDON TOWNHOUSE — LIFE INTEREST FOR MY WIFE

6.1 I give, devise and bequeath my freehold property at 28 Holland Park Avenue, London W11 3QU, registered at HM Land Registry under Title Number NGL123456 (the "London Townhouse"), to my English Executor upon trust to permit my wife **CHIEF MRS ADAEZE OKAFOR** to reside therein for the remainder of her natural life, and to receive any income therefrom (hereinafter the "Life Interest").

6.2 During the subsistence of the Life Interest:

   (a) My wife shall be entitled to reside in the London Townhouse rent-free;

   (b) My wife shall be responsible for the payment of council tax, utility charges, and buildings insurance, and shall keep the property in reasonable repair;

   (c) My wife shall not sell, mortgage, charge, sublet, or otherwise encumber the London Townhouse without the written consent of my English Executor; and

   (d) My wife may, with the written consent of my English Executor, vacate the London Townhouse and let it on an assured shorthold tenancy, receiving the rent as income during the Life Interest.

6.3 Upon the death of my wife, or upon her voluntarily surrendering the Life Interest in writing, the London Townhouse shall pass absolutely to my four children — **CHUKWUEMEKA OKAFOR**, **NKECHI OKAFOR**, **OBIORA OKAFOR**, and **AMARA OKAFOR** — in equal shares as tenants in common.

6.4 If any of my children shall predecease my wife (or me, if my wife predeceases me) leaving issue, the share of such deceased child shall pass to his or her issue per stirpes. If any of my children shall predecease without issue, his or her share shall be divided equally among the surviving children.

---

## 7. UNITED KINGDOM FINANCIAL ASSETS

7.1 I give and bequeath the balances standing to the credit of my Barclays Bank UK current account (account number 30456789, sort code 20-45-67) and my Barclays Bank UK savings account (account number 98765432, sort code 20-45-67), totalling approximately **SIX HUNDRED THOUSAND POUNDS STERLING (GBP 600,000)**, to my wife **CHIEF MRS ADAEZE OKAFOR** absolutely.

7.2 I give and bequeath my motor vehicle, a Mercedes-Benz S-Class saloon (registration number LG72 OKF), to my daughter **NKECHI OKAFOR** absolutely.

---

## 8. OKAFOR HOLDINGS LTD — NIGERIAN BUSINESS

8.1 I give and bequeath my entire shareholding in **OKAFOR HOLDINGS LIMITED**, a company incorporated under the laws of the Federal Republic of Nigeria (RC Number 123456), being 10,000 ordinary shares of NGN 1.00 each (representing one hundred per centum of the issued share capital), to my sons **CHUKWUEMEKA GEORGE OKAFOR** and **OBIORA OKAFOR** in equal shares.

8.2 I direct that Chukwuemeka and Obiora shall serve as joint Managing Directors of the company and shall carry on the business in accordance with the company's memorandum and articles of association.

8.3 I express the wish, which I acknowledge is precatory and not binding, that Chukwuemeka and Obiora shall conduct the business honestly and in good faith, shall maintain the company's reputation, and shall provide employment to members of the Okafor family where reasonably practicable.

8.4 I record that Okafor Holdings Limited is a trading company engaged in import and export, and that it is not a quoted company. I draw my Nigerian Executor's attention to the possibility that the transfer of shares in the company may qualify for Business Property Relief under the applicable tax laws.

---

## 9. LAGOS COMPOUND — CUSTOMARY LAW CONFLICT

9.1 I give, devise and bequeath the Lagos Compound, being the property and land at Plot 15, Okafor Compound, Chief Okafor Close, off Adeola Odeku Street, Victoria Island, Lagos, Nigeria, to my four children — **CHUKWUEMEKA OKAFOR**, **NKECHI OKAFOR**, **OBIORA OKAFOR**, and **AMARA OKAFOR** — in equal shares as tenants in common.

### Acknowledgement of Customary Law Conflict

9.2 I acknowledge that the Lagos Compound is family land originally acquired by my late father, Chief Mazi Okafor, and that under the customary law of the Igbo people (as affirmed in the decisions of the Nigerian courts, including *Onwugbufor v Okoye* [1996] 1 NWLR (Pt. 424) 252 and *Nzekwu v Nzekwu* [1989] 2 NWLR (Pt. 104) 373), the eldest son has a right of custodianship (or "management") over the family land, which includes the right to occupy the principal dwelling and to manage the land on behalf of the family.

9.3 I acknowledge that my testamentary direction in Clause 9.1 — to divide the Lagos Compound equally among my four children — may conflict with the customary law position, and that any of my children (or any member of the Okafor kindred) may challenge this disposition on the grounds of customary law.

9.4 I nevertheless express my clear and emphatic testamentary intention that all four of my children, whether sons or daughters, shall share equally in the Lagos Compound. I reject the customary distinction between sons and daughters for the purposes of inheritance, and I direct that my daughters Nkechi and Amara shall have the same rights of ownership and occupation as my sons Chukwuemeka and Obiora.

9.5 I recognise, however, that this testamentary direction may be overridden by a court of competent jurisdiction in Nigeria applying customary law, and I make the following provision in the event that occurs:

   (a) If a Nigerian court determines that Chukwuemeka, as the eldest son, has custodial rights over the Lagos Compound under customary law, I direct that Chukwuemeka shall hold the compound on behalf of the entire Okafor family (including Nkechi, Obiora, and Amara) and shall not sell, mortgage, or encumber the compound without the unanimous written consent of all four of my children;

   (b) All four children shall have equal rights of access to and use of the compound; and

   (c) Chukwuemeka shall not exclude any of his siblings from the compound or from the enjoyment of any income derived therefrom.

9.6 I direct that the Lagos Compound shall not, under any circumstances, be sold, transferred, or disposed of to any person outside the Okafor family (meaning my lineal descendants and their issue) without the unanimous written consent of all my living children (or, after the death of any child, the consent of that child's eldest surviving issue of full age).

### Direction to My Executors and Children

9.7 I urge my Executors and my children, with the greatest possible emphasis, to resolve any dispute regarding the Lagos Compound amicably and within the family, without resort to litigation. The compound has been in the Okafor family for three generations and I wish it to remain so. I have seen too many Nigerian families destroyed by inheritance disputes, and I implore my children not to follow that path.

---

## 10. NIGERIAN FINANCIAL ASSETS

10.1 I give and bequeath the balances standing to the credit of my First Bank of Nigeria accounts (savings account number 2012345678 and current account number 2087654321, both at the Victoria Island branch), totalling approximately **FORTY-FIVE MILLION NAIRA (NGN 45,000,000)**, to my four children in equal shares absolutely.

10.2 I give and bequeath my motor vehicle in Nigeria, a Range Rover Vogue (registration number LND-123-KJ), to my son **OBIORA OKAFOR** absolutely.

---

## 11. CHIEFTAINCY TITLE

11.1 I record that I hold the hereditary chieftaincy title of **Ichie Obi** of Okafor kindred. This title is not a property right and cannot be bequeathed by Will, but is governed by the customs and traditions of the Okafor kindred and the wider Igbo community.

11.2 I express my wish that, in accordance with Igbo tradition, the chieftaincy title shall pass to my eldest son **CHUKWUEMEKA GEORGE OKAFOR**, and I urge the elders of the Okafor kindred and the community to bestow the title upon him.

11.3 I direct that the costs of any chieftaincy installation ceremony shall be borne by my Nigerian Estate, up to a maximum of **TWO MILLION NAIRA (NGN 2,000,000)**.

11.4 This clause is precatory and I acknowledge that the conferral of a chieftaincy title is a matter for the community and not for testamentary disposition.

---

## 12. RESIDUARY ESTATE

### English Residue

12.1 Subject to the payment of all debts, funeral expenses, testamentary expenses and specific devises and bequests relating to my English Estate, I give, devise and bequeath all the rest and residue of my English Estate to my four children — **CHUKWUEMEKA OKAFOR**, **NKECHI OKAFOR**, **OBIORA OKAFOR**, and **AMARA OKAFOR** — in equal shares absolutely.

### Nigerian Residue

12.2 Subject to the payment of all debts, funeral expenses, testamentary expenses and specific devises and bequests relating to my Nigerian Estate, I give, devise and bequeath all the rest and residue of my Nigerian Estate to my four children in equal shares absolutely.

12.3 If any child shall predecease me leaving issue, the share of such deceased child in the residuary estate (whether English or Nigerian) shall pass to his or her issue per stirpes. If any child shall predecease me without issue, the deceased child's share shall be divided equally among the surviving children.

---

## 13. SURVIVORSHIP CLAUSE

13.1 If any beneficiary named in this Will shall die within twenty-eight (28) days of the date of my death, or in circumstances rendering it uncertain which of us survived the other, then the gift to that beneficiary shall take effect as if that beneficiary had predeceased me.

---

## 14. GENERAL PROVISIONS

14.1 The Apportionment Act 1870 (in respect of my English Estate) shall not apply to my estate.

14.2 Words importing the singular shall include the plural and vice versa, and words importing any gender shall include every gender.

14.3 References to any statute or statutory provision, whether of England and Wales or of the Federal Republic of Nigeria, shall include that statute or provision as from time to time amended, extended, re-enacted, or consolidated.

14.4 If any provision of this Will shall be held to be invalid or unenforceable in any jurisdiction, the remaining provisions shall continue in full force and effect.

14.5 This Will has been prepared with the advice of legal counsel in both England and Nigeria, namely **MR. JAMES WHITFIELD** of Whitfield & Crane LLP, London, and **BARRISTER EMEKA IBE** of Ibe & Associates, 45 Broad Street, Lagos. I have received independent advice from each as to the laws of their respective jurisdictions and the potential conflicts between them.

---

## 15. MY FINAL WORDS TO MY CHILDREN

15.1 I wish to record the following, which I ask my children to read and to take to heart:

I came to England from Nigeria in 1985 with nothing but my education, my determination, and the prayers of my mother. By the grace of God, I have built a life and a business that provides for my family in two countries. I have tried in this Will to treat all four of you equally, because you are all equally my children and I love you all without distinction.

I know that our tradition favours the eldest son, and I know that Chukwuemeka has a special role in the family by virtue of custom. I do not ask him to abandon that role. But I do ask him — and I ask all of you — to remember that fairness and love are more important than tradition, and that a family united is worth more than any compound or any business.

Do not fight over what I leave behind. There is enough for all of you. Look after your mother. Look after each other.

Your father,

**Chief George Chukwudi Okafor**

---

## 16. ATTESTATION

**IN WITNESS WHEREOF** I, **CHIEF GEORGE CHUKWUDI OKAFOR**, the Testator, have hereunto set my hand to this my last Will and Testament on this **7th day of June 2024**, at 28 Holland Park Avenue, London W11 3QU.

&nbsp;

**SIGNED** by the above-named Testator )

**CHIEF GEORGE CHUKWUDI OKAFOR** )

as and for his last Will and Testament )

in the presence of us both present at the )

same time who at his request in his )

presence and in the presence of each ) ________________________

other have hereunto subscribed our ) Signature of Testator

names as witnesses: )

&nbsp;

---

**FIRST WITNESS:**

Signed: ________________________

Name: **DR. FUNKE ADEYEMI**

Address: 55 Campden Hill Road, London W8 7AS

Occupation: Consultant physician

&nbsp;

**SECOND WITNESS:**

Signed: ________________________

Name: **MR. COLIN HARTLEY**

Address: 30 Holland Park Avenue, London W11 3QU

Occupation: Retired civil servant

&nbsp;

---

*This is a demonstration document prepared for INHERIT schema testing. It does not constitute a valid legal instrument and should not be relied upon as legal advice. The interaction between English testamentary law and Nigerian customary law is exceptionally complex, and the testamentary provisions regarding the Lagos Compound may not be enforceable in a Nigerian court applying customary law. Any person in a similar situation should seek independent legal advice from practitioners qualified in both English and Nigerian law, with specific expertise in Igbo customary succession.*
