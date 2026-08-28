---
title: "INHERIT JSON Profile"
version: "1.0"
status: draft
date: 2026-04-07T12:00
lastmod: 2026-04-07T18:00
author: "Rich Davies"
source: "docs/policies/json-profile.md"
---

# INHERIT JSON Profile

This document is the definitive statement of what INHERIT accepts and rejects at the parsing boundary. It covers encoding, payload structure, field naming, numeric precision, and string length constraints. All conformant INHERIT implementations must enforce every rule defined here before any schema validation takes place.

For the canonical JSON form used when computing integrity digests and digital signatures, see the [Canonical JSON policy](./canonical-json.md). For structured error responses, see the [Error Guide](../implement/error-guide.md).

---

## Encoding

### UTF-8 Only

All INHERIT payloads **must** be encoded as UTF-8.

- No BOM (byte order mark). Payloads beginning with `0xEF 0xBB 0xBF` **must** be rejected.
- Do not attempt to detect or infer encoding. If a payload fails UTF-8 decoding, reject it immediately with a `400 Bad Request` before attempting JSON parsing.
- Rationale: UTF-8 is the mandatory encoding for JSON per [RFC 8259 §8.1](https://www.rfc-editor.org/rfc/rfc8259#section-8.1). Accepting other encodings silently creates inconsistency across implementations.

---

## Duplicate Keys

INHERIT **rejects** any JSON object that contains duplicate keys at the same level.

Do not accept duplicates. Do not silently pick a winner (first or last). Return a `400 Bad Request` error.

**Rationale:** RFC 8259 §4 leaves duplicate key handling undefined. In practice, different parsers resolve duplicates differently — some take the first value, some take the last, some merge. This creates divergent behaviour across implementations and is a known attack vector for security-critical fields such as `integrity.digest` or `$schema`.

---

## Unknown Fields

INHERIT uses `unevaluatedProperties: false` in its JSON Schema definitions. This means:

- **Standard fields** must match the camelCase property names defined in the schemas.
- **Extension fields** must match the `x-inherit-*` prefix pattern (e.g. `x-inherit-jurisdiction-extra`).
- All other properties are rejected with a validation error.

Unknown fields are not silently ignored. This is a deliberate design choice: it prevents silent data loss and makes schema evolution explicit.

---

## Null, Missing, and Empty Semantics

INHERIT distinguishes three states for optional fields: missing (not provided), null (explicitly cleared), and empty array (assessed with zero results). These semantics affect how implementations parse, store, and round-trip INHERIT documents.

See the [Null Semantics policy](./null-semantics.md) for the full rules, examples, and implementation guidance.

---

## Payload Boundaries

These limits apply to all inbound INHERIT payloads. Implementations **must** enforce them before schema validation.

| Limit | Value | Notes |
|---|---|---|
| Maximum payload size | **10 MB** | Reject with `413 Content Too Large` |
| Maximum nesting depth | **64 levels** | Reject with `400 Bad Request` |
| Maximum array length | **10,000 items** | Per individual array |

**Payload size** is measured as the byte length of the raw request body before parsing. Implementations should read the `Content-Length` header as an early check, but must also enforce the limit during streaming if no header is present.

**Nesting depth** is measured as the maximum number of nested JSON objects and arrays at any point in the document. A depth of 64 is well above any legitimate INHERIT document structure and guards against stack-overflow attacks on recursive parsers.

**Array length** applies per array. An INHERIT document with 10,000 assets and 10,000 relationships is already pathological; this limit prevents unbounded memory allocation during deserialisation.

---

## Numeric Precision

### Integer Safety Range

All numeric values in INHERIT are integers. The standard uses integer minor units for monetary amounts (pennies, cents, etc.) to avoid floating-point rounding errors entirely.

The safe integer range enforced by the `money` type is **±999,999,999,999,999** (approximately ±10¹⁵). This is well within the IEEE 754 double-precision safe integer range of ±9,007,199,254,740,991 (2⁵³ − 1), ensuring that any conformant JSON parser can represent these values without precision loss.

**Floating-point currency is not permitted.** Values like `1234.56` for monetary amounts are invalid. The correct representation is an integer (e.g. `123456` for £1,234.56) paired with a currency code and exponent.

### No Arbitrary-Precision Integers

INHERIT does not use arbitrary-precision integer extensions (e.g. JSON bigint). All integers must fit within the IEEE 754 safe integer range defined above.

---

## String Length Limits

The following categories reflect the limits actually enforced in the INHERIT schemas. Where an individual schema defines a more restrictive limit, the schema limit takes precedence over the category default.

| Category | Typical `maxLength` | Used for |
|---|---|---|
| Flag / code | 2–3 | ISO country codes, currency codes, language tags |
| Short code | 10–20 | Phone numbers, account suffixes, sort codes |
| Identifier | 50–64 | Internal reference codes, external IDs, schema-level labels |
| Short text | 100–255 | Names, titles, labels, descriptions |
| Medium text | 500–2000 | Notes, explanations, conditions |
| URI | 2048 | `url`, `uri`, and `$ref` fields |
| Long text | 5000 | Full clauses, legal descriptions, narrative fields |
| Base64 content | 10,485,760 | Embedded document content (media and document schemas) |

**UUID fields** are constrained by the `uuid` format keyword rather than `maxLength`. All IDs are v4 UUIDs (36 characters including hyphens).

**Enum fields** are constrained by allowed values rather than `maxLength`. If a string field has an `enum` constraint, the enum constraint governs; no separate length limit applies.

**Note on base64 content:** The 10 MB base64 limit in `document.json` and `common/media.json` corresponds to approximately 7.5 MB of decoded binary data. This is separate from the 10 MB payload size limit — a document embedding a file near this limit will approach the overall payload cap.

---

## Content-Type

| Direction | Required `Content-Type` |
|---|---|
| Request bodies (inbound) | `application/json` |
| Successful response bodies (outbound) | `application/json` |
| Error response bodies (outbound) | `application/problem+json` |

Requests with a `Content-Type` other than `application/json` (or an `application/json`-compatible media type) **must** be rejected with `415 Unsupported Media Type`.

Error responses use `application/problem+json` per [RFC 9457 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457). See the [Error Guide](../implement/error-guide.md) for the full error structure.

---

## Error Reporting

All parsing and validation errors **must** be returned as RFC 9457 Problem Details objects. The `Content-Type` of the error response is `application/problem+json`.

Key fields:

- `type` — a URI identifying the error category (e.g. `https://openinherit.org/errors/validation-error`)
- `title` — a short human-readable summary
- `status` — the HTTP status code (e.g. `400`)
- `detail` — a longer human-readable explanation
- `errors` — an array of individual field-level validation errors (INHERIT extension)

For the complete error taxonomy, field-level error codes, and worked examples, see the [Error Guide](../implement/error-guide.md).

---

## JSON Extensions

INHERIT **does not accept** non-standard JSON extensions:

- **Comments** — `//` and `/* */` comments are not valid JSON and must not be accepted. They are stripped silently by some parsers, which creates divergence between implementations.
- **Trailing commas** — not valid JSON. Reject with a parse error.
- **Unquoted keys** — not valid JSON.
- **Single-quoted strings** — not valid JSON.

If a client sends JSONC (JSON with comments) or JSON5, the server must return `400 Bad Request`.

---

## Tooling Annotations

The INHERIT schemas contain one non-standard annotation: `x-lint-exclude`. This is a [Sourcemeta CLI](https://github.com/sourcemeta/jsonschema) lint directive that suppresses specific lint rules on individual properties. It is present on the `@context` and `@type` JSON-LD properties to suppress the `simple_properties_identifiers` rule (which flags property names starting with `@`).

This annotation has **no effect on validation**. It is not a JSON Schema keyword and is ignored by all validators. However, validators running in strict mode (notably Ajv) may reject schemas containing unknown keywords. See the [Getting Started guide](/docs/getting-started/) for workarounds.

Future versions may move this annotation to an external lint configuration file if the Sourcemeta CLI adds support for per-schema rule exclusions in config files.

---

## Conformance

An implementation is **JSON Profile conformant** if and only if it satisfies all five of the following criteria:

1. **UTF-8 only.** All inbound payloads are decoded as UTF-8. Payloads with a BOM or that fail UTF-8 decoding are rejected before parsing.
2. **Duplicate keys rejected.** Any JSON object containing duplicate keys at the same level is rejected with `400 Bad Request`. No winner is picked.
3. **Payload limits enforced.** The 10 MB size limit, 64-level nesting limit, and 10,000-item array limit are enforced before schema validation begins.
4. **Non-standard JSON extensions rejected.** Comments, trailing commas, unquoted keys, and single-quoted strings are not accepted.
5. **Structured error responses.** All error responses use RFC 9457 Problem Details with `Content-Type: application/problem+json`.

Implementations that satisfy these five criteria may declare `inheritJsonProfile: true` in their conformance declaration. See the [Conformance Declaration](./conformance-declaration.md) schema for the full declaration format.
