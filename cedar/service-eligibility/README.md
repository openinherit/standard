<!-- SPDX-FileCopyrightText: 2026 Testate Technologies Ltd -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
<!--
-->

# Cedar service-eligibility (TT-626)

The **service-eligibility** Cedar area: which **professional-category** may **offer** which
**service-type** in which **jurisdiction**. This is a _separate_ Cedar concern from the
disclosure/authz ReBAC substrate in `policies/` (`inherit.cedar` +
`estate.cedarschema`) — which is NOT part of this repository; that one answers _who may **view** what_; this one answers _who may
**offer** what service where_. Different entities, different gate class.

It exists so a consumer app (MyFamilyInherits, InheritWills, IAS) can be **hard-capped** so it
cannot surface a professional service the law forbids in a jurisdiction. The cap is _provable_, not
sampled — see the gate below.

## Files

| File                              | Role                                                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `service-eligibility.cedarschema` | The domain schema: `Professional{category}`, `ServiceRequest{serviceType,jurisdiction,quoteMode?,proximityMode?}`, action `OfferService`.           |
| `ew.cedar`                        | **P** — the England & Wales eligibility policy (the "rule under test"). TT-624 pack: 2 capability-guarded permits + the reserved-activities forbid. |

## The un-fakeable gate (mirrors gov-oracle)

The proof lives in **`code-inherit-test-suite`**, not here — exactly as the gov-oracle gate keeps
the authoritative gov.uk figure test-suite-side so a standard PR cannot edit it to pass:

- **P** (here, `ew.cedar`) — the eligibility policy under test.
- **Q** (test-suite, `tests/cedar/service-eligibility/ew.forbidden.cedar`) — the frozen
  "forbidden-region oracle": a `permit` matching _exactly the disallowed service space_ in E&W.
- **The proof:** `cedar symcc disjoint --policies1 P --policies2 Q` proves, by SMT over the
  **entire** request space, that `∄ request : P allows ∧ Q allows` — i.e. **P never permits a
  service Q marks forbidden**. Not a sample query — a symbolic guarantee.

Because Q lives in the test-suite, a standard PR **cannot weaken the definition of "disallowed"**
to sneak a service through; it can only pass by making P genuinely not reach the forbidden region.
The gate + an every-run "LEAKY mutant must fail" self-test run as the
`cedar-analysis / Cedar service-eligibility analysis (no disallowed service reachable, E&W)`
required check on `main-protection`.

## Toolchain provenance

| Tool                 | Pin                                        | Note                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cedar-policy-cli`   | **4.10.0**, built **`--features analyze`** | Matches the SDK/spike pin + the existing a21 Cedar gates. The analyze feature bundles `symcc`; without it `cedar symcc` refuses to run. Install: `cargo install cedar-policy-cli --version 4.10.0 --features analyze --force`. |
| `cedar-policy-symcc` | **0.4.0**                                  | Pulled by the `analyze` feature (richard-task #219).                                                                                                                                                                           |
| CVC5 (SMT backend)   | **1.2.1**                                  | CI downloads the pinned static Linux binary; passed to symcc via `CVC5=`/`--cvc5-path`.                                                                                                                                        |

## Seam for TT-624 (E&W) / TT-625 (ROI) — adding a jurisdiction is data, not code

1. **Standard (here):** add `cedar/service-eligibility/<jur>.cedar` (P — the `permit`/`forbid`
   set), drawing service-types from the `RegulatedServiceTypeScheme` SKOS vocabulary those issues
   own.
2. **Test-suite:** add `tests/cedar/service-eligibility/<jur>.forbidden.cedar` (Q — the deny-set
   oracle) + a `checks[]` row in `tests/cedar/service-eligibility/manifest.yaml`. The harness picks
   it up with **no code change**.
3. **Capability flags** attach as OPTIONAL `ServiceRequest` attributes on this schema
   (`quoteMode?`/`proximityMode?` — the TT-626 `Bool` sketch was superseded by TT-624's locked
   posture enums). The per-jurisdiction POSTURE (e.g. `professional-authored-only`,
   `user-sort-ok`) lives in `linkml/parameters/parameters.yaml`
   (`QuoteEstimationPostureScheme` / `ProximityMatchingPostureScheme`) + a
   `JurisdictionServiceCapabilityPostures` fixture; the Cedar policy enforces the posture's
   allowed MODE set in every permit. Fee-sharing is modelled as a `forbid` clause where the law
   forbids it (e.g. ROI s.62 Solicitors Act 1954 — TT-625); E&W deliberately carries no
   fee-share forbid (lawful with agreement + disclosure, SRA 5.1) — the conditions are computed
   by `catala/services/FeeShareDisclosureCheck.catala_en`.
4. **Counsel-sign-off gate:** each pack encodes law conservatively; TT-624/625 document a
   counsel-confirmation step before a jurisdiction's flags are _activated_ in a shipping app.

## E&W pack (TT-624) — postures + counsel gate

| Jurisdiction | quote_estimation                                                            | proximity_matching                         | Permitted (P)                                                                                                                     | Deny-line (Q, test-suite)                                                                         | Assurance                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| E&W          | `professional-authored-only` → modes {professional-authored, typical-range} | `user-sort-ok` → modes {user-sort, filter} | solicitor × {will_drafting, estate_administration, reserved_probate_activities, trust_administration}; tax_adviser × {iht_advice} | six reserved activities × non-authorised categories; `platform-computed` quotes; `opaque-routing` | `ai-drafted` — activation requires counsel sign-off (`fixtures/parameters/legal-assurance-ai-drafted-ew-service-eligibility.yaml`, ICP-0015 floor) |

- `serviceType` strings = `RegulatedServiceTypeScheme` values verbatim (`linkml/people/people.yaml`).
- App-readable postures: `fixtures/parameters/service-capability-postures-ew.yaml` (locked enums,
  schema-closed). Drift check: `scripts/slice1/test_posture_cedar_consistency.py`.
- **Guard form (symcc strict mode):** optional-attribute guards MUST be
  `(if resource has X then [...].contains(resource.X) else true)`; the
  `!(resource has X) || ...` form fails as `UnsafeOptionalAttributeAccess` — and symcc exits 0
  on that failure, so only the harness's fail-closed stdout parsing catches it.
- **Every permit must carry both capability guards** — the analysis gate goes RED on any permit
  that omits one (proven 2026-07-18: guard-omitted permit → `DOES NOT HOLD` with a
  `platform-computed` counterexample).

## References

- The design and implementation records for this pack are internal to Testate
  Technologies and are not published with the standard.
- Launch packs: TT-624 (E&W) · TT-625 (ROI) · foundation: TT-626.
