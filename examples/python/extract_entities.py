# SPDX-License-Identifier: CC0-1.0

"""
extract_entities.py — AI-powered entity extraction from will text using Claude.

Demonstrates:
  - Reading unstructured will text from a file
  - Sending to Claude API with the INHERIT extraction system prompt
  - Using tool_use (structured output) to extract entities
  - Assembling extracted entities into a valid INHERIT v3 document
  - Generating UUIDs, resolving cross-references, building the root envelope
  - Adding AI provenance tracking

Run:  ANTHROPIC_API_KEY=sk-... python extract_entities.py [path-to-text-file]

Default input: ../fixtures/sample-will-text.txt

Requires: pip install anthropic
"""

import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("ERROR: anthropic package not installed.")
    print("Install it with: pip install anthropic")
    sys.exit(1)


# ---------------------------------------------------------------------------
# 1. System prompt — verbatim from the INHERIT AI Integration Guide
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are an expert estate data analyst. Your task is to extract \
structured data from will and testament text according to the INHERIT v3 open \
estate data standard.

## Entity Types

Extract the following entity types:

**person** — Any individual mentioned. Include a "roles" array with one or more of:
- testator: the person making the will
- beneficiary: someone who receives a gift or share
- executor: appointed to administer the estate (also create an executor entity)
- guardian: appointed to care for children (also create a guardian entity)
- witness: signed the will as witness

**property** — Real estate: houses, land, flats. Include address, tenure \
(freehold/leasehold), estimated value if stated.

**asset** — Financial and personal assets: bank accounts, investments, vehicles, \
jewellery, furniture, business interests. Include institution name, account type, \
estimated value if stated.

**liability** — Debts and obligations: mortgages, loans, credit cards. Include \
creditor name, estimated amount if stated.

**bequest** — A gift or instruction. Types:
- specific: a named item to a named person
- pecuniary: a cash sum
- residuary: the remainder of the estate
- conditional: subject to a condition
- demonstrative: from a specified fund
- trust: into trust
- charitable: to a charity

**executor** — An appointed executor (always paired with a person entity).

**guardian** — An appointed guardian (always paired with a person entity).

**wish** — Non-binding preferences: funeral wishes, burial instructions, pet care.

## Confidence Levels

- **high**: Explicitly stated in clear, unambiguous terms
- **medium**: Reasonably inferred from context
- **low**: Ambiguous, incomplete, or uncertain

## Source Locations

Provide page/paragraph references where possible.

## Monetary Amounts

Express all monetary amounts as integer minor units (pennies for GBP). \
Default currency is GBP (ISO 4217) unless another currency is stated. \
Example: £50,000 = { "amount": 5000000, "currency": "GBP" }.

## Important Rules

- Extract factual data only — do NOT interpret legal effect or give legal advice
- Do NOT infer beneficiary shares beyond what is written
- Generate a short descriptive label for each entity
- If a name appears in multiple roles, create one person entity with all roles
- Record warnings for anything ambiguous, contradictory, or significant"""


# ---------------------------------------------------------------------------
# 2. Tool schema for structured extraction via tool_use
# ---------------------------------------------------------------------------

TOOL_SCHEMA = {
    "name": "submit_extraction",
    "description": "Submit the structured extraction of entities from the will text",
    "input_schema": {
        "type": "object",
        "properties": {
            "entities": {
                "type": "array",
                "description": "All entities extracted from the will text",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": [
                                "person", "property", "asset", "liability",
                                "bequest", "executor", "guardian", "wish",
                            ],
                        },
                        "data": {
                            "type": "object",
                            "additionalProperties": True,
                        },
                        "confidence": {
                            "type": "string",
                            "enum": ["high", "medium", "low"],
                        },
                        "source": {"type": "string"},
                        "label": {"type": "string"},
                    },
                    "required": ["type", "data", "confidence", "source", "label"],
                },
            },
            "warnings": {
                "type": "array",
                "items": {"type": "string"},
            },
            "jurisdiction": {
                "type": "object",
                "properties": {
                    "country": {"type": "string"},
                    "subdivision": {"type": "string"},
                },
                "required": ["country"],
            },
            "willType": {
                "type": "string",
                "enum": ["secular", "religious", "dual"],
            },
        },
        "required": ["entities", "warnings"],
    },
}


def extract_entities(will_text: str) -> dict:
    """Send will text to Claude and extract structured entities."""
    client = anthropic.Anthropic()

    print(f"\nSending to Claude (claude-sonnet-4-5) for extraction...")

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        tools=[TOOL_SCHEMA],
        tool_choice={"type": "tool", "name": "submit_extraction"},
        messages=[
            {
                "role": "user",
                "content": f"Please extract all entities from the following will text:\n\n{will_text}",
            }
        ],
    )

    # Extract the tool_use response
    tool_block = next(
        (block for block in response.content if block.type == "tool_use"),
        None,
    )

    if tool_block is None:
        block_types = ", ".join(b.type for b in response.content)
        raise RuntimeError(
            f"No tool_use block in response. Got {len(response.content)} block(s): {block_types}"
        )

    result = tool_block.input
    entities = result.get("entities", [])
    warnings = result.get("warnings", [])

    print(f"Extraction complete. {len(entities)} entities, {len(warnings)} warning(s).")
    print(f"Tokens used: {response.usage.input_tokens} input, {response.usage.output_tokens} output")

    return result


def display_entities(result: dict) -> None:
    """Print extracted entities grouped by type."""
    print("\n--- Extracted Entities ---\n")

    by_type: dict[str, list] = {}
    for entity in result.get("entities", []):
        by_type.setdefault(entity["type"], []).append(entity)

    for entity_type, entities in by_type.items():
        print(f"{entity_type.upper()} ({len(entities)})")
        for entity in entities:
            conf = {"high": "HIGH", "medium": "MED ", "low": "LOW "}.get(
                entity["confidence"], "??? "
            )
            print(f"  [{conf}] {entity['label']}")
            print(f"         Source: {entity['source']}")
        print()

    warnings = result.get("warnings", [])
    if warnings:
        print("WARNINGS:")
        for warning in warnings:
            print(f"  - {warning}")
        print()

    jurisdiction = result.get("jurisdiction")
    if jurisdiction:
        parts = [jurisdiction["country"]]
        if "subdivision" in jurisdiction:
            parts.append(jurisdiction["subdivision"])
        print(f"Jurisdiction: {' / '.join(parts)}")

    will_type = result.get("willType")
    if will_type:
        print(f"Will type: {will_type}")


def assemble_inherit_document(result: dict) -> dict:
    """
    Build a complete INHERIT v3 document from extracted entities.

    Key assembly steps:
      - Generate UUIDs for every entity
      - Resolve cross-references (executor.personId → person.id)
      - Build the root envelope with all required arrays
      - Add AI provenance tracking
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc).isoformat()

    # Track person names → IDs for cross-reference resolution
    person_name_to_id: dict[str, str] = {}
    testator_person_id: str | None = None

    people = []
    properties = []
    assets = []
    liabilities = []
    bequests = []
    executors = []
    guardians = []
    wishes = []

    # AI provenance — attached to every extracted entity
    provenance = {
        "model": "claude",
        "confidence": 85,
        "generatedAt": now,
        "humanReviewed": False,
    }

    # First pass: create all person entities
    for entity in result.get("entities", []):
        if entity["type"] != "person":
            continue

        person_id = str(uuid.uuid4())
        data = dict(entity["data"])
        given = data.get("givenName", data.get("name", ""))
        family = data.get("familyName", "")
        lookup_key = f"{given} {family}".strip().lower()

        if lookup_key:
            person_name_to_id[lookup_key] = person_id

        roles = data.get("roles", [])
        if "testator" in roles:
            testator_person_id = person_id

        people.append({"id": person_id, "aiProvenance": provenance, **data})

    if not testator_person_id and people:
        testator_person_id = people[0]["id"]

    # Second pass: all other entity types
    for entity in result.get("entities", []):
        data = dict(entity["data"])
        entity_id = str(uuid.uuid4())

        if entity["type"] == "person":
            continue
        elif entity["type"] == "property":
            properties.append({"id": entity_id, "aiProvenance": provenance, **data})
        elif entity["type"] == "asset":
            assets.append({"id": entity_id, "aiProvenance": provenance, **data})
        elif entity["type"] == "liability":
            liabilities.append({"id": entity_id, "aiProvenance": provenance, **data})
        elif entity["type"] == "bequest":
            bequests.append({"id": entity_id, "aiProvenance": provenance, **data})
        elif entity["type"] == "executor":
            name = data.get("name", "")
            person_id = _find_person_id(person_name_to_id, name)
            executors.append({
                "id": entity_id,
                "personId": person_id or "UNRESOLVED",
                "role": data.get("role", "primary"),
                "aiProvenance": provenance,
            })
        elif entity["type"] == "guardian":
            guardian_name = data.get("name", data.get("guardianName", ""))
            child_name = data.get("childName", "")
            guardians.append({
                "id": entity_id,
                "personId": _find_person_id(person_name_to_id, guardian_name) or "UNRESOLVED",
                "childPersonId": _find_person_id(person_name_to_id, child_name) or "UNRESOLVED",
                "aiProvenance": provenance,
            })
        elif entity["type"] == "wish":
            wishes.append({"id": entity_id, "aiProvenance": provenance, **data})

    # Build domicile from jurisdiction
    domicile = {
        "country": "GB",
        "subdivision": "GB-ENG",
        "legalSystems": ["common_law"],
        "name": "England & Wales",
    }
    jurisdiction = result.get("jurisdiction")
    if jurisdiction:
        domicile["country"] = jurisdiction["country"]
        if "subdivision" in jurisdiction:
            domicile["subdivision"] = jurisdiction["subdivision"]

    # Assemble the complete INHERIT v3 document
    return {
        "$schema": "https://openinherit.org/v3/schema.json",
        "schemaVersion": 3,
        "exportedAt": today,
        "generator": {
            "name": "INHERIT Python Extraction Example",
            "version": "1.0.0",
        },
        "estate": {
            "id": str(uuid.uuid4()),
            "testatorPersonId": testator_person_id or "UNRESOLVED",
            "status": "draft",
            "domicile": domicile,
            "createdAt": today,
            "lastModifiedAt": today,
        },
        "people": people,
        "kinships": [],
        "relationships": [],
        "properties": properties,
        "assets": assets,
        "assetCollections": [],
        "liabilities": liabilities,
        "bequests": bequests,
        "trusts": [],
        "executors": executors,
        "guardians": guardians,
        "wishes": wishes,
        "documents": [],
        "nonprobateTransfers": [],
        "proxyAuthorisations": [],
        "valuations": [],
        "lifetimeTransfers": [],
        "organisations": [],
        "spaces": [],
        "insurancePolicies": [],
        "pets": [],
        "extensions": [],
    }


def _find_person_id(name_map: dict[str, str], name: str) -> str | None:
    """Fuzzy-match a name against the person name→ID map."""
    if not name:
        return None
    lower = name.lower()
    if lower in name_map:
        return name_map[lower]
    for key, person_id in name_map.items():
        if key in lower or lower in key:
            return person_id
    return None


def main() -> None:
    # Determine input file
    default_fixture = Path(__file__).parent.parent / "fixtures" / "sample-will-text.txt"
    input_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_fixture

    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}")
        if len(sys.argv) <= 1:
            print("\nUsage: ANTHROPIC_API_KEY=sk-... python extract_entities.py [path-to-text]")
        sys.exit(1)

    text = input_path.read_text(encoding="utf-8")
    print(f"Input: {input_path}")
    print(f"Text length: {len(text):,} characters")

    # Extract entities via Claude
    result = extract_entities(text)

    # Display results
    display_entities(result)

    # Assemble into INHERIT document
    print("\n--- Assembling INHERIT Document ---\n")
    doc = assemble_inherit_document(result)

    # Count entities
    for key in ["people", "properties", "assets", "liabilities", "bequests", "executors", "guardians", "wishes"]:
        count = len(doc.get(key, []))
        if count > 0:
            print(f"  {key:<20} {count}")

    # Check for unresolved references
    unresolved = sum(
        1 for e in doc["executors"] + doc["guardians"]
        if e.get("personId") == "UNRESOLVED" or e.get("childPersonId") == "UNRESOLVED"
    )
    if unresolved:
        print(f"\nWarning: {unresolved} entity(ies) have unresolved person references.")

    # Save
    output_path = Path("extracted-output.json").resolve()
    output_json = json.dumps(doc, indent=2, ensure_ascii=False)
    output_path.write_text(output_json + "\n", encoding="utf-8")

    print(f"\nExported: {output_path}")
    print(f"File size: {len(output_json.encode()):,} bytes")
    print("\nNote: The assembled document may need manual review for cross-reference")
    print("accuracy. Run: python validate.py extracted-output.json")


if __name__ == "__main__":
    main()
