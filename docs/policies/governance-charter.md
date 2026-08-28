---
title: "INHERIT Governance Charter"
version: "2.0"
status: draft
date: 2026-04-01T12:30
lastmod: 2026-04-06T12:00
author: "Richard Davies"
source: "docs/policies/governance-charter.md"
supersedes: null
---

# INHERIT Governance Charter

## Purpose

This charter defines how the INHERIT open standard is governed, who makes decisions, and how governance will evolve as adoption grows. INHERIT is an open estate data interchange standard, published under the Apache 2.0 licence. It is maintained by Testate Technologies Ltd (TT) and intended to become independently governed once adoption thresholds are met.

The charter exists to give institutions, partners, and contributors confidence that:

- Their contributions will remain open and accessible
- Governance will become independent on a defined, measurable timeline
- No single commercial entity will permanently control the standard
- The transition to independence is triggered by adoption, not by an arbitrary date

---

## Principles

1. **Open by default.** All schemas, reference data, and documentation are published under Apache 2.0. This is irrevocable.
2. **Adoption-driven governance.** The transition from stewardship to independence is triggered by real-world adoption, not time.
3. **Jurisdiction diversity.** Governance decisions must reflect the international nature of estate planning. No single jurisdiction dominates.
4. **Separation of standard and product.** INHERIT is not a TT product. TT's commercial applications (MyFamilyInherits, LegacyLists, WillsInFaith, WillScan.ai) are built on INHERIT, but the standard exists independently of them.
5. **Backwards compatibility.** Breaking changes require a major version bump and a 12-month deprecation period. Additive changes are the norm.

---

## Governance Phases

### Phase 1: Stewardship (current)

TT maintains INHERIT and holds decision-making authority. A steering committee advises and contributes, but TT retains a veto on all decisions.

**This phase ends when both transition conditions are met** (see [Transition Threshold](#transition-threshold) below).

During stewardship:

- TT funds all infrastructure (hosting, CI, documentation site)
- TT makes final decisions on schema design, release cadence, and reference data
- The steering committee meets quarterly (or more frequently if needed)
- All steering committee minutes are published on openinherit.org
- Any individual or institution may propose changes via the public GitHub repository
- TT commits to responding to all proposals within 30 days

### Phase 2: Independent Governance

Once the transition threshold is met, governance transfers to an independent body (working name: "INHERIT Standards Body" or "Open Estate Data Foundation" — final name to be determined during transition).

During independent governance:

- TT retains a **permanent seat** on the governing body but **loses the veto**
- The governing body elects its own chair (TT may nominate but not self-appoint)
- All members have equal voting rights
- TT continues to contribute engineering resources but does not control the roadmap
- Funding model transitions to membership fees, grants, or a combination
- The Apache 2.0 licence remains irrevocable — no future governing body can change it

---

## Transition Threshold

Both conditions must be met before governance transitions from Phase 1 to Phase 2:

### Condition 1: Five jurisdiction tech partners

- At least **5 jurisdiction tech partners** have signed agreements with TT
- These partners must span at least **5 different jurisdictions**
- A "jurisdiction tech partner" is a legal or estate planning firm that has formally agreed to underwrite advice or provide legal credibility for INHERIT-powered applications in their jurisdiction

### Condition 2: Three institutional endorsements

- At least **3 institutional endorsements** from at least **3 different jurisdictions**
- Endorsing institutions must be at **Endorser** or **Contributor** tier (see below)
- Qualifying institution types:
  - **Law societies** (e.g. Law Society of England & Wales, Law Society of Singapore, American Bar Association)
  - **STEP** (Society of Trust and Estate Practitioners) — international body, but counts as one jurisdiction based on the endorsing branch
  - **Academic institutions** (university law faculties with succession law, estate planning, or comparative law programmes)
  - **Professional regulatory bodies** (e.g. SRA, Council for Licensed Conveyancers) — as endorsers, not in their regulatory capacity

### Institution Engagement Tiers

| Tier | Definition | Counts towards transition? |
|------|-----------|---------------------------|
| **Observer** | Institution has reviewed INHERIT, received a briefing, and is watching progress. No public commitment. | No |
| **Endorser** | Institution has formally and publicly recommended INHERIT for use by its members or students. This must be a documented, public act — not a verbal agreement. | Yes |
| **Contributor** | Institution actively contributes to the INHERIT specification — jurisdiction extensions, reference data, validation rules, or academic research that directly informs the schema. | Yes |

### Verification

- The steering committee maintains a public register of jurisdiction partners and institutional engagements on openinherit.org
- Each entry records: institution name, jurisdiction, tier, date of engagement, and (for Endorsers/Contributors) a link to the public endorsement or contribution
- TT cannot unilaterally claim an institution has endorsed INHERIT — the institution must confirm in writing

---

## Steering Committee

### Composition (Phase 1 — Stewardship)

| Seat | Held by | Voting rights |
|------|---------|---------------|
| **TT Permanent Seat** | Richard Davies (or TT-appointed delegate) | Vote + veto |
| **Tech Partner Representative** | Rotating among jurisdiction tech partners, elected annually | Vote |
| **Institutional Representative** | From any endorsing or contributing institution, elected annually | Vote |
| **Faith Community Representative** | From any faith community organisation using INHERIT's cultural extensions, elected annually | Vote |
| **Independent Technical Adviser** | Individual with standards body experience (W3C, IETF, ISO, or equivalent), appointed by committee consensus | Vote |

### Composition (Phase 2 — Independent Governance)

| Seat | Held by | Voting rights |
|------|---------|---------------|
| **TT Permanent Seat** | Richard Davies (or TT-appointed delegate) | Vote (no veto) |
| **Tech Partner Representatives (2)** | Elected by tech partners, from different jurisdictions | Vote |
| **Institutional Representatives (2)** | Elected by endorsing/contributing institutions, from different jurisdictions | Vote |
| **Faith Community Representative** | Elected by faith community organisations using INHERIT's cultural extensions | Vote |
| **Independent Technical Adviser** | Appointed by committee consensus | Vote |
| **Chair** | Elected by the governing body. TT may nominate but not self-appoint. | Vote + casting vote on ties |

### Decision-Making

- **Routine decisions** (minor schema additions, reference data updates, documentation changes): simple majority
- **Significant decisions** (new entity schemas, new jurisdiction extensions, changes to governance): two-thirds majority
- **Breaking changes** (removing or restructuring existing schemas): unanimous consent + 12-month deprecation notice
- **Phase 1 veto:** TT may veto any decision during Phase 1. The veto must be exercised in writing within 14 days, with a published rationale. Vetoes are recorded in the public minutes.

### Meetings

- Quarterly minimum, with additional meetings called by any two members
- Minutes published on openinherit.org within 7 days
- Meetings may be held remotely

---

## Contributions

### Who Can Contribute

Anyone — individuals, institutions, companies, government bodies. All contributions are made via the public GitHub repository (github.com/openinherit/standard).

### Contribution Process

1. **Proposal:** Open a GitHub issue describing the change, its rationale, and which jurisdictions it affects
2. **Discussion:** Open for community comment for a minimum of 14 days
3. **Steering committee review:** The committee discusses and votes at the next meeting (or asynchronously if urgent)
4. **Implementation:** Accepted proposals are assigned to a contributor (often TT during Phase 1) and implemented as a pull request
5. **Release:** Changes are batched into minor or major releases per the roadmap

### Intellectual Property

- All contributions to INHERIT are made under Apache 2.0
- Contributors retain copyright of their contributions but grant an irrevocable, worldwide licence under Apache 2.0
- No contributor can later withdraw their contribution or change its licence
- TT does not claim ownership of third-party contributions

---

## Licensing

INHERIT is and will remain licensed under **Apache 2.0**. This means:

- Anyone can use, modify, and distribute INHERIT — including for commercial purposes
- No one can make INHERIT proprietary — the licence is irrevocable
- Derivative works must attribute the original
- The licence does not grant trademark rights (the INHERIT name and logo are TT trademarks during Phase 1, transferring to the independent body in Phase 2)

---

## Amendments to This Charter

- During Phase 1: TT may amend this charter with steering committee consultation (but is not bound by their vote)
- During Phase 2: Amendments require a two-thirds majority of the governing body
- All amendments are versioned and published on openinherit.org
- The transition threshold (Condition 1 and Condition 2) cannot be made harder to achieve during Phase 1 — TT commits to this as a binding constraint

---

## Current Status

The current governance phase, steering-committee composition, jurisdiction
partners, and institutional engagements are maintained in the public register
on openinherit.org.

---

## Contact

- **Standard:** openinherit.org
- **Repository:** github.com/openinherit/standard
- **Steward:** Testate Technologies Ltd (testatetechnologies.com)
- **Enquiries:** Richard Davies — rich@testatetechnologies.com
