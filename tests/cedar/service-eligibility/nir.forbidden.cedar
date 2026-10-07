// SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
// SPDX-License-Identifier: Apache-2.0
// FORBIDDEN-REGION ORACLE — the frozen definition of "disallowed in Northern
// Ireland". disjoint(cedar/service-eligibility/nir.cedar, this) VERIFIED <=>
// no disallowed service reachable.
//
// Region 1 — the Solicitors (Northern Ireland) Order 1976 art.23 reserved
// papers: probate / letters-of-administration papers and instruments relating
// to real or personal estate, offered by anyone who is not a solicitor.
// P may permit FEWER than this, never more.
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  resource.jurisdiction == "GB-NIR" &&
  ["reserved_probate_activities","reserved_instrument_activities"].contains(resource.serviceType) &&
  principal.category != "solicitor"
};

// Region 2 — platform-computed quote display (as E&W [MUST confirm]).
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  resource.jurisdiction == "GB-NIR" &&
  resource has quoteMode &&
  resource.quoteMode == "platform-computed"
};

// Region 3 — opaque proximity routing (as E&W [MUST confirm]).
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  resource.jurisdiction == "GB-NIR" &&
  resource has proximityMode &&
  resource.proximityMode == "opaque-routing"
};
