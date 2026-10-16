---
github_issue: https://github.com/openinherit/standard/pull/74
---

# Proposal 0005: Who decides — supported, co-decision or substituted — on a proxy authorisation

**Status:** under-review — the pull request that carries this document also carries the schema
change it describes. Merging that pull request is acceptance; closing it is rejection.
**Author:** Testate Technologies
**Date:** 2026-10-16
**Change class:** additive. One optional property and one conditional on `proxy-authorisation.json`.
No existing field changes meaning, and no document valid under 6.7.0 becomes invalid.

## Summary

Add `decisionModel` ∈ {`supported`, `co_decision`, `substituted`} to `ProxyAuthorisation`, so a
document can say whether the owner still makes the decision the proxy acts on, makes it jointly with
the proxy, or no longer can and the proxy decides in their place.

## Motivation

"My father is still sharp; I am organising it for him" and "my father can no longer decide, so I am
deciding for him" are different legal situations. The first is a **supported** decision: the owner
decides and someone else does the work. The second is a **substituted** decision. They carry
different consent, different reversibility and different law — the Mental Capacity Act 2005 requires
all practicable help before anyone is treated as unable to decide (s.1(3)) and best interests only
once they are (s.4); the Assisted Decision-Making (Capacity) Act 2015 in Ireland separates
assistance, co-decision and representation (Parts 3, 4 and 5); and Article 12 of the UN Convention
on the Rights of Persons with Disabilities is, in substance, the move from the second model to the
first. Today a document cannot say which situation it records.

### What 6.7.0 already says about delegation — this is not a missing vocabulary

`proxy-authorisation.json` has 32 properties and a detailed, sourced delegation model:

| Field | What it carries |
|---|---|
| `delegationType` | the proxy's relation to the owner's authority — `on_behalf_of`, `impersonation`, `co_equal`, `supervised` |
| `delegateType` | `person`, `agent`, `organisation` |
| `scope` | what the proxy may do — `full`, `information_gathering`, `communication`, `negotiation`, `decision_making` |
| `delegationConstraints` | transaction limits and co-approval |
| `activationTrigger`, `activationVerificationMethod` | when the authority starts, including `on_incapacity`, and how that was verified |
| `consentRecord`, `revocation`, `subDelegation`, `auditLog` | consent, withdrawal, chains and audit |

None of these says whether the **owner** retains decision-making capacity. Measured on 6.7.0, the
words `supported`, `substituted` and `best interests` occur **0** times in the schema. The nearest
neighbours are `supervised` and `co_equal`, and they answer a different question: they describe the
**proxy's** relation to the owner's authority, not the **owner's** capacity. A capable owner can have
a `supervised` agent; an owner who has lost capacity can have a `co_equal` attorney. So the gap is
one axis, orthogonal to the three that exist.

## Design

```diff
   "allOf": [
+    {
+      "$comment": "An authority that only activates when the owner can no longer decide is exercised in the owner's place, so it cannot be supported or co_decision.",
+      "if": { "required": [ "activationTrigger" ], "properties": { "activationTrigger": { "const": "on_incapacity" } } },
+      "then": { "properties": { "decisionModel": { "const": "substituted" } } }
+    },
     …
   ],
   "properties": {
     …
     "delegationType": { … },
+    "decisionModel": {
+      "description": "Who makes the decision this authorisation is exercised for: the owner with help (supported), the owner and the proxy jointly (co_decision), or the proxy in place of an owner who cannot decide (substituted). Absent means not recorded",
+      "$comment": "… statutory sources per value …",
+      "enum": [ "supported", "co_decision", "substituted" ]
+    },
     "delegationConstraints": { … },
```

| Value | The owner… | Source |
|---|---|---|
| `supported` | has capacity for the decision and makes it; the proxy helps | MCA 2005 s.1(3); UNCRPD Art 12(3); ADMCA 2015 Part 3 (decision-making assistant) |
| `co_decision` | makes the decision jointly with the proxy | ADMCA 2015 Part 4 (co-decision-maker) |
| `substituted` | lacks capacity for the decision; the proxy decides in their best interests, or under the jurisdiction's equivalent principle | MCA 2005 s.4; Adults with Incapacity (Scotland) Act 2000 s.1; Mental Capacity Act (Northern Ireland) 2016 s.7; ADMCA 2015 Part 5 |

Three choices are deliberate:

1. **`co_decision` is a value of its own.** It is not a softer `supported` or a shared
   `substituted`: in Irish law the decision is valid only if both make it. Without it an Irish
   co-decision-making agreement would have to be recorded as one of the other two, wrongly.
2. **There is no `unspecified` value.** Absence already means "not recorded", which is what every
   6.x document written before this property says. A literal for the same state would give it two
   encodings, which a later change making the field required would have to reconcile.
3. **One coherence rule.** An authorisation whose `activationTrigger` is `on_incapacity` only takes
   effect once the owner cannot decide, so if it records a `decisionModel` that value must be
   `substituted`. The rule does not require the property; it only refuses a contradiction.

Capacity is decision-specific and can change. The property records the model under which this
authorisation is currently exercised; a change of model is recorded as a change to the
authorisation, with its existing `revocation` and `provenance` machinery.

## How each part is proved

| Claim | Command | What makes it go red |
|---|---|---|
| Every value is expressible | `pnpm test` — cases in `tests/v3/proxy-authorisation/proxy-authorisation.test.json` (supported, co_decision, substituted: valid) | removing the property (`unevaluatedProperties: false` rejects it) or any one value |
| The axis is independent of `delegationType` | same — a `supported` owner with a `supervised` agent, a `substituted` attorney acting `co_equal`: valid | coupling the two |
| Absence stays valid | same — `on_incapacity` with no `decisionModel`: valid | making the property required |
| The coherence rule holds | same — `on_incapacity` with `supported` or `co_decision`: invalid | deleting the `allOf` branch |
| The runtime validators agree | `node scripts/test-runtime-validators.mjs` (Zod) and the Python SDK corpus tests | a generated validator that drops the branch |
| Generated copies are current | the Staleness Check, OpenAPI Drift, Runtime Validators and Adopter docs workflows | editing one copy only |

## Backwards Compatibility

Additive. Every document valid under 6.7.0 stays valid: the property is optional, and the
conditional applies only when the document supplies a `decisionModel`. The only documents whose
validity changes are ones that **failed** before — a proxy authorisation carrying `decisionModel` —
which now pass if the value is coherent.

**Not required in 6.x.** Requiring it would invalidate existing documents, which is a major change.
An authorisation with no recorded decision model is the state most likely to cause harm, so a future
major version may make it required; that proposal would also decide whether to admit an explicit
"not yet assessed" value then.

## Alternatives Considered

- **A new `delegationType` value.** Rejected: `delegationType` already answers a different question
  and its four values all combine with each decision model. Overloading it would make
  "a capable owner with a supervised agent" inexpressible.
- **A new `scope` value.** Rejected for the same reason: `scope` is what the proxy may do, not who
  decides. A substituted attorney may hold only `communication` scope.
- **A capacity-assessment record** (who assessed, when, for which decision). Useful, and compatible
  with this proposal, but larger: it needs its own entity and evidence model. This proposal adds the
  axis that record would populate.
- **Inferring the model from `activationTrigger`.** Rejected: an `immediate` authority can be a capable
  owner asking for help or a lasting power of attorney that is already being used on the owner's
  behalf, so the trigger cannot carry it. The coherence rule uses
  the one case where it can.
