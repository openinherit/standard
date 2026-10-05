# Conformance Declaration

INHERIT provides a machine-readable conformance declaration mechanism so that implementations can formally state which parts of the standard they support and at what level.

This complements the [conformance levels](conformance-levels.md) documentation by defining a structured, validatable format for recording test results.

## Why Conformance Declarations Matter

The INHERIT [governance model](../../GOVERNANCE.md) requires **two independent implementations at Level 2** before a schema can be promoted from `draft` to `stable`. Conformance declarations provide the evidence trail for this process:

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

The conformance declaration schema is identified by:

```
https://openinherit.org/v3/conformance-declaration.json
```

This is the schema's `$id`. The file itself is `v3/conformance-declaration.json` in this repository, and the same file ships in the `@openinherit/schema` package. It is a JSON Schema 2020-12 schema.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `implementation` | string | Name of the product, service, or library |
| `implementationVersion` | string | Version of the implementation |
| `inheritVersion` | string | INHERIT version tested against (semver, e.g. `6.6.0`) |
| `conformanceLevel` | integer | Overall level achieved (1, 2, or 3) — the minimum across all entities |
| `declaredAt` | string | ISO 8601 timestamp of when the declaration was generated |
| `entities` | object | Per-entity conformance results (at least one required) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `root` | string | Which document root the conformance applies to: `estate` or `catalogue`. Absent means `estate`. See [Declaring the document root](#declaring-the-document-root) |
| `validatorDetails` | object | Name and version of the validator used |
| `extensions` | object | Per-extension conformance results |
| `notes` | string | Free-text notes (max 2000 characters) |
| `provenance` | object | How the declaration was created, by whom, and whether a human has verified it (see `v3/common/provenance.json`) |
| `disclaimer` | string | The fixed legal disclaimer on validation results. If present, it must be the exact text the schema defines |

## Declaring the document root

INHERIT has one document root, `v3/schema.json`, which a document conforms to at one of two conformance profiles (proposal 0003). The estate profile is the default. A document declares the catalogue profile with `"conformanceProfile": "catalogue"`, and its rules are then exactly `v3/catalogue.json`, the profile's entry point. Conformance at one profile says nothing about the other, so a declaration has to say which one it covers. The declaration field is `root`, and its value names the schema the implementation's documents validate against at that profile.

| Root | Validates against | Who it is for |
|------|-------------|---------------|
| `estate` | `v3/schema.json` | Implementations that exchange a full estate document: the estate, its people, and everything attached to them |
| `catalogue` | `v3/catalogue.json`, the catalogue profile of `v3/schema.json` | Catalogue-only implementations, e.g. living collectors cataloguing items, collections and valuations without the estate envelope |

Rules:

- **`root` is optional and defaults to `estate`.** Declarations written before the field existed claimed the estate root, and they are still valid.
- **A catalogue-only implementation declares `"root": "catalogue"`.** Without it, the declaration claims the estate envelope, which a catalogue-only implementation does not produce. That claim would be false.
- **A `catalogue` declaration cannot list `estate` under `entities`.** A catalogue document has no estate envelope, so there is no estate entity to have tested. The schema refuses such a declaration.
- **Conformance levels apply to both profiles.** Level 1 is schema validity against the declared root. Level 2 is referential integrity among the entities that root carries (e.g. assets to their collections, valuations and properties). Level 3 applies only where a jurisdiction extension is in scope.
- **To claim both profiles, publish two declarations,** one for each. A single declaration describes one profile.

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
# Using the JSON Schema CLI (@sourcemeta/jsonschema), from a checkout of this repository
jsonschema validate v3/conformance-declaration.json my-declaration.json \
  --resolve v3/common/
```

```javascript
// Using Ajv in Node.js. The schema is JSON Schema 2020-12, so use Ajv's 2020 build,
// and load the shared schemas it references from v3/common/
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync } from "node:fs";

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
for (const f of readdirSync("v3/common").filter((f) => f.endsWith(".json"))) {
  ajv.addSchema(read(`v3/common/${f}`));
}
const validate = ajv.compile(read("v3/conformance-declaration.json"));
const valid = validate(declaration);
```

## Example Declaration

The following example shows an implementation called "EstatePro" that supports six core entities at Level 2 and two extensions (one at Level 3, one at Level 2 with warnings):

```json
{
  "implementation": "EstatePro",
  "implementationVersion": "3.1.0",
  "inheritVersion": "6.6.0",
  "root": "estate",
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
  "notes": "Tested against INHERIT 6.6.0 using the official test fixtures"
}
```

### Example: a catalogue-only implementation

A collector's cataloguing app that produces catalogue documents, not estates, declares the `catalogue` root and reports on the entities that root carries:

```json
{
  "implementation": "CollectorShelf",
  "implementationVersion": "1.4.0",
  "inheritVersion": "6.6.0",
  "root": "catalogue",
  "conformanceLevel": 2,
  "declaredAt": "2026-10-04T09:00:00Z",
  "entities": {
    "catalogue": {
      "level": 2,
      "passed": true,
      "errors": 0,
      "warnings": 0
    },
    "asset": {
      "level": 2,
      "passed": true,
      "errors": 0,
      "warnings": 0
    },
    "asset-collection": {
      "level": 2,
      "passed": true,
      "errors": 0,
      "warnings": 0
    },
    "valuation": {
      "level": 2,
      "passed": true,
      "errors": 0,
      "warnings": 0
    }
  },
  "notes": "Catalogue documents only. No estate envelope is produced"
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
4. If both declarations are verified, the promotion vote can proceed per the [governance process](../../GOVERNANCE.md)

### What Counts as Independent?

Two implementations are independent if they:
- Are developed by different organisations, **or**
- Share no common schema-handling code (e.g. a CLI tool and a web application both written from scratch)

A fork with minimal changes does **not** qualify as an independent implementation.

## Versioning

The conformance declaration schema follows the same versioning as the INHERIT standard. When a new major version of INHERIT is released, a corresponding conformance declaration schema is published.

Declarations are version-specific. A declaration for `inheritVersion: "6.6.0"` is evidence for 6.6.0 only and is not valid evidence for promoting schemas in any other version.
