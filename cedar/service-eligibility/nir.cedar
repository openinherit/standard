// SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
// SPDX-License-Identifier: Apache-2.0
// Northern Ireland service-eligibility pack (extends the service-eligibility
// seed; same shape as ew.cedar). CONSERVATIVE encoding: P permits ONLY the
// counsel-safe minimum; everything else is default-deny. Encoding is
// ai-drafted — every [MUST confirm] below is pending Northern Ireland solicitor
// sign-off before a consumer app activates this jurisdiction.
// jurisdiction value = "GB-NIR" (ISO 3166-2).
// Capability modes, assumed the same as E&W pending confirmation [MUST confirm]:
// quote_estimation = professional-authored-only  => quoteMode ceiling
//   {professional-authored, typical-range}; platform-computed UNREACHABLE.
// proximity_matching = user-sort-ok              => proximityMode ceiling
//   {user-sort, filter}; opaque-routing UNREACHABLE.
// Every permit MUST carry both capability guards — the analysis
// (disjoint vs tests/cedar/service-eligibility/nir.forbidden.cedar) goes RED on
// any permit that omits them.
//
// THE RESERVED LINE — Solicitors (Northern Ireland) Order 1976 art.23: an
// unqualified person (not qualified to act as a solicitor) commits an offence
// if, in expectation of fee, gain or reward, they draw or prepare an
// instrument relating to real or personal estate, or papers on which to found
// or oppose a grant of probate or of letters of administration. A will or
// other testamentary instrument is excepted, so will drafting is unreserved
// (as in E&W). [MUST confirm: paragraph lettering and exceptions of art.23.]
//   reserved_probate_activities    = the probate / administration papers (the
//     same activity E&W's value names, under NI's own statute).
//   reserved_instrument_activities = instruments relating to real or personal
//     estate.
// NI will formalities sit in the Wills and Administration Proceedings (NI)
// Order 1994 (writing, signature, two witnesses present together; a gift to a
// witness or a witness's spouse fails) and belong in the NI will-requirements
// profile, not here.

// PERMIT: a solicitor may offer the four NI estate service categories.
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "solicitor" &&
  ["will_drafting","estate_administration","reserved_probate_activities","trust_administration"].contains(resource.serviceType) &&
  resource.jurisdiction == "GB-NIR" &&
  (if resource has quoteMode then ["professional-authored","typical-range"].contains(resource.quoteMode) else true) &&
  (if resource has proximityMode then ["user-sort","filter"].contains(resource.proximityMode) else true)
};

// PERMIT: a vetted tax adviser may offer IHT advice. Inheritance Tax is a
// UK-wide tax (IHTA 1984); tax advice is unregulated in NI as in E&W.
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "tax_adviser" &&
  resource.serviceType == "iht_advice" &&
  resource.jurisdiction == "GB-NIR" &&
  (if resource has quoteMode then ["professional-authored","typical-range"].contains(resource.quoteMode) else true) &&
  (if resource has proximityMode then ["user-sort","filter"].contains(resource.proximityMode) else true)
};

// FORBID (defensive documentation of the statutory ceiling): an unregulated
// will writer may not prepare probate papers or estate instruments for reward
// (art.23). Default-deny already covers this; the forbid documents the line.
forbid (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "unregulated_will_writer" &&
  ["reserved_probate_activities","reserved_instrument_activities"].contains(resource.serviceType) &&
  resource.jurisdiction == "GB-NIR"
};

// Deliberately NOT encoded here:
// - Fee-sharing and referral rules under the Law Society of Northern Ireland's
//   practice regulations [MUST confirm] — not yet determined, so neither
//   permitted nor forbidden beyond default-deny.
// - Barristers and any person excepted by art.23 [MUST confirm]: default-deny
//   until confirmed.
