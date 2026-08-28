---
title: "Kinship Enrichment — Tier 3 Extensions"
version: "1.0"
status: tracked
date: 2026-04-12T01:30:00Z
lastmod: 2026-04-14T00:00:00Z
github_issue: https://github.com/openinherit/standard/issues/42
author: "Rich Davies"
source: "docs/proposals/kinship-enrichment-tier-3.md"
---

# Kinship Enrichment — Tier 3 Extensions

## Context

The kinship redesign (Friday 11 April 2026) introduced composable properties
(`lineage`, `bloodDegree`) and new types (`uncle_aunt`, `cousin`,
`customary_adoption`) to the core schema. Cross-jurisdictional research
covering 20+ legal traditions produced findings relevant to extensions
beyond the 7 covered in Tier 1 and Tier 2.

This document captures those findings as a proposal for future enrichment.
Each extension section describes what the research found, what the extension
currently has, and what improvements would add value.

**Priority order:** Extensions are ranked by the value the kinship research
adds — i.e., how much the research found that the extension doesn't already
capture.

---

## 1. UK England & Wales — HIGH VALUE

### What the research found

The Administration of Estates Act 1925 (s.46) defines a precise intestacy
hierarchy that **explicitly distinguishes whole blood from half blood** at
two levels:

1. Siblings of the whole blood and their issue
2. Siblings of the half blood and their issue
3. Grandparents
4. Uncles/aunts of the whole blood and their issue
5. Uncles/aunts of the half blood and their issue
6. Crown (*bona vacantia*)

This is one of only three jurisdictions (with Hong Kong and New Zealand) that
the research identified as requiring the `bloodDegree` property at the
uncle/aunt level. The distinction is not just terminological — whole blood
takes absolute priority over half blood at each tier.

The Inheritance (Provision for Family and Dependants) Act 1975 allows claims
by a broader set of people, but the extension already captures these via
`ifpa1975Eligible.category`.

### What the extension currently has

- `ifpa1975Eligible.category` enum: `spouse`, `former_spouse`, `child`,
  `child_of_family`, `maintained_person`, `cohabitant`
- No intestacy hierarchy modelling
- No kinship degree or blood distinction

### Proposed improvements

1. **Add intestacy hierarchy model.** A `intestacyDistribution` property with
   a ranked array of heir tiers, each with a `relationshipCategory` and
   `bloodRequirement` (whole/half). This would make the AEA s.46 rules
   machine-readable:

   | Tier | Category | Blood | Maps to core types |
   |------|----------|-------|-------------------|
   | 1 | spouse | n/a | relationship.json |
   | 2 | children and issue | n/a | parent_child_*, grandparent_grandchild |
   | 3 | parents | n/a | parent_child_* |
   | 4 | siblings_whole | whole | sibling |
   | 5 | siblings_half | half | half_sibling |
   | 6 | grandparents | n/a | grandparent_grandchild |
   | 7 | uncles_aunts_whole | whole | uncle_aunt + bloodDegree: whole |
   | 8 | uncles_aunts_half | half | uncle_aunt + bloodDegree: half |
   | 9 | crown | n/a | n/a |

2. **Document the `bloodDegree` connection.** Add `$comment` explaining that
   English intestacy is the primary use case for the core `bloodDegree`
   property — implementers building English intestacy calculators should
   populate `bloodDegree` on all `uncle_aunt` kinship records.

3. **Add `statutoryLegacy` amount tracking.** The extension has
   `survivingSpouseEntitlement` but no structured field for the statutory
   legacy amount (currently £322,000 from 26 July 2023). This is adjacent
   to kinship — the amount determines how much the spouse receives before
   the kinship-based distribution kicks in.

---

## 2. Hong Kong — HIGH VALUE

### What the research found

The Intestates' Estates Ordinance (Cap. 73) follows the English AEA 1925
pattern closely, including the **whole blood / half blood distinction** at
sibling and uncle/aunt levels. The research also found:

- New Territories customary law (*tso*/*tong* ancestral trusts) — patrilineal
  clan membership determines succession to communal land
- Pre-1971 Chinese customary law (Marriage Reform Ordinance 1971) — for
  estates of persons who died or acquired concubines before 7 October 1971,
  Chinese customary law may still apply, including concubine children's
  inheritance rights

### What the extension currently has

- `localGrantTypes` enum
- `mpfNomination` (pension nominations)
- `survivingSpouseEntitlement` (personal chattels, statutory legacy, residue)
- `intestacyDistribution.issueDistribution` (per_stirpes/per_capita)
- No kinship hierarchy, no blood distinction, no customary law handling

### Proposed improvements

1. **Add intestacy hierarchy** — same pattern as England & Wales with the
   whole/half blood tiers. Cap. 73 is substantively identical to AEA s.46
   for this purpose.

2. **Add `newTerritoriesCustomaryLaw` section:**
   - `tsoTongMembership` (boolean) — whether the deceased was a member of a
     tso/tong
   - `patrilinealSuccession` (boolean) — whether patrilineal succession
     applies to communal land
   - `notes` (string) — for recording the specific tso/tong and land details

3. **Add `preReformCustomaryLaw` section:**
   - `applicable` (boolean) — whether pre-1971 Chinese customary law applies
   - `concubineChildrenRecognised` (boolean) — whether children of concubines
     have inheritance rights
   - `notes` (string)

4. **Document `bloodDegree` connection** — same as England & Wales.

---

## 3. US Estate — HIGH VALUE

### What the research found

- The Uniform Probate Code stops at the 2nd parentelic line (grandparents
  and their descendants = uncles/aunts/first cousins). Some states go further.
- **Half-blood rules vary dramatically by state** — the extension already has
  `halfBloodRule` enum (`equal_to_whole_blood`, `half_share`, `excluded`),
  which is excellent. But it only applies at the sibling level. Some states
  apply different half-blood rules at the uncle/aunt level.
- Louisiana forced heirship is unique in the US — the extension models this.
- Per stirpes variants (`strict_per_stirpes`, `modern_per_stirpes`,
  `per_capita_at_each_generation`) are already well-modelled.
- The `retirementAccountRules.edbCategory` enum already captures eligible
  designated beneficiary categories.

### What the extension currently has

- `halfBloodRule` (3 values) — but only for siblings
- `perStirpesVariant` (3 values)
- `louisianaForcedHeirship`
- `electiveShareDetails`
- `retirementAccountRules` with `edbCategory`
- No intestacy hierarchy by kinship degree
- No uncle/aunt/cousin classification

### Proposed improvements

1. **Extend `halfBloodRule` scope.** Currently applies implicitly to siblings.
   Add a `$comment` clarifying that:
   - Most states apply the same half-blood rule at all levels (siblings,
     uncles/aunts)
   - Some states (e.g., Florida) treat half-blood differently at the
     uncle/aunt level
   - Implementers should apply the `halfBloodRule` to `uncle_aunt` kinship
     records using the `bloodDegree` property

2. **Add `intestacyDepth` property:**
   - `upcCompliant` (boolean) — whether the state follows UPC's 2nd parentelic
     limit
   - `maxParentele` (integer) — how many parentelic orders the state recognises
     (2 for UPC states, 3+ for states like California that go to
     great-grandparents)
   - `laughingHeirCutoff` (boolean) — whether the state limits inheritance to
     prevent distant relatives ("laughing heirs") from inheriting

3. **Add `collateralHeirRules` section:**
   - `cousinInheritance` (boolean) — whether first cousins can inherit on
     intestacy
   - `representationAtCollateralLevel` (boolean) — whether per stirpes
     representation applies to uncles/aunts and cousins

---

## 4. Scotland — MEDIUM VALUE

### What the research found

Scotland has a distinct succession system from England & Wales:

- **Legal rights** are indefeasible claims that cannot be defeated by will:
  - *Jus relictae/relicti*: surviving spouse's right to 1/3 (with children)
    or 1/2 (without) of moveable estate
  - *Legitim*: children's right to 1/3 (with surviving spouse) or 1/2
    (without) of moveable estate
- **Prior rights**: surviving spouse gets dwelling house (up to £473,000),
  furniture (up to £29,000), and financial provision (up to £50,000)
- Intestacy order: spouse → children → parents + siblings → grandparents →
  uncles/aunts
- **Cohabitation claims** under Family Law (Scotland) Act 2006 — the
  extension already handles these well

### What the extension currently has

Scotland is already one of the most detailed extensions (590 lines):
- `legalRights` with spouse and children shares
- `priorRights` with dwelling/furniture/financial thresholds
- `cohabitationClaim` with duration and deadline tracking
- `freeEstateDistribution` with ranked distribution
- `croftingSuccession` with specific Crofting Commission rules
- `survivorshipDestinations`

### Proposed improvements

1. **Add kinship-specific `$comment`s** to `freeEstateDistribution` mapping
   the Scottish intestacy order to core kinship types:
   - Rank 1: children (parent_child_*)
   - Rank 2: parents and siblings equally (parent_child_*, sibling,
     half_sibling)
   - Rank 3: surviving spouse (if no rank 1 or 2)
   - Rank 4: uncles/aunts (uncle_aunt)
   - Rank 5: grandparents (grandparent_grandchild)
   - Rank 6: Crown

2. **Document that Scotland does NOT distinguish whole/half blood** at the
   uncle/aunt level (unlike England). Half-siblings inherit equally with
   full siblings. This is a key difference implementers need to know.

3. **Add `successionScotlandAct2016` section** documenting the 2016 reforms
   that are partially in force and partially pending — the extension
   references deadline versions but doesn't explain the substantive changes.

---

## 5. Ireland — MEDIUM VALUE

### What the research found

The Succession Act 1965 creates a distinctive system:

- **Legal right share** (s.111): spouse gets 1/3 (with children) or 1/2
  (without) — cannot be defeated by will
- **Section 117 claims**: children can claim the court failed in its "moral
  duty" to provide for them — highly discretionary
- **Capital Acquisitions Tax** uses kinship-based group thresholds:
  - Group A (€335,000): child, minor child of predeceased child
  - Group B (€32,500): parent, brother, sister, nephew, niece, grandchild
  - Group C (€16,250): all others
  - These thresholds make kinship classification directly relevant to tax

### What the extension currently has

- `spouseLegalRightShare`
- `section117Claim` with claimant person IDs
- `intestacyRules.distributionOrder` enum: `spouse_only`, `spouse_and_children`,
  `children_only`, `parents`, `siblings`, `next_of_kin`
- `capitalAcquisitionsTax` with group thresholds
- `section56Advancement` for lifetime gifts

### Proposed improvements

1. **Expand `distributionOrder`** to include the full Irish intestacy
   hierarchy. Currently missing: `nephews_nieces` (siblings' children inherit
   by representation), `grandparents`, `uncles_aunts`, `first_cousins`.
   The Irish hierarchy continues further than the current enum suggests.

2. **Add `catGroupMapping`** to `capitalAcquisitionsTax` — a structured
   mapping of kinship types to CAT groups:
   - Group A: parent_child_biological, parent_child_adopted,
     grandparent_grandchild (minor grandchild of predeceased child only)
   - Group B: sibling, half_sibling, uncle_aunt, cousin,
     grandparent_grandchild (adult grandchild)
   - Group C: all others
   This makes the tax calculation directly computable from kinship data.

3. **Document that Ireland does NOT distinguish whole/half blood** — siblings
   and their issue inherit equally regardless of blood degree.

---

## 6. Canada — MEDIUM VALUE

### What the research found

Canadian succession is entirely provincial, with significant variation:

- Ontario: Succession Law Reform Act — spouse + children share, then parents,
  then siblings, then nephews/nieces, then "next of kin" (broad)
- British Columbia: Wills, Estates and Succession Act — includes more distant
  relatives
- Alberta: dower rights (surviving spouse's right to homestead)
- Quebec: civil law system (forced heirship, community property)
- Indigenous land succession under various treaty frameworks

### What the extension currently has

Very thin — only 209 lines:
- `indigenousLandDetails` with land type enum
- `albertaDower` with spouse and property references
- No intestacy hierarchy, no heir classification, no provincial variation

### Proposed improvements

1. **Add `province` enum** — the extension currently has no way to indicate
   which provincial law applies. Critical since every province has different
   intestacy rules. Values: all 13 provinces/territories.

2. **Add `intestacyRules` section** (paralleling Ireland's pattern):
   - `distributionOrder` enum covering the common-law provincial pattern:
     `spouse_only`, `spouse_and_children`, `children_only`, `parents`,
     `siblings`, `nephews_nieces`, `grandparents`, `uncles_aunts`, `crown`
   - `preferentialShare` (money) — the amount the spouse receives before
     sharing with children (varies by province: ON $350,000, BC $300,000, etc.)

3. **Add `quebecCivilLaw` section:**
   - `forcedHeirship` (boolean) — Quebec has forced heirship for surviving
     spouse (family patrimony)
   - `familyPatrimonyApplies` (boolean)
   - `notes` (string)

4. **Document kinship type mapping** — `$comment` on any heir classification
   noting that Canadian provinces generally do NOT distinguish whole/half
   blood (unlike England).

---

## 7. EU Succession — MEDIUM VALUE

### What the research found

The EU Succession Regulation (Brussels IV, No 650/2012) primarily governs
which country's law applies in cross-border estates — it doesn't define
kinship rules itself. However, the forced heirship variants modelled in the
extension directly depend on kinship classification:

- **French réserve héréditaire**: only descendants are reserved heirs (since
  2006 reform — parents lost their reserved share)
- **German Pflichtteil**: descendants, parents, and spouse
- **Italian legittima**: spouse, children (including adopted), parents
- **Spanish legítima**: varies by region (2/3 in common civil, 1/4 in
  Catalonia, 1/3 in Basque, symbolic in Navarre)
- **Polish zachowek**: descendants, spouse, parents — 2/3 of intestate share
  (or 1/2 for others)

### What the extension currently has

- `ForcedHeirshipVariant.model` (7 values)
- `SpanishRegionalRegime.region` (7 values)
- No kinship classification for who qualifies as a forced heir

### Proposed improvements

1. **Add `protectedHeirCategories` to `ForcedHeirshipVariant`** — a
   `$comment` or enum documenting which kinship types qualify as forced heirs
   under each model:

   | Model | Protected heirs |
   |-------|----------------|
   | french_reserve | descendants only (since 2006) |
   | german_pflichtteil | descendants, parents, spouse |
   | italian_legittima | spouse, children, parents |
   | scandinavian_laglott | descendants only |
   | dutch_deferred | children only (monetary claim, not share) |
   | polish_zachowek | descendants, spouse, parents |
   | swiss_pflichtteil | descendants, spouse (parents removed 2023) |

2. **Document the 2023 Swiss Pflichtteil reform** — parents are no longer
   protected heirs. The Switzerland extension may already capture this but
   the EU extension should note it for cross-border consistency.

---

## 8. Switzerland — LOW VALUE

### What the research found

- Three parenteles only (no 4th order — unlike Germany)
- 2023 Pflichtteil reform removed parents as protected heirs
- Pflichtteil fractions: descendants 1/2, surviving spouse 1/2 (of statutory
  share)
- The extension already models Pflichtteil by heir class with statutory and
  forced share fractions

### What the extension currently has

- `pflichtteil.protectedHeirs[].heirClass`: `descendant`, `surviving_spouse`,
  `parent`
- Cantonal variation handling
- Matrimonial property regime enum
- Notarial will forms

### Proposed improvements

1. **Update `heirClass` enum comment** — note that `parent` is no longer a
   protected heir since the 1 January 2023 reform. The enum value should
   remain (for pre-2023 estates) but be documented as historical.

2. **Add `reformDate` or `$comment`** noting that the 2023 reform increased
   the freely disposable share from 3/8 to 1/2 (when there are descendants
   and a spouse).

3. **Document three-parentele limit** — `$comment` explaining that Swiss law
   stops at the 3rd parentele (grandparents and their descendants). No
   great-grandparents or great-uncles. If no one in three parenteles, estate
   goes to the canton. This is a key difference from Germany (unlimited
   Ordnungen).

---

## 9. India (general) — LOW VALUE

### What the research found

The India extension covers the multi-personal-law framework. Hindu succession
is already handled by the hindu-succession extension. The research found:

- **Christian succession** (Indian Succession Act 1925): follows English
  pattern with some modifications
- **Parsi succession**: entirely distinct — daughters get half the son's share,
  widow gets equal to a child's share
- **Goa civil code**: Portuguese-derived, community of property, forced
  heirship for children

### What the extension currently has

- `personalLaw` enum (6 values)
- `coparcenaryDetails` (Hindu-specific, overlaps with hindu-succession)
- `muslimSuccessionRules` with school enum
- Property classification (ancestral/self-acquired/mixed)
- Succession certificate types

### Proposed improvements

1. **Add `parsiSuccessionRules`** section:
   - `daughterShareFraction`: always 1/2 of son's share
   - `widowShareFraction`: equal to one child's share
   - `notes` (string)

2. **Add `christianSuccessionRules`** section:
   - `followsIndianSuccessionAct` (boolean)
   - `notes` (string) — for recording any state-specific deviations

3. **Remove coparcenary overlap** — the `coparcenaryDetails` section
   duplicates content in the hindu-succession extension. Consider deprecating
   it with a `$comment` pointing to the Hindu extension.

---

## 10. UAE — LOW VALUE

### What the research found

The UAE operates a dual-track system:
- **Sharia track**: UAE Personal Status Law (Federal Law No. 28/2005) applies
  Islamic faraid to Muslim estates
- **DIFC/ADGM track**: non-Muslims can register wills under common law
  principles at the DIFC Wills Service Centre or ADGM
- **Decree Law 41 (2022)**: allows non-Muslims to elect home-country law

The Islamic succession extension already handles faraid comprehensively. The
UAE extension's value is in modelling the *choice of track*, not the kinship
rules themselves.

### What the extension currently has

- `successionTrack` enum (3 values)
- `difcWill` and `adgmWill` with type enums
- `shariaFixedShares` section
- `expatriateHandling`
- `propertyTreatment` by tenure type
- `disputeResolution` with forum enum

### Proposed improvements

1. **Add `$comment` to `shariaFixedShares`** linking to the Islamic succession
   extension for full faraid modelling. The UAE extension should not duplicate
   the heir classification — it should reference it.

2. **Add `homeCountryLaw` section** for Decree Law 41 elections:
   - `electedCountry` (string, ISO 3166-1 alpha-2)
   - `electionRegistered` (boolean)
   - `registrationReference` (string)
   This is kinship-adjacent — the election determines which succession rules
   (and therefore which kinship classifications) apply.

---

## Implementation Priority

| Extension | Value | Effort | Recommended timing |
|-----------|-------|--------|-------------------|
| UK England & Wales | HIGH | Medium | Next sprint — `bloodDegree` showcase |
| Hong Kong | HIGH | Medium | With E&W (same intestacy pattern) |
| US Estate | HIGH | Medium | Standalone — complex state variation |
| Scotland | MEDIUM | Low | Quick — mostly `$comment` documentation |
| Ireland | MEDIUM | Low | Quick — CAT group mapping is high-value |
| Canada | MEDIUM | Medium | Needs provincial framework first |
| EU Succession | MEDIUM | Low | Quick — forced heir category mapping |
| Switzerland | LOW | Low | Quick — 2023 reform documentation |
| India | LOW | Medium | Parsi/Christian rules need research |
| UAE | LOW | Low | Quick — mostly cross-references |

**Suggested execution order:**
1. England & Wales + Hong Kong together (same intestacy pattern, both need `bloodDegree`)
2. Ireland + Scotland + EU Succession + Switzerland (quick wins, mostly documentation)
3. US Estate (standalone, complex)
4. Canada (needs more design work for provincial variation)
5. India + UAE (lowest priority, least kinship-specific)

## Research Provenance

All findings derive from the cross-jurisdictional kinship research conducted
on Friday 11 April 2026. Sources documented in
`docs/superpowers/specs/2026-04-11-kinship-redesign-design.md`.
