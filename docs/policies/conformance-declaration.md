# Conformance Declaration

INHERIT provides a machine-readable conformance declaration mechanism so that implementations can formally state which parts of the standard they support and at what level.

This complements the [conformance levels](conformance-levels.md) documentation by defining a structured, validatable format for recording test results.

## Why Conformance Declarations Matter

The INHERIT [governance model](../GOVERNANCE.md) requires **two independent implementations at Level 2** before a schema can be promoted from `draft` to `stable`. Conformance declarations provide the evidence trail for this process:

1. An implementation runs its conformance test suite
2. It generates a conformance declaration (a JSON document)
3. The declaration is validated against the conformance declaration schema
4. Maintainers review declarations when considering promotion votes

Without a machine-readable format, governance decisions would rely on self-reported claims with no verifiable structure.

## Conformance Levels Recap

| Level | Name | What It Proves |
|-------|------|----------------|
| **1** | Schema Valid | Documents validate against INHERIT JSON Schemas |
| **2** | Referentially Intact | All internal cross-references (personId, assetId, etc.) resolve correctly |
| **3** | Jurisdiction Complete | All jurisdiction-specific extension fields are populated |

Level 2 is the governance threshold. Level 3 is relevant only when jurisdiction extensions are in scope.

## Declaration Schema

The conformance declaration schema lives at:

```
https://openinherit.org/v2/conformance-declaration.json
```

It uses the INHERIT v2 dialect and validates declarations as JSON documents.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `implementation` | string | Name of the product, service, or library |
| `implementationVersion` | string | Version of the implementation |
| `inheritVersion` | string | INHERIT version tested against (semver, e.g. `2.0.0`) |
| `conformanceLevel` | integer | Overall level achieved (1, 2, or 3) — the minimum across all entities |
| `declaredAt` | string | ISO 8601 timestamp of when the declaration was generated |
| `entities` | object | Per-entity conformance results (at least one required) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `validatorDetails` | object | Name and version of the validator used |
| `extensions` | object | Per-extension conformance results |
| `notes` | string | Free-text notes (max 2000 characters) |

## How to Generate a Declaration

### 1. Run your conformance test suite

Your test suite should exercise each entity schema your implementation supports, checking at the appropriate level:

- **Level 1:** Validate sample documents against the INHERIT JSON Schemas
- **Level 2:** Verify that all cross-references resolve (e.g. every `personId` in a bequest matches a person)
- **Level 3:** Confirm all jurisdiction-required fields are populated per the active extension

### 2. Build the declaration JSON

Collect results per entity and construct the declaration. The `conformanceLevel` must be the **minimum** level across all declared entities — if five entities pass at Level 2 but one only passes at Level 1, the overall level is 1.

### 3. Validate the declaration

Use any JSON Schema 2020-12 validator to check your declaration against the schema:

```bash
# Using the INHERIT CLI (jsonschema)
jsonschema validate \
  --instance my-declaration.json \
  --resolve v2/conformance-declaration.json \
  --resolve v2/dialect.json \
  v2/conformance-declaration.json
```

```javascript
// Using Ajv in Node.js
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const schema = await fetch(
  "https://openinherit.org/v2/conformance-declaration.json"
).then((r) => r.json());

const validate = ajv.compile(schema);
const valid = validate(declaration);
```

## Example Declaration

The following example shows an implementation called "EstatePro" that supports six core entities at Level 2 and two extensions (one at Level 3, one at Level 2 with warnings):

```json
{
  "implementation": "EstatePro",
  "implementationVersion": "3.1.0",
  "inheritVersion": "2.0.0",
  "conformanceLevel": 2,
  "declaredAt": "2026-03-28T14:30:00Z",
  "validatorDetails": {
    "name": "ajv",
    "version": "8.17.1"
  },
  "entities": {
    "estate": {
      "level": 2,
      "passed": true,
      "errors": 0,
      "warnings": 0
    },
    "person": {
      "level": 2,
      "passed": true,
      "errors": 0,
      "warnings": 0
    },
    "bequest": {
      "level": 2,
      "passed": true,
      "errors": 0,
      "warnings": 1,
      "notes": "Advisory warning for missing optional beneficiary contact details"
    },
    "executor": {
      "level": 2,
      "passed": true,
      "errors": 0,
      "warnings": 0
    },
    "property": {
      "level": 2,
      "passed": true,
      "errors": 0,
      "warnings": 0
    },
    "document": {
      "level": 2,
      "passed": true,
      "errors": 0,
      "warnings": 0
    }
  },
  "extensions": {
    "uk-england-wales": {
      "level": 3,
      "passed": true,
      "errors": 0,
      "warnings": 0,
      "jurisdictionsVerified": ["GB"]
    },
    "islamic-succession": {
      "level": 2,
      "passed": true,
      "errors": 0,
      "warnings": 2,
      "notes": "Faraidh calculation edge cases flagged as warnings"
    }
  },
  "notes": "Tested against INHERIT v2.0.0 using the official test fixtures"
}
```

## Governance Workflow

When a schema is proposed for promotion from `draft` to `stable`:

1. The proposer submits a pull request updating the schema's maturity status
2. The PR must include links to (or copies of) **two independent conformance declarations** at Level 2 or above for that entity
3. Maintainers verify the declarations are:
   - Valid against the conformance declaration schema
   - From genuinely independent implementations (different organisations or codebases)
   - Current (the `inheritVersion` matches the version being promoted)
4. If both declarations are verified, the promotion vote can proceed per the [governance process](../GOVERNANCE.md)

### What Counts as Independent?

Two implementations are independent if they:
- Are developed by different organisations, **or**
- Share no common schema-handling code (e.g. a CLI tool and a web application both written from scratch)

A fork with minimal changes does **not** qualify as an independent implementation.

## Versioning

The conformance declaration schema follows the same versioning as the INHERIT standard. When a new major version of INHERIT is released, a corresponding conformance declaration schema is published.

Declarations are version-specific — a declaration for `inheritVersion: "2.0.0"` is not valid evidence for promoting v1.x schemas.
