// SPDX-License-Identifier: CC0-1.0

/**
 * create-catalogue.ts — Build a valid INHERIT v2 catalogue document.
 *
 * Demonstrates:
 *   - Constructing a catalogue-only document (no estate envelope)
 *   - Assets with collectible metadata (brand, model, condition)
 *   - Asset collections with disposal wishes
 *   - Blaze validation against the pre-compiled INHERIT v2 catalogue schema
 *
 * Use case: cataloguing tools (LegacyLists, CherishedItems) that export
 * asset collections without estate planning context.
 *
 * Run:  npx tsx create-catalogue.ts
 *       pnpm run catalogue
 *
 * All monetary amounts are integer minor units (pence for GBP).
 * All IDs are valid v4 UUIDs.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Blaze } from "@sourcemeta/blaze";

// ---------------------------------------------------------------------------
// 1. Stable UUIDs
// ---------------------------------------------------------------------------

const ASSET_1_ID = "a0000001-1111-4000-a000-000000000001";
const ASSET_2_ID = "a0000001-2222-4000-a000-000000000002";
const COLLECTION_ID = "c0000001-1111-4000-a000-000000000001";
const ESTATE_ID = "00000000-0000-4000-8000-000000000000";
const CONTACT_ID = "10000001-1111-4000-a000-000000000001";

// ---------------------------------------------------------------------------
// 2. Build the catalogue
// ---------------------------------------------------------------------------

const catalogue = {
  inherit: "https://openinherit.org/v3/catalogue.json",
  version: 1,
  schemaVersion: "2.9.0",
  exportedAt: new Date().toISOString(),
  generator: {
    name: "INHERIT Catalogue Example",
    version: "1.0.0",
  },

  assets: [
    {
      id: ASSET_1_ID,
      name: "Omega Speedmaster Professional 3570.50",
      category: "jewellery_watches",
      subcategory: "watches",
      description: "Manual-wind chronograph, hesalite crystal, 42mm steel case. Full box and papers.",
      brand: "Omega",
      model: "3570.50",
      condition: "excellent",
      originalPackaging: "complete",
      estimatedValue: { amount: 450000, currency: "GBP" },
      purchaseDate: "2015-09-20",
      searchTerms: ["Omega Speedmaster", "3570.50", "Moonwatch"],
      dataProvenance: "manual_entry",
    },
    {
      id: ASSET_2_ID,
      name: "Rolex Explorer II 16570 Polar",
      category: "jewellery_watches",
      subcategory: "watches",
      description: "White dial, 40mm steel case, cal. 3185 movement. Service papers from 2023.",
      brand: "Rolex",
      model: "16570",
      condition: "good",
      originalPackaging: "box_only",
      estimatedValue: { amount: 720000, currency: "GBP" },
      purchaseDate: "2010-03-15",
      searchTerms: ["Rolex Explorer II", "16570 Polar", "white dial"],
      dataProvenance: "manual_entry",
    },
  ],

  assetCollections: [
    {
      id: COLLECTION_ID,
      estateId: ESTATE_ID,
      name: "Watch Collection",
      description: "Two-piece tool watch collection. Both serviced within last 3 years.",
      category: "watches",
      estimatedValue: { amount: 1170000, currency: "GBP" },
      valuationSource: "self_estimated",
      valuationDate: new Date().toISOString().slice(0, 10),
      disposalWishes: "Offer to James first at fair market value. If he declines, sell via a specialist watch dealer — not general auction.",
      disposalStrategy: "dealer_bids",
    },
  ],

  valuations: [],

  legacyContacts: [
    {
      id: CONTACT_ID,
      name: "James Davies",
      relationship: "son",
      email: "james@example.com",
      notificationMethod: "email",
      accessLevel: "full",
    },
  ],

  dataProvenance: "manual_entry",

  completeness: {
    score: 55,
    maxScore: 100,
    checklist: [
      { category: "assets_and_valuations", item: "Items catalogued", weight: 10, status: "complete" as const },
      { category: "assets_and_valuations", item: "Professional valuations", weight: 8, status: "incomplete" as const },
    ],
  },

  recommendedActions: [
    {
      id: "act-001",
      category: "valuation",
      priority: "high",
      title: "Get dealer valuations",
      description: "Both watches are self-estimated. A specialist dealer valuation would be more accurate for insurance.",
      status: "pending",
      triggeredBy: "Collection valuationSource is self_estimated",
    },
  ],

  conformance: {
    level: "level_1",
    validatedAt: new Date().toISOString(),
    validatedBy: "INHERIT Catalogue Example",
    schemaVersion: "2.9.0",
  },
};

// ---------------------------------------------------------------------------
// 3. Validate against catalogue schema using Blaze (pre-compiled template)
// ---------------------------------------------------------------------------

const templatePath = join(import.meta.dirname!, "compiled", "catalogue-template.json");
const template = JSON.parse(readFileSync(templatePath, "utf-8"));
const evaluator = new Blaze(template);

const valid = evaluator.validate(catalogue);

if (valid) {
  console.log("PASS — Catalogue is valid against catalogue.json");
  console.log(`  ${catalogue.assets.length} assets, ${catalogue.assetCollections.length} collection(s)`);
  console.log(`  Total estimated value: GBP ${(catalogue.assetCollections[0].estimatedValue.amount / 100).toLocaleString()}`);
  console.log(`\n${JSON.stringify(catalogue, null, 2)}`);
} else {
  console.error("FAIL — Validation failed.");
  console.error("(Blaze provides pass/fail only. For detailed errors, run:)");
  console.error("jsonschema validate <file> ../v3/catalogue.json --resolve ../v3/");
  process.exit(1);
}
