// SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
// SPDX-License-Identifier: Apache-2.0
// FROZEN LEAKY MUTANT (TT-626 self-test; TT-624-aligned strings). disjoint
// (this, ew.forbidden.cedar) MUST be "DOES NOT HOLD" every CI run; if it
// ever VERIFIES, the analysis wiring is broken. The leak is a reachable
// ALLOW into oracle Region 1 (tax_adviser is outside the authorised-category
// whitelist and no forbid neutralises it — the TT-626 reachable-ALLOW lesson).
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "solicitor" &&
  resource.serviceType == "will_drafting" &&
  resource.jurisdiction == "E&W"
};
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "tax_adviser" &&
  resource.serviceType == "reserved_probate_activities" &&
  resource.jurisdiction == "E&W"
};
