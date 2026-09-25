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
3. **Write a proposal** describing the change (required for candidate/stable schemas)
4. **Submit a PR** with the change, tests, and updated CHANGELOG

## How to Author a New Extension

1. Read the [Extension Guide](docs/implement/extension-guide.md)
2. Create a subdirectory in `v3/extensions/` with your extension schema and `extension.json` manifest
3. Add test cases in `tests/v3/`
4. Update `extensions-registry.json`
5. Submit a PR

Community extensions can also live in their own repository — see the extension guide for details.

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

### Pre-commit hooks

The repository ships tracked hooks in `.husky/pre-commit`. They run three
things, in order:

1. **Secret and build-artefact guard** (`.githooks/pre-commit`) — refuses
   staged build output, editor config and hardcoded credentials.
2. **Publication content check** (`scripts/check-publication-redline.py
   --staged`) — this repository is public, so it refuses internal-only files
   by path and flags local-machine paths in file contents.
3. **`v3/` schema sync** — when anything under `v3/` is staged, derived files
   are regenerated and staged with it.

**Enable them once, per clone:**

```bash
npm install            # `prepare` wires the hooks for you
# or, without node:
bash scripts/setup-hooks.sh
```

Check at any time with `bash scripts/setup-hooks.sh --check`.

> **Why you have to enable them.** `core.hooksPath` is *local* git config. Git
> does not let a repository configure hooks for a clone it has never seen, so no
> project can make this automatic for you. If the step is skipped, the hooks are
> silent — they do not warn, they simply never run.
>
> **That is why CI, not the hook, is the guarantee.** A local hook is also
> `--no-verify`-able. `.github/workflows/redline.yml` runs the same publication
> check on every push and pull request and cannot be bypassed. The hook exists
> to tell you in one second what CI would tell you in two minutes.

### CI staleness check

A CI workflow verifies that derived files are in sync on every push to `main` and on every pull request. If anything is stale, the build fails with a message telling you exactly which command to run.

### Release process

Version releases use `scripts/release.sh`, which handles version bumping, changelog updates, tagging, and GitHub Release creation. The git tag triggers `.github/workflows/publish.yml`, which publishes all three packages — `@openinherit/schema`, `@openinherit/sdk` and `@openinherit/conformance` — to npm with provenance attestations, and then asks the website to rebuild.

Publishing needs an `NPM_TOKEN` repository secret with publish rights on the `@openinherit` scope; the workflow refuses to start without it rather than failing part-way through. `WWW_DISPATCH_TOKEN` is optional — without it the website notification is skipped, not failed.

`pnpm run check:release-wiring` asserts that this paragraph is still true: that a tag-triggered publishing workflow exists, that every publishable package is wired into it, and that each package still meets npm provenance's preconditions. It runs in CI on every push, so the promise and the machinery cannot drift apart again.

```bash
./scripts/release.sh 6.1.0
```

See the script header for usage details and resume mode.

---

## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold this code. Report unacceptable behaviour to hello@openinherit.org.

## Questions?

Open a discussion or email hello@openinherit.org.
