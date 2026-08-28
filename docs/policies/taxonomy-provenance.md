# Taxonomy Provenance

This document records the provenance of taxonomies and classifications used in INHERIT.

## Item Category Taxonomy

### Decision: INHERIT Product Taxonomy

**Date:** 28 March 2026
**Decision by:** INHERIT Steering Committee
**Updated:** 28 March 2026 (reframed as independent taxonomy)

The INHERIT Product Taxonomy is the item categorization system used across all INHERIT tools — the schema, WillWriter Pro, the scanner, and LegacyLists. It provides 16 top-level categories with extensible subcategories, recommended identifiers, photography guidance, and valuation methods per category.

### Source Evaluation

The steering committee evaluated three major product taxonomies:

1. **Standard Product Taxonomy** (originally published by Shopify under the MIT licence) — open source, 10,000+ categories, 2,000+ typed attributes
2. **Google Product Taxonomy** — freely published, no formal licence, no attribute system
3. **eBay Category Taxonomy** — proprietary, API Licence Agreement prohibits reuse outside eBay platform

**Selected as starting point:** Standard Product Taxonomy (MIT licence)

**Rationale:** The MIT licence is the only option providing unambiguous legal freedom to adopt, adapt, and redistribute. It offers the richest structured attribute system.

**eBay was evaluated but rejected** because their API Licence Agreement explicitly prohibits selling, renting, distributing, or commercializing eBay content outside the eBay platform. Since 2025, it also prohibits using eBay data for AI training. INHERIT is an open standard under the Apache 2.0 licence — using a proprietary taxonomy would create a legal dependency incompatible with our open-source mission.

**No eBay data, categories, or structures were copied or incorporated into INHERIT.**

Google's taxonomy is freely published and widely used but lacks a formal open-source licence and has no attribute system.

### Snapshot and Divergence

The INHERIT Product Taxonomy is **not** a fork of the Standard Product Taxonomy in the Git sense. INHERIT took a point-in-time conceptual snapshot of the Standard Product Taxonomy's structure and category hierarchy, then diverged extensively:

- **Pruned** irrelevant verticals (Software, Office Supplies, Cameras & Optics, etc.)
- **Deepened** estate-relevant verticals (Collectibles, Art, Jewellery, Vehicles, Musical Instruments)
- **Added** estate-specific categories (islamic_financial, firearms_sporting)
- **Added** estate-specific attributes per category (defaultUrgency, disposalComplexity, typicalValuationMethod)
- **Restructured** from thousands of flat categories to 16 top-level categories with subcategories
- **Added** recommended identifiers, photography viewTypes, and brand suggestions per category

The INHERIT Product Taxonomy evolves independently. There is no upstream tracking of the Standard Product Taxonomy's releases.

MIT licence attribution is included in `THIRD-PARTY-NOTICES` in the repository root.

### Implementation

- Top-level categories: `v1/asset.json` field `category` (16-value enum)
- Subcategories: `v1/asset.json` field `subcategory` (freeform string, validated by Level 3 tools)
- Category guidance: `reference-data/category-guidance.json`
- Migration from v1.1.0 categories: `docs/category-migration.md`

## Other Taxonomies

### ISO 3166 (Country and Subdivision Codes)
- Used for jurisdiction codes
- International standard, freely referenced
- No licence concerns

### ISO 4217 (Currency Codes)
- Used for monetary amounts
- International standard, freely referenced

### ISO 10962 (CFI — Classification of Financial Instruments)
- Referenced as guidance for financial instrument categorization
- Not directly copied — INHERIT uses its own field structure informed by CFI categories
- ISO standards may be referenced but not reproduced verbatim

### FIBO (Financial Industry Business Ontology)
- Open source (MIT licence)
- Share classification hierarchy and voting rights vocabulary informed INHERIT's shareholding sub-object design
- Attribution included in schema $comment annotations

### Schema.org
- CC-BY-SA 3.0 licence
- INHERIT's PostalAddress, MonetaryAmount, and naming conventions aligned with Schema.org
- Attribution on the openinherit.org About page
