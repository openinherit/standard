# @openinherit/schema

The **INHERIT** open estate data standard — JSON Schemas for structured estate planning data interchange.

## What's inside

- **31 core entity schemas** — estate, person, bequest, kinship, trust, executor, property, asset, and more
- **14 common types** — address, money, jurisdiction, identifier, provenance, temporal rules
- **5 asset category schemas** — financial, vehicle, digital, business, general
- **21 jurisdiction extensions** — UK, US, Australia/NZ, Singapore/Malaysia, Islamic, Hindu, Jewish, Japan, PRC China, EU Succession, and more
- **Reference data** — enum descriptions, role definitions, form mappings

## Install

```bash
npm install @openinherit/schema
```

## Usage

Import schemas for validation:

```javascript
import inheritSchema from '@openinherit/schema/v3/schema.json' assert { type: 'json' };
import personSchema from '@openinherit/schema/v3/person.json' assert { type: 'json' };
import kinshipSchema from '@openinherit/schema/v3/kinship.json' assert { type: 'json' };
```

Use with any JSON Schema 2020-12 validator:

```javascript
import Ajv from 'ajv/dist/2020';
const ajv = new Ajv();
const validate = ajv.compile(personSchema);
```

## Schema version

This package uses **JSON Schema 2020-12** (`$schema: "https://json-schema.org/draft/2020-12/schema"`).

The `v3/` directory contains all current schemas. The schema generation is v3; the package version (6.x.x) tracks incremental improvements within v3.

## Jurisdiction extensions

| Extension | Legal tradition | Jurisdictions |
|-----------|----------------|---------------|
| UK England & Wales | Common law | GB-ENG, GB-WLS |
| Scotland | Mixed civil/common | GB-SCT |
| US Estate | Common law | US |
| Australia & NZ | Common law | AU, NZ |
| Singapore & Malaysia | Common/Islamic | SG, MY |
| Islamic Succession | Sharia | SG, MY, ID, AE, SA, PK, BD, GB, US, AU, CA |
| Hindu Succession | Hindu customary | IN, NP, LK, MY, SG, GB, US, AU, CA |
| Jewish Succession | Halakha | IL, GB, US, CA, AU, FR |
| Japan | Civil law | JP |
| PRC China | Civil law (socialist) | CN |
| EU Succession | Mixed civil law | 25 EU member states |
| And 10 more... | | |

## Links

- **Developer docs:** [dev.openinherit.org](https://dev.openinherit.org)
- **Website:** [openinherit.org](https://www.openinherit.org)
- **GitHub:** [openinherit/standard](https://github.com/openinherit/standard)
- **SDK:** [@openinherit/sdk](https://www.npmjs.com/package/@openinherit/sdk)

## Licence

Apache-2.0 — see [LICENSE](https://github.com/openinherit/standard/blob/main/LICENSE).
