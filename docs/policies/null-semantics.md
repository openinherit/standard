---
title: "Null Semantics"
version: "1.0"
status: draft
date: 2026-04-10T10:00
lastmod: 2026-04-10T10:00
author: "Rich Davies"
source: "docs/policies/null-semantics.md"
---

# Null Semantics

INHERIT distinguishes three states for optional fields. Getting this wrong is the most common source of subtle data corruption in estate data interchange — one system treats a missing field as "not yet assessed" while another treats it as "assessed and found empty."

## The Three Rules

### 1. Missing = not provided

If a field is absent from the JSON document, no inference should be drawn. The field was not provided by the source system. It may exist in the real world but was not included in this document.

**Do not** default missing fields to `null`, `""`, `0`, `false`, or `[]`. Each of those has a distinct meaning.

### 2. Null = explicitly cleared or not applicable

A field with the value `null` means the source system has explicitly indicated that this field has no value. This is only permitted where the schema's `type` array includes `"null"`.

For example, `"dateOfDeath": null` on a living person means "this person has not died" — it is an explicit assertion, not an omission.

### 3. Empty array = assessed with zero results

An empty array `[]` means the source system assessed the field and found zero items. This is distinct from a missing array, which means the field was not assessed.

For example:
- `"bequests"` missing — the estate's bequests have not been recorded in this document
- `"bequests": []` — the estate has been assessed and has no bequests

## Which fields allow null?

Only fields whose schema `type` includes `"null"` accept null values. For example:

```json
{
  "dateOfDeath": {
    "type": ["string", "null"],
    "format": "date"
  }
}
```

This field accepts a date string or `null`. Fields with `"type": "string"` (without null in the union) must not be set to `null` — they should be omitted entirely if not applicable.

## Why this matters

Consider a system that imports an INHERIT document and stores it in a database:

| JSON state | Correct interpretation | Common mistake |
|---|---|---|
| Field missing | Do not update existing DB value | Set DB column to NULL |
| Field is `null` | Set DB column to NULL | Same as above (losing the distinction) |
| Field is `[]` | Set DB column to empty array | Treat as "no data" and skip |

If your system conflates missing and null, round-tripping a document will lose information: fields that were never provided will appear to have been explicitly cleared.

## Implementing in code

When parsing INHERIT documents, use a three-state representation for optional fields:

- **Not present** — the key does not exist in the parsed object
- **Present with value** — the key exists and has a non-null value
- **Present as null** — the key exists and its value is `null`

Most JSON parsers in most languages preserve this distinction naturally. The risk comes from ORMs, form libraries, and serialisation frameworks that flatten missing and null into a single representation. Test your round-trip path: serialise a document, deserialise it, serialise again, and diff. If fields appear or disappear, your pipeline has a null-semantics bug.
