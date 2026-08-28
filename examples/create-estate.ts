// SPDX-License-Identifier: CC0-1.0

/**
 * create-estate.ts — Build a valid INHERIT v2 English estate from scratch.
 *
 * Demonstrates:
 *   - Constructing a complete INHERIT v2 document with required and optional entity arrays
 *   - Testator, spouse (beneficiary + executor), child (beneficiary)
 *   - Property with freehold tenure and estimated value
 *   - Specific bequest (house) and pecuniary bequest (cash)
 *   - Executor appointment
 *   - Blaze validation against the pre-compiled INHERIT v2 root schema
 *
 * Run:  npx tsx create-estate.ts
 *       pnpm run create
 *
 * All monetary amounts are integer minor units (pence for GBP).
 * All IDs are valid v4 UUIDs.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Blaze } from "@sourcemeta/blaze";

// ---------------------------------------------------------------------------
// 1. Stable UUIDs — makes the example reproducible and cross-referenceable
// ---------------------------------------------------------------------------

const TESTATOR_ID = "a1b2c3d4-1111-4aaa-8000-000000000001";
const SPOUSE_ID = "a1b2c3d4-2222-4aaa-8000-000000000002";
const CHILD_ID = "a1b2c3d4-3333-4aaa-8000-000000000003";
const ESTATE_ID = "a1b2c3d4-4444-4aaa-8000-000000000004";
const PROPERTY_ID = "a1b2c3d4-5555-4aaa-8000-000000000005";
const BEQUEST_HOUSE_ID = "a1b2c3d4-6666-4aaa-8000-000000000006";
const BEQUEST_CASH_ID = "a1b2c3d4-7777-4aaa-8000-000000000007";
const EXECUTOR_ID = "a1b2c3d4-8888-4aaa-8000-000000000008";

// ---------------------------------------------------------------------------
// 2. People — testator, spouse, child
// ---------------------------------------------------------------------------

const testator = {
  id: TESTATOR_ID,
  givenName: "James",
  familyName: "Ashford",
  dateOfBirth: "1965-04-12",
  roles: ["testator"] as const,
  contact: {
    address: {
      streetAddress: "42 Acacia Avenue",
      addressLocality: "Bristol",
      postalCode: "BS1 4AA",
      addressCountry: "GB",
    },
  },
};

const spouse = {
  id: SPOUSE_ID,
  givenName: "Catherine",
  familyName: "Ashford",
  roles: ["beneficiary", "executor"] as const,
  contact: {
    address: {
      streetAddress: "42 Acacia Avenue",
      addressLocality: "Bristol",
      postalCode: "BS1 4AA",
      addressCountry: "GB",
    },
  },
};

const child = {
  id: CHILD_ID,
  givenName: "Oliver",
  familyName: "Ashford",
  roles: ["beneficiary"] as const,
};

// ---------------------------------------------------------------------------
// 3. Property — the family home
// ---------------------------------------------------------------------------

const familyHome = {
  id: PROPERTY_ID,
  name: "42 Acacia Avenue",
  propertyType: "attached",
  tenureType: "ownership",
  ownershipType: "sole",
  isPrimaryResidence: true,
  estimatedValue: {
    amount: 45000000, // GBP 450,000.00 in pence
    currency: "GBP",
  },
  address: {
    streetAddress: "42 Acacia Avenue",
    addressLocality: "Bristol",
    postalCode: "BS1 4AA",
    addressCountry: "GB",
  },
};

// ---------------------------------------------------------------------------
// 4. Bequests — house to Catherine (specific), GBP 10,000 to Oliver (pecuniary)
// ---------------------------------------------------------------------------

const houseBequest = {
  id: BEQUEST_HOUSE_ID,
  bequestType: "specific",
  beneficiaryId: SPOUSE_ID,
  description:
    "My freehold property at 42 Acacia Avenue, Bristol, BS1 4AA, to my wife Catherine Ashford absolutely.",
};

const cashBequest = {
  id: BEQUEST_CASH_ID,
  bequestType: "pecuniary",
  beneficiaryId: CHILD_ID,
  amount: {
    amount: 1000000, // GBP 10,000.00 in pence
    currency: "GBP",
  },
  description: "The sum of ten thousand pounds sterling to my son Oliver Ashford.",
};

// ---------------------------------------------------------------------------
// 5. Executor — Catherine as primary executor
// ---------------------------------------------------------------------------

const executor = {
  id: EXECUTOR_ID,
  personId: SPOUSE_ID,
  role: "primary",
};

// ---------------------------------------------------------------------------
// 6. Estate — ties everything together
// ---------------------------------------------------------------------------

const estate = {
  id: ESTATE_ID,
  testatorPersonId: TESTATOR_ID,
  status: "planning",
  jurisdiction: {
    country: "GB",
    subdivision: "GB-ENG",
    legalSystems: ["common_law"],
    name: "England & Wales",
  },
  createdAt: "2026-03-27T12:00:00Z",
  lastModifiedAt: "2026-03-27T12:00:00Z",
};

// ---------------------------------------------------------------------------
// 7. Root INHERIT v2 document
// ---------------------------------------------------------------------------

const inheritDocument = {
  inherit: "https://openinherit.org/v3/schema.json",
  version: 1,
  schemaVersion: "2.9.0",
  exportedAt: "2026-03-27T12:00:00Z",
  generator: {
    name: "INHERIT Examples",
    version: "1.0.0",
    url: "https://github.com/openinherit/standard",
  },

  // The estate record
  estate,

  // Entity arrays — populated where relevant, empty otherwise
  people: [testator, spouse, child],
  kinships: [],
  relationships: [],
  properties: [familyHome],
  assets: [],
  liabilities: [],
  bequests: [houseBequest, cashBequest],
  trusts: [],
  executors: [executor],
  guardians: [],
  wishes: [],
  documents: [],
  nonprobateTransfers: [],
  proxyAuthorisations: [],
  valuations: [],
  lifetimeTransfers: [],
  dealerInterests: [],
};

// ---------------------------------------------------------------------------
// 8. Validate against INHERIT v2 schema using Blaze (pre-compiled template)
// ---------------------------------------------------------------------------

function main(): void {
  // Load the pre-compiled template (generated by `pnpm run precompile`)
  const templatePath = join(import.meta.dirname!, "compiled", "schema-template.json");
  const template = JSON.parse(readFileSync(templatePath, "utf-8"));
  const evaluator = new Blaze(template);

  const valid = evaluator.validate(inheritDocument);

  if (valid) {
    console.log("Level 1: VALID");
  } else {
    console.log("Level 1: INVALID");
    console.log("\n(Blaze provides pass/fail only. For detailed errors, run:)");
    console.log("jsonschema validate <file> ../v3/schema.json --resolve ../v3/");
  }

  // Print the complete INHERIT JSON document
  console.log("\n--- INHERIT Document ---");
  console.log(JSON.stringify(inheritDocument, null, 2));
}

main();
