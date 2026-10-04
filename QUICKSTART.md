# INHERIT quickstart

Three steps: install, validate a document, run a derivation. You need
Node.js 22 or later and pnpm 10 (`corepack enable` provides it).

Every command on this page is run in CI by `scripts/test-quickstart.mjs`, and
the output shown under each one is what that run must print — so if this page
and the repository disagree, the build goes red.

## 1. Install

Clone the standard and install its tooling:

```bash
git clone https://github.com/openinherit/standard.git
cd standard
```

<!-- quickstart:run -->
```bash
pnpm install --frozen-lockfile
```

That installs, among other things, the pinned JSON Schema validator
(`@sourcemeta/jsonschema`) used in step 2.

Building on INHERIT in your own project? The schemas and the generated
TypeScript client are published to npm:

```bash
npm install @openinherit/schema   # the JSON Schemas, under v3/
npm install @openinherit/sdk      # TypeScript types and a generated API client
```

## 2. Validate a document

An INHERIT document is a single JSON file whose root is
[`v3/schema.json`](v3/schema.json). Validate the smallest valid one:

<!-- quickstart:run -->
```bash
pnpm exec jsonschema validate v3/schema.json examples/fixtures/minimal-estate.json --resolve v3/
```

<!-- quickstart:output -->
```text
1 validated, 1 passed, 0 failed
```

Now one that is wrong on purpose — its estate `id` is not a UUID. The validator
refuses it and says where:

<!-- quickstart:run expect-fail -->
```bash
pnpm exec jsonschema validate v3/schema.json packages/conformance/estate/invalid/bad-uuid.json --resolve v3/
```

<!-- quickstart:output -->
```text
The string value "not-a-uuid" was expected to match the regular expression
at instance location "/estate/id"
1 validated, 0 passed, 1 failed
```

Schema validation cannot see across entities: a bequest may name a beneficiary
that is not in `people` and still be schema-valid. The referential-integrity
check covers that:

<!-- quickstart:run -->
```bash
node scripts/validate-refs.mjs examples/fixtures/minimal-estate.json
```

<!-- quickstart:output -->
```text
All cross-references valid.
```

## 3. Run a derivation

Some figures in INHERIT are derived rather than entered. A property's
`netEquity` is its value less the active charges secured against it, and the
estate's `netEstateEquity` is the sum of those less any unsecured debts. JSON
Schema cannot express arithmetic, so the derivation lives in
[`scripts/validate-net-equity.mjs`](scripts/validate-net-equity.mjs). Run it with
`--show` to see every derived figure:

<!-- quickstart:run -->
```bash
node scripts/validate-net-equity.mjs --show examples/fixtures/spaces-and-liabilities-estate.json
```

<!-- quickstart:output -->
```text
derived  properties[0] cc110000-0000-4000-a000-000000000001: netEquity = 29550000 GBP  (value 50000000 - active charges 20450000, floored at 0)
derived  estate: netEstateEquity = 30700000 GBP  (sum of 3 netted entities minus 1 unsecured liabilities)
Net-equity figures match their derivations.
```

Amounts are integer minor units, so the house is £500,000 with a mortgage that
would cost £204,500 to settle today. The redemption figure (`settlementAmount`),
not the original loan, is what counts, and a discharged charge counts for
nothing.

A document that states a figure its own data does not support is refused:

<!-- quickstart:run expect-fail -->
```bash
node scripts/validate-net-equity.mjs examples/fixtures/net-equity-mismatch.json
```

<!-- quickstart:output -->
```text
NET_EQUITY_MISMATCH
netEquity states 50000000, derivation gives 30000000
```

## Where next

- [Schema reference](docs/reference/README.md) — one page per schema, generated
  from `v3/`.
- [Primer](docs/implement/primer.md) and
  [minimal viable estate](docs/implement/minimal-viable-estate.md) — how the
  entities fit together.
- [Error guide](docs/implement/error-guide.md) — what validation failures mean.
- [Examples](examples/README.md) — fixtures for many jurisdictions, and code in
  TypeScript, Python and Go.
- [Conformance kit](packages/conformance/README.md) — valid and invalid
  documents with expected results, to test your own implementation.
