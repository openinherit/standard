---
title: "Last Will and Testament of Gloria Helmsley-Winters"
version: "1.0"
status: approved
date: 2026-04-12T18:00
lastmod: 2026-04-12T18:00
author: "Rich Davies"
source: "examples/wills/new-york/gloria-helmsley-winters/gloria-helmsley-winters-story-v0001.md"
---

# Last Will and Testament of Gloria Helmsley-Winters

**Jurisdiction:** New York (NY EPTL, SCPA)
**Date of execution:** Thursday 14 September 2023
**Complexity:** Complex
**PDF:** `glorias-will.pdf` (in Downloads or generated from this source)
**Fixture:** `gloria-helmsley-winters-inherit-v0001.json` (to be created in this folder)

## What this will tests

This will exercises the following INHERIT capabilities:

- **Explicit disinheritance** — two named grandchildren with stated reasons and `disinheritanceStatement` text, testing `omittedHeirs` modelling and `isDeliberate: true`
- **Pet trust** — $8M irrevocable trust for a companion animal, with named trustee, successor trustee, care instructions, and remainder clause; tests `trustType: pet_trust` and `animalBeneficiary`
- **Executor conflict of interest** — executor Rosa Martinez also receives a $500,000 bequest, testing `conflictOfInterest` flags and dual-role modelling (`executor` + `beneficiary` on same person)
- **Cooperative shares** — Park Avenue apartment held as cooperative corporation shares rather than freehold or leasehold; tests `tenureType: cooperative` and property valuation
- **Charitable residuary** — entire residue to a private foundation, testing `charityRegistration` with 501(c)(3) status and `residuaryBeneficiaryType: organisation`
- **Power of appointment** — Foundation trustees hold power to distribute among any registered 501(c)(3) charity; tests `powerOfAppointment` with `appointmentClass: charitable`
- **Survivorship clause** — 90-day survivorship period (longer than the typical 28/30-day clauses in other test wills); tests `survivalPeriodDays: 90`
- **New York estate tax** — estate valued well above the NY exclusion amount, triggering the "cliff" effect; tests `taxJurisdiction` and `estateTaxNotes`
- **Self-proving affidavit** — NY EPTL 3-2.1(a)(2) attestation with notarised affidavit; tests `attestationType: self_proving` and `notaryPublic`
- **Nonprobate asset** — Foundation endowment ($180M) passes outside the estate as a separately governed entity; tests `passesOutsideEstate: true`
- **Specific bequest to institution** — jewellery collection to the Metropolitan Museum of Art; tests `institutionalBeneficiary` with museum/cultural body
- **Real property devise to charity** — East Hampton house to the American Cancer Society; tests charitable devise of real property with `charityPurposeRestriction: unrestricted`
- **Cremation and ash disposition** — funeral wishes specifying cremation and commingling with late husband's ashes; tests `funeralWishes` with `dispositionMethod: cremation` and `ashDisposition`
- **Widow/predeceased spouse** — Leonard Winters died 2018; tests `deceasedSpouse` kinship node with empty roles
- **Predeceased child** — Richard Winters died 2020; tests `deceasedChild` kinship node and per stirpes implications
- **Administrative powers** — NY EPTL standard fiduciary powers; tests `executorPowers` with statutory reference
- **Multiple asset categories** — real property (cooperative, freehold), financial accounts, jewellery, companion animal — testing `assetCategory` diversity
- **Professional substitute executor** — JP Morgan Trust Company as corporate fiduciary fallback; tests `executorType: corporate`

## People

| Person | Role | Relationship to testator |
|--------|------|--------------------------|
| Gloria Helmsley-Winters | Testator | -- |
| Rosa Martinez | Executor (primary), beneficiary | Long-time personal assistant (30 years) |
| JP Morgan Trust Company, N.A. | Executor (substitute), successor trustee (pet trust) | Corporate fiduciary |
| Victoria Winters | Disinherited | Granddaughter (estranged) |
| Alexander Winters | Disinherited | Grandson (estranged) |
| Richard Winters (deceased, 2020) | Kinship node (empty roles) | Son |
| Leonard Winters (deceased, 2018) | Kinship node (empty roles) | Late husband |
| Duchess | Pet trust beneficiary | Pomeranian dog |
| Helmsley-Winters Foundation | Residuary beneficiary, power of appointment holder | Private foundation, 501(c)(3) |
| Metropolitan Museum of Art | Beneficiary (specific bequest) | Museum, 501(c)(3) |
| American Cancer Society | Beneficiary (specific devise) | Charity, 501(c)(3) |
| Margaret Alston-Hughes, Esq. | Witness | Attorney (not drafter) |
| Dr. Philip Okonkwo | Witness | Personal physician |
| Catherine Ng | Notary public | Notary Public, State of New York |

---

## Full will text

<br>

<div style="text-align: center;">

# LAST WILL AND TESTAMENT

# OF

# GLORIA HELMSLEY-WINTERS

</div>

---

**I, GLORIA HELMSLEY-WINTERS**, of 740 Park Avenue, Apartment 14B, New York, New York 10021, being of sound mind and memory and not acting under duress, menace, fraud, or undue influence of any person whomsoever, do hereby make, publish, and declare this instrument to be my Last Will and Testament, hereby revoking all former Wills and Codicils heretofore made by me.

---

## ARTICLE I — REVOCATION AND DECLARATIONS

**1.1** I hereby revoke all former Wills, Codicils, and Testamentary Dispositions heretofore made by me and declare this to be my Last Will and Testament.

**1.2** I am a widow. My husband, **LEONARD WINTERS**, predeceased me on the 3rd day of October 2018.

**1.3** I have one child, **RICHARD WINTERS**, who predeceased me on the 17th day of June 2020.

**1.4** I have two grandchildren: **VICTORIA WINTERS** (born 1995) and **ALEXANDER WINTERS** (born 1998), both being the children of my late son Richard Winters.

---

## ARTICLE II — APPOINTMENT OF EXECUTOR AND TRUSTEE

**2.1** I nominate, constitute, and appoint **ROSA MARTINEZ** (date of birth: 12 May 1971), of 445 East 86th Street, Apartment 3C, New York, New York 10028, as the Executor and Trustee of this my Last Will and Testament.

**2.2** In the event that Rosa Martinez shall predecease me, or shall fail to qualify, refuse to act, resign, or become unable to act as Executor and Trustee, I nominate, constitute, and appoint **JP MORGAN TRUST COMPANY, NATIONAL ASSOCIATION**, a national banking association with its principal office at 383 Madison Avenue, New York, New York 10179, as substitute Executor and Trustee.

**2.3** I direct that my Executor shall not be required to furnish any bond or other security in any jurisdiction, and if notwithstanding this direction any bond is required by law, I direct that no surety be required thereon.

**2.4** I acknowledge that Rosa Martinez is named as a beneficiary under Article V of this Will and also serves as Executor. I have considered this potential conflict of interest fully and have concluded that her thirty years of devoted and faithful service to me, her intimate knowledge of my affairs and wishes, and her unimpeachable integrity make her the most suitable person to administer my estate. This dual appointment is deliberate and made with full understanding of its implications.

---

## ARTICLE III — INTENTIONAL DISINHERITANCE

**3.1** I have intentionally and with full knowledge made no provision whatsoever for my grandchildren **VICTORIA WINTERS** and **ALEXANDER WINTERS** in this my Last Will and Testament, or in any trust established hereunder. This omission is deliberate and is not the result of accident, inadvertence, or oversight.

**3.2** I wish to state, for the record and to forestall any contest of this Will, that my reasons for this omission are as follows: Victoria Winters and Alexander Winters have been estranged from me for a period exceeding five years. Following the death of my son Richard Winters in 2020, both grandchildren declined all contact with me, refused my repeated invitations to visit, returned my correspondence unopened, and have shown no interest whatsoever in my wellbeing or affairs. I bore them no ill will, but I do not consider them appropriate objects of my bounty.

**3.3** If any person, whether or not named as a beneficiary in this Will, shall directly or indirectly contest this Will or any provision hereof, or shall challenge the validity of any trust created hereunder, or shall seek to obtain an adjudication in any proceeding in any court that this Will or any of its provisions or any trust created hereunder is void, or shall seek otherwise to void, nullify, or set aside this Will or any of its provisions, then the right of that person to take any interest given to him or her by this Will shall be determined by the Surrogate's Court having jurisdiction and such contest shall be subject to the provisions of EPTL 3-3.5.

---

## ARTICLE IV — PET TRUST FOR DUCHESS

**4.1** I direct my Executor to establish, immediately upon my death, an irrevocable trust (hereinafter the "Pet Trust") for the care, maintenance, and welfare of my beloved Pomeranian dog, **DUCHESS**, in accordance with EPTL 7-8.1 (Trusts for Pets).

**4.2** I bequeath and set aside the sum of **EIGHT MILLION DOLLARS ($8,000,000.00)** to the Pet Trust.

**4.3** I appoint **ROSA MARTINEZ** as Trustee of the Pet Trust. In the event that Rosa Martinez shall be unable or unwilling to serve as Trustee, I appoint **JP MORGAN TRUST COMPANY, NATIONAL ASSOCIATION** as successor Trustee.

**4.4** The Trustee shall apply the income and, to the extent necessary, the principal of the Pet Trust for the following purposes, and no others:

   (a) **Housing:** Duchess shall continue to reside in my apartment at 740 Park Avenue, Apartment 14B, New York, New York 10021, for so long as is practicable. If that residence becomes unavailable, Duchess shall be provided with a dwelling of comparable quality and comfort in Manhattan, and in no event shall Duchess be housed in a kennel, shelter, or any facility primarily used for the boarding of animals;

   (b) **Daily care:** Duchess shall receive no fewer than three walks per day, each of a minimum duration of thirty minutes, with a professional dog walker approved by the Trustee;

   (c) **Nutrition:** Duchess shall be fed only premium organic dog food of a quality not less than that to which she is accustomed at the date of my death, and shall have access at all times to fresh filtered water;

   (d) **Veterinary care:** Duchess shall receive comprehensive veterinary care from a board-certified veterinarian, including but not limited to annual examinations, dental cleanings, vaccinations, emergency treatment, and any specialty care as recommended by the attending veterinarian. Cost shall be no object in the preservation of Duchess's health and comfort;

   (e) **Grooming:** Duchess shall be professionally groomed no less frequently than once every two weeks, by a groomer experienced with the Pomeranian breed;

   (f) **Companionship:** The Trustee shall ensure that Duchess is not left alone for periods exceeding four consecutive hours during waking hours, and shall engage such pet-sitting or companion services as are necessary to ensure Duchess's emotional wellbeing; and

   (g) **Miscellaneous:** The Trustee may apply funds from the Pet Trust for any other expenses reasonably necessary for Duchess's comfort, health, and happiness, including but not limited to toys, bedding, climate control, and travel expenses for veterinary appointments.

**4.5** Upon the death of Duchess, the Trustee shall arrange a dignified cremation, and the remainder of the Pet Trust, both income and principal, shall pass to the **HELMSLEY-WINTERS FOUNDATION** as described in Article VII of this Will.

**4.6** In the event that any court of competent jurisdiction shall determine that the amount set aside for the Pet Trust exceeds the amount required for the intended use as described herein, any excess amount shall be distributed to the Helmsley-Winters Foundation.

**4.7** The Trustee shall render an annual accounting of the Pet Trust to JP Morgan Trust Company, National Association, regardless of whether JP Morgan is then serving as Trustee.

---

## ARTICLE V — SPECIFIC BEQUESTS

### (a) Bequest to Rosa Martinez

**5.1** I give and bequeath the sum of **FIVE HUNDRED THOUSAND DOLLARS ($500,000.00)** to my personal assistant, **ROSA MARTINEZ**, in recognition of thirty years of loyal, devoted, and faithful service to me. If Rosa Martinez shall predecease me or fail to survive me by ninety (90) days, this bequest shall lapse and shall fall into and form part of the residue of my estate.

### (b) Jewellery Collection to the Metropolitan Museum of Art

**5.2** I give and bequeath my entire collection of jewellery, presently stored in the vault of Christie's, 20 Rockefeller Plaza, New York, New York 10020 (the "Jewellery Collection"), having an appraised value of approximately **THREE MILLION DOLLARS ($3,000,000.00)**, to **THE METROPOLITAN MUSEUM OF ART**, a New York not-for-profit corporation (EIN 13-1624100), having its principal offices at 1000 Fifth Avenue, New York, New York 10028.

**5.3** I direct that the Jewellery Collection shall be accepted by the Metropolitan Museum of Art for display in its permanent collection, and I express the wish — which I acknowledge is precatory and not binding — that the collection be exhibited under the designation "The Gloria Helmsley-Winters Collection."

**5.4** In the event that the Metropolitan Museum of Art shall decline to accept the Jewellery Collection, or shall fail to claim it within twelve (12) months of the date of my death, I direct my Executor to offer the Jewellery Collection to the **SMITHSONIAN INSTITUTION**, and failing acceptance by the Smithsonian Institution, to sell the Jewellery Collection at public auction and add the net proceeds to the residue of my estate.

### (c) East Hampton Property to the American Cancer Society

**5.5** I give, devise, and bequeath my real property located at **142 Dune Road, East Hampton, New York 11937** (the "East Hampton Property"), together with all fixtures, improvements, and appurtenances thereto, having an estimated value of approximately **EIGHT MILLION DOLLARS ($8,000,000.00)**, to the **AMERICAN CANCER SOCIETY, INC.**, a New York not-for-profit corporation (EIN 13-1788491), having its principal offices at 250 Williams Street NW, Atlanta, Georgia 30303.

**5.6** The American Cancer Society may use, sell, lease, or otherwise dispose of the East Hampton Property at its sole discretion and without restriction, and the net proceeds of any sale shall be applied to its general charitable purposes.

**5.7** In the event that the American Cancer Society shall disclaim or refuse to accept the East Hampton Property, I direct my Executor to sell the property at fair market value and add the net proceeds to the residue of my estate.

---

## ARTICLE VI — POWER OF APPOINTMENT

**6.1** I hereby grant to the then-serving Trustees of the **HELMSLEY-WINTERS FOUNDATION** (EIN 13-4567890) a non-exclusive, non-general power of appointment, exercisable by unanimous written instrument, to appoint and distribute such portions of the residue of my estate as they shall receive under Article VII, among any one or more organisations which at the time of distribution are described in Section 501(c)(3) of the Internal Revenue Code of 1986, as amended, and which are not private foundations within the meaning of Section 509(a) of such Code.

**6.2** This power of appointment shall be exercisable at any time and from time to time, and may be exercised in whole or in part.

**6.3** In default of the exercise of this power, the residue shall be retained by the Helmsley-Winters Foundation for its general charitable purposes.

---

## ARTICLE VII — RESIDUARY ESTATE

**7.1** All the rest, residue, and remainder of my estate, both real and personal, of whatsoever kind and wheresoever situated, of which I shall die seized or possessed, or to which I shall be entitled at the time of my death, including any property over which I may hold a power of appointment at the time of my death, and including any bequest or devise which shall lapse or fail for any reason (the "Residuary Estate"), I give, devise, and bequeath to the **HELMSLEY-WINTERS FOUNDATION** (EIN 13-4567890), a private foundation organised under the laws of the State of New York and recognised as exempt from federal income tax under Section 501(c)(3) of the Internal Revenue Code of 1986, as amended, having its principal office at 230 Park Avenue, New York, New York 10169.

**7.2** It is my wish and intention that the Helmsley-Winters Foundation shall use the Residuary Estate for its general charitable purposes, including but not limited to the support of medical research, education, the arts, and the relief of human suffering.

---

## ARTICLE VIII — ASSETS PASSING OUTSIDE THIS ESTATE

**8.1** I record for the information of my Executor that the endowment of the **HELMSLEY-WINTERS FOUNDATION**, presently valued at approximately **ONE HUNDRED AND EIGHTY MILLION DOLLARS ($180,000,000.00)**, of which I serve as a Trustee, is not an asset of my personal estate and does not pass under this Will. The Foundation is a separate legal entity and its assets are governed by the Foundation's Certificate of Incorporation, By-Laws, and the applicable provisions of the New York Not-for-Profit Corporation Law.

**8.2** Upon my death, my trusteeship of the Foundation shall terminate and the remaining Trustees shall continue to administer the Foundation in accordance with its governing instruments.

---

## ARTICLE IX — SURVIVORSHIP CLAUSE

**9.1** If any beneficiary under this Will (other than any charitable organisation or the Helmsley-Winters Foundation) shall fail to survive me by ninety (90) days, then for all purposes of this Will that beneficiary shall be deemed to have predeceased me, and the bequest or devise to such beneficiary shall lapse and shall fall into and form part of the Residuary Estate.

**9.2** If Rosa Martinez shall fail to survive me by ninety (90) days, the appointment of Executor and Trustee under Article II and Article IV shall pass to the substitute named therein.

---

## ARTICLE X — FUNERAL AND BURIAL WISHES

**10.1** I direct that my funeral shall be a private service, attended only by those persons whom my Executor, in her sole discretion, shall invite. I wish no public memorial, no eulogy by any person who did not know me personally, and no flowers other than white peonies.

**10.2** I direct that my remains shall be cremated.

**10.3** I direct that my ashes shall be interred with or placed alongside the remains of my late husband, **LEONARD WINTERS**, at Woodlawn Cemetery, 4199 Webster Avenue, Bronx, New York 10470, in the Winters family mausoleum. If interment alongside my husband's remains is not practicable, I direct my Executor to arrange for my ashes to be scattered at a location of her choosing, provided that it is a place of natural beauty.

---

## ARTICLE XI — NEW YORK ESTATE TAX PROVISIONS

**11.1** I direct my Executor to pay all estate, inheritance, succession, and transfer taxes (including any interest and penalties thereon), whether federal, state, or otherwise, which may be assessed or levied against my estate or any beneficiary thereof by reason of my death, from the Residuary Estate, as an expense of administration, and without apportionment among the beneficiaries.

**11.2** I acknowledge that the value of my taxable estate may exceed the applicable New York State estate tax basic exclusion amount, and I direct my Executor to take all lawful steps to minimise the aggregate tax burden on my estate, including but not limited to the timely filing of all returns, the election of any available deductions, and the engagement of qualified tax counsel.

---

## ARTICLE XII — ADMINISTRATIVE POWERS

**12.1** In addition to all powers granted by law, including those conferred by the Estates, Powers and Trusts Law of the State of New York, my Executor and any Trustee acting hereunder shall have the following powers, exercisable in their sole discretion and without the necessity of obtaining prior court approval:

   (a) To retain any asset of my estate, whether or not it constitutes a legal investment for fiduciaries, for such period as my Executor or Trustee shall deem advisable;

   (b) To sell, exchange, lease, mortgage, pledge, or otherwise dispose of any property, real or personal, at public or private sale, for cash or on credit, upon such terms and conditions as my Executor or Trustee shall determine;

   (c) To invest and reinvest estate and trust funds in such property as my Executor or Trustee shall select, including but not limited to stocks, bonds, mutual funds, money market instruments, real estate, and interests in limited partnerships or limited liability companies, without regard to any statutory limitation on trust investments;

   (d) To borrow money and to encumber estate or trust property as security therefor;

   (e) To compromise, settle, or release any claim in favour of or against the estate upon such terms as my Executor or Trustee shall deem advisable;

   (f) To employ attorneys, accountants, investment advisors, custodians, and such other agents and professionals as my Executor or Trustee shall deem necessary, and to pay their reasonable compensation from the estate or trust;

   (g) To make distributions in cash or in kind, or partly in each, and to allocate specific assets to any beneficiary's share at such values as my Executor or Trustee shall determine; and

   (h) To do all other acts which my Executor or Trustee shall deem necessary or desirable for the proper management, investment, and distribution of my estate and any trust created hereunder.

**12.2** The powers granted herein shall be construed liberally, and no power conferred herein shall be limited by reference to any other power.

---

## ARTICLE XIII — CONSTRUCTION AND MISCELLANEOUS

**13.1** This Will shall be governed by and construed in accordance with the laws of the State of New York, including the Estates, Powers and Trusts Law and the Surrogate's Court Procedure Act.

**13.2** If any provision of this Will shall be held invalid or unenforceable, the remaining provisions shall remain in full force and effect.

**13.3** Words importing the singular shall include the plural and vice versa, and words importing any gender shall include every gender.

**13.4** Article and section headings are for convenience of reference only and shall not affect the construction or interpretation of any provision of this Will.

---

## ARTICLE XIV — ATTESTATION AND EXECUTION

**IN WITNESS WHEREOF**, I, **GLORIA HELMSLEY-WINTERS**, the Testator, have on this **14th day of September 2023**, signed, sealed, published, and declared this instrument, consisting of this and the preceding pages, each of which I have signed for purposes of identification, as and for my Last Will and Testament, in the presence of the undersigned witnesses, who witnessed and subscribed the same at my request and in my presence and in the presence of each other.

&nbsp;

________________________

**GLORIA HELMSLEY-WINTERS**, Testator

&nbsp;

---

### ATTESTATION CLAUSE

The foregoing instrument was signed, sealed, published, and declared by the above-named Testator, **GLORIA HELMSLEY-WINTERS**, as and for her Last Will and Testament, in our presence, and we, at her request and in her presence and in the presence of each other, have hereunto subscribed our names as attesting witnesses on this **14th day of September 2023**. Each of us observed the signing of this Will by the Testator and each of us signs this Will at the request of the Testator. Each of us believes the Testator to be of sound mind, memory, and understanding and not under any duress, menace, fraud, misrepresentation, or undue influence. We declare under penalty of perjury that the foregoing is true and correct.

&nbsp;

**FIRST WITNESS:**

Signed: ________________________

Name: **MARGARET ALSTON-HUGHES, ESQ.**

Address: 450 Lexington Avenue, Suite 3100, New York, NY 10017

Occupation: Attorney-at-Law

&nbsp;

**SECOND WITNESS:**

Signed: ________________________

Name: **DR. PHILIP OKONKWO**

Address: 1305 York Avenue, New York, NY 10021

Occupation: Physician

&nbsp;

---

### SELF-PROVING AFFIDAVIT (pursuant to NY EPTL 3-2.1(a)(2))

**STATE OF NEW YORK** )

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;) ss.:

**COUNTY OF NEW YORK** )

&nbsp;

We, **GLORIA HELMSLEY-WINTERS**, **MARGARET ALSTON-HUGHES**, and **DR. PHILIP OKONKWO**, the Testator and the witnesses respectively, whose names are signed to the foregoing instrument, being duly sworn, do hereby declare to the undersigned authority that the Testator signed and executed the instrument as her Last Will and Testament, that she signed it willingly and as her free and voluntary act for the purposes therein expressed, and that each of the witnesses, in the presence and at the request of the Testator, and in the presence of each other, signed the Will as witness, and that to the best of the knowledge of each witness the Testator was at the time of signing eighteen (18) years of age or older, of sound mind, and under no constraint or undue influence.

&nbsp;

________________________

**GLORIA HELMSLEY-WINTERS**, Testator

&nbsp;

________________________

**MARGARET ALSTON-HUGHES**, Witness

&nbsp;

________________________

**DR. PHILIP OKONKWO**, Witness

&nbsp;

Subscribed, sworn to, and acknowledged before me by **GLORIA HELMSLEY-WINTERS**, the Testator, and subscribed and sworn to before me by **MARGARET ALSTON-HUGHES** and **DR. PHILIP OKONKWO**, the witnesses, on this **14th day of September 2023**.

&nbsp;

________________________

**CATHERINE NG**

Notary Public, State of New York

No. 01NG6789012

Qualified in New York County

Commission Expires: 31 March 2025

&nbsp;

[NOTARIAL SEAL]

---

## Legal disclaimer

*This is a demonstration document created for the INHERIT open estate data standard. It does not constitute a valid legal instrument and must not be used as a model for any actual testamentary disposition. The characters, addresses, and organisations described herein are fictitious or are used in a fictitious context. Any resemblance to actual persons, living or dead, or to actual events is entirely coincidental. Persons requiring a will or other estate planning instrument should consult a licensed attorney in their jurisdiction.*
