// SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
// SPDX-License-Identifier: Apache-2.0
// FROZEN LEAKY MUTANT (Northern Ireland). disjoint(this, nir.forbidden.cedar)
// MUST be "DOES NOT HOLD"; if it ever VERIFIES, the NI analysis does not bite.
// The leak: a tax adviser preparing probate papers — oracle Region 1.
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "solicitor" &&
  resource.serviceType == "will_drafting" &&
  resource.jurisdiction == "GB-NIR"
};
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "tax_adviser" &&
  resource.serviceType == "reserved_probate_activities" &&
  resource.jurisdiction == "GB-NIR"
};
