// SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
// SPDX-License-Identifier: Apache-2.0
// FROZEN LEAKY MUTANT (Scotland). disjoint(this, sct.forbidden.cedar) MUST be
// "DOES NOT HOLD"; if it ever VERIFIES, the Scotland analysis does not bite.
// The leak: a tax adviser preparing confirmation papers — oracle Region 1, and
// no forbid in this file neutralises it.
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "solicitor" &&
  resource.serviceType == "will_drafting" &&
  resource.jurisdiction == "GB-SCT"
};
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "tax_adviser" &&
  resource.serviceType == "reserved_confirmation_activities" &&
  resource.jurisdiction == "GB-SCT"
};
