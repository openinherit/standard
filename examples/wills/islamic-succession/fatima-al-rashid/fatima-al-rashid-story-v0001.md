---
title: "Wasiyyah (Islamic Will) of Fatima binte Abdul Rahman"
version: "1.0"
status: approved
date: 2026-04-12T14:00
lastmod: 2026-04-12T14:00
author: "Rich Davies"
source: "examples/wills/islamic-succession/fatima-al-rashid/fatima-al-rashid-story-v0001.md"
---

# Wasiyyah (Islamic Will) of Fatima binte Abdul Rahman

**Jurisdiction:** Singapore (Wills Act, Cap 352; Administration of Muslim Law Act, Cap 3 — s.111)
**Date of execution:** Wednesday 15 November 2023
**Complexity:** Complex
**PDF:** `fatimas-will.pdf` (in Downloads or generated from this source)
**Fixture:** `fatima-al-rashid-inherit-v0001.json` (to be created in this folder)

## What this will tests

This will exercises the following INHERIT capabilities:

- **Islamic succession extension** (`islamic-succession`): `school: shafii`, `faraidApplies: true`, `wasiyyaRules` with `maxPortion: 33.33` and `toNonHeirsOnly: true`
- **Mahr as priority debt**: dedicated `mahr` field with `amount`, `agreed`, `paidInFull: false`, `outstandingAmount`, and `creditorPersonId`
- **Heir classifications**: `wife` (heirClass for testator's perspective — Yusuf as `husband`), `daughter` x2, `son` x1 — with `fixedShareFraction` and `residuaryClass` modelling
- **Syariah Court reference**: `islamicFormalities.shariaCourtReference` for the Inheritance Certificate
- **Singapore-Malaysia extension** (`singapore-malaysia`): `singaporeAMLA` with `school: shafii`, CPF exclusion via `cpfNominations` with `passesOutsideEstate: true`
- **HDB joint tenancy**: property with `tenureType` modelling and `passesOutsideEstate: true` (right of survivorship — excluded from estate)
- **Non-Muslim beneficiary under wasiyyah**: bequest to Chen Li Hua within the one-third limit, testing `toNonHeirsOnly` constraint
- **Dual-court process**: acknowledgement that the Syariah Court issues the Inheritance Certificate while the civil court grants probate
- **Specific bequests with cultural context**: gold jewellery with `significance: family_heirloom` and provenance (inherited from mother)
- **Charitable bequest**: pecuniary bequest to MUIS (Islamic Religious Council of Singapore) with purpose restriction
- **30-day survivorship clause** with `conditionType: survival_period`
- **Islamic funeral wishes**: burial rites, specific cemetery (Pusara Aman), gender-specific washing requirements
- **`administrationPhases`**: debts (including mahr) → funeral costs → wasiyyah bequests → faraid distribution
- **`nonprobateTransfers`**: CPF (separate nomination) and HDB joint tenancy both excluded from the distributable estate
- **Attestation**: two Muslim witnesses as required for wasiyyah validity
- **Parent-child kinship**: three children (Aisyah, Imran, Nurul) with `kinshipType: parent_child_biological`
- **Spousal relationship**: `relationshipType: marriage` with Islamic marriage context
- **Multiple asset types**: savings account, unit trusts, gold jewellery — testing `assetCategory` diversity

## People

| Person | Role | Relationship to testator |
|--------|------|--------------------------|
| Fatima binte Abdul Rahman | Testator | — |
| Yusuf bin Hassan | Executor (primary), beneficiary (faraid) | Husband |
| Ahmad bin Abdul Rahman | Executor (substitute) | Brother |
| Aisyah binte Yusuf | Beneficiary (specific bequest + faraid) | Eldest daughter |
| Imran bin Yusuf | Beneficiary (faraid) | Son |
| Nurul binte Yusuf | Beneficiary (faraid) | Youngest daughter |
| Chen Li Hua | Beneficiary (wasiyyah residue) | Friend (non-Muslim) |
| Majlis Ugama Islam Singapura (MUIS) | Beneficiary (charitable bequest) | Organisation |
| Muhammad Ismail bin Osman | Witness | Neighbour |
| Aminah binte Yusof | Witness | Colleague |

---

## Full will text

<br>

<div style="text-align: centre;">

# بسم الله الرحمن الرحيم

**BISMILLAHIR RAHMANIR RAHIM**

*In the name of Allah, the Most Gracious, the Most Merciful*

</div>

---

# WASIYYAH

# (LAST WILL AND TESTAMENT)

# OF

# FATIMA BINTE ABDUL RAHMAN

# (NRIC NO. S7512345C)

---

**THIS WASIYYAH** is made on the **15th day of November 2023** by me, **FATIMA BINTE ABDUL RAHMAN** (NRIC No. S7512345C), a Muslim woman of legal age and sound mind, domiciled in the Republic of Singapore, residing at Blk 501 Tampines Street 45, #12-345, Singapore 520501 (hereinafter called "the Testator").

---

## 1. DECLARATION OF FAITH AND PREAMBLE

1.1 I bear witness that there is no god but Allah (La ilaha illallah) and that Muhammad is the Messenger of Allah (Muhammadur Rasulullah). I make this Wasiyyah in full consciousness of my duty to Allah Subhanahu wa Ta'ala and in accordance with the teachings of Islam.

1.2 I acknowledge that I am a Muslim for the purposes of the Administration of Muslim Law Act (Cap 3) ("AMLA") and that the distribution of my estate shall be governed by Islamic law (Syariah) as administered in Singapore.

1.3 I acknowledge that under section 111 of AMLA, notwithstanding anything in the provisions of the English law or in any other written law, no Muslim domiciled in Singapore shall, after the commencement of AMLA, dispose of his or her property by will except in accordance with the provisions of and subject to the restrictions imposed by the school of Muslim law professed by the testator.

1.4 I profess the Shafi'i school of Muslim law (Mazhab Syafi'i).

---

## 2. REVOCATION OF FORMER WILLS

2.1 I hereby revoke all former Wills, Codicils, Wasiyyahs and Testamentary Dispositions heretofore made by me and declare this to be my last Wasiyyah.

---

## 3. LIMITATION OF THIS WASIYYAH — ONE-THIRD RULE

3.1 I acknowledge and declare that this Wasiyyah is limited to the disposal of not more than one-third (1/3) of my net estate (after the payment of my debts, funeral expenses and other obligations), in accordance with section 111 of AMLA and the principles of Islamic law as interpreted by the Shafi'i school.

3.2 I acknowledge and declare that the remaining two-thirds (2/3) of my net estate shall be distributed in accordance with the rules of Faraid (Islamic inheritance law) as certified by the Inheritance Certificate to be issued by the Syariah Court of Singapore.

3.3 If any bequest under this Wasiyyah, whether specific or general, shall cause the aggregate of all bequests to exceed one-third (1/3) of my net estate, then all bequests shall abate proportionally so that the total does not exceed the said one-third.

---

## 4. APPOINTMENT OF EXECUTOR (WASI)

4.1 I appoint my husband **YUSUF BIN HASSAN** (NRIC No. S7634567D) of Blk 501 Tampines Street 45, #12-345, Singapore 520501 as the sole Executor and Trustee of this my Wasiyyah (hereinafter called "my Executor").

4.2 If my said husband shall predecease me or shall be unwilling or unable to act as Executor, I appoint my brother **AHMAD BIN ABDUL RAHMAN** (NRIC No. S7012345E) of Blk 320 Jurong East Street 31, #08-456, Singapore 600320 as substitute Executor and Trustee.

4.3 My Executor shall have all the powers conferred upon personal representatives and trustees by the laws of Singapore, including but not limited to the power to sell, mortgage, lease, exchange, or otherwise dispose of any property forming part of my estate, and to invest, manage and apply the proceeds thereof.

4.4 My Executor shall, upon my death, apply to the Syariah Court of Singapore for an Inheritance Certificate (Sijil Faraid) to determine the Faraid beneficiaries and their respective shares in the two-thirds (2/3) portion of my net estate.

4.5 My Executor shall also apply to the appropriate civil court for a Grant of Probate in respect of this Wasiyyah, and shall administer my estate in accordance with both the Syariah Court Inheritance Certificate and this Wasiyyah.

---

## 5. PAYMENT OF DEBTS AND OBLIGATIONS

5.1 I direct my Executor to pay all my just debts, testamentary expenses, estate duty (if any) and funeral expenses from my estate in priority to any distribution or bequest.

5.2 **MAHR (DOWRY):** I acknowledge that there is an outstanding mahr (mas kahwin) of **SINGAPORE DOLLARS FIVE THOUSAND (SGD 5,000.00)** due and owing to my husband, YUSUF BIN HASSAN, as agreed upon in our nikah (marriage contract). I direct my Executor to settle this mahr in full as a priority debt of my estate before any distribution under either this Wasiyyah or the Faraid. The mahr is a debt owed by my estate and takes precedence over all testamentary dispositions.

5.3 The order of priority for the discharge of obligations from my estate shall be:

   (a) Funeral expenses (kafan and burial costs);

   (b) Payment of debts, including the outstanding mahr;

   (c) Bequests under this Wasiyyah (limited to one-third of the net estate); and

   (d) Distribution of the remaining two-thirds under Faraid.

---

## 6. SPECIFIC BEQUESTS (WASIYYAH — WITHIN THE ONE-THIRD)

Subject to the one-third limitation set out in Clause 3 above, I make the following bequests:

### (a) Charitable Bequest to MUIS

6.1 I bequeath the sum of **SINGAPORE DOLLARS TEN THOUSAND (SGD 10,000.00)** to **MAJLIS UGAMA ISLAM SINGAPURA (MUIS)** (UEN T08CC4033J), the Islamic Religious Council of Singapore, for the specific purpose of the maintenance and upkeep of mosques in Singapore.

6.2 I direct that the said sum shall be applied by MUIS exclusively for mosque maintenance and shall not be diverted to any other purpose. My Executor shall obtain a receipt from MUIS acknowledging the purpose restriction.

### (b) Gold Jewellery to Eldest Daughter

6.3 I bequeath the whole of my collection of gold jewellery, which was inherited from my late mother and which is currently kept at my said residential address, and which is valued at approximately SINGAPORE DOLLARS TWENTY-FIVE THOUSAND (SGD 25,000.00), to my eldest daughter **AISYAH BINTE YUSUF** (NRIC No. T9812345A) of Blk 501 Tampines Street 45, #12-345, Singapore 520501.

6.4 I express the wish that Aisyah shall keep this jewellery within the family as it carries deep sentimental value, having been passed down from her maternal grandmother. This wish is precatory and not binding.

6.5 For the avoidance of doubt, Aisyah is a Faraid heir and this bequest to her as a Faraid heir from the wasiyyah portion requires the consent of the other Faraid heirs at the time of distribution. If such consent is not given, this bequest shall be treated as part of the Faraid estate and distributed according to the Inheritance Certificate.

### (c) Residue of the Disposable One-Third

6.6 I bequeath all the residue of the disposable one-third (1/3) of my net estate (after the payment of the bequests in Clauses 6.1 and 6.3 above) to my friend **CHEN LI HUA** (NRIC No. S8045678F) of Blk 210 Bedok North Street 1, #05-234, Singapore 460210, in grateful recognition of her devoted care and companionship during my illness.

6.7 For the avoidance of doubt, Chen Li Hua is not a Muslim and is not a Faraid heir. This bequest to a non-heir from the wasiyyah portion does not require the consent of the Faraid heirs.

---

## 7. FARAID DISTRIBUTION — TWO-THIRDS

7.1 I acknowledge and direct that the remaining two-thirds (2/3) of my net estate (after payment of debts, funeral expenses and the bequests under Clause 6) shall be distributed in accordance with the rules of Faraid as set out in the Inheritance Certificate to be issued by the Syariah Court of Singapore.

7.2 I record for the information of my Executor and the Syariah Court that, as at the date of this Wasiyyah, my Faraid heirs are:

   (a) **YUSUF BIN HASSAN** — my husband;

   (b) **AISYAH BINTE YUSUF** — my eldest daughter, aged 28 years;

   (c) **IMRAN BIN YUSUF** — my son, aged 25 years; and

   (d) **NURUL BINTE YUSUF** — my youngest daughter, aged 20 years.

7.3 I acknowledge that the Syariah Court alone has the jurisdiction to determine the identity and respective shares of my Faraid heirs at the date of my death, and that the listing in Clause 7.2 is for reference only and shall not be binding on the Syariah Court.

---

## 8. ASSETS EXCLUDED FROM THIS ESTATE

### (a) HDB Flat — Joint Tenancy

8.1 I record that the Housing and Development Board flat at Blk 501 Tampines Street 45, #12-345, Singapore 520501 is held by me and my husband YUSUF BIN HASSAN as joint tenants. Upon my death, the said flat shall pass to my husband by right of survivorship and does not form part of my estate for the purposes of either this Wasiyyah or the Faraid distribution.

### (b) Central Provident Fund (CPF)

8.2 I record that my Central Provident Fund ("CPF") monies are the subject of a separate CPF nomination made by me in accordance with the Central Provident Fund Act (Cap 36) and the regulations thereunder. My CPF monies do not form part of my estate and are not governed by this Wasiyyah or by the rules of Faraid.

8.3 For the avoidance of doubt, this Wasiyyah does not purport to dispose of, and my Executor shall have no power over, my CPF monies.

---

## 9. SURVIVORSHIP CLAUSE

9.1 If any beneficiary named in this Wasiyyah (other than MUIS) shall die within thirty (30) days of the date of my death, or in circumstances rendering it uncertain which of us survived the other, then the bequest to that beneficiary shall lapse and shall fall into and form part of the residue of the disposable one-third of my estate.

9.2 If there is no surviving beneficiary of the residue of the disposable one-third, the whole of the one-third shall be distributed as part of the Faraid estate.

---

## 10. FUNERAL WISHES

10.1 I direct that upon my death, my body shall be prepared and buried in accordance with Islamic rites. Specifically:

   (a) My body shall be washed (mandi jenazah) by Muslim women in accordance with the Sunnah;

   (b) My body shall be shrouded (kafan) in white cloth in accordance with Islamic requirements;

   (c) The solat jenazah (funeral prayer) shall be performed for me;

   (d) I wish to be buried at **Pusara Aman** cemetery, Lim Chu Kang, Singapore, or if space is not available, at such other Muslim cemetery in Singapore as my Executor shall determine; and

   (e) My funeral arrangements shall be simple and modest, in keeping with Islamic principles, and shall not involve any extravagance.

10.2 I direct my Executor to meet the costs of my funeral from my estate as a first charge.

---

## 11. GENERAL PROVISIONS

11.1 Words importing the singular shall include the plural and vice versa, and words importing any gender shall include every gender.

11.2 If any provision of this Wasiyyah shall be held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.

11.3 This Wasiyyah shall be governed by and construed in accordance with the laws of the Republic of Singapore, including the Administration of Muslim Law Act (Cap 3) and the Wills Act (Cap 352).

---

## 12. ATTESTATION

**IN WITNESS WHEREOF** I, **FATIMA BINTE ABDUL RAHMAN**, the Testator, have hereunto set my hand to this my Wasiyyah on this **15th day of November 2023**.

&nbsp;

**SIGNED** by the above-named Testator )

**FATIMA BINTE ABDUL RAHMAN** )

as and for her last Wasiyyah in the )

presence of us both present at the )

same time who at her request in her )

presence and in the presence of each ) ________________________

other have hereunto subscribed our ) Signature of Testator

names as witnesses: )

&nbsp;

---

**FIRST WITNESS:**

Signed: ________________________

Name: **MUHAMMAD ISMAIL BIN OSMAN**

NRIC No.: S7856789G

Address: Blk 501 Tampines Street 45, #10-123, Singapore 520501

Occupation: Neighbour

Religion: Islam

&nbsp;

**SECOND WITNESS:**

Signed: ________________________

Name: **AMINAH BINTE YUSOF**

NRIC No.: S8167890H

Address: 15 Simei Street 4, #06-789, Singapore 529510

Occupation: Colleague

Religion: Islam

&nbsp;

---

*This is a demonstration document prepared for API Days Singapore. It does not constitute a valid legal instrument.*
