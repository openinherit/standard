---
title: "Last Will and Testament of Henry Burt III"
version: "1.0"
status: approved
date: 2026-04-12T22:30
lastmod: 2026-04-12T22:30
author: "Rich Davies"
source: "examples/wills/michigan/henry-burt-iii/henry-burt-iii-story-v0001.md"
---

# Last Will and Testament of Henry Burt III

**Jurisdiction:** Michigan, USA (Michigan Trust Code, MCL 700.1101 et seq.)
**Date of execution:** Thursday 18 January 2024
**Complexity:** Extreme
**PDF:** `henrys-will.pdf` (in Downloads or generated from this source)
**Fixture:** `henry-burt-iii-inherit-v0001.json` (to be created in this folder)

## What this will tests

This will exercises the following INHERIT capabilities at the extreme end of complexity:

- **Multi-generational perpetuity trust (dynasty trust):** trust principal locked until 21 years after the death of the last grandchild alive at the testator's death — potentially 80+ years of trust duration. Tests INHERIT's ability to model trust termination events that reference the lifetimes of measuring lives rather than fixed dates.
- **Generation-skipping transfer (GST) tax allocation:** entire GST exemption allocated to the dynasty trust. Tests `gstClassification` and `gstExemptionAllocation` modelling.
- **Four-generation family tree:** testator, children, grandchildren, great-grandchildren. Tests deep kinship chains (`parent_child_biological` x4 levels), `generationNumber` tracking, and descendant class definitions.
- **Income-only distributions during measuring lives:** children and grandchildren receive income only, never principal. Tests `distributionType: income_only` vs `distributionType: principal` and the distinction between income beneficiaries and remaindermen.
- **HEMS standard:** trustee discretionary distributions limited to health, education, maintenance, and support. Tests `distributionStandard` modelling.
- **Business succession clause:** mandatory 25-year operating period for Burt Timber Holdings LLC. Tests `businessSuccession` with `minimumOperatingPeriod`, `managementDirective: professional`, and `entityType: llc`.
- **Limited power of appointment:** Henry IV holds power to appoint trust assets among descendants only. Tests `powerOfAppointment` with `scope: limited` and `appointeeClass: descendants`.
- **60-day survivorship clause:** longer than standard 28/30-day clauses. Tests `survivalPeriod` flexibility.
- **Co-executor arrangement:** professional institution (Comerica Bank) with family co-executor (Henry IV). Tests `executorType: institutional` alongside `executorType: individual`.
- **Specific bequests of diverse asset types:** automobile collection (tangible personal property), pecuniary legacies ($1M each), charitable bequest to university. Tests `assetCategory` breadth.
- **Pour-over into trust:** all residuary assets pour into the dynasty trust. Tests `pourOverTrust` linkage between will and trust instrument.
- **Michigan perpetuities abolition:** trust relies on MCL 554.92 (2008 abolition of the Rule Against Perpetuities for trusts). Tests `perpetuitiesRule` modelling with `abolished: true` and `jurisdiction: MI`.
- **Widower status:** predeceased spouse (Elizabeth, d. 2019). Tests `deceasedSpouse` kinship with `deathDate` and empty `roles` array.
- **Timber and agricultural land:** 12,000 acres across 4 counties. Tests real property with `acreage`, `countyParcel` identifiers, and `landUse: timberland`.
- **LLC membership interest:** 100% member interest in private company. Tests `businessInterest` with `ownershipPercentage: 100` and `entityStructure: llc`.
- **Institutional trust accounts:** Comerica Bank accounts totalling $22M. Tests `financialAccount` with `institution` and `accountPurpose: trust`.
- **Burial directive:** specific cemetery and family plot. Tests `funeralWishes` with `burialLocation` and `cemeteryName`.

## People

| Person | Role | Relationship to testator |
|--------|------|--------------------------|
| Henry Burt III | Testator | -- |
| Elizabeth Anne Burt (nee Caldwell) | Deceased spouse | Wife (d. 2019) |
| Henry Burt IV | Co-executor, beneficiary (specific bequest + income), power of appointment holder | Son (age 50) |
| Margaret Burt Livingston | Beneficiary (specific bequest + income) | Daughter (age 47) |
| William Caldwell Burt | Beneficiary (specific bequest + income) | Son (age 42) |
| Comerica Bank Trust Department | Co-executor, trustee | Institution |
| 8 grandchildren (3 + 3 + 2) | Income beneficiaries | Grandchildren |
| 2 great-grandchildren | Remaindermen (potential) | Great-grandchildren (Henry IV's eldest's children) |
| University of Michigan | Beneficiary (charitable bequest) | Organisation |

## Legal disclaimer

*This is a demonstration document. It does not constitute a valid legal instrument, has not been executed, and should not be relied upon for any legal purpose. All names, addresses, and identifying details are fictional. Any resemblance to real persons, living or dead, is purely coincidental.*

---

## Full will text

<br>

<div style="text-align: centre;">

# LAST WILL AND TESTAMENT

# OF

# HENRY BURT III

</div>

---

**I, HENRY BURT III**, of 1200 Lakeshore Drive, Grosse Pointe Shores, Michigan 48236, County of Wayne, being of sound mind and disposing memory and not acting under duress, menace, fraud, or the undue influence of any person whomsoever, do hereby make, publish, and declare this to be my Last Will and Testament, hereby revoking all former Wills and Codicils heretofore made by me.

---

## ARTICLE I — REVOCATION

1.1 I revoke all Wills and Codicils previously made by me.

---

## ARTICLE II — DECLARATIONS

2.1 I am a widower. My beloved wife, **ELIZABETH ANNE BURT** (nee Caldwell), died on the 23rd day of March 2019. References in this Will to "my late wife" or "Elizabeth" shall mean Elizabeth Anne Burt.

2.2 I have three (3) living children:

   (a) **HENRY BURT IV**, born the 12th day of June 1974, of 450 Provencal Road, Grosse Pointe Farms, Michigan 48236;

   (b) **MARGARET BURT LIVINGSTON**, born the 3rd day of September 1977, of 2800 West Maple Road, Birmingham, Michigan 48009; and

   (c) **WILLIAM CALDWELL BURT**, born the 14th day of February 1982, of 1100 Woodward Avenue, Apt 3201, Detroit, Michigan 48226.

2.3 I have eight (8) living grandchildren:

   (a) Children of Henry Burt IV: **HENRY BURT V** (born 2000), **CAROLINE ELIZABETH BURT** (born 2003), and **JAMES CALDWELL BURT** (born 2006);

   (b) Children of Margaret Burt Livingston: **ALEXANDER LIVINGSTON** (born 2005), **VICTORIA LIVINGSTON** (born 2008), and **ELEANOR LIVINGSTON** (born 2010); and

   (c) Children of William Caldwell Burt: **WILLIAM CALDWELL BURT JR.** (born 2015) and **GRACE ELIZABETH BURT** (born 2018).

2.4 I have two (2) living great-grandchildren, both children of my grandson Henry Burt V: **HENRY BURT VI** (born 2023) and **ELIZABETH ROSE BURT** (born 2024).

2.5 Except as otherwise provided herein, the term "descendants" shall mean all persons who are descended from me by blood or by lawful adoption, whether born before or after the execution of this Will or before or after my death.

---

## ARTICLE III — APPOINTMENT OF PERSONAL REPRESENTATIVES

3.1 I appoint **COMERICA BANK AND TRUST, N.A.**, Trust Department, 411 West Lafayette Boulevard, Detroit, Michigan 48226, and my son **HENRY BURT IV** to serve as Co-Personal Representatives of my estate (hereinafter collectively referred to as "my Personal Representatives" and individually as "Co-Personal Representative").

3.2 If Comerica Bank and Trust, N.A. shall be unable or unwilling to serve or to continue serving as Co-Personal Representative, I appoint **NORTHERN TRUST COMPANY** to serve in its place and stead. If my son Henry Burt IV shall be unable or unwilling to serve or to continue serving as Co-Personal Representative, I appoint my daughter Margaret Burt Livingston to serve in his place and stead.

3.3 My Personal Representatives shall serve without bond, to the fullest extent permitted by law.

3.4 My Personal Representatives shall have all powers conferred upon fiduciaries by the Michigan Trust Code (MCL 700.1101 et seq.), the Estates and Protected Individuals Code (EPIC) (MCL 700.1101 et seq.), and the Uniform Prudent Investor Act as adopted in Michigan, including without limitation the power to sell, lease, mortgage, exchange, invest, reinvest, and otherwise manage any and all property of my estate, real, personal, or mixed, upon such terms as they shall deem advisable.

3.5 Any disagreement between my Co-Personal Representatives as to any matter of administration shall be resolved by the institutional Co-Personal Representative, whose decision shall be final and binding.

---

## ARTICLE IV — PAYMENT OF DEBTS, EXPENSES, AND TAXES

4.1 I direct my Personal Representatives to pay from the residue of my estate, as soon after my death as practicable, all of my legally enforceable debts, the expenses of my last illness and funeral, the costs and expenses of administering my estate, and all estate, inheritance, succession, and transfer taxes, both federal and state, which may become payable by reason of my death, whether or not such taxes are attributable to property passing under this Will.

4.2 All such debts, expenses, and taxes shall be charged against and paid from the residue of my estate and shall not be apportioned among the beneficiaries of this Will or the beneficiaries of any trust established hereunder, except as otherwise required by federal or state law.

---

## ARTICLE V — SPECIFIC BEQUESTS

### (a) Automobile Collection

5.1 I give, devise, and bequeath the whole of my collection of vintage and classic automobiles, comprising eighteen (18) vehicles presently stored at my private garage at 1200 Lakeshore Drive, Grosse Pointe Shores, Michigan 48236, together with all related titles, registration documents, maintenance records, spare parts, and memorabilia, to my son **HENRY BURT IV**. Said collection includes, without limitation:

   (i) 1957 Mercedes-Benz 300 SL Gullwing;

   (ii) 1961 Ferrari 250 GT SWB;

   (iii) 1967 Chevrolet Corvette Sting Ray L88;

   (iv) 1970 Plymouth Hemi 'Cuda;

   (v) 1969 Ford Mustang Boss 429;

   (vi) 1953 Buick Skylark Convertible;

   and twelve (12) additional vehicles as catalogued in the schedule appended to this Will.

5.2 If my son Henry Burt IV shall predecease me, this bequest shall pass to his children surviving at the date of my death, in equal shares per stirpes.

### (b) Pecuniary Bequests to Daughter and Younger Son

5.3 I give and bequeath the sum of **ONE MILLION DOLLARS ($1,000,000.00)** to my daughter **MARGARET BURT LIVINGSTON**. If Margaret shall predecease me, this bequest shall pass to her children surviving at the date of my death, in equal shares per stirpes.

5.4 I give and bequeath the sum of **ONE MILLION DOLLARS ($1,000,000.00)** to my son **WILLIAM CALDWELL BURT**. If William shall predecease me, this bequest shall pass to his children surviving at the date of my death, in equal shares per stirpes.

### (c) Charitable Bequest

5.5 I give and bequeath the sum of **FIVE HUNDRED THOUSAND DOLLARS ($500,000.00)** to the **REGENTS OF THE UNIVERSITY OF MICHIGAN**, Ann Arbor, Michigan 48109, for the benefit of the School for Environment and Sustainability (formerly the School of Natural Resources and Environment), to be used for the establishment or maintenance of a scholarship fund in the name of "The Burt Family Forestry Scholarship" for students pursuing graduate studies in forestry science, silviculture, or sustainable timber management.

5.6 If the University of Michigan shall not accept this bequest upon the conditions stated, or if the designated programme shall have ceased to exist at the date of my death, my Personal Representatives shall apply the said sum to such other educational institution in the State of Michigan as they shall select, for purposes most nearly approximating those set out in Clause 5.5 above.

---

## ARTICLE VI — THE BURT DYNASTY TRUST

### Establishment and Funding

6.1 I give, devise, and bequeath all the rest, residue, and remainder of my estate, both real and personal, of whatsoever kind and wheresoever situate, including without limitation:

   (a) My residence at 1200 Lakeshore Drive, Grosse Pointe Shores, Michigan 48236;

   (b) My one hundred per cent (100%) membership interest in **BURT TIMBER HOLDINGS LLC**, a Michigan limited liability company;

   (c) All timberlands and real property held by me individually in the Counties of Crawford, Roscommon, Ogemaw, and Iosco in the State of Michigan, comprising approximately twelve thousand (12,000) acres;

   (d) All accounts, investments, and trust accounts held at Comerica Bank and Trust, N.A. or any successor institution; and

   (e) All other property not otherwise effectively disposed of by this Will,

to the Trustee hereinafter named, **IN TRUST**, to be held, managed, invested, and distributed as the **"BURT DYNASTY TRUST"** (hereinafter "the Trust"), upon the following terms and conditions:

### Trustee

6.2 I appoint **COMERICA BANK AND TRUST, N.A.**, Trust Department, as sole Trustee of the Burt Dynasty Trust (hereinafter "the Trustee"). If Comerica Bank and Trust, N.A. shall be unable or unwilling to serve or to continue serving as Trustee, Northern Trust Company shall serve as successor Trustee. The Trustee shall serve without bond.

### Measuring Lives

6.3 For the purposes of this Article VI, the term **"Measuring Lives"** shall mean all of my grandchildren who are living at the date of my death. As of the date of this Will, the Measuring Lives are: Henry Burt V, Caroline Elizabeth Burt, James Caldwell Burt, Alexander Livingston, Victoria Livingston, Eleanor Livingston, William Caldwell Burt Jr., and Grace Elizabeth Burt.

### Income Distributions — Children's Lifetime Interests

6.4 During the lifetime of each of my children (Henry Burt IV, Margaret Burt Livingston, and William Caldwell Burt), the Trustee shall pay to or apply for the benefit of such child the net income of such child's proportionate share of the Trust, in quarterly or more frequent instalments as the Trustee shall determine. For the purposes of this Clause 6.4, each child's proportionate share shall be one-third (1/3) of the Trust.

6.5 Upon the death of any child of mine, such child's income interest shall terminate, and such child's proportionate share of Trust income shall thereafter be paid to or applied for the benefit of such deceased child's then-living descendants, per stirpes, for the remainder of the Trust term.

### Income Distributions — Grandchildren's Lifetime Interests

6.6 Following the death of the last of my children, and during the lifetime of each Measuring Life, the Trustee shall pay to or apply for the benefit of the Measuring Lives and any other then-living grandchildren the net income of the Trust, in proportionate shares per stirpes.

6.7 For the avoidance of doubt, no grandchild or other descendant shall receive any distribution of Trust principal during the Trust term, except as provided in Clause 6.9 below.

### Discretionary Principal Distributions — HEMS Standard

6.8 Notwithstanding any other provision of this Article VI, the Trustee may, in its sole and absolute discretion, distribute to or for the benefit of any then-living descendant of mine such amounts of Trust principal as the Trustee shall determine to be necessary or advisable for the **health, education, maintenance, and support** of such descendant (the "HEMS standard"), taking into account such descendant's other income and resources.

6.9 In exercising this discretion, the Trustee shall give primary consideration to preserving the long-term value of the Trust and shall not make distributions of principal that would, in the Trustee's reasonable judgement, materially impair the Trust's ability to fulfil its purposes over the full Trust term.

### Trust Termination and Final Distribution

6.10 The Trust shall terminate **twenty-one (21) years after the death of the last surviving Measuring Life** (that is, twenty-one years after the death of the last surviving grandchild of mine who was living at the date of my death).

6.11 Upon termination of the Trust, the Trustee shall distribute all remaining Trust principal and any undistributed income to my then-living descendants, in equal shares per stirpes.

6.12 If at the termination of the Trust there are no then-living descendants of mine, the Trustee shall distribute the remaining Trust estate in equal shares to (a) the University of Michigan, for the purposes described in Clause 5.5, and (b) such charitable organisations in the State of Michigan as the Trustee shall select, whose purposes include forest conservation, environmental stewardship, or education.

### Michigan Perpetuities

6.13 I acknowledge and declare that, pursuant to MCL 554.92 as enacted by Public Act 148 of 2008, the State of Michigan has abolished the common law Rule Against Perpetuities with respect to trusts. This Trust is intended to take full advantage of this legislative provision and shall not be subject to any rule requiring termination at any particular time or upon the expiry of any number of lives in being plus twenty-one years.

6.14 Notwithstanding Clause 6.13, I have elected to establish a defined termination event (Clause 6.10) rather than an indefinite perpetual trust, as I believe that multigenerational wealth should eventually vest absolutely in the hands of my descendants rather than be held in trust in perpetuity.

---

## ARTICLE VII — GENERATION-SKIPPING TRANSFER TAX

7.1 I direct that my Personal Representatives and the Trustee shall allocate my entire **generation-skipping transfer (GST) tax exemption** (as defined in Section 2631 of the Internal Revenue Code of 1986, as amended) to the Burt Dynasty Trust established under Article VI of this Will.

7.2 If my GST tax exemption is not sufficient to exempt the entire Trust from the generation-skipping transfer tax, my Personal Representatives shall allocate the exemption to that portion of the Trust that will, in the judgement of the institutional Co-Personal Representative, produce the greatest overall tax benefit to my descendants.

7.3 My Personal Representatives are authorised to make, and I direct them to make, such elections, allocations, and designations as may be necessary or advisable to minimise the aggregate estate, gift, and generation-skipping transfer taxes payable by my estate and by the trusts and beneficiaries hereunder.

---

## ARTICLE VIII — BUSINESS SUCCESSION

8.1 I direct the Trustee to maintain **BURT TIMBER HOLDINGS LLC** as a going concern for a period of not less than **twenty-five (25) years** following the date of my death. During such period, the Trustee shall not dissolve, liquidate, or dispose of the company or its material assets except:

   (a) In the ordinary course of business;

   (b) As may be necessary to comply with applicable law; or

   (c) Upon the unanimous written consent of all of my then-living children (or, if none survive, the unanimous written consent of all Measuring Lives then living).

8.2 The Trustee shall appoint and retain qualified professional management for Burt Timber Holdings LLC and shall not permit any beneficiary of this Will or the Trust to serve as the chief executive officer, chief operating officer, or chief financial officer of the company, unless such beneficiary holds a graduate degree in business, forestry, or a related discipline and has a minimum of ten (10) years' professional experience in the timber, natural resources, or real estate industries.

8.3 Following the expiry of the twenty-five (25) year period, the Trustee may, in its discretion, continue to operate, restructure, sell, or liquidate Burt Timber Holdings LLC, having due regard to the interests of the Trust beneficiaries and the long-term sustainability of the timberlands.

8.4 The Trustee shall cause Burt Timber Holdings LLC and all associated timberlands to be managed in accordance with sustainable forestry practices as certified by the Forest Stewardship Council (FSC) or an equivalent accreditation body, and shall not permit clear-cutting, strip-mining, or other practices that would materially degrade the ecological value of the timberlands.

---

## ARTICLE IX — POWER OF APPOINTMENT

9.1 I grant to my son **HENRY BURT IV** a **limited testamentary power of appointment** over the Trust assets, exercisable by specific reference to this power in his Last Will and Testament, to appoint all or any portion of the Trust estate among my descendants (and the estates and trusts for the benefit of my descendants) in such proportions, outright or in further trust, as Henry IV shall determine.

9.2 This power of appointment is a limited power and shall not be exercisable in favour of Henry IV, his estate, his creditors, or the creditors of his estate.

9.3 To the extent that Henry IV fails to exercise this power, or to the extent that it is not effectively exercised, the Trust estate shall be held, administered, and distributed in accordance with the other provisions of Article VI.

9.4 If Henry IV shall predecease me, or if Henry IV shall die without having exercised this power, the power of appointment shall not pass to any other person and shall lapse.

---

## ARTICLE X — SURVIVORSHIP

10.1 If any beneficiary named in this Will (other than a charitable organisation or the Burt Dynasty Trust) shall die within **sixty (60) days** of the date of my death, or in circumstances rendering it uncertain which of us survived the other, then for all purposes of this Will such beneficiary shall be deemed to have predeceased me, and the gift or bequest to such beneficiary shall be disposed of as though such beneficiary had in fact predeceased me.

---

## ARTICLE XI — ADMINISTRATIVE POWERS

11.1 In addition to the powers conferred elsewhere in this Will and the powers granted by Michigan law, my Personal Representatives and the Trustee shall have the following powers, to be exercised in their fiduciary discretion:

   (a) **Investment:** To invest and reinvest in any form of property or investment, real, personal, or mixed, including without limitation stocks, bonds, mutual funds, real estate, limited liability company interests, timber, mineral rights, life insurance, annuities, and alternative investments, without being restricted to investments authorised for fiduciaries under Michigan law;

   (b) **Retention:** To retain any property received from me or from my estate for such period as they shall deem advisable, without regard to diversification or prudence requirements, and without liability for any decline in value;

   (c) **Real Property:** To manage, improve, repair, lease, sell, exchange, partition, and mortgage any real property, including the authority to demolish buildings, erect new structures, and grant easements;

   (d) **Borrowing:** To borrow money from any source, including themselves in their individual capacities, upon such terms as they shall deem advisable, and to pledge or mortgage any Trust property as security;

   (e) **Litigation:** To commence, defend, compromise, arbitrate, or settle any claim or litigation affecting the estate or Trust;

   (f) **Tax Elections:** To make any and all elections available under federal or state tax law, including but not limited to the election of a fiscal year, the election of valuation dates, and the election to treat any trust as a qualified Subchapter S trust, an electing small business trust, or a grantor trust;

   (g) **Distribution in Kind:** To make distributions in cash or in kind, or partly in each, and to allocate specific assets to particular shares or trusts as they shall deem appropriate, and such allocation shall be binding upon all beneficiaries;

   (h) **Professional Advisors:** To employ such attorneys, accountants, investment advisors, property managers, foresters, and other professional advisors as they shall deem necessary, and to delegate authority to such advisors, and to pay reasonable compensation to such advisors from the estate or Trust;

   (i) **Consolidation and Division:** To consolidate or divide Trust property into separate trusts or shares, and to hold, administer, and account for such separate trusts or shares either together or separately; and

   (j) **Ancillary Administration:** To take any action necessary to administer any property situated outside the State of Michigan, including the appointment of ancillary personal representatives and the transfer of assets to any other jurisdiction.

---

## ARTICLE XII — FUNERAL ARRANGEMENTS

12.1 I direct that my funeral and burial shall be private, attended only by my family and such close friends as my children shall select. I do not wish any public memorial service.

12.2 I wish to be buried at the **Burt family plot, Elmwood Cemetery**, 1200 Elmwood Avenue, Detroit, Michigan 48207, beside my late wife Elizabeth.

12.3 I direct that my funeral arrangements shall be dignified but not extravagant, and that no obituary shall be published in any newspaper or periodical until after my burial has taken place.

---

## ARTICLE XIII — GENERAL PROVISIONS

13.1 **Governing Law.** This Will and the Burt Dynasty Trust shall be governed by and construed in accordance with the laws of the State of Michigan.

13.2 **Severability.** If any provision of this Will or the Trust shall be held to be invalid, illegal, or unenforceable, such invalidity, illegality, or unenforceability shall not affect or impair any other provision, and the remaining provisions shall continue in full force and effect.

13.3 **Construction.** Words importing the singular number shall include the plural and vice versa, and words importing any gender shall include all genders. The term "child" or "children" shall include persons legally adopted. The term "per stirpes" shall have the meaning ascribed to it by MCL 700.2718.

13.4 **No Contest.** If any beneficiary under this Will or the Trust shall, directly or indirectly, contest or seek to set aside or invalidate this Will or any provision hereof, or shall conspire with any person to do any of the foregoing, then any gift, interest, or benefit given to such beneficiary under this Will shall be revoked and shall pass as though such beneficiary had predeceased me without descendants.

13.5 **Spendthrift.** No interest of any beneficiary in the income or principal of the Trust shall be subject to the claims of any creditor of such beneficiary, nor shall any beneficiary have the power to sell, assign, transfer, pledge, mortgage, or otherwise encumber or anticipate his or her interest in the Trust, and no interest in the Trust shall be subject to attachment, garnishment, execution, or other legal process.

---

## ARTICLE XIV — ATTESTATION

**IN WITNESS WHEREOF**, I, **HENRY BURT III**, have hereunto set my hand and seal to this, my Last Will and Testament, consisting of this and the preceding pages, on this **18th day of January 2024**, and I declare that I sign and execute this instrument as my Last Will and Testament, that I sign it willingly, that I execute it as my free and voluntary act for the purposes therein expressed, and that I am eighteen (18) years of age or older, of sound mind, and under no constraint or undue influence.

&nbsp;

**SIGNED, SEALED, PUBLISHED AND DECLARED** )

by the above-named **HENRY BURT III** )

as and for his Last Will and Testament )

in the presence of us, who at his )

request, in his presence, and in the ) ________________________

presence of each other, have subscribed ) HENRY BURT III

our names as attesting witnesses: )

&nbsp;

---

**FIRST WITNESS:**

Signed: ________________________

Name: **JONATHAN R. PRESCOTT**

Address: 500 Woodward Avenue, Suite 4000, Detroit, Michigan 48226

Occupation: Attorney at Law (Prescott, Howell & Chase LLP)

&nbsp;

**SECOND WITNESS:**

Signed: ________________________

Name: **DIANE K. WHITFIELD**

Address: 500 Woodward Avenue, Suite 4000, Detroit, Michigan 48226

Occupation: Legal Secretary (Prescott, Howell & Chase LLP)

&nbsp;

---

## SELF-PROVING AFFIDAVIT

### STATE OF MICHIGAN

### COUNTY OF WAYNE

Before me, the undersigned authority, on this **18th day of January 2024**, personally appeared **HENRY BURT III**, the Testator, and **JONATHAN R. PRESCOTT** and **DIANE K. WHITFIELD**, the witnesses, each known to me personally, and the Testator and the witnesses, being duly sworn, each on his or her oath, declared to me that:

1. The Testator declared to the witnesses that the foregoing instrument is the Testator's Last Will and Testament, and that the Testator had willingly signed and executed it as his free and voluntary act for the purposes therein expressed;

2. Each witness stated that he or she signed the Will as witness in the presence and at the request of the Testator and in the presence of the other witness; and

3. The Testator, at the time of the execution of this Will, was eighteen (18) years of age or over, of sound mind, and under no constraint, duress, fraud, or undue influence.

&nbsp;

________________________

**HENRY BURT III**, Testator

&nbsp;

________________________

**JONATHAN R. PRESCOTT**, Witness

&nbsp;

________________________

**DIANE K. WHITFIELD**, Witness

&nbsp;

Subscribed, sworn to, and acknowledged before me by **Henry Burt III**, the Testator, and subscribed and sworn to before me by **Jonathan R. Prescott** and **Diane K. Whitfield**, the witnesses, on this **18th day of January 2024**.

&nbsp;

________________________

Notary Public, State of Michigan

County of Wayne

My Commission Expires: _______________

&nbsp;

---

*This is a demonstration document. It does not constitute a valid legal instrument, has not been executed, and should not be relied upon for any legal purpose. All names, addresses, and identifying details are fictional. Any resemblance to real persons, living or dead, is purely coincidental.*
