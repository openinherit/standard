# Extension Composition Guide

INHERIT extensions are designed to compose. A geographic extension (e.g. `uk-england-wales`) governs the statutory framework — tax thresholds, intestacy rules, probate procedure — whilst a tradition extension (e.g. `islamic-succession`) captures succession rules derived from a religious or customary legal tradition. Both are loaded via the `extensions` array on the estate's succession regime and their properties are merged into the estate document without namespace collision.

This document records **seven validated multi-extension combinations**. Each has been tested against the v3 schemas to confirm that no property-level conflicts arise and that the resulting document validates cleanly.

---

## How Composition Works

Each extension declares its own top-level `properties`. Geographic extensions use fields such as `nilRateBand`, `inheritanceTaxRate`, and `ifpa1975Eligible`. Tradition extensions use fields such as `school`, `faraidApplies`, `heirClassifications`, and `wasiyyaRules`. Because extensions are namespaced by design — geographic extensions never define tradition-specific fields and vice versa — properties do not collide.

When two extensions are loaded:

1. The estate's `successionRegime.extensions` array lists both extension IDs.
2. Each extension's properties appear under their respective keys in `x-inherit-extensions`.
3. Validators apply both schemas independently — a document must satisfy both to be conformant.

The sole area requiring attention is **heir classification**: geographic extensions may define intestacy-eligible heirs, while tradition extensions define their own heir classes. These are **parallel, not conflicting** — both can coexist because they describe different legal dimensions of the same person.

---

## 1. England & Wales + Islamic Succession

**Scenario:** A Muslim resident domiciled in England whose estate is subject to English IHT and probate, but whose family wishes to distribute the net estate according to faraid.

**Extensions loaded:** `uk-england-wales`, `islamic-succession`

**Field conflicts:** None. The England & Wales extension governs `nilRateBand`, `residenceNilRateBand`, `inheritanceTaxRate`, and `ifpa1975Eligible`. The Islamic extension governs `school`, `faraidApplies`, `heirClassifications`, `wasiyyaRules`, and `awlApplied`. No property names overlap.

**Resolution approach:** English law takes precedence for tax and administration. Faraid distribution applies to the net distributable estate after IHT, debts, and administration expenses. An IFPA 1975 claim could override faraid allocations — this tension is recorded in `notes`, not resolved by the schema.

```json
{
  "successionRegime": {
    "jurisdiction": "GB",
    "determinedBy": "domicile",
    "extensions": ["uk-england-wales", "islamic-succession"]
  },
  "x-inherit-extensions": {
    "uk-england-wales": {
      "nilRateBand": { "value": 32500000, "effectiveDate": "2009-04-06" },
      "inheritanceTaxRate": { "value": 40, "effectiveDate": "2009-04-06" }
    },
    "islamic-succession": {
      "school": "hanafi",
      "faraidApplies": true,
      "wasiyyaRules": { "maxPortion": 33.33, "toNonHeirsOnly": true }
    }
  }
}
```

---

## 2. England & Wales + Jewish Succession

**Scenario:** A Jewish resident domiciled in England whose family wishes to apply halachic inheritance principles alongside English probate.

**Extensions loaded:** `uk-england-wales`, `jewish-succession`

**Field conflicts:** None. The England & Wales extension defines IHT thresholds and IFPA eligibility. The Jewish extension defines `halachicHeirs`, `bekhorApplies` (firstborn double-share), `mezonotObligations`, and `kinyanDetails`. No overlap.

**Resolution approach:** English law governs tax and administration. Halachic distribution is applied to the net estate. Where a bekhor (firstborn) double-share conflicts with equal distribution under English intestacy, the will must explicitly provide for it — the schema records both legal positions without adjudicating.

```json
{
  "successionRegime": {
    "jurisdiction": "GB",
    "determinedBy": "domicile",
    "extensions": ["uk-england-wales", "jewish-succession"]
  },
  "x-inherit-extensions": {
    "uk-england-wales": {
      "nilRateBand": { "value": 32500000, "effectiveDate": "2009-04-06" },
      "ifpa1975Eligible": [
        { "personId": "a1b2c3d4-0000-0000-0000-000000000001", "category": "spouse" }
      ]
    },
    "jewish-succession": {
      "bekhorApplies": true,
      "halachicHeirs": [
        { "personId": "a1b2c3d4-0000-0000-0000-000000000002", "heirType": "bekhor" }
      ]
    }
  }
}
```

---

## 3. England & Wales + Hindu Succession

**Scenario:** A Hindu resident domiciled in England whose estate includes assets in both England and India, and whose family wishes to record the coparcenary and Class I heir positions under the Hindu Succession Act.

**Extensions loaded:** `uk-england-wales`, `hindu-succession`

**Field conflicts:** None. The England & Wales extension covers IHT and English intestacy. The Hindu extension covers `coparcenaryMembers`, `successionSchool` (Mitakshara or Dayabhaga), `classOneHeirs`, and `stridhanAssets`. No overlap.

**Resolution approach:** English law governs the English estate for tax and probate. Hindu succession rules may govern Indian-situs assets under Indian private international law. The schema records both positions. Where the deceased held Hindu Undivided Family (HUF) property, the coparcenary interest is captured in the Hindu extension whilst the English estate captures only the deceased's severable share.

```json
{
  "successionRegime": {
    "jurisdiction": "GB",
    "determinedBy": "domicile",
    "extensions": ["uk-england-wales", "hindu-succession"]
  },
  "x-inherit-extensions": {
    "uk-england-wales": {
      "nilRateBand": { "value": 32500000, "effectiveDate": "2009-04-06" },
      "transferableNilRateBand": true
    },
    "hindu-succession": {
      "successionSchool": "mitakshara",
      "coparcenaryMembers": [
        "a1b2c3d4-0000-0000-0000-000000000003",
        "a1b2c3d4-0000-0000-0000-000000000004"
      ]
    }
  }
}
```

---

## 4. Singapore-Malaysia + Islamic Succession

**Scenario:** A Muslim resident in Singapore whose estate falls under the Administration of Muslim Law Act (AMLA), requiring Shariah court certification of faraid shares.

**Extensions loaded:** `singapore-malaysia`, `islamic-succession`

**Field conflicts:** None. The Singapore-Malaysia extension covers `amlaApplicable`, `cpfNomination`, and `isaDistribution`. The Islamic extension covers `school`, `faraidApplies`, `heirClassifications`, and `shariaCourtReference`. No overlap.

**Resolution approach:** AMLA mandates that Muslim estates in Singapore are distributed according to Islamic law. The Singapore-Malaysia extension records the AMLA applicability and CPF nominations (which are outside the Muslim estate). The Islamic extension records the faraid calculation. These are complementary — AMLA is the statutory mechanism that invokes faraid.

```json
{
  "successionRegime": {
    "jurisdiction": "SG",
    "determinedBy": "personal_status",
    "extensions": ["singapore-malaysia", "islamic-succession"]
  },
  "x-inherit-extensions": {
    "singapore-malaysia": {
      "amlaApplicable": true,
      "cpfNomination": { "nominated": true, "nomineeCount": 2 }
    },
    "islamic-succession": {
      "school": "shafii",
      "faraidApplies": true,
      "awlApplied": false
    }
  }
}
```

---

## 5. Singapore-Malaysia + Hindu Succession

**Scenario:** A Hindu resident in Singapore whose estate is governed by the Intestate Succession Act (ISA) but whose family wishes to record coparcenary and HUF positions for Indian-situs assets.

**Extensions loaded:** `singapore-malaysia`, `hindu-succession`

**Field conflicts:** None. The Singapore-Malaysia extension covers `isaDistribution` and `cpfNomination`. The Hindu extension covers `successionSchool`, `coparcenaryMembers`, and `classOneHeirs`. No overlap.

**Resolution approach:** Singaporean ISA governs the local estate. Hindu succession rules are recorded for Indian-situs assets and family reference. CPF nominations operate outside both succession regimes. The schema captures all three dimensions without conflict.

```json
{
  "successionRegime": {
    "jurisdiction": "SG",
    "determinedBy": "domicile",
    "extensions": ["singapore-malaysia", "hindu-succession"]
  },
  "x-inherit-extensions": {
    "singapore-malaysia": {
      "isaDistribution": { "applicable": true }
    },
    "hindu-succession": {
      "successionSchool": "mitakshara",
      "classOneHeirs": [
        { "personId": "a1b2c3d4-0000-0000-0000-000000000005", "relationship": "son" }
      ]
    }
  }
}
```

---

## 6. US Estate + Islamic Succession

**Scenario:** A Muslim resident in New York whose estate is subject to US federal estate tax and New York elective-share rules, but whose family wishes to distribute the net estate according to faraid.

**Extensions loaded:** `us-estate`, `islamic-succession`

**Field conflicts:** None. The US extension covers `state`, `propertyRegime`, `electiveShare`, `homesteadExemption`, and `noContestClause`. The Islamic extension covers `school`, `faraidApplies`, `heirClassifications`, and `wasiyyaRules`. No overlap.

**Resolution approach:** US federal and state law govern tax, elective share, and homestead. Faraid distribution applies to the net estate after all statutory obligations. The elective share (New York EPTL) may override faraid allocations — a surviving spouse can claim the statutory share regardless of the will or faraid. This tension is inherent and is recorded, not resolved, by the schema.

```json
{
  "successionRegime": {
    "jurisdiction": "US",
    "determinedBy": "domicile",
    "extensions": ["us-estate", "islamic-succession"]
  },
  "x-inherit-extensions": {
    "us-estate": {
      "state": "US-NY",
      "propertyRegime": "separate_property",
      "electiveShare": { "applicable": true }
    },
    "islamic-succession": {
      "school": "hanafi",
      "faraidApplies": true,
      "wasiyyaRules": { "maxPortion": 33.33, "toNonHeirsOnly": true }
    }
  }
}
```

---

## 7. UK England & Wales + Africa Customary

**Scenario:** A Nigerian Igbo resident domiciled in England who holds land in Lagos. The English estate is governed by English probate and IHT; the Nigerian land may be subject to customary succession rules under Igbo patrilineal tradition, potentially mediated by a family council decision.

**Extensions loaded:** `uk-england-wales`, `africa-customary`

**Field conflicts:** None. The England & Wales extension covers IHT thresholds, IFPA eligibility, and English intestacy. The Africa Customary extension covers `customarySuccessionRules` (ethnic group, succession system, widow/daughter rights), `familyCouncilDecisions`, and `communalPropertyDetails`. No overlap.

**Resolution approach:** English law governs the English-situs estate. Nigerian-situs land may be governed by customary law depending on the state (Lagos applies customary law alongside statute). The schema records the Igbo patrilineal rule and any family council decision. Where customary rules conflict with the Nigerian Constitution (e.g. exclusion of daughters, per *Ukeje v Ukeje* [2014]), the `constitutionalOverride` flag and `caseReference` capture the position.

```json
{
  "successionRegime": {
    "jurisdiction": "GB",
    "determinedBy": "domicile",
    "extensions": ["uk-england-wales", "africa-customary"]
  },
  "x-inherit-extensions": {
    "uk-england-wales": {
      "nilRateBand": { "value": 32500000, "effectiveDate": "2009-04-06" },
      "inheritanceTaxRate": { "value": 40, "effectiveDate": "2009-04-06" }
    },
    "africa-customary": {
      "customarySuccessionRules": [{
        "ethnicGroup": "Igbo",
        "successionSystem": "patrilineal_primogeniture",
        "constitutionalOverride": true,
        "caseReference": "Ukeje v Ukeje [2014] LPELR-22724(SC)"
      }]
    }
  }
}
```

---

## Conflict Summary Table

| Combination | Geographic Extension | Tradition Extension | Property Conflicts | Notes |
|---|---|---|---|---|
| 1 | uk-england-wales | islamic-succession | None | IFPA 1975 may override faraid |
| 2 | uk-england-wales | jewish-succession | None | Bekhor requires explicit will provision |
| 3 | uk-england-wales | hindu-succession | None | HUF coparcenary recorded separately |
| 4 | singapore-malaysia | islamic-succession | None | AMLA invokes faraid by statute |
| 5 | singapore-malaysia | hindu-succession | None | ISA governs local; Hindu for Indian assets |
| 6 | us-estate | islamic-succession | None | Elective share may override faraid |
| 7 | uk-england-wales | africa-customary | None | Constitutional challenges may override custom |

In all seven cases, no property-level conflicts exist. The extensions are complementary by design: geographic extensions occupy a different property namespace from tradition extensions. The primary source of real-world tension is not schema conflict but **legal precedence** — statutory rights (IFPA 1975, elective share, constitutional override) may trump tradition-based distributions. The schema records both positions faithfully; it does not adjudicate between them.

---

Other combinations may work but are untested. If you encounter a combination not listed here, please submit it to the steering committee for validation. General composition rules are formalised in v3.0 — see the extension conformance metadata on each extension schema.
