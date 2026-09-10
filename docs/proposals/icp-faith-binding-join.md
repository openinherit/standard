---
title: "Promote the faith-bindingness rule from a $comment to a checkable join"
description: "Make (legalSystems value x territory [x personal status]) bindingness checkable instead of prose."
version: "0.1"
status: draft
date: 2026-09-07
lastmod: 2026-09-07
github_issue: https://github.com/openinherit/standard/issues/15
author: "Testate Technologies"
source: "docs/proposals/faith-binding-join.md"
change_class: additive-plus-lint-rule
---

# Proposal: promote the faith-bindingness rule from a `$comment` to a checkable join

**Status:** draft
**Change class:** additive + a new lint rule. No existing document becomes invalid.

## Summary

INHERIT already states, twice, in prose, that a religious legal tradition binds **only where the
territory makes it bind**. It has the `binding` boolean to record the answer. What it does not have
is anything that **checks** the boolean against the territory. This proposal adds the join —
`(legalSystems value × territory)`, with an optional person term — and a lint rule that reads it.

⚠️ **The slot already exists. This proposal adds the join, not the slot.** `binding` is present on
all four succession-regime objects and on `estate.religiousConsideration`. Nothing here creates a
new place to record an answer; it creates a way to be wrong about one visibly.

## Motivation

The rule is currently a comment. `v3/common/jurisdiction.json`, `legalSystems.$comment`:

> *"islamic_law: Islamic Shariah succession rules — **only where legally binding in the
> jurisdiction** (Singapore AMLA, not a Muslim in Manchester). hindu_law: Hindu succession law where
> legally binding (India HSA 1956). jewish_law: Jewish halachic succession law where legally
> binding. canon_law: Canon law where legally binding."*

And again as a field description, `v3/estate.json`, `religiousConsideration.binding`:

> *"Whether this religious consideration is legally binding **in the estate's jurisdiction**"*

Both sentences state a **join** between two things the schema already models separately. Neither can
be evaluated. A document may today assert `religiousConsideration: {tradition: "islamic_law",
binding: true}` on an estate whose jurisdiction is `GB-ENG`, whose own profile does **not** list
`islamic_law` among its `legalSystems` — and the standard has nothing to say about it. That is the
"Muslim in Manchester" case the `$comment` names, and it validates cleanly.

⭐ **A third term is required and the standard already names it.** Territory × tradition is not
always sufficient. In India the answer turns on the **religion of the deceased** — the Hindu
Succession Act 1956 governs some estates and the Muslim Personal Law (Shariat) Application Act 1937
others, in the same territory, at the same time. That is a **person**-level fact that a
(territory × tradition) pair cannot hold. INHERIT's `determinedBy` enum already carries the term:
`personal_status`.

⇒ The rule is `Binding(territory × tradition [× personal_status])`.

## Design

Two additive pieces plus a rule.

**1. Declare, per jurisdiction profile, how each of its legal systems binds.**

```jsonc
// reference-data/jurisdiction-profiles.json — per jurisdiction entry
{
  "legalSystems": ["common_law", "islamic_law"],
  "legalSystemBinding": {                      // NEW — optional, keyed by legalSystems value
    "islamic_law": {
      "binds": "by_personal_status",           // enum: always | by_personal_status | never
      "determinedBy": "personal_status",       // an existing determinedBy value
      "authority": "Administration of Muslim Law Act (AMLA)"
    }
  }
}
```

- `always` — the tradition binds every estate in the territory.
- `by_personal_status` — it binds by a fact about the person; `determinedBy: personal_status`
  carries which. (Singapore under AMLA; India under HSA 1956 / the Shariat Act 1937.)
- `never` — the tradition may be **recorded** but has no legal force here. This is the case that
  makes `binding: true` in England and Wales a detectable error rather than an opinion.

**2. A lint rule over instance documents.** For any object asserting a tradition with
`binding: true`, resolve the estate's (or the asset's) territory and check that the territory's
profile does not declare that tradition `never`. A `binding: true` against a `never` territory is
an **error**. A `binding: true` against `by_personal_status` with no `determinedBy: personal_status`
recorded anywhere on the object is a **warning** — the answer may be right, but nothing says why.

## Backwards compatibility

Wholly additive. `legalSystemBinding` is optional; a profile that omits it produces no findings, so
the rule starts at zero and ratchets as profiles are filled in. No enum gains or loses a value. No
existing instance document becomes invalid — the lint rule is a *new* check, and it is proposed as
a warning-then-error migration rather than an immediate error, so that the reference data can be
completed before the rule is enforced.

## Alternatives considered

- **Leave it as a `$comment`.** Rejected: the standard's own composition guide concludes that *"the
  schema records both positions faithfully; it does not adjudicate between them"* — which is
  correct, and is precisely why the *recording* must be checkable. Refusing to adjudicate is not the
  same as refusing to notice a contradiction.
- **Put bindingness on the tradition extension instead of the jurisdiction profile.** Rejected: a
  tradition has no territory, and it is the territory that decides. Putting the fact on the
  tradition would require every tradition to enumerate every territory.
- **Model it as a boolean per (territory, tradition) pair.** Rejected: a boolean cannot express the
  India case, which is the case that most needs expressing. `by_personal_status` is the third value
  a boolean does not have.
