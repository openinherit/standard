---
title: "The Maturity Matrix"
version: "1.0"
status: draft
date: 2026-10-20T12:00
lastmod: 2026-10-20T12:00
author: "Josh"
source: "docs/policies/maturity-matrix.md"
supersedes: null
---

## What it is

[`maturity-matrix.json`](../../maturity-matrix.json) is the public statement of how settled each
part of INHERIT is. It lists every schema in [`v3/index.json`](../../v3/index.json) and every
extension in [`extensions-registry.json`](../../extensions-registry.json), with a maturity level for
each. It is published openly, in the way W3C, IETF and CNCF publish the maturity of their
specifications, so that an implementer can see what is stable before building on it.

The matrix invents nothing. `scripts/generate-maturity-matrix.mjs` generates it from the maturity
the standard already declares, and CI (`staleness-check.yml`) fails when it no longer matches.
Never edit it by hand.

## Sources

Maturity is declared in three places. The matrix reads all three:

| Source | Applies to | Defined in |
|---|---|---|
| the `maturity` keyword on a schema | every schema | [Estate vocabulary §3](../../v3/vocab/estate/spec.md) |
| `maturity` on an extension manifest, `v3/extensions/<name>/extension.json` | extensions | [Extension guide](../implement/extension-guide.md) |
| `maturity` and `legalReviewStatus` in `extensions-registry.json` | extensions | [Maturity signalling](maturity-signalling.md) |

The levels are the ones [GOVERNANCE.md](../../GOVERNANCE.md) defines: `draft`, `candidate`,
`stable`, plus `deprecated`. Any other value is refused and the matrix is not written.

## How a level is resolved

- **The least mature declaration wins.** When the registry and manifest say `stable` and the
  extension's schema says `draft`, the row is `draft`. A deprecated declaration from any source
  makes the row `deprecated`.
- **No declaration means `undeclared`.** The vocabulary says that omitting `maturity` *"implies
  no commitment to stability"*, so treat `undeclared` as no more settled than `draft`.
- **Disagreement is published, not hidden.** Each extension row carries all three declarations
  and `consistent: false` when they differ or one is missing. The summary counts such rows.
- **The matrix never raises a level.** Promotion follows the rules in GOVERNANCE.md and happens in
  the sources. The matrix only reports it.

## Two signals, side by side

Schema maturity tells a developer how likely a structure is to change. `legalReviewStatus` tells a
legal professional whether the content has been independently reviewed. These are independent, and
the matrix shows both. A `stable` extension can still be `self_verified` (see
[Maturity signalling](maturity-signalling.md)).

## Status, not timing

The matrix reports where each part stands **today**. It carries no dates, target releases or
sequencing, and the generator copies a fixed set of keys only, so a timing field added to a source
cannot reach it. Plans for future work are discussed in `proposals/`, not here.

## Known gaps, stated plainly

On the day this policy was written:

- no schema outside `v3/extensions/` declared `maturity`, so every core row reads `undeclared`;
- most extensions' own schema files declare a lower level than their registry entry and manifest,
  or none at all;
- the `maturity` enum in [`v3/vocab/estate/meta.json`](../../v3/vocab/estate/meta.json) lists
  `draft`, `stable` and `deprecated`, but not `candidate`, which GOVERNANCE.md defines and
  extensions use.

Closing these gaps is a maintainer decision. It means assigning a level to each schema and making
the sources agree, and the matrix will show each step as it lands. Read the live numbers from the
`summary` block of `maturity-matrix.json`. Do not take them from this page.

## Where it is shown

The matrix is rendered at [openinherit.org/maturity](https://www.openinherit.org/maturity/). The
site holds a copy of this file and fails its checks when the copy differs from the one here.
