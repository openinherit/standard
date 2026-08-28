# JSON Schema Patterns — Contributor Guide

This document covers the JSON Schema patterns used across the INHERIT schema suite. All INHERIT schemas target **JSON Schema 2020-12** via the custom dialect at `v3/dialect.json`. Contributors must follow these patterns when proposing schema changes.

---

## 1. `unevaluatedProperties` Placement

**Rule:** `unevaluatedProperties: false` must appear at the **parent (root) level** of the schema, never inside an `allOf` sibling.

### The Sibling Trap

In JSON Schema 2020-12, `unevaluatedProperties` considers properties "evaluated" by any applicator keyword at the same schema level (`properties`, `patternProperties`, `allOf`, `if`/`then`, etc.). When you place `unevaluatedProperties` inside an `allOf` entry, it only sees what that single subschema evaluates — it cannot see properties defined by sibling entries or the parent. This causes legitimate properties to be rejected as "unevaluated".

### Incorrect — `unevaluatedProperties` inside `allOf`

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string", "maxLength": 255 }
  },
  "allOf": [
    {
      "if": {
        "required": ["category"],
        "properties": {
          "category": { "const": "financial" }
        }
      },
      "then": {
        "required": ["accountNumber"]
      },
      "unevaluatedProperties": false
    }
  ]
}
```

This rejects `id` and `name` because the `allOf[0]` subschema has no visibility of the parent's `properties`. Every property defined outside the subschema is "unevaluated" from its perspective.

### Correct — `unevaluatedProperties` at parent level

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string", "maxLength": 255 },
    "category": { "type": "string" },
    "accountNumber": { "type": "string", "maxLength": 255 }
  },
  "allOf": [
    {
      "if": {
        "required": ["category"],
        "properties": {
          "category": { "const": "financial" }
        }
      },
      "then": {
        "required": ["accountNumber"]
      }
    }
  ],
  "patternProperties": {
    "^x-inherit-": true
  },
  "unevaluatedProperties": false
}
```

At the parent level, `unevaluatedProperties` sees everything: the `properties` block, `patternProperties`, and everything evaluated through `allOf`/`if`/`then`. This is the pattern used throughout INHERIT — see `bequest.json` and `person.json` for real examples.

---

## 2. `if`/`then`/`else` Guards

**Rule:** Always include `required` for the discriminator field(s) in the `if` block. Never rely on `const` or `enum` alone.

### The False-Positive Branch Matching Risk

JSON Schema's `if` keyword succeeds when the instance satisfies the subschema. If you write `"properties": { "bequestType": { "const": "class" } }` without `"required": ["bequestType"]`, then any object that **lacks** `bequestType` trivially passes the `if` — the `const` constraint is never tested because the property is absent. The `then` branch fires incorrectly, imposing requirements on objects that should not match.

### Incorrect — missing `required` in `if`

```json
{
  "if": {
    "properties": {
      "bequestType": { "const": "life_interest" }
    }
  },
  "then": {
    "required": ["lifeInterest"]
  }
}
```

An object like `{ "id": "...", "bequestType": "pecuniary" }` correctly fails the `if` (because `"pecuniary" !== "life_interest"`). But an object like `{ "id": "..." }` — with no `bequestType` at all — **passes** the `if`, because the absent property is not tested. The `then` branch fires and demands `lifeInterest`, which makes no sense for an object with no bequest type.

### Correct — `required` guards the discriminator

```json
{
  "if": {
    "required": ["bequestType"],
    "properties": {
      "bequestType": { "const": "life_interest" }
    }
  },
  "then": {
    "required": ["lifeInterest"]
  }
}
```

Now the `if` only matches when `bequestType` is both present **and** equal to `"life_interest"`. Objects without the field skip the branch entirely. This is the pattern used throughout INHERIT — see `bequest.json` lines 49-64 and 66-80 for real examples.

---

## 3. `$vocabulary` Usage

**Rule:** INHERIT's custom vocabulary is declared `false` (optional) in `dialect.json`. Do not change it to `true`.

### How It Works

The `$vocabulary` keyword in a metaschema tells validators which vocabularies they must understand. A vocabulary mapped to `true` is **required** — validators that do not recognise it must refuse to process the schema. A vocabulary mapped to `false` is **optional** — validators may ignore unknown keywords from that vocabulary and still process the schema.

### INHERIT's Dialect

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://openinherit.org/v3/dialect.json",
  "$vocabulary": {
    "https://json-schema.org/draft/2020-12/vocab/core": true,
    "https://json-schema.org/draft/2020-12/vocab/applicator": true,
    "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
    "https://json-schema.org/draft/2020-12/vocab/validation": true,
    "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
    "https://json-schema.org/draft/2020-12/vocab/content": true,
    "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
    "https://openinherit.org/v3/vocab/estate": false
  }
}
```

All standard 2020-12 vocabularies are required (`true`). INHERIT's custom estate vocabulary (`https://openinherit.org/v3/vocab/estate`) is declared `false` so that generic validators — AJV, Hyperjump, Sourcemeta — can process INHERIT schemas without needing awareness of custom keywords. They will simply treat unknown keywords as annotations and move on.

### Why Not `true`?

Setting a custom vocabulary to `true` means **every validator must understand it or refuse to validate**. That defeats the purpose of an open standard — you would force every consumer to use an INHERIT-aware validator. By keeping it `false`, any compliant JSON Schema 2020-12 validator can process INHERIT documents out of the box.

---

## 4. Extension Field Naming

**Rule:** All extension fields use the `x-inherit-` prefix, with camelCase after the prefix.

### Pattern

```
^x-inherit-[a-z][a-zA-Z0-9]*$
```

### How It Is Enforced

Every INHERIT entity schema includes both `patternProperties` (to allow extension fields) and `propertyNames` (to constrain their shape):

```json
{
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "givenName": { "type": "string", "maxLength": 255 }
  },
  "patternProperties": {
    "^x-inherit-": true
  },
  "unevaluatedProperties": false,
  "propertyNames": {
    "pattern": "^(x-inherit-[a-zA-Z][a-zA-Z0-9-]*|[a-z][a-zA-Z0-9]*)$"
  }
}
```

- **`patternProperties`** with `"^x-inherit-": true` marks any `x-inherit-*` property as evaluated, so `unevaluatedProperties: false` does not reject it.
- **`propertyNames`** constrains all property names to either standard camelCase fields or `x-inherit-` prefixed extension fields.

### Examples

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "givenName": "Chidi",
  "roles": ["beneficiary"],
  "x-inherit-okparaStatus": "confirmed",
  "x-inherit-halachicStatus": "kohen"
}
```

Invalid extension field names:

- `x-custom-field` — wrong prefix (must be `x-inherit-`)
- `x-inherit-` — empty after prefix
- `x-inherit-123` — must start with a lowercase letter after prefix
- `inheritCustomField` — missing the `x-inherit-` prefix

---

## 5. Enum Extensibility

**Rule:** All enums that need forward compatibility use the `anyOf [closed enum, x-inherit- pattern]` pattern.

### The Pattern

```json
{
  "status": {
    "description": "Legislative status of this rule",
    "anyOf": [
      {
        "enum": [
          "enacted",
          "royal_assent",
          "bill_stage",
          "consultation",
          "announced"
        ]
      },
      {
        "type": "string",
        "pattern": "^x-inherit-[a-z][a-zA-Z0-9]*$",
        "maxLength": 100
      }
    ]
  }
}
```

### Why

A plain `enum` is a closed set — any value not listed is rejected. That is fine for values the standard controls (like `bequestType`), but some fields need to accommodate domain-specific values that platforms or jurisdiction extensions add. The `anyOf` pattern says: "accept any value from the standard set **or** any `x-inherit-`-prefixed custom value."

This gives platforms forward compatibility without modifying the standard. A UK probate platform could use `"x-inherit-grantOfRepresentation"` as a custom status, and it would validate cleanly against the schema. When the community agrees a value should be standardised, it moves from the extension pattern into the core enum in a future version.

### When to Use

- **Use `anyOf`** for fields where jurisdiction extensions or platforms genuinely need custom values (e.g. cultural types, specialised statuses).
- **Use plain `enum`** for fields where the standard controls the full set and extension values would be meaningless or dangerous (e.g. `bequestType`, which drives conditional validation logic).

---

## 6. String Constraints

**Rule:** Every `string` property MUST have a `maxLength`. No unbounded strings.

### Standard Limits

| Category | `maxLength` | Used for |
|----------|-------------|----------|
| **Names** | 255 | `givenName`, `familyName`, `name`, `title`, `classDefinition` |
| **Notes** | 2000 | `notes`, `description` (free-text commentary fields) |
| **URIs** | 2048 | `uri`, `website`, `url` fields |
| **Content** | 5000 | Large text blocks (document content, extended descriptions) |
| **References** | 500 | `legislativeReference`, `registrationNumber`, citations |
| **Codes** | 100 | `subcategory`, `language`, short classification values |

### Why

Unbounded strings are a denial-of-service vector. A validator processing a 100 MB string in a `givenName` field will allocate memory proportional to the input. Storage systems that map JSON fields to database columns need to know the maximum size. API gateways and serialisation layers need bounded payloads.

### Example

```json
{
  "givenName": {
    "description": "The person's given (first) name",
    "type": "string",
    "minLength": 1,
    "maxLength": 255
  },
  "notes": {
    "description": "Free-text notes about this person",
    "type": "string",
    "maxLength": 2000
  },
  "language": {
    "description": "BCP 47 language tag",
    "type": "string",
    "maxLength": 100
  },
  "legislativeReference": {
    "description": "Citation for the legislation that establishes this rule",
    "type": "string",
    "maxLength": 500
  }
}
```

### Adding a New String Field

When adding a new string property to any INHERIT schema:

1. Choose the appropriate limit from the table above.
2. If none fits, pick the nearest category and document why in a `$comment`.
3. Never omit `maxLength` — the test suite enforces this across all schemas.
4. Use `minLength: 1` for required string fields to prevent empty strings passing validation.
