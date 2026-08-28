# INHERIT Estate Vocabulary Specification

**Vocabulary URI:** `https://openinherit.org/v3/vocab/estate`
**Meta-schema:** `https://openinherit.org/v3/vocab/estate/meta.json`
**Status:** v3

## Introduction

The INHERIT estate vocabulary is a custom JSON Schema 2020-12 vocabulary that provides schema-level metadata keywords for estate data schemas. These keywords describe the legal, geographic, and organisational context of a schema -- information that is essential for correct interpretation of estate data but which has no representation in standard JSON Schema.

The vocabulary is declared as `false` (optional) in the INHERIT dialect. This means that a generic JSON Schema 2020-12 validator that does not understand these keywords will still process INHERIT schemas gracefully -- it simply ignores the custom keywords. Validators that *do* understand the vocabulary can use these keywords to enforce jurisdiction constraints, check version compatibility, and surface provenance metadata.

The meta-schema at `meta.json` validates the *syntax* of the vocabulary keywords when they appear in a schema document. It does not define their *semantics* -- that is the purpose of this specification.

All 10 keywords are schema-level annotations. They appear at the root of an INHERIT schema document alongside standard JSON Schema keywords such as `$id`, `title`, and `properties`. The value of each keyword MUST be collected as an annotation.

---

## Keywords

### 1. `jurisdiction`

**Name:** `jurisdiction`

**Definition:** Identifies the specific legal jurisdiction that this schema targets or operates within. Succession law varies not just by country but by subdivision -- Scotland differs from England and Wales, and US states have radically different intestacy rules. This keyword captures that granularity.

**Type:** Object (references `common/jurisdiction.json`)

**Valid values:** An object conforming to the `jurisdiction.json` schema, which has the following properties:

| Property | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `country` | string | Yes | Exactly 2 uppercase letters, pattern `^[A-Z]{2}$` | ISO 3166-1 alpha-2 country code |
| `subdivision` | string | No | Max 255 chars, pattern `^[A-Z]{2}-[A-Z0-9]{1,6}$` | ISO 3166-2 subdivision code |
| `legalSystems` | array of strings | No | Enum items, max 20 items, unique | Legal traditions in force in this jurisdiction |
| `name` | string | No | Max 255 chars | Human-readable jurisdiction name (not authoritative) |

No additional properties are permitted.

**Example:**

```json
{
  "jurisdiction": {
    "country": "GB",
    "subdivision": "GB-ENG",
    "name": "England and Wales"
  }
}
```

**When to use:** Every schema that models jurisdiction-specific succession rules should declare `jurisdiction`. Schemas that are jurisdiction-agnostic (e.g. a pure data transport schema) may omit it.

**Interaction with other keywords:** The `jurisdiction` keyword provides a single, structured jurisdiction reference. For extension schemas that apply across multiple countries, use `applicableJurisdictions` instead (or in addition). The `legalSystems` property within the jurisdiction object relates to the top-level `legalSystems` keyword but serves a different purpose: the nested property describes the jurisdiction itself, whilst the top-level keyword describes what the schema implements. If `successionRegime` is also present, the declared regime should be one that is legally recognised within the declared jurisdiction.

---

### 2. `successionRegime`

**Name:** `successionRegime`

**Definition:** Describes the legal succession system that this schema implements. This captures both the broad legal tradition (common law, civil law, etc.) and a human-readable description of the specific regime.

**Type:** Object

**Valid values:** An object with the following properties:

| Property | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `legalTradition` | string | No | Enum: `common_law`, `civil_law`, `mixed`, `customary_law`, `islamic_law`, `hindu_law`, `jewish_law`, `canon_law` | The broad legal tradition governing succession |
| `description` | string | No | Max 2000 characters | Human-readable description of the specific succession regime |

**Example:**

```json
{
  "successionRegime": {
    "legalTradition": "common_law",
    "description": "English testamentary freedom with the Inheritance (Provision for Family and Dependants) Act 1975 providing discretionary family provision"
  }
}
```

**When to use:** Use on any schema that models a specific succession regime. The `description` field is particularly valuable for mixed or plural systems where the enum value alone is insufficient -- for example, Nigerian customary law varies significantly between ethnic groups.

**Interaction with other keywords:** The `legalTradition` value should be consistent with the `legalSystems` keyword if both are present. If `jurisdiction` is also declared, the succession regime should be one that is legally recognised within that jurisdiction. The `dataProvenance` keyword should identify the specific legislation or case law that underpins the declared regime.

---

### 3. `maturity`

**Name:** `maturity`

**Definition:** Declares the lifecycle stage of the schema. This allows consumers to make informed decisions about whether to depend on a schema in production systems.

**Type:** String

**Valid values:**

| Value | Meaning |
|---|---|
| `draft` | The schema is under active development. Its structure may change without notice. Not suitable for production use. |
| `stable` | The schema is considered production-ready. Breaking changes will follow the INHERIT versioning policy. |
| `deprecated` | The schema is being phased out. Consumers should migrate to the replacement identified in the schema documentation. |

**Example:**

```json
{
  "maturity": "stable"
}
```

**When to use:** Every published schema should declare `maturity`. Omitting it implies no commitment to stability.

**Interaction with other keywords:** A schema with `maturity: "draft"` should generally not appear in the `compatibleWith` array of another schema, as its structure may change. The `inheritVersion` keyword is independent of maturity -- a draft schema may still declare version compatibility. Schemas with `maturity: "deprecated"` should still declare `maintainers` so that consumers know whom to contact about migration.

---

### 4. `extensionType`

**Name:** `extensionType`

**Definition:** Classifies an extension schema by its purpose. Extensions either adapt the standard for a specific legal tradition (e.g. Islamic succession, Hindu joint family property) or for a specific geographic region (e.g. England and Wales intestacy rules).

**Type:** String

**Valid values:**

| Value | Meaning |
|---|---|
| `tradition` | The extension adapts INHERIT for a specific legal or religious tradition, potentially applicable across multiple jurisdictions |
| `geographic` | The extension adapts INHERIT for a specific country or subdivision |

**Example:**

```json
{
  "extensionType": "geographic"
}
```

**When to use:** Use on extension schemas only. Core INHERIT schemas should not declare `extensionType`.

**Interaction with other keywords:** A `tradition` extension typically declares `legalSystems` to identify which traditions it covers, and `applicableJurisdictions` to list the countries where those traditions are legally binding. A `geographic` extension typically declares `jurisdiction` for a single target and may also declare `applicableJurisdictions` if it covers multiple subdivisions within a country. The `successionRegime` keyword provides further detail about the specific legal system the extension implements.

---

### 5. `applicableJurisdictions`

**Name:** `applicableJurisdictions`

**Definition:** Lists the countries where this schema is applicable, using ISO 3166-1 alpha-2 codes. This is a broad-stroke declaration of geographic scope, complementing the more detailed `jurisdiction` keyword.

**Type:** Array of strings

**Valid values:** Each item must be exactly 2 uppercase ASCII letters matching the pattern `^[A-Z]{2}$` (ISO 3166-1 alpha-2 country code). The array must contain at least 1 item and all items must be unique.

**Example:**

```json
{
  "applicableJurisdictions": ["GB", "AU", "NZ", "SG", "MY"]
}
```

**When to use:** Use on extension schemas that apply across multiple countries. This is especially relevant for `tradition`-type extensions -- for example, an Islamic succession extension might list all countries where Islamic family law is part of the legal system.

**Interaction with other keywords:** If `jurisdiction` is also present, the country in `jurisdiction.country` should appear in the `applicableJurisdictions` array. For `geographic` extensions targeting a single country, `jurisdiction` alone may suffice; `applicableJurisdictions` adds value when the schema spans multiple countries. Schemas listed in `compatibleWith` should have at least some overlap in their `applicableJurisdictions` for the compatibility declaration to be meaningful.

---

### 6. `inheritVersion`

**Name:** `inheritVersion`

**Definition:** Declares the range of INHERIT specification versions that this schema is compatible with, expressed as a semver range string.

**Type:** String

**Valid values:** A semver range string, maximum 50 characters. Uses standard Node.js/npm semver range syntax.

**Example:**

```json
{
  "inheritVersion": ">=2.0.0 <3.0.0"
}
```

**When to use:** Every extension schema should declare `inheritVersion` so that tooling can verify compatibility. Core schemas published as part of a specific INHERIT release may omit it, as their version is implicit.

**Interaction with other keywords:** Independent of all other keywords. However, schemas listed in `compatibleWith` should have overlapping `inheritVersion` ranges -- if they target different major versions, they are unlikely to be compatible.

---

### 7. `legalSystems`

**Name:** `legalSystems`

**Definition:** Lists the legal traditions that this schema implements or accommodates. Unlike the `legalSystems` property nested within the `jurisdiction` keyword (which describes the jurisdiction's own legal character), this top-level keyword describes what the schema itself covers.

**Type:** Array of strings

**Valid values:** Each item is a free-text string, maximum 100 characters. The array must contain at least 1 item and all items must be unique. Whilst the values are not constrained to an enum at this level, schema authors should use the canonical legal tradition identifiers (e.g. `common_law`, `civil_law`, `islamic_law`) where applicable, for consistency with the `successionRegime.legalTradition` enum.

**Example:**

```json
{
  "legalSystems": ["common_law", "islamic_law"]
}
```

**When to use:** Use on schemas that explicitly accommodate one or more legal traditions. This is particularly important for `tradition`-type extensions and for schemas that handle plural legal systems (e.g. Singapore, where common law and Islamic law coexist for succession purposes).

**Interaction with other keywords:** Should be consistent with `successionRegime.legalTradition` if both are present. For `tradition`-type extensions (declared via `extensionType`), `legalSystems` identifies which traditions the extension covers. The `jurisdiction.legalSystems` property describes the jurisdiction's own character; the top-level `legalSystems` keyword describes the schema's coverage -- these may differ if the schema only partially covers a plural jurisdiction.

---

### 8. `dataProvenance`

**Name:** `dataProvenance`

**Definition:** Documents the source of legal authority underpinning this schema. This is a human-readable string identifying the legislation, case law, regulatory guidance, or academic sources that informed the schema design.

**Type:** String

**Valid values:** Free text, maximum 2000 characters.

**Example:**

```json
{
  "dataProvenance": "Administration of Estates Act 1925, Inheritance (Provision for Family and Dependants) Act 1975, Intestates' Estates Act 1952. Schema structure informed by Law Commission Report No. 331 (2011)."
}
```

**When to use:** Every schema that models jurisdiction-specific legal rules should declare `dataProvenance`. This is essential for trust and auditability -- consumers need to know which legal sources were consulted and can verify the schema against those sources.

**Interaction with other keywords:** The provenance should correspond to the jurisdiction declared in `jurisdiction` and the succession regime declared in `successionRegime`. If the schema covers multiple jurisdictions (via `applicableJurisdictions`), the provenance should address the legal basis across all of them. The `maintainers` keyword identifies who is responsible for ensuring the provenance remains accurate and up to date.

---

### 9. `maintainers`

**Name:** `maintainers`

**Definition:** Lists the people responsible for this schema's correctness and ongoing maintenance.

**Type:** Array of objects

**Valid values:** Each item is an object with the following properties:

| Property | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `name` | string | Yes | Max 255 characters | The maintainer's name |
| `organisation` | string | No | Max 255 characters | The maintainer's organisation |
| `role` | string | Yes | Enum: `lead`, `contributor`, `reviewer` | The maintainer's role |

The array must contain at least 1 item. No additional properties are permitted on the maintainer objects.

**Role definitions:**

| Role | Meaning |
|---|---|
| `lead` | Primary responsibility for the schema's correctness and evolution |
| `contributor` | Active contributor to the schema's development |
| `reviewer` | Reviews changes for accuracy (typically a domain expert -- e.g. a solicitor or academic) |

**Example:**

```json
{
  "maintainers": [
    {
      "name": "Dr Amina Okonkwo",
      "organisation": "University of Lagos Faculty of Law",
      "role": "lead"
    },
    {
      "name": "James Chen",
      "organisation": "Testate Technologies Ltd",
      "role": "contributor"
    }
  ]
}
```

**When to use:** Every published schema should declare at least one maintainer. For jurisdiction-specific schemas, at least one maintainer should have domain expertise in the relevant legal system.

**Interaction with other keywords:** Independent of other keywords structurally, but the maintainers should collectively have expertise covering the `jurisdiction`, `successionRegime`, and `legalSystems` declared on the schema. Schemas with `maturity: "deprecated"` should retain their `maintainers` so consumers know whom to contact about migration.

---

### 10. `compatibleWith`

**Name:** `compatibleWith`

**Definition:** Lists the identifiers of other extension schemas that this schema is designed to work alongside. This enables tooling to validate that a set of extensions applied to a single estate document are mutually compatible.

**Type:** Array of strings

**Valid values:** Each item is a string, maximum 255 characters. All items must be unique. Values should be schema `$id` URIs or other stable identifiers.

**Example:**

```json
{
  "compatibleWith": [
    "https://openinherit.org/v3/extensions/islamic-succession.json",
    "https://openinherit.org/v3/extensions/singapore-probate.json"
  ]
}
```

**When to use:** Use on extension schemas that have been tested or designed for use in combination with other extensions. Omitting this keyword implies no statement about compatibility (not that the schema is incompatible with everything).

**Interaction with other keywords:** Schemas listed in `compatibleWith` should have overlapping `inheritVersion` ranges. If this schema declares `applicableJurisdictions`, the compatible schemas should have at least some jurisdictional overlap to be meaningful. Do not list schemas with `maturity: "draft"` unless the compatibility has been specifically verified.

---

## Full Example

The following shows a complete set of estate vocabulary keywords on a hypothetical extension schema:

```json
{
  "$schema": "https://openinherit.org/v3/dialect.json",
  "$id": "https://openinherit.org/v3/extensions/england-wales-intestacy.json",
  "title": "England and Wales Intestacy Rules",

  "jurisdiction": {
    "country": "GB",
    "subdivision": "GB-ENG",
    "legalSystems": ["common_law"],
    "name": "England and Wales"
  },
  "successionRegime": {
    "legalTradition": "common_law",
    "description": "Intestacy rules under the Administration of Estates Act 1925 as amended, including the statutory legacy thresholds updated in 2023"
  },
  "maturity": "stable",
  "extensionType": "geographic",
  "applicableJurisdictions": ["GB"],
  "inheritVersion": ">=2.0.0 <3.0.0",
  "legalSystems": ["common_law"],
  "dataProvenance": "Administration of Estates Act 1925 (as amended), Inheritance and Trustees' Powers Act 2014, The Administration of Estates Act 1925 (Fixed Net Sum) Order 2023 SI 2023/1349",
  "maintainers": [
    {
      "name": "Sarah Mitchell",
      "organisation": "Testate Technologies Ltd",
      "role": "lead"
    }
  ],
  "compatibleWith": [
    "https://openinherit.org/v3/extensions/england-wales-probate.json"
  ],

  "type": "object",
  "properties": {}
}
```
