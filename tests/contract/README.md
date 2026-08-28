# Contract Test Suite

These "golden" documents are frozen fixtures that must remain valid across all minor versions of INHERIT. Breaking a golden document is a CI failure that requires a major version bump and mandatory discussion.

## How it works

The `contract-test.sh` script validates each golden document against the current schemas. If any golden document fails validation, the CI build fails.

## Adding golden documents

1. Copy a valid fixture from `examples/fixtures/` into this directory with a `golden-` prefix.
2. The contract test script automatically picks up all `golden-*.json` files.
3. Commit with a message explaining why this document shape must be preserved.

## When a golden document breaks

If a schema change breaks a golden document, you must:

1. Confirm the change is intentional (not a regression)
2. Bump the major version (this is a breaking change)
3. Update the golden document to match the new schema
4. Document the breaking change in CHANGELOG.md
