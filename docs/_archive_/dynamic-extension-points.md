# Dynamic Extension Points (Advanced / Future)

> **Archived.** This technique was considered during v3 planning but not adopted — INHERIT v3 retained the `x-inherit-*` pattern properties approach. The explanation of `$dynamicRef`/`$dynamicAnchor` remains correct and may be useful for future reference. URI examples reference v2, which was the current version when this was written.

> **Original status:** Informational.

## Background: `$dynamicRef` / `$dynamicAnchor` in JSON Schema 2020-12

JSON Schema 2020-12 introduced `$dynamicRef` and `$dynamicAnchor` as a mechanism for late-bound schema resolution. Unlike `$ref`, which resolves statically at schema-load time, `$dynamicRef` resolves by walking the dynamic scope (the chain of schemas that led to the current evaluation point) and binding to the nearest `$dynamicAnchor` with a matching name.

This enables a powerful pattern: a **base schema** can declare an extension point using `$dynamicAnchor`, and a **consumer schema** can override that extension point simply by declaring its own `$dynamicAnchor` with the same name higher in the evaluation chain. No modifications to the base schema are needed.

INHERIT's dialect metaschema (`v2/dialect.json`) already uses this mechanism: it declares `"$dynamicAnchor": "meta"` so that the standard JSON Schema 2020-12 meta-validation infrastructure can be extended with INHERIT's custom vocabulary keywords.

## How This Applies to INHERIT's Extension Model

INHERIT v2.x supports implementer extensions via `patternProperties` matching the `^x-inherit-` prefix. Any property whose name begins with `x-inherit-` passes validation and can carry platform-specific data. This is simple, effective, and sufficient for the vast majority of use cases.

However, `x-inherit-` fields are **unvalidated by the base schema** -- they are permitted but not constrained. An implementer who wants the schema validator to enforce structure on their custom fields must maintain a separate validation step.

`$dynamicRef` / `$dynamicAnchor` offers a cleaner alternative: the base INHERIT schema can define a named extension point, and a consumer schema can inject a fully validated sub-schema into that point. The validator enforces both the base INHERIT constraints and the consumer's custom constraints in a single pass.

## Worked Example: MFI Overriding the Asset Extension Point

Suppose MyFamilyInherits (MFI) wants to add validated platform-specific fields to every asset: a risk score and an internal classification code.

### Step 1: Base Schema with `$dynamicAnchor`

The INHERIT base `asset.json` would declare an extension point:

```json
{
  "$schema": "https://openinherit.org/v2/dialect.json",
  "$id": "https://openinherit.org/v2/asset.json",
  "title": "Asset",
  "type": "object",
  "required": ["id", "name", "category"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string" },
    "category": { "type": "string" }
  },
  "$defs": {
    "extension-point": {
      "$dynamicAnchor": "asset-ext",
      "$comment": "Default: accept anything. Consumers may override."
    }
  },
  "allOf": [
    { "$dynamicRef": "#asset-ext" }
  ],
  "patternProperties": {
    "^x-inherit-": true
  },
  "unevaluatedProperties": false
}
```

The key elements:

- `$defs/extension-point` declares `$dynamicAnchor: "asset-ext"` with no constraints (the default allows anything).
- The `allOf` includes a `$dynamicRef` to `#asset-ext`, which the validator resolves at evaluation time.

### Step 2: MFI Consumer Schema with `$dynamicAnchor` Override

MFI creates a wrapper schema that references the base and overrides the extension point:

```json
{
  "$schema": "https://openinherit.org/v2/dialect.json",
  "$id": "https://mfi.example.com/schemas/mfi-asset.json",
  "title": "MFI Asset",
  "$comment": "Extends INHERIT asset with validated MFI-specific fields.",
  "$defs": {
    "mfi-extension": {
      "$dynamicAnchor": "asset-ext",
      "properties": {
        "x-inherit-mfi-risk-score": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10,
          "description": "MFI internal risk classification (1 = lowest, 10 = highest)"
        },
        "x-inherit-mfi-classification": {
          "type": "string",
          "enum": ["standard", "complex", "contested", "cross-border"],
          "description": "MFI processing classification code"
        }
      },
      "required": ["x-inherit-mfi-risk-score"]
    }
  },
  "$ref": "https://openinherit.org/v2/asset.json"
}
```

When a validator evaluates a document against `mfi-asset.json`:

1. The `$ref` pulls in the base `asset.json`.
2. The base schema's `$dynamicRef: "#asset-ext"` resolves by searching the dynamic scope.
3. It finds MFI's `$dynamicAnchor: "asset-ext"` (declared higher in the evaluation chain) and binds to it.
4. The MFI extension constraints are enforced: `x-inherit-mfi-risk-score` is required and must be an integer between 1 and 10.

The base INHERIT schema is never modified. MFI gets full validation of its custom fields.

## Current Recommendation

**`x-inherit-` pattern properties remain the primary extension mechanism for INHERIT v2.x. `$dynamicRef` adoption is planned for v3.0.**

The current `patternProperties` approach is well understood, widely supported, and does not require implementers to compose schemas. It is the right choice for the majority of integrations.

## When to Consider `$dynamicRef`

This is an advanced technique. Most implementers should use `x-inherit-` prefixed fields and validate them separately if needed. Consider `$dynamicRef` only if:

- You need **schema-enforced validation** of extension fields in a single pass
- You are building a **platform** (not a one-off integration) and want to distribute validated schemas to downstream consumers
- Your JSON Schema tooling **fully supports 2020-12 dynamic references** -- many popular validators do not yet implement this feature correctly

If you are unsure whether you need this, you almost certainly do not.
