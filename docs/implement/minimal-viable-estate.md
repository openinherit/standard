---
title: "Minimal Viable Estate"
version: "1.0"
status: draft
date: 2026-04-07T12:00
lastmod: 2026-04-07T18:00
author: "Rich Davies"
source: "docs/implement/minimal-viable-estate.md"
supersedes: null
---

# Minimal Viable Estate

## Introduction

Implementing INHERIT need not be an all-or-nothing exercise. The principle of *minimal viable data* — the smallest amount of structured data that still delivers measurable value — underpins INHERIT's adoption model. INHERIT defines four Minimal Viable Estate (MVE) levels. Each level represents a distinct entry point with its own use case, implementation effort, and conformance outcome.

The four levels form an **adoption ladder**: implementers can ship at Level 0, validate with real users, and climb the ladder as confidence grows. Each rung is a complete, schema-valid INHERIT document — not a draft or a partial representation. Every level can be produced, validated, and exchanged with any conformant INHERIT tool.

---

## Level 0 — Testator Only

**Use case:** Onboarding. A user has just created an account. You know who they are but nothing else about their estate.

**What it contains:**

- The testator's given name, family name, and date of birth
- Domicile (country and legal subdivision)
- Status: `planning`
- All required arrays present but empty

**What it does not contain:** assets, beneficiaries, executors, bequests, or any jurisdiction extension.

**Required fields at this level:**

| Field | Example |
|-------|---------|
| `schemaVersion` | `"1.9.0"` |
| `estate.id` | UUID v4 |
| `estate.testatorPersonId` | UUID v4 matching a person in `people` |
| `estate.status` | `"planning"` |
| `estate.domicile.country` | `"GB"` |
| `estate.domicile.subdivision` | `"GB-ENG"` |
| `estate.createdAt` | ISO 8601 timestamp |
| `estate.lastModifiedAt` | ISO 8601 timestamp |
| `people[0].id` | UUID v4 |
| `people[0].givenName` | `"Jane"` |
| `people[0].familyName` | `"Thompson"` |
| `people[0].dateOfBirth` | `"1968-03-14"` |
| `people[0].roles` | `["testator"]` |

**Fixture:** [`examples/fixtures/mve-level-0-testator-only.json`](../../examples/fixtures/mve-level-0-testator-only.json)

---

## Level 1 — Simple Will

**Use case:** Straightforward estate. A testator has a single executor, one or more beneficiaries, and at least one asset. This is the minimum *useful* estate — it captures who gets what.

**What it contains (in addition to Level 0):**

- A second person in the `people` array with `roles: ["executor"]`
- An executor object in the `executors` array referencing that person
- At least one beneficiary (`roles: ["beneficiary"]`) in the `people` array
- At least one asset in the `assets` array (e.g. a savings account, `category: "financial"`)
- At least one bequest in the `bequests` array, linking the asset description to the beneficiary
- A jurisdiction extension declaration (e.g. `uk-england-wales`)

**What it does not contain:** properties (real estate), kinship relationships, guardians, trusts, or tax position calculations.

**Fixture:** [`examples/fixtures/mve-level-1-simple-will.json`](../../examples/fixtures/mve-level-1-simple-will.json)

The fixture tells a coherent story: Jane Thompson appoints her husband David as executor and leaves her Nationwide savings account to her daughter Sophie.

---

## Level 2 — Full Domestic Estate

**Use case:** Solicitor-prepared estate. A complete single-jurisdiction estate with residential property, multiple assets, explicit kinship relationships, guardian appointments, and a conformance declaration at `level_2`.

**What it contains (in addition to Level 1):**

- Residential property in the `properties` array
- Multiple assets across categories (financial, personal, digital)
- Kinship relationships (parent/child, marriage)
- Guardian appointment where minor children are present
- Conformance declaration with `completenessScore`
- `applicationState` block with completeness checklist and recommended actions
- Tax position estimate

**Fixture:** [`examples/fixtures/english-family-estate.json`](../../examples/fixtures/english-family-estate.json)

---

## Level 3 — Cross-Border Estate

**Use case:** International or high-net-worth estate. The testator holds assets or has family connections across multiple jurisdictions, requiring multiple extensions and dual succession instruments.

**What it contains (in addition to Level 2):**

- Multiple jurisdiction extensions (e.g. `uk-england-wales` and `islamic-succession`)
- Dual will or equivalent multi-instrument arrangement (`willType: "dual"`)
- Digital assets (`category: "digital"`)
- Assets in multiple currencies
- Religious or cultural succession considerations
- Detailed provenance metadata

**Fixture:** [`examples/fixtures/fatima-al-rashid-islamic-digital-estate.json`](../../examples/fixtures/fatima-al-rashid-islamic-digital-estate.json)

---

## Adoption Ladder

| Level | Name | Entry Point | Typical Time to Implement | Conformance Achieved |
|-------|------|-------------|--------------------------|----------------------|
| **0** | Testator Only | Account creation / onboarding flow | Hours | Level 1 (identity + domicile) |
| **1** | Simple Will | First estate planning session | 1–3 days | Level 1 |
| **2** | Full Domestic Estate | Solicitor workflow integration | 1–2 weeks | Level 2 |
| **3** | Cross-Border Estate | HNW or international client platform | 2–4 weeks | Level 2 |

**Notes on conformance levels:**

- **Level 1 conformance** requires a valid schema-conformant document with testator identity and domicile. Both MVE Level 0 and Level 1 meet this threshold.
- **Level 2 conformance** additionally requires executor appointment, at least one asset, and a bequest. MVE Level 1 achieves Level 2 conformance once a `conformance` block is declared.
- Conformance declarations are optional in the document structure but required for interoperability with conformance-aware tools such as the [INHERIT Conformance Kit](../../sdk/conformance/).

The ladder is not prescriptive — implementers may choose to skip levels or merge them. The purpose is to make it clear that **any level of INHERIT adoption is better than none**, and that a Level 0 document is a genuine contribution to the open estate data ecosystem.
