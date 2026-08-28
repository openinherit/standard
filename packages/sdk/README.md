# @openinherit/sdk

TypeScript SDK for the **INHERIT** open estate data standard — types, API client stubs, and validation.

## Install

```bash
npm install @openinherit/sdk @hey-api/client-fetch
```

## Quick start

```typescript
import { type Estate, type Person, type Bequest, type Kinship } from '@openinherit/sdk';

// Full TypeScript types for all 31 INHERIT entities
const person: Person = {
  id: 'a1000001-0000-4000-a000-000000000001',
  givenName: 'Katrina',
  familyName: 'Tan',
  roles: ['testator'],
  gender: 'female',
};
```

## API client (Reference API)

```typescript
import { createEstate, getEstate, validateEstate } from '@openinherit/sdk/reference';

// Create an estate
const { data } = await createEstate({ body: estateData });

// Validate a document
const { data: result } = await validateEstate({
  path: { estateId: 'e1000001-...' },
});
```

## What's included

- **Full TypeScript types** for all 31 core entities, 14 common types, and 21 jurisdiction extensions
- **API client stubs** generated from the OpenAPI 3.1 Reference API via [hey-api](https://heyapi.dev)
- **ESM-only** — built with [tsup](https://tsup.egoist.dev) for correct Node.js ESM resolution
- **Three entry points:**
  - `@openinherit/sdk` — current API (v1 estate endpoints)
  - `@openinherit/sdk/v2` — v2 API with expanded operations
  - `@openinherit/sdk/reference` — full Reference API with all CRUD operations

## Key types

| Type | Description |
|------|-------------|
| `Estate` | The root entity — testator, domicile, succession regime |
| `Person` | Anyone involved — testator, beneficiary, executor, witness |
| `Bequest` | A disposition — specific, pecuniary, residuary, life interest, class, debt forgiveness |
| `Kinship` | Familial bonds — parent/child, sibling, uncle/aunt, cousin |
| `Trust` | Testamentary and inter vivos trusts — discretionary, life interest, charitable, NRB |
| `PowerOfAppointment` | Testamentary authority — general, special, hybrid |
| `Executor` | Estate administrators — primary, substitute, literary, digital, specialist |
| `Property` | Real property — freehold, leasehold, with tax relief eligibility |

## Schema package

For the raw JSON Schemas (without TypeScript types), use [@openinherit/schema](https://www.npmjs.com/package/@openinherit/schema).

## Links

- **Developer docs:** [dev.openinherit.org](https://dev.openinherit.org)
- **Website:** [openinherit.org](https://www.openinherit.org)
- **GitHub:** [openinherit/standard](https://github.com/openinherit/standard)
- **Schema package:** [@openinherit/schema](https://www.npmjs.com/package/@openinherit/schema)

## Licence

Apache-2.0 — see [LICENSE](https://github.com/openinherit/standard/blob/main/LICENSE).
