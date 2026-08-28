---
title: "Last Will and Testament of Pierre Jean-Marie Dubois"
version: "1.0"
status: approved
date: 2026-04-12T16:00
lastmod: 2026-04-12T16:00
author: "Rich Davies"
source: "examples/wills/england-wales/pierre-dubois/pierre-dubois-story-v0001.md"
---

# Last Will and Testament of Pierre Jean-Marie Dubois

**Jurisdiction:** England & Wales (primary); France (immovable property — overridden by Brussels IV election)
**Date of execution:** Wednesday 11 September 2024
**Complexity:** Complex
**PDF:** `pierres-will.pdf` (in Downloads or generated from this source)
**Fixture:** `pierre-dubois-inherit-v0001.json` (to be created in this folder)

## What this will tests

This will exercises the following INHERIT capabilities:

- **EU Succession extension** (`eu-succession`): `brusselsIV` choice of law with `nationalityElection: true` — French national electing English law for entire succession including French immovable property
- **`forcedHeirshipVariant`**: `model: french_reserve` with `reservedFraction: 2/3` — two children, each entitled to 1/3 under the reserve hereditaire — expressly overridden by Brussels IV election
- **`postBrexitHandling`**: UK is not an EU member state; the election is made under French/EU law, and recognised by France, but England applies its own domestic succession law regardless
- **`governingJurisdictions`** on the estate: dual jurisdiction (England & Wales for movables and domicile; France for situs of the villa) unified by Brussels IV election
- **`successionRegime`** per clause: the French villa bequest carries `determinedBy: choice_of_law` with treaty reference, while other bequests carry `determinedBy: domicile`
- **`cohabitantRights`** (UK England & Wales extension): Margaret Hartley as cohabiting partner with potential Inheritance Act 1975 claim as `maintained_person`
- **`familyProvisionClaims`**: potential claim by Margaret (cohabitant/maintained person) and potential claim by children (if Brussels IV election were challenged)
- **Cross-border property**: leasehold London flat (`tenureType: leasehold`, `leaseLengthYears: 125`) vs freehold French villa (`tenureType: ownership`)
- **Multi-currency estate**: GBP assets (London flat, Barclays account, wine, art) and EUR assets (French villa, Credit Agricole account) — tests `money.currency` diversity
- **Wine collection** as `assetCategory: collectible` with `storageLocation` and bottle count via `identifiers`
- **Art collection** with multiple items, minor Impressionist provenance, and aggregate valuation
- **Specific bequests** to named individuals (wine to Luc, art to Sophie) with `mentionedAssetIds`
- **Charitable bequest** to Medecins Sans Frontieres UK (charity 1026588) with `charityRegistrationNumber`
- **Joint bequest** to two beneficiaries equally (`sharePercentage: 50`) for the French villa
- **Residuary bequest** to non-spouse cohabitant (Margaret) — London flat and residue
- **28-day survivorship** with `conditionType: survival_period` and `failureConsequence: lapse_to_residue`
- **`executorPowers`**: Trustee Act 2000 (general management), sale/postpone, appropriation, insurance
- **`statutoryExclusions`**: Apportionment Act 1870 ss.2-4
- **`administrationPhases`**: debts, funeral costs, specific bequests, residue
- **Funeral wishes**: cremation with ashes scattered in a specific foreign location (Mougins, France)
- **Divorce and ex-spouse**: Isabelle Moreau recorded as former spouse — tests `relationshipType: former_marriage` and exclusion from estate
- **`registryReference`**: FCDDV (Fichier Central des Dispositions de Dernieres Volontes) — French central will registry where cross-border wills are registered
- **Attestation**: two witnesses, English law formalities (Wills Act 1837 s.9)

## People

| Person | Role | Relationship to testator |
|--------|------|--------------------------|
| Pierre Jean-Marie Dubois | Testator | -- |
| Margaret Anne Hartley | Executor (primary), beneficiary (residue + London flat) | Cohabiting partner (8 years) |
| Sophie Marie Dubois | Executor (substitute), beneficiary (art collection + 50% French villa) | Daughter |
| Luc Antoine Dubois | Beneficiary (wine collection + 50% French villa) | Son |
| Isabelle Claire Moreau | Former spouse (excluded) | Ex-wife (divorced) |
| Medecins Sans Frontieres UK | Beneficiary (charitable bequest) | Charity (reg. 1026588) |
| Dr. James Edward Whitfield | Witness | Solicitor |
| Annabel Frances Thornton | Witness | Solicitor's clerk |

---

## Full will text

<br>

<div style="text-align: centre;">

# LAST WILL AND TESTAMENT

# OF

# PIERRE JEAN-MARIE DUBOIS

</div>

---

**THIS IS THE LAST WILL AND TESTAMENT** of me, **PIERRE JEAN-MARIE DUBOIS**, a French national, born on the 14th day of March 1958 at Bordeaux, France, now domiciled in England and residing at 14 Kensington Court, London W8 5DL, England (hereinafter called "the Testator").

---

## 1. REVOCATION

1.1 I hereby revoke all former Wills, Codicils and Testamentary Dispositions made by me, whether in England, in France, or in any other jurisdiction, and declare this to be my last Will.

---

## 2. CHOICE OF LAW — BRUSSELS IV ELECTION

2.1 I am a national of the French Republic. I have been habitually resident in England since 2009 and am domiciled in England for the purposes of English private international law.

2.2 Pursuant to Article 22 of Regulation (EU) No 650/2012 of the European Parliament and of the Council of 4 July 2012 on jurisdiction, applicable law, recognition and enforcement of decisions and acceptance and authentication of authentic instruments in matters of succession and on the creation of a European Certificate of Succession (hereinafter "the Brussels IV Regulation"), **I hereby elect that the law of England and Wales shall govern the succession to my entire estate, including all immovable property situated in France or in any other jurisdiction**.

2.3 I make this election by virtue of my domicile in England and the connection between my estate and the laws of England and Wales. I am aware that, absent this election, the law of my habitual residence (England) would apply to my movable property and that, under French domestic law, the French immovable property might be subject to the reserve hereditaire. It is my express intention that the law of England and Wales, with its principle of testamentary freedom, shall govern the succession to all of my assets, movable and immovable, wherever situated.

2.4 I acknowledge that France, as a participating Member State of the Brussels IV Regulation, is bound to recognise this election. I further acknowledge that the United Kingdom is not a participating Member State of the Brussels IV Regulation, and that English courts will apply English domestic succession law by reason of my English domicile, irrespective of this election. This election is therefore directed primarily at the French courts and any other courts within the European Union that may assert jurisdiction over any part of my estate.

2.5 I direct that this Will shall be registered with the Fichier Central des Dispositions de Dernieres Volontes (FCDDV), the French central register of wills, so that French authorities may be informed of this election and of the existence of this Will.

---

## 3. APPOINTMENT OF EXECUTORS AND TRUSTEES

3.1 I appoint my partner **MARGARET ANNE HARTLEY** of 14 Kensington Court, London W8 5DL, England as the sole Executor and Trustee of this my Will (hereinafter called "my Executor").

3.2 If the said Margaret Anne Hartley shall predecease me or shall be unable or unwilling to act as Executor, I appoint my daughter **SOPHIE MARIE DUBOIS** of 45 Rue du Faubourg Saint-Honore, 75008 Paris, France as substitute Executor and Trustee.

3.3 I direct my Executor to instruct a solicitor qualified in English law and, separately, a notaire qualified in French law to assist with the administration of my estate in the respective jurisdictions.

---

## 4. SPECIFIC BEQUESTS

Subject to the payment of my debts, funeral expenses and testamentary expenses, I make the following specific bequests:

### (a) Wine Collection to Luc

4.1 I bequeath the whole of my wine collection, currently stored at London City Bond, 11 Pollen Street, London, comprising approximately four hundred and fifty (450) bottles and estimated to be worth approximately EIGHTY THOUSAND POUNDS (GBP 80,000), to my son **LUC ANTOINE DUBOIS** of 12 Quai Saint-Antoine, 69002 Lyon, France.

4.2 I express the wish that Luc shall not dispose of the wines in haste but shall enjoy them over time, and that he shall share them with his sister Sophie on occasions that bring them together. This wish is precatory and not binding.

### (b) Art Collection to Sophie

4.3 I bequeath the whole of my art collection, comprising three paintings by minor Impressionist artists, estimated in the aggregate to be worth approximately TWO HUNDRED THOUSAND POUNDS (GBP 200,000), to my daughter **SOPHIE MARIE DUBOIS** of the address given above.

4.4 The said paintings are currently held at my London residence. Sophie shall be entitled to remove them to any jurisdiction she chooses, and I ask that she display them with the care and regard that I have always shown them.

### (c) Charitable Bequest to Medecins Sans Frontieres

4.5 I bequeath the sum of **TWENTY THOUSAND POUNDS (GBP 20,000)** to **MEDECINS SANS FRONTIERES UK** (registered charity number 1026588, registered address Lower Ground Floor, Chancery Exchange, 10 Furnival Street, London EC4A 1AB).

4.6 I direct that the said sum shall be applied towards the general charitable purposes of Medecins Sans Frontieres UK. I direct my Executor to obtain a receipt from the said charity and to claim any applicable Gift Aid relief or charitable exemption from Inheritance Tax on this bequest.

---

## 5. THE FRENCH VILLA — SOPHIE AND LUC EQUALLY

5.1 I devise my villa and the land appertaining thereto, known as 7 Chemin des Oliviers, 06250 Mougins, Alpes-Maritimes, France, registered at the Cadastre under references to be identified by my notaire, to my said children **SOPHIE MARIE DUBOIS** and **LUC ANTOINE DUBOIS** in equal shares absolutely as tenants in common.

5.2 I record that this devise is made under, and takes effect by virtue of, the law of England and Wales, as elected pursuant to Article 22 of the Brussels IV Regulation in Clause 2 above. I have deliberately chosen not to follow the rules of the French reserve hereditaire, which would otherwise require that two-thirds (2/3) of the value of the French immovable property be distributed among my children in defined proportions. Under the law of England and Wales, I enjoy full testamentary freedom, and I exercise it by devising the French villa to my children in equal shares.

5.3 If either Sophie or Luc shall predecease me, the share of the deceased child shall pass to the survivor of them absolutely.

---

## 6. LONDON FLAT AND RESIDUARY ESTATE

6.1 I devise my leasehold flat at 14 Kensington Court, London W8 5DL, England, held on a lease of one hundred and twenty-five (125) years, to my partner **MARGARET ANNE HARTLEY** of that address absolutely.

6.2 Subject to the payment of my debts, funeral expenses, testamentary expenses and the specific bequests set out above, I give, devise and bequeath the whole of the rest, residue and remainder of my estate, of whatsoever nature and wheresoever situated, including but not limited to:

   (a) my current account with Barclays Bank PLC (sort code 20-45-67, account number ending 8901);

   (b) my savings account with Credit Agricole S.A. (IBAN FR76 3000 6000 0112 3456 7890 189); and

   (c) all other property, investments, chattels and effects not otherwise specifically disposed of by this Will,

to the said **MARGARET ANNE HARTLEY** absolutely.

6.3 I record that Margaret Anne Hartley has been my cohabiting partner for approximately eight (8) years and that she has been maintained by me during that period. I make this provision for her in recognition of her devotion and companionship, and with the intention that she should be adequately provided for after my death. For the avoidance of doubt, this provision is not made in satisfaction of any claim she might bring under the Inheritance (Provision for Family and Dependants) Act 1975, and any such claim is a matter for the court.

---

## 7. SURVIVORSHIP

7.1 If any individual beneficiary named in this Will (other than Medecins Sans Frontieres UK) shall die within twenty-eight (28) days of the date of my death, or in circumstances rendering it uncertain which of us survived the other, then the gift or devise to that beneficiary shall lapse and shall fall into and form part of the residue of my estate.

7.2 The provisions of section 184 of the Law of Property Act 1925 (commorientes) shall not apply to this Will.

---

## 8. ADMINISTRATIVE POWERS

8.1 In addition to all powers conferred upon them by law, my Executor and Trustee (and any substitute) shall have the following powers, to be exercised at their absolute discretion:

### (a) General Management

8.2 All the powers of investment, delegation and insurance conferred by the Trustee Act 2000 as if my Executor were a trust corporation.

### (b) Power of Sale and Postponement

8.3 Power to sell, call in and convert into money the whole or any part of my estate at such time or times and in such manner as my Executor shall think fit, and to postpone the sale, calling in or conversion of any part of my estate for so long as my Executor shall in her absolute discretion think fit, without being liable for any loss occasioned thereby.

### (c) Power of Appropriation

8.4 Power to appropriate any asset forming part of my estate in or towards the satisfaction of any legacy or share of residue, without the consent of any person, and for this purpose I dispense with the requirements of section 41 of the Administration of Estates Act 1925 as to consents.

### (d) Power to Insure

8.5 Power to insure any property forming part of my estate against loss or damage from any cause and to pay the premiums out of the income or capital of my estate.

### (e) Power to Act in France

8.6 Power to instruct a notaire in France and to do all things necessary to give effect to this Will in France, including but not limited to the registration of this Will with the Fichier Central des Dispositions de Dernieres Volontes (FCDDV), the obtaining of a European Certificate of Succession if required, and the transfer of title to the French villa pursuant to Clause 5.

---

## 9. EXCLUSION OF APPORTIONMENT ACT

9.1 The provisions of the Apportionment Act 1870 (sections 2, 3 and 4) shall not apply to my estate. All dividends, interest and other income accruing on my investments shall be treated as income or capital according to the date of receipt and not according to the period in respect of which they accrue.

---

## 10. FORMER MARRIAGE

10.1 I record that I was formerly married to **ISABELLE CLAIRE MOREAU** of 88 Avenue de Wagram, 75017 Paris, France, and that our marriage was dissolved by a final decree of divorce pronounced by the Tribunal de Grande Instance de Bordeaux on the 3rd day of June 2005. I make no provision for Isabelle in this Will.

---

## 11. FUNERAL WISHES

11.1 I direct that upon my death my body shall be cremated.

11.2 I express the wish that my ashes shall be taken to Mougins, Alpes-Maritimes, France, and scattered in the garden of my villa at 7 Chemin des Oliviers, or if that villa has been sold, at such other place in the commune of Mougins as my children Sophie and Luc shall together determine.

11.3 I express the wish that no religious ceremony be held, but that my family and friends shall gather informally to celebrate my life, preferably with good wine.

---

## 12. ATTESTATION

**IN WITNESS WHEREOF** I, **PIERRE JEAN-MARIE DUBOIS**, the Testator, have hereunto set my hand to this my Last Will and Testament on this **11th day of September 2024**.

&nbsp;

**SIGNED** by the above-named Testator )

**PIERRE JEAN-MARIE DUBOIS** )

as and for his last Will in the )

presence of us both present at the )

same time who at his request in his )

presence and in the presence of each ) ________________________

other have hereunto subscribed our ) Signature of Testator

names as witnesses: )

&nbsp;

---

**FIRST WITNESS:**

Signed: ________________________

Name: **DR. JAMES EDWARD WHITFIELD**

Address: Whitfield & Partners LLP, 3 Raymond Buildings, Gray's Inn, London WC1R 5BH

Occupation: Solicitor

&nbsp;

**SECOND WITNESS:**

Signed: ________________________

Name: **ANNABEL FRANCES THORNTON**

Address: Whitfield & Partners LLP, 3 Raymond Buildings, Gray's Inn, London WC1R 5BH

Occupation: Solicitor's Clerk

&nbsp;

---

*This is a demonstration document created for the INHERIT open estate data standard. It does not constitute a valid legal instrument. All names, addresses, and identifying details are fictional. Any resemblance to real persons, living or dead, is coincidental.*
