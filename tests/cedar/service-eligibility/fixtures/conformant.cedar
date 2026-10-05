// SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
// SPDX-License-Identifier: Apache-2.0
// Service-eligibility unit-test fixture — conformant policy (disjoint from forbidden.cedar).
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "solicitor" &&
  resource.serviceType == "will_drafting" &&
  resource.jurisdiction == "E&W"
};
