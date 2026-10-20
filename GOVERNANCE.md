---
title: Governance
---

# Governance

## Decision-Making

INHERIT uses a **Founding Steward** governance model. Richard Davies (Testate Technologies Ltd) has final authority over the standard during the current stewardship phase. Extension maintainers have authority over their jurisdiction's schema content.

Governance will transition to an independent body once measurable adoption thresholds are met. See the [Governance Charter](docs/policies/governance-charter.md) for the full transition plan, steering committee composition, and threshold conditions.

## Schema Change Rules

Changes are governed by schema maturity level:

| Maturity | Who Decides | Change Rules |
|----------|------------|-------------|
| **draft** | Maintainer discretion | Breaking changes allowed |
| **candidate** | Requires proposal + community review | Breaking changes require a proposal in `proposals/`, minimum 14-day review period, and maintainer approval |
| **stable** | Cannot be changed | No breaking changes permitted. New major version required. |

## Versioning

INHERIT carries three version numbers, and each one means one thing:

| Number | Where it appears | What it means |
|--------|------------------|---------------|
| `v3` | the schema directory, and the `/v3/` in every schema `$id` | the namespace schemas are identified by. It is not a release number |
| package version | `package.json`, the npm packages, release tags, `CHANGELOG.md` | the release of the standard, in semver |
| `schemaVersion` | the root of each INHERIT document | the package version the document was written against |

[Versioning and Compatibility](docs/policies/versioning.md#three-version-numbers) is the full statement. [`v3/index.json`](v3/index.json) lists every schema in the namespace.

- **Within a major version:** Additive only — new optional properties, new enum values, new schemas. Never remove, rename, or tighten cardinality. The package's minor or patch version increases.
- **Across major versions:** Breaking changes permitted, and the package's major version increases. Schemas stay in `v3/` under the same `$id`s: releases 4.0.0, 5.0.0 and 6.0.0 were all published there. Moving the schemas to a new namespace would change every `$id`, so it is a decision of its own and needs a proposal in `proposals/`. It does not follow automatically from a major release.
- **Schemas are immutable once published.** To change a published schema, publish a new version.

## Extension Promotion

| From | To | Requirements |
|------|----|-------------|
| Community | Pending | Maintainer submits request, schema passes CI, at least one implementation exists |
| Pending | Core | Reviewed by Richard, passes full test suite, maintainer commits to ongoing maintenance |

## Stability Requirement

No schema reaches `stable` maturity until at least **two independent implementations** pass Level 2 (Referentially Intact) conformance. This follows the W3C model.

## Steering Committee

The steering committee grows organically from commercial partnerships. Each jurisdiction partner firm gets a seat. The committee advises on schema evolution, new extensions, and breaking changes.
