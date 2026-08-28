---
title: Contributing to INHERIT
---

# Contributing to INHERIT

Thank you for your interest in contributing to the INHERIT open estate data standard. This document explains how to get involved.

## How to Report a Bug

Use the [bug report template](.github/ISSUE_TEMPLATE/bug-report.yml). Include:
- Which schema is affected
- What you expected vs. what happened
- Steps to reproduce
- Your INHERIT version

## How to Propose a Schema Change

1. **File an issue** using the [schema change request template](.github/ISSUE_TEMPLATE/schema-change-request.yml)
2. **Discuss** in the issue — gather feedback, assess backwards compatibility
3. **Write a proposal** in `docs/proposals/` (required for candidate/stable schemas)
4. **Submit a PR** with the change, tests, and updated CHANGELOG

## How to Author a New Extension

1. Read the [Extension Guide](docs/implement/extension-guide.md)
2. Create a subdirectory in `v3/extensions/` with your extension schema and `extension.json` manifest
3. Add test cases in `tests/v3/`
4. Update `extensions-registry.json`
5. Submit a PR

Community extensions can also live in their own repository — see the extension guide for details.

## Documentation Structure

Documentation lives in `docs/` and is organised by lifecycle:

| Directory | Purpose | Maintenance expectation |
|-----------|---------|------------------------|
| `docs/implement/` | How-to guides for implementers (primer, AI guide, extension guide, etc.) | **Must stay current.** Audited against the schemas on every release. |
| `docs/releases/` | Derived from the schemas (enum lists, canonical ordering, role definitions). | **Regenerated on release.** Ideally automated. |
| `docs/policies/` | Governance, conformance, versioning, data protection. | **Reviewed periodically.** Changes are deliberate and rare. |
| `docs/proposals/` | Forward-looking ideas — features, integrations, research. Not yet part of the standard. | **No maintenance expectation.** Proposals are correct at the time of writing. |
| `docs/_archive_/` | Historical documents that were correct at a point in time (e.g. migration guides for old versions). | **Never updated.** Kept for reference only. |

**Rules:**

- If you add a new guide, put it in `docs/implement/` — this signals that it must be kept current.
- If you write a proposal or research document, put it in `docs/proposals/` — this signals that it describes future thinking, not the current standard.
- Reference documents in `docs/releases/` should be generated from the schemas where possible, not hand-written.
- When a guide becomes obsolete (e.g. a migration guide for a version that's no longer supported), move it to `docs/_archive_/`.

## Pull Request Requirements

All PRs must:

- [ ] Pass all CI checks (schema validation, OpenAPI lint, test suite)
- [ ] Include language-agnostic test cases for new or changed schemas
- [ ] Update `CHANGELOG.md`
- [ ] Maintain backwards compatibility for `candidate` and `stable` schemas
- [ ] For extensions: update `extension.json` manifest with new version and `lastVerified` date

## Nature of Contributions

All contributions to INHERIT are voluntary. Contributing does not create an employment, contractor, or agency relationship with Testate Technologies Ltd or any other party. Contributors are not entitled to compensation unless a separate written agreement exists.

---

## How Releases Work

INHERIT uses automated guardrails to keep derived files in sync with the source schemas.

### Pre-commit hook

When you commit changes to files in `v3/`, a Husky pre-commit hook automatically:

1. Syncs `v3/` to `packages/schema/v3/` (the npm package content)
2. Copies `extensions-registry.json` to `packages/schema/` if it changed
3. Regenerates `dist/inherit-v3-bundled.json`
4. Stages all resulting changes

You don't need to remember these steps — they happen automatically. If you're curious about what the hook does, see `.husky/pre-commit`.

The hook only runs when `v3/` files are staged. Non-schema commits (documentation, website, etc.) are unaffected.

### CI staleness check

A CI workflow verifies that derived files are in sync on every push to `main` and on every pull request. If anything is stale, the build fails with a message telling you exactly which command to run.

### Release process

Version releases use `scripts/release.sh`, which handles version bumping, changelog updates, tagging, and GitHub Release creation. The git tag triggers CI to publish `@openinherit/schema` and `@openinherit/sdk` to npm, and to rebuild www.openinherit.org.

```bash
./scripts/release.sh 6.1.0
```

See the script header for usage details and resume mode.

---

## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold this code. Report unacceptable behaviour to hello@openinherit.org.

## Questions?

Open a discussion or email hello@openinherit.org.
