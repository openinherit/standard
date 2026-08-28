---
title: "INHERIT Conformance Test Kit"
version: "2.0"
status: approved
date: 2026-04-06T00:00
lastmod: 2026-04-12T23:59
author: "Rich Davies"
source: "packages/conformance/README.md"
supersedes: null
---

# INHERIT Conformance Test Kit

Validate your INHERIT implementation against the open estate data standard. The main
schema test suite (77 suites, 2,000+ test cases) lives in the `tests/` directory of the
[standard repo](https://github.com/openinherit/standard). This conformance kit provides
a standalone, language-agnostic subset: bundled schemas + fixture documents + expected
results, runnable without Node.js or the Sourcemeta CLI.

**Schema version:** v3 (package 6.4.x) — 31 entity schemas, 14 common types, 5 asset
categories, 21 jurisdiction extensions, 1 new PowerOfAppointment entity.

## Install

```bash
npm install @openinherit/conformance
```

Or download from [GitHub Releases](https://github.com/openinherit/standard/releases).

## What's included

| Path | Contents |
|------|----------|
| `schemas/` | Bundled JSON Schemas (`inherit-v3-bundled.json`, `catalogue-v3-bundled.json`) |
| `estate/valid/` | 12 valid estate documents |
| `estate/invalid/` | 9 invalid estate documents (each targets a specific validation rule) |
| `catalogue/valid/` | 1 valid catalogue document |
| `catalogue/invalid/` | 2 invalid catalogue documents |
| `expected/` | Expected results — one `.expected.json` per fixture |
| `manifest.json` | Machine-readable list of all tests |
| `runners/` | Reference test runners (Python, bash) |

## Invalid fixture catalogue

| File | What it tests |
|------|--------------|
| `estate/invalid/missing-required-fields.json` | Missing `estate` and `people` required fields |
| `estate/invalid/wrong-type-people.json` | `people` is a string instead of an array |
| `estate/invalid/bad-uuid.json` | `id` and `testatorPersonId` are not valid UUIDs |
| `estate/invalid/invalid-enum.json` | `status` is not a recognised enum value |
| `estate/invalid/extra-property-name.json` | Top-level property name violates the `propertyNames` pattern |
| `estate/invalid/invalid-extension-values.json` | Hindu succession extension has invalid enum value (`school: "invalid_school"`). Level 1 valid — the base schema does not validate extension-specific content. Extension-level invalid when the `x-inherit-hindu-succession` schema is loaded |
| `estate/invalid/missing-extension-required.json` | US estate extension missing required `propertyId` in `homesteadExemptions`. Level 1 valid — extension-level invalid when the `x-inherit-us-estate` schema is loaded |
| `catalogue/invalid/missing-assets.json` | Missing required `assets` field |
| `catalogue/invalid/assets-wrong-type.json` | `assets` is a string instead of an array |

## Extension-level fixtures

Some fixtures in `estate/invalid/` are **Level 1 valid** (they pass the base bundled
schema) but contain errors that only surface when the relevant extension schema is also
loaded. These have `"valid": true` in their expected results because the conformance kit
ships only the base schema. The `note` field describes the extension-level error.

If your validator loads extension schemas alongside the base schema, these fixtures should
fail. If it validates against the base schema only, they should pass.

## Expected result format

Each `.expected.json` contains:

```json
{ "valid": true, "schemaMode": "estate" }
```

or for invalid documents:

```json
{ "valid": false, "schemaMode": "estate", "minErrors": 1 }
```

Your validator must return a JSON object with at least a `valid` boolean field.

## Running with the Python runner

Requires the `jsonschema` Python package (any JSON Schema 2020-12 validator works):

```bash
pip install jsonschema
python runners/run-tests.py
```

## Running with the bash runner

Requires a validator that accepts a file path and outputs JSON with a `valid` field:

```bash
chmod +x runners/run-tests.sh
./runners/run-tests.sh "inherit validate --json"
```

The bash runner calls your validator as `<command> <fixture-path>` and parses the
`valid` field from its stdout JSON. Exit code is 0 if all tests pass, 1 if any fail.

## Building your own runner

Read `manifest.json` to enumerate all tests. For each entry:

1. Load the document at `file`
2. Validate it using your implementation
3. Load the expected result at `expected`
4. Assert `result.valid === expected.valid`

The `minErrors` field in expected results is advisory — use it to verify your
validator is producing specific errors, not just returning the right boolean.

## Known lint false positives in bundled schemas

Running `jsonschema lint` against the bundled schemas produces `orphan_definitions`
warnings (e.g. `TrustAppointee`, `TrustBeneficiary` in `catalogue-v3-bundled.json`).
These are **false positives**: the definitions are referenced via `$ref: "#/$defs/..."` within
their parent sub-schema's scope, but the lint tool resolves `#` against the root document
rather than the nearest `$id`. At runtime, validators correctly resolve these references.

If linting bundled schemas, suppress the rule:

```bash
jsonschema lint schemas/catalogue-v3-bundled.json --exclude orphan_definitions
```
