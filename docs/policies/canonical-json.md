---
title: "INHERIT Canonical JSON"
version: "1.0"
status: draft
date: 2026-04-07T12:00
lastmod: 2026-04-07T12:00
author: "Rich Davies"
source: "docs/policies/canonical-json.md"
---

# INHERIT Canonical JSON

This document defines the canonical JSON serialisation used by INHERIT for computing integrity digests, digital signatures, byte-level comparison, and ETag generation.

## When Canonical Form Is Required

Canonical JSON serialisation **must** be used whenever the byte-level representation of an INHERIT document matters:

- **Computing `integrity.digest`** — the hash is computed over the canonical form, excluding the `integrity` field itself.
- **Digital signatures** — any future signing mechanism (W3C Verifiable Credentials 2.0, JWS envelopes) requires a stable byte sequence to sign.
- **Byte-level comparison** — determining whether two INHERIT documents are semantically identical.
- **ETag generation** — HTTP ETags derived from document content should use the canonical form so that logically identical documents produce the same ETag regardless of original formatting.

## Canonical Serialisation Rules

An INHERIT document in canonical form **must** satisfy all of the following rules:

1. **Lexicographic key ordering** — all object keys at every level of nesting must be sorted in Unicode code-point order (i.e. byte-wise ascending UTF-8). This is recursive: nested objects follow the same rule.
2. **No insignificant whitespace** — no spaces, tabs, or newlines between tokens. The output is a single line with no formatting.
3. **UTF-8 NFC normalisation** — the entire output must be encoded as UTF-8 in Unicode Normalisation Form C (NFC). This ensures that composed and decomposed character sequences produce identical bytes.
4. **No byte-order mark (BOM)** — the output must not begin with `U+FEFF`.
5. **Shortest number representation** — numbers must use the shortest JSON representation that preserves their value. No leading zeroes, no trailing zeroes after a decimal point, no unnecessary plus sign in exponents. For example: `1`, `0.5`, `1e10` (not `1.0`, `0.50`, `1.0e+10`).
6. **String escaping** — strings must use the shortest valid JSON escape sequence. Characters that JSON requires to be escaped (`"`, `\`, and control characters U+0000–U+001F) must be escaped; all other characters should appear as literal UTF-8 bytes, not `\uXXXX` sequences.

These rules are intentionally compatible with [RFC 8785 (JSON Canonicalization Scheme)](https://www.rfc-editor.org/rfc/rfc8785), with the additional requirement of UTF-8 NFC normalisation.

## Computing the Integrity Digest

To compute the value of the `integrity` field on an estate document:

1. **Remove** the `integrity` field from the document (if present). All other fields remain.
2. **Serialise** the document according to the canonical serialisation rules above.
3. **Hash** the resulting byte sequence using the chosen algorithm (`sha-256`, `sha-384`, or `sha-512`).
4. **Hex-encode** the hash output using lowercase hexadecimal characters.
5. **Set** `integrity.algorithm` to the algorithm name and `integrity.digest` to the hex-encoded hash.

The `integrity` field is always excluded from the digest computation because including it would create a circular dependency — the hash would need to include itself.

> **Implementation note:** The JSON Schema validates that `digest` is a hex string between 64 and 128 characters, but it cannot enforce that the digest length matches the algorithm (SHA-256 = 64 chars, SHA-384 = 96 chars, SHA-512 = 128 chars). Validators should check this at the application level: if `algorithm` is `sha-256` and `digest` is not exactly 64 characters, the document is semantically invalid even though it passes schema validation.

## Worked Example

Given the following estate document (formatted for readability):

```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "testatorPersonId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "planning",
  "domicile": {
    "country": "GB",
    "subdivision": "GB-ENG"
  },
  "createdAt": "2026-04-07T10:00:00Z",
  "lastModifiedAt": "2026-04-07T10:00:00Z"
}
```

The canonical form is (shown here with a line break for readability only — the actual output has no whitespace):

```
{"createdAt":"2026-04-07T10:00:00Z","domicile":{"country":"GB","subdivision":"GB-ENG"},"id":"b2c3d4e5-f6a7-8901-bcde-f12345678901","lastModifiedAt":"2026-04-07T10:00:00Z","status":"planning","testatorPersonId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890"}
```

Note that:
- Keys are sorted lexicographically at every level (`country` before `subdivision` within `domicile`; `createdAt` before `domicile` before `id` at the top level).
- There is no whitespace between tokens.
- The result is a single UTF-8 byte sequence.

Computing the SHA-256 digest of this byte sequence and hex-encoding the result gives the value for `integrity.digest`.

## Relationship to the JSON Profile

The INHERIT JSON Profile (see `docs/policies/` for the full specification when published) defines what valid INHERIT JSON looks like on the way **in** — the constraints on structure, naming, and value formats that producers must follow.

Canonical JSON defines what INHERIT JSON looks like on the way **out** for cryptographic purposes. A document that conforms to the JSON Profile may arrive with any valid formatting (indented, compact, keys in any order). The canonical form normalises that formatting into a single deterministic byte sequence.

The two specifications are complementary: the profile governs **content validity**, and canonical JSON governs **byte-level identity**.

## Signing Roadmap

The `integrity` field provides tamper detection but not authentication — it proves the document has not been altered, but not who created the digest. Future versions of INHERIT intend to support digital signatures, most likely via a W3C Verifiable Credentials 2.0 envelope or a JWS (JSON Web Signature) wrapper. The canonical JSON specification ensures that, when signing is introduced, the bytes being signed are deterministic and reproducible. Implementers who adopt the `integrity` field today will have a smooth migration path to full digital signatures.
