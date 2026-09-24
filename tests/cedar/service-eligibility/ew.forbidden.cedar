// SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
// SPDX-License-Identifier: Apache-2.0
// FORBIDDEN-REGION ORACLE (TT-626 seed; TT-624 full E&W deny-set) — the
// frozen definition of "disallowed in E&W".
// disjoint(standard's ew.cedar, this) VERIFIED <=> no disallowed service
// reachable. Lives in the TEST-SUITE so a standard PR cannot weaken
// "disallowed" to pass.
//
// Region 1 — reserved legal activities (LSA 2007 s.12(1)(a)-(f) + Sch 2)
// offered by anyone OUTSIDE the authorised-category whitelist. Whitelist =
// categories with an LSA-approved regulator for reserved activities
// (solicitor/barrister/CILEX/licensed conveyancer/notary); the standard's P
// may still permit FEWER than these (conservative), never more.
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  resource.jurisdiction == "E&W" &&
  ["rights_of_audience","conduct_of_litigation","reserved_instrument_activities","reserved_probate_activities","notarial_activities","administration_of_oaths"].contains(resource.serviceType) &&
  !(["solicitor","barrister","chartered_legal_executive","licensed_conveyancer","notary"].contains(principal.category))
};

// Region 2 — platform-computed quote display (quote_estimation posture is
// professional-authored-only in E&W; Avvo 5.4(c) "who sets the price").
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  resource.jurisdiction == "E&W" &&
  resource has quoteMode &&
  resource.quoteMode == "platform-computed"
};

// Region 3 — opaque proximity routing (proximity_matching posture is
// user-sort-ok in E&W; sort/filter only, never an opaque match/route — L19/L10).
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  resource.jurisdiction == "E&W" &&
  resource has proximityMode &&
  resource.proximityMode == "opaque-routing"
};
