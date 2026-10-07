// SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
// SPDX-License-Identifier: Apache-2.0
// Scotland service-eligibility pack (extends the service-eligibility seed; same
// shape as ew.cedar). CONSERVATIVE encoding: P permits ONLY the counsel-safe
// minimum; everything else is default-deny. Encoding is ai-drafted — every
// [MUST confirm] below is pending Scottish solicitor sign-off before a consumer
// app activates this jurisdiction.
// jurisdiction value = "GB-SCT" (ISO 3166-2, the reference-data/
// jurisdiction-profiles.json key).
// Capability modes, assumed the same as E&W pending confirmation [MUST confirm]:
// quote_estimation = professional-authored-only  => quoteMode ceiling
//   {professional-authored, typical-range}; platform-computed UNREACHABLE.
// proximity_matching = user-sort-ok              => proximityMode ceiling
//   {user-sort, filter}; opaque-routing UNREACHABLE.
// Every permit MUST carry both capability guards — the analysis
// (disjoint vs tests/cedar/service-eligibility/sct.forbidden.cedar) goes RED on
// any permit that omits them.
//
// THE RESERVED LINE — Solicitors (Scotland) Act 1980 s.32(1): an unqualified
// person (s.65(1): not qualified to practise as a solicitor) commits an offence
// if, for fee, gain or reward, they draw or prepare (a) a writ relating to
// heritable or moveable estate, (b) a writ relating to court proceedings, or
// (c) papers on which to found or oppose an application for confirmation in
// favour of executors. s.32(2)(a) EXCEPTS a will or other testamentary writing,
// so will drafting is unreserved (as in E&W).
//   reserved_confirmation_activities = s.32(1)(c) (the Scottish counterpart of
//     E&W's reserved_probate_activities; a different statute, so a different
//     service-type value rather than a shared one).
//   reserved_instrument_activities   = s.32(1)(a) writs relating to estate.

// PERMIT: a solicitor may offer the four Scottish estate service categories.
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "solicitor" &&
  ["will_drafting","estate_administration","reserved_confirmation_activities","trust_administration"].contains(resource.serviceType) &&
  resource.jurisdiction == "GB-SCT" &&
  (if resource has quoteMode then ["professional-authored","typical-range"].contains(resource.quoteMode) else true) &&
  (if resource has proximityMode then ["user-sort","filter"].contains(resource.proximityMode) else true)
};

// PERMIT: a vetted tax adviser may offer IHT advice. Inheritance Tax is a
// UK-wide tax (IHTA 1984) and tax advice is unregulated in Scotland as in E&W;
// vetting is a data-plane requirement on the app, not a prohibition here.
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "tax_adviser" &&
  resource.serviceType == "iht_advice" &&
  resource.jurisdiction == "GB-SCT" &&
  (if resource has quoteMode then ["professional-authored","typical-range"].contains(resource.quoteMode) else true) &&
  (if resource has proximityMode then ["user-sort","filter"].contains(resource.proximityMode) else true)
};

// FORBID (defensive documentation of the statutory ceiling): an unregulated
// will writer may not prepare confirmation papers or estate writs for reward —
// s.32(1)(a) and (c). Default-deny already covers this; the forbid documents
// the deny-line.
forbid (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "unregulated_will_writer" &&
  ["reserved_confirmation_activities","reserved_instrument_activities"].contains(resource.serviceType) &&
  resource.jurisdiction == "GB-SCT"
};

// Deliberately NOT encoded here:
// - Prior rights (Succession (Scotland) Act 1964 ss.8-9: dwelling-house,
//   furniture and plenishings, financial provision; intestacy only) and legal
//   rights (s.10ff, computed under s.11: jus relicti/relictae and legitim, one
//   third or one half of the net moveable estate, binding even against a will)
//   are facts about the ESTATE, not about who may offer a service. They belong
//   in the Scotland will-requirements profile and in the succession overlay
//   compute, not in an eligibility deny-set.
// - Fee-sharing and referral rules under the Law Society of Scotland Practice
//   Rules [MUST confirm] — not yet determined, so neither permitted nor
//   forbidden beyond default-deny.
// - Advocates and any person excepted by s.32(2) [MUST confirm]: default-deny
//   until confirmed.
