// SPDX-License-Identifier: CC0-1.0

/**
 * extract-entities.ts — AI-powered entity extraction from will text using Claude.
 *
 * Demonstrates:
 *   - Reading unstructured will text from a file
 *   - Sending to Claude API with the INHERIT extraction system prompt
 *   - Using tool_use (structured output) to extract entities
 *   - Assembling extracted entities into a valid INHERIT v1 document
 *   - Generating UUIDs, resolving cross-references, building the root envelope
 *
 * Run:  ANTHROPIC_API_KEY=sk-... npx tsx extract-entities.ts [path-to-text-file]
 *       ANTHROPIC_API_KEY=sk-... pnpm run extract [-- path-to-text-file]
 *
 * Default input: fixtures/sample-will-text.txt
 *
 * Requires: ANTHROPIC_API_KEY environment variable.
 *
 * The system prompt and tool schema are included inline — this file IS
 * the documentation for how INHERIT AI extraction works.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// 1. System prompt — verbatim from the production will-scanner
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert estate data analyst. Your task is to extract structured data from will and testament text according to the INHERIT v1 open estate data standard.

## Entity Types

Extract the following entity types:

**person** — Any individual mentioned. Include a "roles" array with one or more of:
- testator: the person making the will
- beneficiary: someone who receives a gift or share
- executor: appointed to administer the estate (also create an executor entity)
- guardian: appointed to care for children (also create a guardian entity)
- witness: signed the will as witness

**property** — Real estate: houses, land, flats. Include address, tenure (freehold/leasehold), estimated value if stated.

**asset** — Financial and personal assets: bank accounts, investments, vehicles, jewellery, furniture, business interests. Include institution name, account type, estimated value if stated.

**liability** — Debts and obligations: mortgages, loans, credit cards. Include creditor name, estimated amount if stated.

**bequest** — A gift or instruction. Types:
- specific: a named item to a named person
- pecuniary: a cash sum
- residuary: the remainder of the estate
- conditional: subject to a condition
- demonstrative: from a specified fund
- trust: into trust
- charitable: to a charity

**executor** — An appointed executor (always paired with a person entity for the same individual).

**guardian** — An appointed guardian (always paired with a person entity for the same individual).

**wish** — Non-binding preferences: funeral wishes, burial instructions, pet care, letters of wishes.

## Confidence Levels

- **high**: Explicitly stated in clear, unambiguous terms
- **medium**: Reasonably inferred from context
- **low**: Ambiguous, incomplete, or uncertain

## Source Locations

Provide page/paragraph references where possible (e.g. "Page 2, clause 3", "Opening paragraph").

## Monetary Amounts

Express all monetary amounts as integer minor units (pennies for GBP). Default currency is GBP (ISO 4217) unless another currency is stated. Example: £50,000 = { amount: 5000000, currency: "GBP" }.

## Important Rules

- Extract factual data only — do NOT interpret legal effect or give legal advice
- Do NOT infer beneficiary shares or entitlements beyond what is written
- Generate a short descriptive label for each entity (e.g. "Testator: John Smith", "House at 12 Oak Lane", "Gift of £10,000 to daughter")
- If a name appears in multiple roles, create one person entity with all roles listed
- Record warnings for anything ambiguous, contradictory, or potentially significant`;

// ---------------------------------------------------------------------------
// 2. Tool schema for submit_extraction — structured output via tool_use
// ---------------------------------------------------------------------------

const TOOL_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    entities: {
      type: "array",
      description: "All entities extracted from the will text",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "person",
              "property",
              "asset",
              "liability",
              "bequest",
              "executor",
              "guardian",
              "wish",
            ],
            description: "Entity type",
          },
          data: {
            type: "object",
            description: "Entity-specific structured data",
            additionalProperties: true,
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Confidence level for this extraction",
          },
          source: {
            type: "string",
            description:
              'Source location in the document (e.g. "Page 1, clause 2")',
          },
          label: {
            type: "string",
            description: "Short descriptive label for this entity",
          },
        },
        required: ["type", "data", "confidence", "source", "label"],
        additionalProperties: false,
      },
    },
    warnings: {
      type: "array",
      description:
        "Warnings about ambiguous, contradictory, or potentially significant content",
      items: { type: "string" },
    },
    jurisdiction: {
      type: "object",
      description: "Jurisdiction governing this will, if determinable",
      properties: {
        country: {
          type: "string",
          description: 'ISO 3166-1 alpha-2 country code (e.g. "GB")',
        },
        subdivision: {
          type: "string",
          description: 'ISO 3166-2 subdivision code (e.g. "GB-ENG")',
        },
      },
      required: ["country"],
      additionalProperties: false,
    },
    willType: {
      type: "string",
      enum: ["secular", "religious", "dual"],
      description: "Type of will if determinable",
    },
  },
  required: ["entities", "warnings"],
  additionalProperties: false,
};

// ---------------------------------------------------------------------------
// Types for the extraction response
// ---------------------------------------------------------------------------

/** A single extracted entity from the Claude tool_use response. */
interface ExtractedEntity {
  type:
    | "person"
    | "property"
    | "asset"
    | "liability"
    | "bequest"
    | "executor"
    | "guardian"
    | "wish";
  data: Record<string, unknown>;
  confidence: "high" | "medium" | "low";
  source: string;
  label: string;
}

/** The full extraction result from the submit_extraction tool. */
interface ExtractionResult {
  entities: ExtractedEntity[];
  warnings: string[];
  jurisdiction?: { country: string; subdivision?: string };
  willType?: "secular" | "religious" | "dual";
}

/** Root INHERIT document structure. */
interface InheritDocument {
  inherit: string;
  version: number;
  exportedAt: string;
  generator: { name: string; version: string; url: string };
  estate: Record<string, unknown>;
  people: Record<string, unknown>[];
  kinships: unknown[];
  relationships: unknown[];
  properties: Record<string, unknown>[];
  assets: Record<string, unknown>[];
  liabilities: Record<string, unknown>[];
  bequests: Record<string, unknown>[];
  trusts: unknown[];
  executors: Record<string, unknown>[];
  guardians: Record<string, unknown>[];
  wishes: Record<string, unknown>[];
  documents: unknown[];
  nonprobateTransfers: unknown[];
  proxyAuthorisations: unknown[];
  dealerInterests: unknown[];
}

// ---------------------------------------------------------------------------
// CLI argument handling
// ---------------------------------------------------------------------------

const defaultFixture = join(
  import.meta.dirname!,
  "fixtures",
  "sample-will-text.txt"
);
const inputPath = resolve(process.argv[2] ?? defaultFixture);

// ---------------------------------------------------------------------------
// 3. Check for API key
// ---------------------------------------------------------------------------

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY environment variable is not set.\n");
  console.error("To use this example, you need a valid Anthropic API key.");
  console.error("Get one at: https://console.anthropic.com/settings/keys\n");
  console.error("Then run:");
  console.error(
    "  ANTHROPIC_API_KEY=sk-ant-... npx tsx extract-entities.ts [path-to-text]\n"
  );
  console.error("Or export it in your shell:");
  console.error("  export ANTHROPIC_API_KEY=sk-ant-...");
  console.error("  npx tsx extract-entities.ts");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 4. Load the will text
// ---------------------------------------------------------------------------

let text: string;
try {
  text = readFileSync(inputPath, "utf-8");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);

  if (!process.argv[2]) {
    console.error("ERROR: Default fixture not found.");
    console.error(`  Expected: ${inputPath}`);
    console.error("");
    console.error("The fixture files are created by Task 4. You can either:");
    console.error("  1. Run after fixtures are created");
    console.error("  2. Pass a path to any text file containing will text:");
    console.error(
      "     ANTHROPIC_API_KEY=sk-... npx tsx extract-entities.ts path/to/will.txt"
    );
  } else {
    console.error(`ERROR: Could not read file: ${msg}`);
  }
  process.exit(1);
}

console.log(`Input: ${inputPath}`);
console.log(`Text length: ${text.length.toLocaleString()} characters`);

// ---------------------------------------------------------------------------
// 5. Call Claude API with the extraction system prompt and tool_use
// ---------------------------------------------------------------------------

async function extractEntities(willText: string): Promise<ExtractionResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log("\nSending to Claude (claude-sonnet-4-5) for extraction...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "submit_extraction",
        description:
          "Submit the structured extraction of entities from the will text",
        input_schema: TOOL_INPUT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "submit_extraction" },
    messages: [
      {
        role: "user",
        content: `Please extract all entities from the following will text:\n\n${willText}`,
      },
    ],
  });

  // Extract the tool_use response — Claude is forced to use submit_extraction
  const toolBlock = response.content.find((block) => block.type === "tool_use");

  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error(
      "Unexpected response — no tool_use block found. " +
        `Response had ${response.content.length} content block(s) of types: ` +
        response.content.map((b) => b.type).join(", ")
    );
  }

  const result = toolBlock.input as ExtractionResult;

  console.log(
    `Extraction complete. ${result.entities.length} entities, ${result.warnings.length} warning(s).`
  );
  console.log(
    `Tokens used: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output`
  );

  return result;
}

// ---------------------------------------------------------------------------
// 6. Display extracted entities
// ---------------------------------------------------------------------------

function displayEntities(result: ExtractionResult): void {
  console.log("\n--- Extracted Entities ---\n");

  // Group by type for readability
  const byType = new Map<string, ExtractedEntity[]>();
  for (const entity of result.entities) {
    const group = byType.get(entity.type) ?? [];
    group.push(entity);
    byType.set(entity.type, group);
  }

  for (const [type, entities] of byType) {
    console.log(`${type.toUpperCase()} (${entities.length})`);
    for (const entity of entities) {
      const confidence =
        entity.confidence === "high"
          ? "HIGH"
          : entity.confidence === "medium"
            ? "MED "
            : "LOW ";
      console.log(`  [${confidence}] ${entity.label}`);
      console.log(`         Source: ${entity.source}`);
    }
    console.log();
  }

  // Display warnings
  if (result.warnings.length > 0) {
    console.log("WARNINGS:");
    for (const warning of result.warnings) {
      console.log(`  - ${warning}`);
    }
    console.log();
  }

  // Display jurisdiction if identified
  if (result.jurisdiction) {
    const parts = [result.jurisdiction.country];
    if (result.jurisdiction.subdivision) {
      parts.push(result.jurisdiction.subdivision);
    }
    console.log(`Jurisdiction: ${parts.join(" / ")}`);
  }

  if (result.willType) {
    console.log(`Will type: ${result.willType}`);
  }
}

// ---------------------------------------------------------------------------
// 7. Assemble into a valid INHERIT document
// ---------------------------------------------------------------------------

/**
 * Build a complete INHERIT v1 document from the extracted entities.
 *
 * This demonstrates the key assembly steps:
 *   - Generate UUIDs for every entity
 *   - Resolve cross-references (e.g. executor.personId → person.id)
 *   - Build the root envelope with all 15 required arrays
 *   - Set estate metadata from the extraction jurisdiction
 */
function assembleInheritDocument(
  result: ExtractionResult
): InheritDocument {
  const today = new Date().toISOString().slice(0, 10);

  // Track person names → IDs so we can resolve cross-references
  // (e.g. an executor entity references the same person by name)
  const personNameToId = new Map<string, string>();

  // Separate entities by type and assign UUIDs
  const people: Record<string, unknown>[] = [];
  const properties: Record<string, unknown>[] = [];
  const assets: Record<string, unknown>[] = [];
  const liabilities: Record<string, unknown>[] = [];
  const bequests: Record<string, unknown>[] = [];
  const executors: Record<string, unknown>[] = [];
  const guardians: Record<string, unknown>[] = [];
  const wishes: Record<string, unknown>[] = [];

  // First pass: create all person entities and build the name→ID map
  let testatorPersonId: string | undefined;

  for (const entity of result.entities) {
    if (entity.type !== "person") continue;

    const id = randomUUID();
    const data = entity.data as Record<string, unknown>;

    // Build a lookup key from the name fields
    const givenName = (data.givenName as string) ?? (data.name as string) ?? "";
    const familyName = (data.familyName as string) ?? "";
    const lookupKey = `${givenName} ${familyName}`.trim().toLowerCase();

    if (lookupKey) {
      personNameToId.set(lookupKey, id);
    }

    // Check if this person is the testator
    const roles = data.roles as string[] | undefined;
    if (roles?.includes("testator")) {
      testatorPersonId = id;
    }

    people.push({ id, ...data });
  }

  // If no testator was identified, use the first person
  if (!testatorPersonId && people.length > 0) {
    testatorPersonId = people[0].id as string;
  }

  // Second pass: create all other entity types, resolving cross-references
  for (const entity of result.entities) {
    const id = randomUUID();
    const data = entity.data as Record<string, unknown>;

    switch (entity.type) {
      case "person":
        // Already handled in first pass
        break;

      case "property":
        properties.push({ id, ...data });
        break;

      case "asset":
        assets.push({ id, ...data });
        break;

      case "liability":
        liabilities.push({ id, ...data });
        break;

      case "bequest":
        bequests.push({ id, ...data });
        break;

      case "executor": {
        // Resolve the person reference — match by name in the data
        const execName = (data.name as string) ?? "";
        const personId =
          personNameToId.get(execName.toLowerCase()) ??
          findPersonIdByPartialName(personNameToId, execName);
        executors.push({ id, personId: personId ?? "UNRESOLVED", role: data.role ?? "primary" });
        break;
      }

      case "guardian": {
        // Resolve guardian and child person references
        const guardianName = (data.name as string) ?? (data.guardianName as string) ?? "";
        const childName = (data.childName as string) ?? "";
        const guardianPersonId =
          personNameToId.get(guardianName.toLowerCase()) ??
          findPersonIdByPartialName(personNameToId, guardianName);
        const childPersonId =
          personNameToId.get(childName.toLowerCase()) ??
          findPersonIdByPartialName(personNameToId, childName);
        guardians.push({
          id,
          personId: guardianPersonId ?? "UNRESOLVED",
          childPersonId: childPersonId ?? "UNRESOLVED",
        });
        break;
      }

      case "wish":
        wishes.push({ id, ...data });
        break;
    }
  }

  // Build the estate record (v3 envelope — uses `domicile`, requires
  // `id`/`testatorPersonId`/`status`/`createdAt`/`lastModifiedAt`/`domicile`).
  const estate: Record<string, unknown> = {
    id: randomUUID(),
    testatorPersonId: testatorPersonId ?? "UNRESOLVED",
    status: "planning",
    createdAt: today,
    lastModifiedAt: today,
    domicile: result.jurisdiction
      ? {
          country: result.jurisdiction.country,
          ...(result.jurisdiction.subdivision
            ? { subdivision: result.jurisdiction.subdivision }
            : {}),
        }
      : { country: "UNRESOLVED" },
  };

  // Assemble the complete INHERIT v3 document
  return {
    $schema: "https://openinherit.org/v3/schema.json",
    "@context": "https://openinherit.org/v3/context/inherit-v1.jsonld",
    schemaVersion: "6.6.0",
    exportedAt: today,
    dataProvenance: "ai_extracted",
    generator: {
      name: "INHERIT AI Extraction Example",
      version: "1.0.0",
      url: "https://github.com/openinherit/standard",
    },
    estate,
    people,
    kinships: [],
    relationships: [],
    properties,
    assets,
    liabilities,
    bequests,
    trusts: [],
    executors,
    guardians,
    wishes,
    documents: [],
    nonprobateTransfers: [],
    proxyAuthorisations: [],
    dealerInterests: [],
  };
}

/**
 * Fuzzy-match a name against the person name→ID map.
 * Handles cases where the extraction uses a full name but the map key
 * was built from givenName + familyName separately.
 */
function findPersonIdByPartialName(
  nameMap: Map<string, string>,
  searchName: string
): string | undefined {
  if (!searchName) return undefined;

  const lower = searchName.toLowerCase();

  // Exact match first
  if (nameMap.has(lower)) return nameMap.get(lower);

  // Partial match — check if the search name is contained in any key or vice versa
  for (const [key, id] of nameMap) {
    if (key.includes(lower) || lower.includes(key)) {
      return id;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// 8. Main — orchestrate the extraction pipeline
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Call Claude API for extraction
  const result = await extractEntities(text);

  // Display each extracted entity with type, label, confidence, source
  displayEntities(result);

  // Assemble into a valid INHERIT document
  console.log("\n--- Assembling INHERIT Document ---\n");
  const inheritDoc = assembleInheritDocument(result);

  // Count entities in the assembled document
  const entityCounts = {
    people: inheritDoc.people.length,
    properties: inheritDoc.properties.length,
    assets: inheritDoc.assets.length,
    liabilities: inheritDoc.liabilities.length,
    bequests: inheritDoc.bequests.length,
    executors: inheritDoc.executors.length,
    guardians: inheritDoc.guardians.length,
    wishes: inheritDoc.wishes.length,
  };

  console.log("Assembled entity counts:");
  for (const [type, count] of Object.entries(entityCounts)) {
    if (count > 0) {
      console.log(`  ${type.padEnd(20)} ${count}`);
    }
  }

  // Check for unresolved references
  const allEntities = [
    ...inheritDoc.executors,
    ...inheritDoc.guardians,
  ];
  const unresolvedCount = allEntities.filter(
    (e) =>
      (e as Record<string, unknown>).personId === "UNRESOLVED" ||
      (e as Record<string, unknown>).personId === "UNRESOLVED" ||
      (e as Record<string, unknown>).childPersonId === "UNRESOLVED"
  ).length;

  if (unresolvedCount > 0) {
    console.log(
      `\nWarning: ${unresolvedCount} entity(ies) have unresolved person references.`
    );
    console.log(
      "This is expected when extracted names do not exactly match person entities."
    );
  }

  // Save the assembled INHERIT document
  const outputPath = resolve("extracted-output.json");
  const outputJson = JSON.stringify(inheritDoc, null, 2);
  writeFileSync(outputPath, outputJson, "utf-8");

  console.log(`\nExported: ${outputPath}`);
  console.log(
    `File size: ${Buffer.byteLength(outputJson, "utf-8").toLocaleString()} bytes`
  );
  console.log(
    "\nNote: The assembled document may need manual review for cross-reference"
  );
  console.log(
    "accuracy. Run validate-document.ts to check schema conformance."
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
