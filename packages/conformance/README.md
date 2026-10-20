---
title: "INHERIT Conformance Test Kit"
version: "3.0"
status: approved
date: 2026-04-06T00:00
lastmod: 2026-10-20T00:00
author: "Rich Davies"
source: "packages/conformance/README.md"
supersedes: null
---

# INHERIT Conformance Test Kit

Validate your INHERIT implementation against the open estate data standard. The main
schema test suite lives in the `tests/` directory of the
[standard repo](https://github.com/openinherit/standard). This conformance kit provides
a standalone, language-agnostic subset: bundled schemas + fixture documents + expected
results, runnable without Node.js or the Sourcemeta CLI.

**Versioned with the standard.** The kit is released with every version of the standard, at the
same version number: `manifest.json`'s `version` is the package's, and the release tag `vX.Y.Z`
names both.

## Install

```bash
npm install @openinherit/conformance
```

Or download from [GitHub Releases](https://github.com/openinherit/standard/releases).

## What's included

| Path | Contents |
|------|----------|
| `schemas/` | Bundled JSON Schemas (`inherit-v3-bundled.json`, `catalogue-v3-bundled.json`) |
| `estate/valid/`, `catalogue/valid/` | VALID documents — every one must be accepted |
| `estate/invalid/`, `catalogue/invalid/` | INVALID documents — every one must be refused, and each breaks exactly one rule |
| `expected/` | One `.expected.json` per document |
| `mutations.json` | How each INVALID document is made: a VALID base, one operation, the rule it breaks |
| `manifest.json` | Every test, with the sha256 of its document, its expected result and each bundled schema |
| `runners/` | Reference test runners (Python, bash) |

## The INVALID cases: one rule each

Every INVALID document is a VALID document from this kit with **one** JSON Patch operation
(RFC 6902 `add`, `replace` or `remove`) applied. `mutations.json` records, for each:

| Field | Meaning |
|---|---|
| `base` | the VALID document it starts from |
| `op` | the single operation applied |
| `rule.class` | `closed-world`, `enum`, `required`, `type`, `format` or `x-inherit` |
| `rule.keyword` | the JSON Schema keyword that refuses it, e.g. `unevaluatedProperties` |
| `rule.instancePath` | where that keyword reports it, as a JSON Pointer |

The same three fields are in each INVALID document's expected file and manifest entry. Because
the base is accepted and only one thing changes, a validator that refuses the document for any
other reason, or accepts it, is wrong about that rule specifically.

The classes:

- **closed-world** — an undeclared property, refused by `unevaluatedProperties: false` at the
  root, on an entity, inside a core extension block, and at the catalogue root.
- **enum**, **required**, **type**, **format** — a value outside an enumeration, a missing
  required member, a value of the wrong type, an identifier that is not a UUID.
- **x-inherit** — misuse of the extension namespace: an `x-inherit-*` block that is not an
  object, has a key that is not an identifier, or has more than 200 keys; and content a core
  extension's own schema refuses (an unknown Hindu succession `school`, a US homestead exemption
  with no `propertyId`).

## Level 1 only

The kit grades **Level 1 (schema valid)**. Three VALID documents are deliberately broken at
Level 2 and say so in their expected file's `note`: `broken-references.json` and
`broken-extension-refs.json` carry references that resolve to nothing, and
`empty-extension-data.json` declares an extension without its data block. A Level 1 validator
must accept all three.

## Expected result format

```json
{ "valid": true, "schemaMode": "estate" }
```

or for an INVALID document:

```json
{
  "valid": false,
  "schemaMode": "estate",
  "minErrors": 1,
  "description": "estate.status is not one of the declared values.",
  "rule": { "class": "enum", "keyword": "enum", "instancePath": "/estate/status" },
  "base": "estate/valid/minimal-estate.json",
  "op": { "op": "replace", "path": "/estate/status", "value": "not_a_status" }
}
```

Your validator must return a JSON object with at least a `valid` boolean field.

## Integrity

`manifest.json` lists every test as `file`, `sha256`, `expected`, `expectedSha256`, `valid`,
`schemaMode` (and `rule` for INVALID tests), and every bundled schema as `file`, `sha256`. Check
a file's sha256 before trusting it; the Python runner refuses to run against an altered kit.

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

1. Load the document at `file` and check its `sha256`
2. Validate it using your implementation, against the bundle for its `schemaMode`
3. Assert your verdict equals the entry's `valid`
4. For an INVALID entry, check that your validator reports `rule.keyword` at
   `rule.instancePath` — the right verdict for the wrong reason is still a defect

`minErrors` is kept for older runners; every INVALID case breaks exactly one rule.

## Implementations graded on every change

In the standard's CI, three independent implementations run every case and must all give the
manifest's verdict, with no list of tolerated disagreements: Python `jsonschema` over the bundles
(`runners/run-tests.py`), the generated Zod validators (`@openinherit/sdk/zod`) and the generated
pydantic models (`openinherit.models`).

## Maintaining the kit

The INVALID documents, their expected files and `manifest.json` are generated. Edit
`mutations.json` (or a VALID document), then, from the repository root:

```bash
python3 scripts/build-conformance-kit.py          # regenerate
python3 scripts/check-conformance-kit.py          # one rule per INVALID, hashes, versions
```

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
