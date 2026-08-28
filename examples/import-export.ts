// SPDX-License-Identifier: CC0-1.0

/**
 * import-export.ts — Load, modify, and re-export an INHERIT document.
 *
 * Demonstrates:
 *   - Loading an INHERIT v1 JSON file from disc
 *   - Parsing and inspecting entity counts
 *   - Adding a new person (solicitor as attorney) with contact details
 *   - Updating the estate's lastModifiedAt timestamp
 *   - Exporting the modified document as output.json
 *   - Round-trip fidelity: the exported file is valid INHERIT JSON
 *
 * Run:  npx tsx import-export.ts [path-to-inherit-json]
 *       pnpm run import-export [-- path-to-inherit-json]
 *
 * Default input: fixtures/english-family-estate.json
 *
 * All monetary amounts are integer minor units (pence for GBP).
 * All IDs are valid v4 UUIDs.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types — minimal shapes for the entity arrays we inspect and modify
// ---------------------------------------------------------------------------

/** A person in the INHERIT document. */
interface Person {
  id: string;
  givenName: string;
  familyName?: string;
  roles: string[];
  contact?: {
    email?: string;
    phone?: string;
    address?: {
      streetAddress?: string;
      addressLocality?: string;
      postalCode?: string;
      addressCountry?: string;
    };
  };
  [key: string]: unknown;
}

/** Minimal estate shape — we only need to update lastModifiedAt. */
interface Estate {
  lastModifiedAt?: string;
  [key: string]: unknown;
}

/** Root INHERIT document with all 15 required entity arrays. */
interface InheritDocument {
  inherit: string;
  version: number;
  exportedAt?: string;
  generator?: { name: string; version?: string; url?: string };
  estate: Estate;
  people: Person[];
  kinships: unknown[];
  relationships: unknown[];
  properties: unknown[];
  assets: unknown[];
  liabilities: unknown[];
  bequests: unknown[];
  trusts: unknown[];
  executors: unknown[];
  guardians: unknown[];
  wishes: unknown[];
  documents: unknown[];
  nonprobateTransfers: unknown[];
  proxyAuthorisations: unknown[];
  dealerInterests: unknown[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// CLI argument handling — accept optional file path, default to fixture
// ---------------------------------------------------------------------------

const defaultFixture = join(import.meta.dirname!, "fixtures", "english-family-estate.json");
const inputPath = resolve(process.argv[2] ?? defaultFixture);

// ---------------------------------------------------------------------------
// 1. Load the INHERIT document
// ---------------------------------------------------------------------------

let rawJson: string;
try {
  rawJson = readFileSync(inputPath, "utf-8");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);

  // If using the default fixture path and it doesn't exist, give a helpful hint
  if (!process.argv[2]) {
    console.error("ERROR: Default fixture not found.");
    console.error(`  Expected: ${inputPath}`);
    console.error("");
    console.error("The fixture files are created by Task 4. You can either:");
    console.error("  1. Run after fixtures are created");
    console.error("  2. Pass a path to any INHERIT JSON file:");
    console.error("     npx tsx import-export.ts path/to/document.json");
  } else {
    console.error(`ERROR: Could not read file: ${msg}`);
  }
  process.exit(1);
}

let doc: InheritDocument;
try {
  doc = JSON.parse(rawJson) as InheritDocument;
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`ERROR: Invalid JSON: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Print entity counts before modification
// ---------------------------------------------------------------------------

/**
 * Count and display entities in each of the 15 required arrays.
 */
function printEntityCounts(document: InheritDocument, label: string): void {
  console.log(`\n--- Entity Counts (${label}) ---`);

  const arrays: Array<[string, unknown[]]> = [
    ["People", document.people],
    ["Kinships", document.kinships],
    ["Relationships", document.relationships],
    ["Properties", document.properties],
    ["Assets", document.assets],
    ["Liabilities", document.liabilities],
    ["Bequests", document.bequests],
    ["Trusts", document.trusts],
    ["Executors", document.executors],
    ["Guardians", document.guardians],
    ["Wishes", document.wishes],
    ["Documents", document.documents],
    ["Non-probate Transfers", document.nonprobateTransfers],
    ["Proxy Authorisations", document.proxyAuthorisations],
    ["Dealer Interests", document.applicationState?.dealerInterests],
  ];

  let total = 0;
  for (const [name, arr] of arrays) {
    const count = Array.isArray(arr) ? arr.length : 0;
    total += count;
    // Only print non-empty arrays and always print People for context
    if (count > 0 || name === "People") {
      console.log(`  ${name.padEnd(24)} ${count}`);
    }
  }

  console.log(`  ${"─".repeat(24)} ─────`);
  console.log(`  ${"Total".padEnd(24)} ${total}`);
}

console.log(`Loaded: ${inputPath}`);
console.log(`INHERIT version: ${doc.version}`);
printEntityCounts(doc, "Before");

// ---------------------------------------------------------------------------
// 3. Add a new person — Eleanor Hughes, solicitor acting as attorney
// ---------------------------------------------------------------------------

const newPerson: Person = {
  id: randomUUID(),
  givenName: "Eleanor",
  familyName: "Hughes",
  roles: ["attorney"],
  contact: {
    email: "e.hughes@hughessolicitors.co.uk",
    phone: "+44 117 496 0200",
    address: {
      streetAddress: "14 Queen Square",
      addressLocality: "Bristol",
      postalCode: "BS1 4NT",
      addressCountry: "GB",
    },
  },
};

doc.people.push(newPerson);

console.log(`\nAdded person: ${newPerson.givenName} ${newPerson.familyName}`);
console.log(`  ID:    ${newPerson.id}`);
console.log(`  Roles: ${newPerson.roles.join(", ")}`);
console.log(`  Email: ${newPerson.contact?.email}`);

// ---------------------------------------------------------------------------
// 4. Update estate.lastModifiedAt to today's date
// ---------------------------------------------------------------------------

const today = new Date().toISOString().slice(0, 10); // ISO 8601 date (YYYY-MM-DD)
const previousDate = doc.estate.lastModifiedAt ?? "(not set)";
doc.estate.lastModifiedAt = today;

console.log(`\nUpdated estate.lastModifiedAt: ${previousDate} → ${today}`);

// ---------------------------------------------------------------------------
// 5. Update exportedAt to reflect this export
// ---------------------------------------------------------------------------

doc.exportedAt = today;

// ---------------------------------------------------------------------------
// 6. Print entity counts after modification
// ---------------------------------------------------------------------------

printEntityCounts(doc, "After");

// ---------------------------------------------------------------------------
// 7. Export as output.json
// ---------------------------------------------------------------------------

const outputPath = resolve("output.json");
const outputJson = JSON.stringify(doc, null, 2);
writeFileSync(outputPath, outputJson, "utf-8");

console.log(`\nExported: ${outputPath}`);
console.log(`File size: ${Buffer.byteLength(outputJson, "utf-8").toLocaleString()} bytes`);

// ---------------------------------------------------------------------------
// 8. Verify round-trip fidelity — re-parse the output and check it matches
// ---------------------------------------------------------------------------

const reloaded = JSON.parse(readFileSync(outputPath, "utf-8")) as InheritDocument;

// Check the key structural invariants survived the round-trip
const checks = [
  ["inherit URI", reloaded.inherit === doc.inherit],
  ["version", reloaded.version === doc.version],
  ["people count", reloaded.people.length === doc.people.length],
  ["estate.lastModifiedAt", reloaded.estate.lastModifiedAt === today],
  ["new person present", reloaded.people.some((p) => p.id === newPerson.id)],
] as const;

console.log("\n--- Round-Trip Fidelity ---");
let allPassed = true;
for (const [name, passed] of checks) {
  const status = passed ? "PASS" : "FAIL";
  console.log(`  ${status}  ${name}`);
  if (!passed) allPassed = false;
}

if (allPassed) {
  console.log("\nRound-trip: All checks passed.");
} else {
  console.error("\nRound-trip: Some checks failed — review the output file.");
  process.exit(1);
}
