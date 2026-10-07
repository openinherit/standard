// SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
// SPDX-License-Identifier: Apache-2.0
// FORBIDDEN-REGION ORACLE — the frozen definition of "disallowed in Scotland".
// disjoint(cedar/service-eligibility/sct.cedar, this) VERIFIED <=> no
// disallowed service reachable.
//
// Region 1 — the Solicitors (Scotland) Act 1980 s.32(1) reserved writs:
// confirmation papers (s.32(1)(c)) and writs relating to heritable or moveable
// estate (s.32(1)(a)), offered by anyone who is not a solicitor (s.65(1)
// "unqualified person"). P may permit FEWER than this, never more.
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  resource.jurisdiction == "GB-SCT" &&
  ["reserved_confirmation_activities","reserved_instrument_activities"].contains(resource.serviceType) &&
  principal.category != "solicitor"
};

// Region 2 — platform-computed quote display (quote_estimation posture
// professional-authored-only, as E&W [MUST confirm]).
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  resource.jurisdiction == "GB-SCT" &&
  resource has quoteMode &&
  resource.quoteMode == "platform-computed"
};

// Region 3 — opaque proximity routing (proximity_matching posture
// user-sort-ok, as E&W [MUST confirm]).
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  resource.jurisdiction == "GB-SCT" &&
  resource has proximityMode &&
  resource.proximityMode == "opaque-routing"
};
