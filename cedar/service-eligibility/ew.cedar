// SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
// SPDX-License-Identifier: Apache-2.0
// England & Wales service-eligibility pack (TT-624; extends the TT-626 seed).
// CONSERVATIVE encoding: P permits ONLY the counsel-safe minimum; everything
// else is default-deny. Encoding is ai-drafted — activation gated by
// fixtures/parameters/legal-assurance-ai-drafted-ew-service-eligibility.yaml
// (counsel-signed-off is the ICP-0015 launch-eligibility floor).
// serviceType strings = linkml/people/people.yaml RegulatedServiceTypeScheme
// values VERBATIM. Capability modes per the locked postures (issue comments):
// quote_estimation = professional-authored-only  => quoteMode ceiling
//   {professional-authored, typical-range}; platform-computed UNREACHABLE.
// proximity_matching = user-sort-ok              => proximityMode ceiling
//   {user-sort, filter}; opaque-routing UNREACHABLE.
// Every permit MUST carry both capability guards — the cedar-analysis gate
// (disjoint vs the test-suite oracle) goes RED on any permit that omits them.

// PERMIT: a solicitor may offer the four E&W estate service categories.
// Solicitors are authorised persons for reserved probate activities:
// LSA 2007 s.18 + Sch 4 (SRA the approved regulator); will_drafting,
// estate_administration, trust_administration are UNRESERVED (Sch 2).
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "solicitor" &&
  ["will_drafting","estate_administration","reserved_probate_activities","trust_administration"].contains(resource.serviceType) &&
  resource.jurisdiction == "E&W" &&
  (if resource has quoteMode then ["professional-authored","typical-range"].contains(resource.quoteMode) else true) &&
  (if resource has proximityMode then ["user-sort","filter"].contains(resource.proximityMode) else true)
};

// PERMIT: a vetted tax adviser may offer IHT advice. Tax advice is
// UNREGULATED in E&W; the vetting floor (HMRC registration from 18 May 2026
// + CIOT/ATT/ICAEW/STEP + PII + AML, posture §5d) is a data-plane
// requirement on the app's vetting flow, not a service prohibition here.
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "tax_adviser" &&
  resource.serviceType == "iht_advice" &&
  resource.jurisdiction == "E&W" &&
  (if resource has quoteMode then ["professional-authored","typical-range"].contains(resource.quoteMode) else true) &&
  (if resource has proximityMode then ["user-sort","filter"].contains(resource.proximityMode) else true)
};

// FORBID (defensive documentation of the statutory ceiling): an unregulated
// will writer may not carry on ANY of the six reserved legal activities —
// LSA 2007 s.12(1)(a)-(f) + Sch 2 (paras 1-8); s.14 makes it an offence.
// Default-deny already covers this; the forbid documents the deny-line.
// NOTE (TT-626 lesson): this forbid means a leak-test permit for
// unregulated_will_writer x reserved_* is NEUTRALISED (forbid wins) — a true
// negative fixture must use a category no forbid covers (e.g. tax_adviser).
forbid (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "unregulated_will_writer" &&
  ["rights_of_audience","conduct_of_litigation","reserved_instrument_activities","reserved_probate_activities","notarial_activities","administration_of_oaths"].contains(resource.serviceType) &&
  resource.jurisdiction == "E&W"
};

// Deliberately NOT encoded for E&W (do not over-restrict — posture §5c):
// - fee-sharing: LAWFUL in E&W with written agreement + disclosure (SRA Code
//   5.1(a)-(c)); the compliance conditions are computed by
//   catala/services/FeeShareDisclosureCheck.catala_en, not forbidden here.
//   (Contrast ROI s.62 Solicitors Act 1954 — TT-625 adds that forbid.)
// - LASPO 2012 ss.56-60 referral-fee ban: personal-injury only (s.56(4); no
//   extension regulations made) — does not reach wills/probate.
// - will_drafting by non-solicitors: UNRESERVED in E&W. P's silence = MFI
//   surfaces only vetted categories; the law does not forbid the activity.
// Categories counsel may later authorise for reserved_probate_activities
// (barrister, chartered_legal_executive, licensed_conveyancer, notary,
// ICAEW-probate-accredited): default-deny until the LegalAssuranceRecord
// reaches counsel-signed-off for them.
