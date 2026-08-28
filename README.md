# INHERIT — Open Estate Data Interchange Standard

INHERIT is an open standard for structured estate-planning data: a set of
JSON Schema (Draft 2020-12) entity schemas, jurisdiction extensions, an OpenAPI
description, reference data, and conformance fixtures, with SDKs in several
languages. It gives applications a common, validatable shape for wills, estates,
assets, beneficiaries, and the relationships between them.

This repository is the public home of the standard. It is published under the
Apache License 2.0.

## What's here

- `v3/` — the JSON Schema 2020-12 entity schemas and jurisdiction extensions.
- `packages/` — published SDK and tooling packages (`@openinherit/schema`,
  `@openinherit/sdk`, `@openinherit/conformance`, and language SDKs).
- `openapi/` — the fully dereferenced OpenAPI description.
- `examples/` — runnable examples and JSON fixtures.
- `reference-data/` — enum descriptions and agent task definitions.
- `docs/` — implementation guides, policies, proposals, and integration notes.
- `llms.txt` — a compact machine-readable entry point for AI agents.

## Install

The standard ships as npm packages (version 6.6.0):

```bash
npm install @openinherit/schema
npm install @openinherit/sdk
npm install @openinherit/conformance
```

## Conventions

- Monetary amounts are integer minor units (pennies/cents).
- IDs are v4 UUIDs; dates are ISO 8601 (`YYYY-MM-DD`).
- `unevaluatedProperties: false` — no undeclared fields.
- Validate with AJV or the CLI; do not self-validate.
- Schema semantics are stable — changes to `v3/` go through a formal proposal
  (`docs/proposals/`).

## Contributing

See `CONTRIBUTING.md` and `GOVERNANCE.md`. Security reports: `SECURITY.md`.

## Provenance

The standard was developed in a private repository and is published here with a
fresh commit history; earlier development history is not carried over. The
`@openinherit/*` 6.6.0 packages have been available on npm under Apache-2.0
since earlier in 2026, and this repository is their canonical source.

## Licence

Apache License 2.0 — see `LICENSE`.
