// SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
// SPDX-License-Identifier: Apache-2.0
// Service-eligibility unit-test fixture — forbidden-region oracle (Q).
@jurisdiction("GB-ENG")
permit (
  principal,
  action == Action::"OfferService",
  resource
) when {
  principal.category == "unregulated_will_writer" &&
  resource.serviceType == "reserved_probate" &&
  resource.jurisdiction == "E&W"
};
