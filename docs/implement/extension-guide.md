# Extension Guide

How to create, maintain, and publish INHERIT extensions.

## What Is an Extension?

An extension adds jurisdiction-specific or cultural fields to the core INHERIT schemas. For example, the UK England & Wales extension adds IHT nil-rate band thresholds, intestacy statutory legacy amounts, and IFPA 1975 eligibility data.

Extensions **add** fields — they never remove or override core fields. An INHERIT document is always valid against core schemas, with or without extensions.

## Extension Tiers

| Tier | Where It Lives | Who Maintains It |
|------|---------------|-----------------|
| **Core** | `v3/extensions/` in the main repo, tested in CI | Testate Technologies + jurisdiction partners |
| **Community** | Third-party repos following this template | External maintainers |
| **Pending** | Staging area in the main repo | Being evaluated for promotion to Core |

## Extension Structure

Every extension lives in its own subdirectory:

```
v3/extensions/uk-england-wales/
  uk-england-wales.json    ← The schema
  extension.json           ← Manifest (metadata, maintainers, compatibility)
  codelists/               ← Jurisdiction-specific enumerations (optional)
```

### The Schema File

A standard JSON Schema 2020-12 file with:
- `$schema` pointing to the INHERIT dialect
- `$id` with the canonical URI
- Properties specific to the jurisdiction
- References to common types via `$ref`

### The Manifest (`extension.json`)

Every extension must have an `extension.json` manifest:

```json
{
  "name": "UK England & Wales",
  "id": "https://openinherit.org/v3/extensions/uk-england-wales.json",
  "version": "1.0.0",
  "inherit": ">=3.0.0 <4.0.0",
  "maturity": "draft",
  "jurisdiction": "GB-ENG",
  "legalSystems": ["common_law"],
  "maintainers": [
    {
      "name": "Testate Technologies",
      "organisation": "Testate Technologies Ltd",
      "role": "lead"
    }
  ],
  "lastVerified": "2026-03-26",
  "dataProvenance": "Inheritance Tax Act 1984, Administration of Estates Act 1925",
  "responsibleOrganisation": "Testate Technologies Ltd",
  "description": "IHT thresholds, intestacy rules, IFPA 1975 eligibility."
}
```

Key fields:
- **`inherit`** — Semver-style compatibility range with the core standard
- **`maturity`** — draft / candidate / stable
- **`lastVerified`** — When the legal content was last checked against current legislation
- **`dataProvenance`** — Source legislation or regulations
- **`responsibleOrganisation`** — Who is legally responsible for the content

## Creating a New Extension

1. **Create the directory** in `v3/extensions/{your-jurisdiction}/`
2. **Write the schema** — define jurisdiction-specific properties
3. **Create `extension.json`** — fill in all manifest fields
4. **Add test cases** in `tests/v3/` for your extension
5. **Update `extensions-registry.json`** — add your extension to the catalogue
6. **Submit a PR** — include tests and a CHANGELOG entry

## CODEOWNERS

The `.github/CODEOWNERS` file maps extension paths to maintainers. When you're added as a code owner for your extension:
- You're auto-assigned as a reviewer on PRs that touch your extension
- You can approve changes to your extension independently

## Graduation: CODEOWNERS to Own Repo

When you need full autonomy over your extension:

1. We create `openinherit/ext-{your-jurisdiction}` (e.g. `openinherit/ext-japan`)
2. Your extension code moves there
3. You get full write access
4. The main repo references your extension via the extensions registry
5. Your repo has its own CI that validates against INHERIT core
6. You publish releases independently

Graduation is optional and partner-initiated. CODEOWNERS works well for most partnerships.

## Testing Extensions

Extensions must pass the core test suite. Your extension tests should verify:
- Required fields are enforced
- Optional fields are accepted
- Invalid data is rejected
- Common type references (`$ref` to money, jurisdiction, etc.) work correctly

## Updating `lastVerified`

When you review your extension against current legislation:
1. Check all thresholds, rates, and rules against current law
2. Update any values that have changed
3. Bump the `lastVerified` date in `extension.json`
4. Submit a PR with the changes

This is particularly important for temporal data (tax thresholds, exemption amounts) that changes with legislation.

## Legal Review Status

Each extension has a review status indicating the level of legal verification:

| Status | Meaning |
|--------|---------|
| **Reviewed** | Reviewed by a qualified practitioner in this jurisdiction |
| **Legislation-based** | Based on published legislation, not yet reviewed by a practitioner |
| **Community** | Community-contributed, not formally reviewed |

All 13 core extensions currently have status: **Legislation-based**. They were authored using published legislation as the primary source and verified against official government publications.

As jurisdiction partners are onboarded, their extensions will move to **Reviewed** status. This means a qualified legal practitioner in the jurisdiction has confirmed the extension accurately represents current succession law, tax thresholds, and procedural requirements.

Community extensions submitted via pull request start at **Community** status and may be promoted to **Legislation-based** after the maintainers verify the legal sources cited.
