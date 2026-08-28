# Maturity Model

Every INHERIT schema carries a maturity level that determines what changes are permitted. This model is based on FHIR's maturity ladder and the W3C Recommendation Track.

## Levels

| Level | Meaning | Change Rules |
|-------|---------|-------------|
| **draft** | Under active development | Breaking changes allowed at maintainer's discretion |
| **candidate** | Functionally complete, seeking feedback | Breaking changes require a proposal in `proposals/`, minimum 14-day community review period, and maintainer approval |
| **stable** | Production-ready, depended upon | No breaking changes. New major version required. |

## Current Assignments

### Candidate (13 schemas)

These schemas are functionally complete and seeking real-world feedback:

| Schema | Description |
|--------|-------------|
| `person.json` | People referenced in the estate |
| `estate.json` | The estate itself |
| `relationship.json` | Relationships between people |
| `kinship.json` | Family group structure |
| `property.json` | Real property |
| `asset.json` | Non-property assets |
| `liability.json` | Debts and obligations |
| `bequest.json` | Gifts in a will |
| `common/money.json` | Monetary amounts |
| `common/address.json` | Postal addresses |
| `common/jurisdiction.json` | Jurisdiction codes |
| `common/identifier.json` | External identifiers |
| `schema.json` | Root document envelope |

### Draft (56 schemas)

These schemas are under active development:

**Entity schemas (24):**
- `trust.json`, `executor.json`, `guardian.json`, `wish.json`
- `document.json`, `attestation.json`, `proxy-authorisation.json`
- `dealer-interest.json`, `nonprobate-transfer.json`
- `asset-collection.json`, `asset-interest.json`
- `acknowledgement.json`, `catalogue.json`, `dialect.json`, `event.json`
- `insurance-policy.json`, `lifetime-transfer.json`, `notification.json`
- `organisation.json`, `pet.json`, `space.json`, `subscription.json`
- `valuation.json`, `conformance-declaration.json`

**Common types (10):**
- `common/temporal-rule.json`, `common/visibility.json`
- `common/cultural-disposition.json`, `common/provenance.json`
- `common/field-provenance.json`, `common/ai-provenance.json`
- `common/completeness.json`, `common/error-codes.json`
- `common/media.json`, `common/tax-position.json`

**Asset categories (5):**
- `asset-categories/financial.json`, `asset-categories/vehicle.json`
- `asset-categories/digital.json`, `asset-categories/business.json`
- `asset-categories/general.json`

**Jurisdiction/cultural extensions (17):**
- All 17 extensions (uk-england-wales, scotland, ireland, us-estate, canada, australia-nz, eu-succession, singapore-malaysia, japan, prc-china, india, uae, latin-america, islamic-succession, hindu-succession, jewish-succession, africa-customary)

## How Promotion Works

### Draft to Candidate

A schema is promoted to candidate when:
- It has been implemented in at least one application
- All required fields are justified
- The schema has comprehensive test coverage
- No known design issues remain open

### Candidate to Stable

A schema is promoted to stable when:
- At least **two independent implementations** pass Level 2 (Referentially Intact) conformance
- The schema has been candidate for at least 6 months
- No breaking changes have been needed during the candidate period

This follows the W3C two-implementation model: a schema is promoted once two independent implementations have each passed Level 2 (Referentially Intact) conformance.

## How Maturity Is Recorded

Each schema carries maturity information in the OpenAPI schema bundle via `x-inherit-maturity` annotations. Extension manifests (`extension.json`) include a `maturity` field.

## Versioning Rules

- **Within v3.x:** Additive only — new optional properties, new enum values, new schemas
- **Across major versions:** Breaking changes permitted via new directory (e.g. `v4/`)
- **Published schemas are immutable** — to change one, publish a new version
