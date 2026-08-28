# INHERIT Examples

Runnable examples demonstrating how to create, validate, and work with INHERIT estate documents.

## Quick Start

```bash
cd examples
pnpm install
```

## Code Examples

| File | Language | What it demonstrates |
|------|----------|---------------------|
| `validate-document.ts` | TypeScript | Level 1 (schema) and Level 2 (referential integrity) conformance validation |
| `create-estate.ts` | TypeScript | Building an estate document from scratch using generated types |
| `create-catalogue.ts` | TypeScript | Creating asset catalogues |
| `extract-entities.ts` | TypeScript | Extracting structured INHERIT data from unstructured text |
| `import-export.ts` | TypeScript | Round-trip serialisation and deserialisation |
| `python/validate.py` | Python | Schema validation using Python's `jsonschema` library |
| `go/validate.go` | Go | Schema validation in Go |

Run a TypeScript example:

```bash
npx tsx validate-document.ts
```

## Fixtures

Complete, validated estate documents covering a range of jurisdictions and scenarios. All fixtures are tested in CI via the `validate-examples` workflow.

### Core Scenarios

| File | Description |
|------|-------------|
| `minimal-estate.json` | Smallest valid INHERIT document |
| `english-family-estate.json` | UK common law estate |
| `new-york-estate.json` | US estate |
| `scottish-estate.json` | Scottish succession law |
| `dubai-estate.json` | UAE estate |
| `mumbai-estate.json` | Indian succession |
| `korean-estate.json` | South Korean estate |
| `singapore-estate.json` | Singapore estate |
| `tokyo-estate.json` | Japanese estate |
| `catalogue-only.json` | Asset catalogue without a full estate |
| `fatima-al-rashid-islamic-digital-estate.json` | Dual-jurisdiction (English + Islamic faraid) with digital assets, video declarations, and posthumous AI preferences |

### Extension Demos

Each file demonstrates jurisdiction-specific fields from the corresponding extension:

| File | Extension |
|------|-----------|
| `extension-uk-england-wales.json` | UK (England & Wales) |
| `extension-us-estate.json` | United States |
| `extension-canada.json` | Canada |
| `extension-australia-nz.json` | Australia & New Zealand |
| `extension-eu-succession.json` | European Union |
| `extension-japan.json` | Japan |
| `extension-prc-china.json` | People's Republic of China |
| `extension-singapore-malaysia.json` | Singapore & Malaysia |
| `extension-latin-america.json` | Latin America |
| `extension-islamic-succession.json` | Islamic succession (faraid) |
| `extension-jewish-succession.json` | Jewish succession (halacha) |
| `extension-hindu-succession.json` | Hindu succession |
| `extension-africa-customary.json` | African customary law |

### Test Cases

| File | Purpose |
|------|---------|
| `broken-references.json` | Intentionally invalid — tests that Level 2 validation catches broken cross-references |
| `sample-will-text.txt` | Plain-text will for testing extraction workflows |

## Example Wills

Complete will packages — story narrative, INHERIT JSON fixture, and source will PDF — co-located per person:

See [`examples/wills/README.md`](wills/README.md) for the full collection and conventions.

## Licensing

All examples and fixtures are licensed under [CC0](../LICENSE-EXAMPLES) — use them freely with no attribution required.
