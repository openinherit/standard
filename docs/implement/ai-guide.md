# AI Integration Guide

> The single source of truth for building AI systems that read, write, and validate INHERIT documents.

All agent wrapper files (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/rules`) point here.

---

## Section 1: Building with INHERIT

### What is INHERIT?

INHERIT is an open estate data interchange standard for structured estate planning information. It defines 32 core entity schemas, 14 common types, 5 asset category schemas, and 21 jurisdiction/cultural extensions — enabling estate planning data to move between software systems, legal professionals, and AI tools across 7 legal traditions (common law, civil law, mixed, religious, customary, socialist, and hybrid).

### The Minimum Viable Estate

The smallest valid INHERIT document requires:

1. The root envelope (`$schema`, `schemaVersion`)
2. An `estate` object with `testatorPersonId`, `status`, `domicile`, `createdAt`, `lastModifiedAt`
3. One person in `people` with role `testator`
4. All entity arrays present (empty is valid)

```json
{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": 3,
  "exportedAt": "2026-03-27",
  "generator": {
    "name": "My App",
    "version": "1.0.0"
  },
  "estate": {
    "id": "e0000001-0000-4000-a000-000000000001",
    "testatorPersonId": "a1000001-0000-4000-a000-000000000001",
    "status": "draft",
    "domicile": {
      "country": "GB",
      "subdivision": "GB-ENG",
      "legalSystems": ["common_law"],
      "name": "England & Wales"
    },
    "createdAt": "2026-03-27",
    "lastModifiedAt": "2026-03-27"
  },
  "people": [
    {
      "id": "a1000001-0000-4000-a000-000000000001",
      "givenName": "James",
      "familyName": "Ashford",
      "roles": ["testator"]
    }
  ],
  "kinships": [],
  "relationships": [],
  "properties": [],
  "assets": [],
  "assetCollections": [],
  "liabilities": [],
  "bequests": [],
  "trusts": [],
  "executors": [],
  "guardians": [],
  "wishes": [],
  "documents": [],
  "nonprobateTransfers": [],
  "proxyAuthorisations": [],
  "valuations": [],
  "lifetimeTransfers": [],
  "organisations": [],
  "spaces": [],
  "insurancePolicies": [],
  "pets": [],
  "extensions": []
}
```

See [`examples/fixtures/minimal-estate.json`](../examples/fixtures/minimal-estate.json) for the canonical fixture.

### Entity Relationships

Entities cross-reference each other by UUID. All referenced IDs must resolve to an entity in the corresponding array.

```
estate.testatorPersonId ──────────────► person.id
bequest.beneficiaryId ────────────────► person.id
bequest.sourceAssetId ────────────────► asset.id
executor.personId ────────────────────► person.id
guardian.personId ────────────────────► person.id
guardian.childPersonId ───────────────► person.id
kinship.fromPersonId ─────────────────► person.id
kinship.toPersonId ───────────────────► person.id
relationship.partners[].personId ─────► person.id
```

### Required vs Optional Fields

Every entity has required fields. Omitting them causes validation failure.

| Entity | Required Fields |
|--------|----------------|
| **person** | `id`, `givenName`, `roles` |
| **estate** | `id`, `testatorPersonId`, `status`, `domicile`, `createdAt`, `lastModifiedAt` |
| **property** | `id`, `name` |
| **asset** | `id`, `name`, `category` |
| **bequest** | `id`, `bequestType` (+ `beneficiaryId` or `beneficiaryOrganisation` for most types) |
| **executor** | `id`, `personId`, `role` |
| **guardian** | `id`, `personId`, `childPersonId`, `role`, `appointmentType` |
| **liability** | `id`, `liabilityType`, `amount` |
| **wish** | `id`, `wishType`, `title` |
| **trust** | `id`, `name`, `trustType`, `trustees` (min 1), `beneficiaries` (min 1) |
| **document** | `id`, `type`, `title` |
| **nonprobateTransfer** | `id`, `transferType`, `passesOutsideEstate` |
| **kinship** | `id`, `kinshipType`, `fromPersonId`, `toPersonId` |
| **relationship** | `id`, `type`, `partners` (min 2) |
| **proxyAuthorisation** | `id`, `proxyPersonId`, `testatorPersonId`, `scope`, `consentRecord` |
| **dealerInterest** | `id`, `interestedParty`, `offerStatus`, `privacyLevel` |

### Common Mistakes

1. **Forgetting to include all entity arrays** — even empty ones are required. The schema validates their presence.
2. **Using string amounts** (`"45000000"`) instead of integer (`45000000`) for money. All monetary amounts are integer minor units.
3. **Missing root envelope fields** — `$schema` and `schemaVersion` are required at the document root.
4. **Using auto-increment IDs** instead of v4 UUIDs. Every `id` must be a valid UUID v4.
5. **Invalid enum values** — check the schema for allowed values (e.g. `status`, `type`, `role`). The schema rejects unknown values.
6. **Adding undeclared properties** — `unevaluatedProperties: false` rejects any field not defined in the schema.
7. **Wrong date format** — all dates must be ISO 8601: `YYYY-MM-DD`.

### Validation Patterns

Use AJV (Another JSON Validator) with 2020-12 support:

```typescript
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

// Load all schemas from the v3/ directory
function loadSchemas(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { loadSchemas(full); continue; }
    if (!entry.endsWith('.json')) continue;
    const schema = JSON.parse(readFileSync(full, 'utf-8'));
    if (schema.$id) {
      // Replace custom dialect with standard 2020-12
      if (schema.$schema === 'https://openinherit.org/v3/dialect.json') {
        schema.$schema = 'https://json-schema.org/draft/2020-12/schema';
      }
      ajv.addSchema(schema);
    }
  }
}

loadSchemas('./v3');
const validate = ajv.getSchema('https://openinherit.org/v3/schema.json');

// Validate a document
const doc = JSON.parse(readFileSync('my-estate.json', 'utf-8'));
if (validate && !validate(doc)) {
  console.error('Validation errors:', validate.errors);
} else {
  console.log('Valid INHERIT document.');
}
```

See [`examples/validate-document.ts`](../examples/validate-document.ts) for a complete runnable example.

### JSON Schema Keyword Reference

INHERIT uses JSON Schema 2020-12 with format assertion. For keyword-level documentation with common pitfalls and examples, see [learnjsonschema.com](https://www.learnjsonschema.com/2020-12/).

---

## Section 2: Extracting INHERIT Data from Documents

This section provides production-ready prompts and schemas for using AI to extract structured estate data from will text, scanned documents, or other unstructured sources.

### System Prompt

Use this system prompt verbatim when configuring an LLM for entity extraction:

```
You are an expert estate data analyst. Your task is to extract structured data from will and testament text according to the INHERIT v3 open estate data standard.

## Entity Types

Extract the following entity types:

**person** — Any individual mentioned. Include a "roles" array with one or more of:
- testator: the person making the will
- beneficiary: someone who receives a gift or share
- executor: appointed to administer the estate (also create an executor entity)
- guardian: appointed to care for children (also create a guardian entity)
- witness: signed the will as witness

**property** — Real estate: houses, land, flats. Include address, tenure (freehold/leasehold), estimated value if stated.

**asset** — Financial and personal assets: bank accounts, investments, vehicles, jewellery, furniture, business interests. Include institution name, account type, estimated value if stated.

**liability** — Debts and obligations: mortgages, loans, credit cards. Include creditor name, estimated amount if stated.

**bequest** — A gift or instruction. Types:
- specific: a named item to a named person
- pecuniary: a cash sum
- residuary: the remainder of the estate
- conditional: subject to a condition
- demonstrative: from a specified fund
- trust: into trust
- charitable: to a charity

**executor** — An appointed executor (always paired with a person entity for the same individual).

**guardian** — An appointed guardian (always paired with a person entity for the same individual).

**wish** — Non-binding preferences: funeral wishes, burial instructions, pet care, letters of wishes.

## Confidence Levels

- **high**: Explicitly stated in clear, unambiguous terms
- **medium**: Reasonably inferred from context
- **low**: Ambiguous, incomplete, or uncertain

## Source Locations

Provide page/paragraph references where possible (e.g. "Page 2, clause 3", "Opening paragraph").

## Monetary Amounts

Express all monetary amounts as integer minor units (pennies for GBP). Default currency is GBP (ISO 4217) unless another currency is stated. Example: £50,000 = { amount: 5000000, currency: "GBP" }.

## Important Rules

- Extract factual data only — do NOT interpret legal effect or give legal advice
- Do NOT infer beneficiary shares or entitlements beyond what is written
- Generate a short descriptive label for each entity
- If a name appears in multiple roles, create one person entity with all roles listed
- Record warnings for anything ambiguous, contradictory, or potentially significant
```

### Tool Schema

Use this `tool_use` schema when calling an LLM for extraction. The format is Anthropic tool_use; adapt for other providers as needed.

```json
{
  "name": "submit_extraction",
  "description": "Submit the structured extraction of entities from the will text",
  "input_schema": {
    "type": "object",
    "properties": {
      "entities": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "enum": [
                "person", "property", "asset", "liability",
                "bequest", "executor", "guardian", "wish"
              ]
            },
            "data": { "type": "object", "additionalProperties": true },
            "confidence": { "type": "string", "enum": ["high", "medium", "low"] },
            "source": { "type": "string" },
            "label": { "type": "string" }
          },
          "required": ["type", "data", "confidence", "source", "label"]
        }
      },
      "warnings": { "type": "array", "items": { "type": "string" } },
      "jurisdiction": {
        "type": "object",
        "properties": {
          "country": { "type": "string" },
          "subdivision": { "type": "string" }
        },
        "required": ["country"]
      },
      "willType": {
        "type": "string",
        "enum": ["secular", "religious", "dual"]
      }
    },
    "required": ["entities", "warnings"]
  }
}
```

### Entity Types to Extract

| Entity Type | What to Look For | Example Text | Expected Extraction |
|-------------|-----------------|--------------|---------------------|
| **person** | Any named individual | "I, Margaret Chen, of 14 Elm Road..." | `{ givenName: "Margaret", familyName: "Chen", roles: ["testator"] }` |
| **property** | Real estate, land | "my freehold property at 14 Elm Road, Bristol" | `{ name: "14 Elm Road, Bristol", tenure: "freehold" }` |
| **asset** | Financial, personal items | "my Barclays savings account (sort code 20-45-67)" | `{ name: "Barclays savings account", category: "bank_account" }` |
| **liability** | Debts, mortgages | "the outstanding mortgage with Halifax" | `{ liabilityType: "mortgage", creditor: "Halifax" }` |
| **bequest** | Gifts, shares | "I give £50,000 to my son David" | `{ bequestType: "pecuniary", amount: { amount: 5000000, currency: "GBP" } }` |
| **executor** | Appointed administrators | "I appoint my wife Susan as executor" | `{ role: "primary" }` (+ person with executor role) |
| **guardian** | Child guardians | "I appoint my sister Jane as guardian of my children" | `{ role: "guardian", appointmentType: "primary" }` (+ person) |
| **wish** | Non-binding preferences | "I wish to be cremated" | `{ wishType: "funeral", title: "Cremation wish" }` |

### Confidence Scoring

| Level | When to Use | Example |
|-------|------------|---------|
| **high** | Explicitly stated in clear, unambiguous terms | "I give my house at 14 Elm Road to my daughter Sarah" |
| **medium** | Reasonably inferred from context | "my home" (address not stated but inferable from earlier in the document) |
| **low** | Ambiguous, incomplete, or uncertain | "my personal effects" (unclear what items are included) |

### Post-Extraction Assembly

After the LLM returns extracted entities, assemble a valid INHERIT document:

1. **Generate v4 UUIDs** for every entity's `id` field
2. **Resolve cross-references** — set `bequest.beneficiaryId` to the correct person's UUID, `executor.personId` to the person's UUID, etc.
3. **Set `estate.testatorPersonId`** to the UUID of the person with role `testator`
4. **Fill all entity arrays** — place extracted entities in their arrays; use empty arrays for types with no extracted data
5. **Wrap in the root envelope:**
   ```json
   {
     "$schema": "https://openinherit.org/v3/schema.json",
     "schemaVersion": 3,
     "exportedAt": "2026-03-27",
     "generator": { "name": "Your App", "version": "1.0.0" }
   }
   ```
6. **Validate** the assembled document against the schema (see [Validation Patterns](#validation-patterns))

See [`examples/extract-entities.ts`](../examples/extract-entities.ts) (TypeScript) and [`examples/python/extract_entities.py`](../examples/python/extract_entities.py) (Python) for complete runnable examples. Both include AI provenance tracking.

### Model Recommendations

- **Entity extraction:** Use `claude-sonnet-4-5` or any model supporting tool_use. The system prompt and tool schema above work across providers.
- **Building documents:** Any model that can follow JSON Schema constraints. Provide the schema inline or as a reference.
- **Validation:** Always use AJV or the web validator after generation. Do not rely on the LLM to self-validate — models hallucinate valid-looking but invalid JSON.

---

## Section 3: Guardrails

### What INHERIT Is NOT

- **Not legal advice.** INHERIT is a data format. It does not interpret wills, assess validity, or recommend actions.
- **Not a database schema.** It is an interchange format — your application's internal data model may differ.
- **Not a UI framework.** INHERIT defines data structure, not presentation.
- **Not a complete estate plan.** An INHERIT document captures structured data; it does not replace professional legal counsel.

### Generation Rules

When generating or modifying INHERIT documents programmatically or via AI:

1. Every `id` **MUST** be a valid v4 UUID
2. Every monetary amount **MUST** be an integer in minor units (pennies/cents)
3. Every date **MUST** be ISO 8601 format (`YYYY-MM-DD`)
4. Every person referenced anywhere **MUST** exist in the `people` array
5. The `estate` **MUST** have a `testatorPersonId` that matches a person with role `testator`
6. All entity arrays **MUST** be present (empty arrays are valid)
7. `unevaluatedProperties: false` means no extra fields — the schema rejects undeclared properties

### Validation Strategy

| Task | Recommended Approach |
|------|---------------------|
| Entity extraction | Any model with tool_use support |
| Building documents | Any model that can follow JSON Schema constraints |
| **Validation** | **AJV or the web validator — never the LLM** |

LLMs are excellent at extraction and generation but unreliable at self-validation. Always validate the output with a deterministic JSON Schema validator.

---

## Section 4: AI Provenance Tracking

When AI generates or modifies INHERIT data, track provenance using the `ai-provenance` common type (`v3/common/ai-provenance.json`). This records which model produced the data and whether a human has verified it.

### Schema Fields

| Field | Type | Description |
|-------|------|-------------|
| `model` | string | AI model family: `claude`, `gpt`, `gemini`, `grok`, `llama`, `mistral`, `other`, or `x-inherit-*` for custom |
| `confidence` | integer (0–100) | How certain the AI is about the generated data |
| `generatedAt` | datetime | When the AI produced this data |
| `humanReviewed` | boolean | Whether a human has verified the data |
| `reviewedBy` | string | Person name or role of the reviewer |
| `reviewedAt` | datetime | When the human review occurred |

### Example: Adding Provenance to an Extracted Entity

After extracting entities from a will using the system prompt in Section 2, attach provenance to each entity:

```json
{
  "id": "a1000001-0000-4000-a000-000000000001",
  "givenName": "Margaret",
  "familyName": "Chen",
  "roles": ["testator"],
  "aiProvenance": {
    "model": "claude",
    "confidence": 95,
    "generatedAt": "2026-04-10T14:30:00Z",
    "humanReviewed": false
  }
}
```

After a solicitor reviews the extracted data:

```json
{
  "aiProvenance": {
    "model": "claude",
    "confidence": 95,
    "generatedAt": "2026-04-10T14:30:00Z",
    "humanReviewed": true,
    "reviewedBy": "Sarah Thompson, Solicitor",
    "reviewedAt": "2026-04-11T09:15:00Z"
  }
}
```

### When to Use Provenance

- **Always** when AI extracts data from unstructured text (wills, letters, scanned documents)
- **Always** when AI generates placeholder or estimated values (asset valuations, property values)
- **Recommended** when AI assists in assembling a document from structured input
- **Not needed** when the data is entered directly by a human through a form

### Extension Properties

For implementation-specific detail (exact model version, pipeline ID, token cost, reasoning chain), use `x-inherit-*` extension properties:

```json
{
  "aiProvenance": {
    "model": "claude",
    "confidence": 92,
    "generatedAt": "2026-04-10T14:30:00Z",
    "humanReviewed": false,
    "x-inherit-willscan": {
      "modelVersion": "claude-sonnet-4-5-20250514",
      "pipelineId": "extract-v3.2",
      "tokenCost": 4521,
      "extractionDurationMs": 3200
    }
  }
}
```

---

## Section 5: Agent Reference Data

The `reference-data/` directory contains structured definitions for building multi-agent systems that work with INHERIT:

### agent-task-definitions.json

Defines platform access methods, authentication types, rate limits, and automation permissions for every external service an INHERIT agent might interact with (Amazon, eBay, Anthropic, art databases, auction houses, assay offices, etc.). Use this to determine:

- Whether a platform allows automated access (`tosPermitsAutomation`)
- What authentication method to use (`authType`: API key, OAuth, manual)
- Rate limiting constraints (`rateLimitNotes`)
- API documentation URLs (`apiDocUrl`)

### agent-output-schema.json

Defines the expected output format for agent tasks — the structured contract between agents in a multi-agent pipeline. Use this when building orchestration systems that chain INHERIT operations.

### How to Use

```python
import json

with open('reference-data/agent-task-definitions.json') as f:
    tasks = json.load(f)

# Check if eBay allows automated access
ebay = tasks['platformAccess']['ebay']
print(f"eBay automation allowed: {ebay['tosPermitsAutomation']}")
print(f"Auth type: {ebay['authType']}")
print(f"Rate limit: {ebay['rateLimitNotes']}")
```

---

## Section 8: Document Profile

### Expected Document Sizes

| Category | Size | Description | Example |
|----------|------|-------------|---------|
| Small | <50KB | Simple domestic estate, single jurisdiction | English estate with 5 people, 10 assets, 3 bequests |
| Medium | 50-500KB | Cross-border estate with extensions | UK domicile with French property, Islamic succession overlay |
| Large | 500KB-5MB | Complex multi-extension estate with full provenance | Multi-jurisdiction estate with 80+ people, collections, scenarios |

**Recommended maximum document size: 5MB.** Implementations should reject documents exceeding this limit.

### Streaming and Performance

- **Level 1 validation** (schema shape) can be performed incrementally on document fragments
- **Level 2 validation** (referential integrity) requires the full document in memory — all cross-references must be checked against complete entity arrays
- **Level 3 validation** (jurisdiction completeness) requires loading extension metadata from the registry

### Serialisation Guidance

- **Encoding:** UTF-8, no BOM
- **Format:** Compact JSON for interchange (no pretty-printing). Pretty JSON for debugging only
- **Field ordering:** Not semantically significant (JSON objects are unordered), but stable ordering (e.g. sorted keys) improves diff quality and caching
- **Null handling:** See the INHERIT Null Policy in schema.json `$comment`
