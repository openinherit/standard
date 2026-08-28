# Extension Maintainer Guide

A technical guide for partner firm staff who maintain jurisdiction extensions.

## Your Extension's Structure

Your extension lives in `v3/extensions/{your-jurisdiction}/`:

```
v3/extensions/uk-england-wales/
  uk-england-wales.json    ← The schema (succession rules as JSON Schema)
  extension.json           ← Manifest (metadata about your extension)
  codelists/               ← Jurisdiction-specific enumerations (optional)
```

## The `extension.json` Manifest

This is the metadata file that describes your extension:

```json
{
  "name": "UK England & Wales",
  "id": "https://openinherit.org/v3/extensions/uk-england-wales.json",
  "version": "1.0.0",
  "inherit": ">=1.0.0 <2.0.0",
  "maturity": "draft",
  "jurisdiction": "GB-ENG",
  "legalSystems": ["common_law"],
  "maintainers": [
    {
      "name": "Your Name",
      "organisation": "Your Firm LLP",
      "role": "lead"
    }
  ],
  "lastVerified": "2026-03-26",
  "dataProvenance": "Inheritance Tax Act 1984, ...",
  "responsibleOrganisation": "Your Firm LLP",
  "description": "What this extension covers."
}
```

### Fields You'll Update Regularly

- **`lastVerified`** — Update this whenever you confirm the extension reflects current law
- **`version`** — Bump when you make changes (follows semantic versioning)
- **`dataProvenance`** — Update if new legislation is added

## Proposing Changes

When legislation changes in your jurisdiction:

1. **File an issue** on `openinherit/standard` describing the change
2. **Include**: which law changed, effective date, impact on the schema
3. **Submit a PR** if you're comfortable with JSON, or we'll implement it for you
4. **Update `lastVerified`** in `extension.json`

### Adding a New Field

New optional fields can be added freely to `draft` extensions:

```json
{
  "newThreshold": {
    "$ref": "../../common/temporal-rule.json",
    "$comment": "New threshold introduced by Finance Act 2027"
  }
}
```

### Changing an Existing Field

For `candidate` or `stable` extensions, field changes require a proposal. File a proposal in `proposals/` explaining:
- What changed
- Why (link to the legislation)
- Impact on existing documents

## CODEOWNERS

You're listed in `.github/CODEOWNERS` for your extension path. This means:
- You're auto-assigned as a reviewer on any PR that touches your extension
- Your approval is required before changes to your extension are merged
- You can submit PRs directly to your extension

## Testing

Run the test suite to verify your extension:

```bash
pnpm test
```

Your extension should have test cases in `tests/v3/`. At minimum:
- A valid document with your extension data
- An invalid document missing required extension fields

## The Graduation Path

If you need full autonomy over your extension (faster releases, independent CI):

1. We create `openinherit/ext-{your-jurisdiction}`
2. Your extension code moves there
3. You get full write access to that repo
4. The main repo references your extension via the registry
5. You publish releases independently

Most partners stay with CODEOWNERS — graduation is for when you need to iterate faster than the main repo's release cycle.

## Codelist Management

If your jurisdiction has specific enumerations (e.g. types of property tenure, categories of heir), these go in `codelists/`:

```
codelists/
  property-tenure.json
  heir-categories.json
```

Each codelist is a simple JSON array with `code`, `label`, and `description` for each entry.
