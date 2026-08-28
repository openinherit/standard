#!/usr/bin/env python3
"""
validate.py — Three-level INHERIT document validator (Python).

Demonstrates:
  - Level 1: JSON Schema validation (jsonschema library, 2020-12 draft)
  - Level 2: Referential integrity checks across entity arrays
  - Level 3: Placeholder for extension-specific field checking (planned for v1.1)

Usage:
    python validate.py <path-to-inherit-json>
    python validate.py ../../examples/fixtures/minimal-estate.json

Exit code 0 if Level 2 passes, 1 otherwise.

British English throughout, matching the INHERIT specification conventions.
"""

import json
import os
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, ValidationError
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012


# ---------------------------------------------------------------------------
# 1. CLI argument handling
# ---------------------------------------------------------------------------

def main() -> None:
    """Entry point — parse arguments, run all validation levels, report results."""
    if len(sys.argv) < 2:
        print("Usage: python validate.py <path-to-inherit-json>", file=sys.stderr)
        print(
            "Example: python validate.py ../../examples/fixtures/english-family-estate.json",
            file=sys.stderr,
        )
        sys.exit(1)

    file_path = Path(sys.argv[1]).resolve()

    if not file_path.exists():
        print(f"ERROR: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Validating: {file_path}\n")
    print("=" * 60)

    # ------------------------------------------------------------------
    # 2. Load and parse the input document
    # ------------------------------------------------------------------

    try:
        raw_text = file_path.read_text(encoding="utf-8")
    except OSError as exc:
        print(f"ERROR: Could not read file: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        document = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        print(f"ERROR: Invalid JSON: {exc}", file=sys.stderr)
        print("\nConformance level: 0 (not valid JSON)")
        sys.exit(1)

    # ------------------------------------------------------------------
    # 3. Level 1: JSON Schema validation
    # ------------------------------------------------------------------

    print("\nLevel 1: JSON Schema Validation (jsonschema, 2020-12 draft)")
    print("-" * 60)

    level1_pass, level1_errors = run_level1(document)

    if level1_pass:
        print("  PASS — Document conforms to the INHERIT v1 root schema.\n")
    else:
        print("  FAIL — Schema validation errors:\n")
        for err_msg in level1_errors:
            print(err_msg)
            print()
        print("=" * 60)
        print("\nConformance level achieved: 0")
        print("The document does not pass JSON Schema validation.")
        sys.exit(1)

    # ------------------------------------------------------------------
    # 4. Level 2: Referential integrity checks
    # ------------------------------------------------------------------

    print("Level 2: Referential Integrity Checks")
    print("-" * 60)

    level2_pass, level2_errors = run_level2(document)

    if level2_pass:
        print("  PASS — All cross-references resolve correctly.\n")
    else:
        print("  FAIL — Referential integrity errors:\n")
        for err_info in level2_errors:
            print(f"  Path:        {err_info['path']}")
            print(f"  Message:     {err_info['message']}")
            print(f"  Explanation: {err_info['explanation']}")
            print()
        print("=" * 60)
        print("\nConformance level achieved: 1")
        print(
            "The document passes schema validation but has broken cross-references."
        )
        sys.exit(1)

    # ------------------------------------------------------------------
    # 5. Level 3: Extension-specific checks (placeholder)
    # ------------------------------------------------------------------

    print("Level 3: Extension-Specific Field Checking")
    print("-" * 60)
    print(
        "  Level 3 checking not yet implemented"
        " — extension-specific field checking is planned for v1.1.\n"
    )

    # ------------------------------------------------------------------
    # 6. Summary
    # ------------------------------------------------------------------

    print("=" * 60)
    print("\nConformance level achieved: 2")
    print(
        "The document passes schema validation and referential integrity checks."
    )
    sys.exit(0)


# ---------------------------------------------------------------------------
# Schema loading helpers
# ---------------------------------------------------------------------------

def collect_json_files(directory: Path) -> list[Path]:
    """Recursively collect all .json files from a directory tree."""
    results: list[Path] = []
    for root, _dirs, files in os.walk(directory):
        for name in files:
            if name.endswith(".json"):
                results.append(Path(root) / name)
    return results


def load_schemas_into_registry(schema_dir: Path) -> tuple[Registry, dict]:
    """
    Load every JSON Schema from the v1/ directory and build a referencing
    Registry that maps each schema's $id URI to its contents.

    The custom INHERIT dialect URI ($schema: "https://openinherit.org/v1/dialect.json")
    is replaced with the standard JSON Schema 2020-12 URI so that the jsonschema
    library can validate without a custom meta-schema.

    Returns (registry, root_schema) where root_schema is the v1/schema.json contents.
    """
    schema_files = collect_json_files(schema_dir)
    resources: list[tuple[str, Resource]] = []
    root_schema = None

    for schema_file in schema_files:
        try:
            raw = schema_file.read_text(encoding="utf-8")
            schema = json.loads(raw)
        except (json.JSONDecodeError, OSError):
            # Skip malformed or unreadable files
            continue

        schema_id = schema.get("$id")
        if not isinstance(schema_id, str):
            # Only register schemas that declare a $id — needed for $ref resolution
            continue

        # Replace the custom INHERIT dialect with standard 2020-12 so that
        # the jsonschema library recognises the schema correctly
        if schema.get("$schema") == "https://openinherit.org/v1/dialect.json":
            schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"

        # Track the root schema for later use
        if schema_id == "https://openinherit.org/v1/schema.json":
            root_schema = schema

        # Create a Resource and pair it with its $id for the registry
        resource = Resource.from_contents(schema, default_specification=DRAFT202012)
        resources.append((schema_id, resource))

    # Build the registry from all collected (uri, resource) pairs
    registry = Registry().with_resources(resources)

    return registry, root_schema


# ---------------------------------------------------------------------------
# Level 1: JSON Schema validation
# ---------------------------------------------------------------------------

def run_level1(document: dict) -> tuple[bool, list[str]]:
    """
    Validate the document against the INHERIT v1 root schema using
    JSON Schema 2020-12 draft.

    Returns (passed, error_messages).
    """
    # Locate the v1/ schema directory relative to this script
    script_dir = Path(__file__).resolve().parent
    schema_dir = script_dir / ".." / ".." / "v1"
    schema_dir = schema_dir.resolve()

    if not schema_dir.is_dir():
        return False, [
            f"  Schema directory not found at {schema_dir}."
            " Ensure the v1/ directory exists relative to this script."
        ]

    registry, root_schema = load_schemas_into_registry(schema_dir)

    if root_schema is None:
        return False, [
            "  Root schema (v1/schema.json) not found or missing $id."
            " Check that v1/schema.json is present and has the correct $id."
        ]

    # Create a validator instance with the registry for $ref resolution
    validator = Draft202012Validator(
        root_schema,
        registry=registry,
    )

    # Collect all validation errors
    errors: list[str] = []
    for error in sorted(validator.iter_errors(document), key=lambda e: list(e.path)):
        path = "/" + "/".join(str(p) for p in error.absolute_path) if error.absolute_path else "/"
        message = error.message
        explanation = explain_schema_error(error)
        errors.append(
            f"  Path:        {path}\n"
            f"  Message:     {message}\n"
            f"  Explanation: {explanation}"
        )

    return len(errors) == 0, errors


def explain_schema_error(error: ValidationError) -> str:
    """Provide a human-readable explanation for a JSON Schema validation error."""
    path = "/" + "/".join(str(p) for p in error.absolute_path) if error.absolute_path else "/"

    validator_type = error.validator

    if validator_type == "required":
        missing = error.message.split("'")[1] if "'" in error.message else "unknown"
        return f'The property "{missing}" is required at {path} but was not provided.'
    elif validator_type == "type":
        expected = error.schema.get("type", "unknown")
        return f"The value at {path} has the wrong type — expected {expected}."
    elif validator_type == "enum":
        allowed = error.schema.get("enum", [])
        return f"The value at {path} is not one of the allowed values: {json.dumps(allowed)}."
    elif validator_type == "format":
        fmt = error.schema.get("format", "unknown")
        return f'The value at {path} does not match the expected format "{fmt}".'
    elif validator_type == "const":
        expected = error.schema.get("const")
        return f"The value at {path} must be exactly {json.dumps(expected)}."
    elif validator_type in ("additionalProperties", "unevaluatedProperties"):
        return f"An unexpected property at {path} is not allowed by the schema."
    elif validator_type in ("minimum", "maximum"):
        limit = error.schema.get(validator_type)
        return f"The value at {path} is outside the allowed range ({validator_type}: {limit})."
    elif validator_type == "anyOf":
        return f"The value at {path} does not match any of the permitted alternatives."
    elif validator_type == "oneOf":
        return f"The value at {path} must match exactly one alternative."
    else:
        return f"{error.message} at {path}."


# ---------------------------------------------------------------------------
# Level 2: Referential integrity checks
# ---------------------------------------------------------------------------

def run_level2(document: dict) -> tuple[bool, list[dict]]:
    """
    Check referential integrity across entity arrays.

    These are the same checks as the TypeScript validator:
      - estate.testatorPersonId must reference a person
      - bequest.beneficiaryId must reference a person (when present)
      - executor.personId must reference a person
      - guardian.personId must reference a person
      - guardian.childPersonId must reference a person

    Returns (passed, error_list) where each error is a dict with
    'path', 'message', and 'explanation' keys.
    """
    errors: list[dict] = []

    # Build a lookup set of all person IDs
    person_ids = {p["id"] for p in document.get("people", [])}

    # --- estate.testatorPersonId must reference a person ---
    estate = document.get("estate", {})
    testator_id = estate.get("testatorPersonId")
    if testator_id and testator_id not in person_ids:
        errors.append({
            "path": "/estate/testatorPersonId",
            "message": f'Person "{testator_id}" not found in people array.',
            "explanation": (
                "The testator identified in the estate record must exist"
                " as a person in the people array."
            ),
        })

    # --- bequest.beneficiaryId must reference a person (when present) ---
    for i, bequest in enumerate(document.get("bequests", [])):
        beneficiary_id = bequest.get("beneficiaryId")
        if beneficiary_id and beneficiary_id not in person_ids:
            errors.append({
                "path": f"/bequests/{i}/beneficiaryId",
                "message": f'Person "{beneficiary_id}" not found in people array.',
                "explanation": (
                    f'Bequest "{bequest.get("id", "unknown")}" references a beneficiary'
                    " that does not exist in the people array."
                ),
            })

    # --- executor.personId must reference a person ---
    for i, executor in enumerate(document.get("executors", [])):
        person_id = executor.get("personId")
        if person_id and person_id not in person_ids:
            errors.append({
                "path": f"/executors/{i}/personId",
                "message": f'Person "{person_id}" not found in people array.',
                "explanation": (
                    f'Executor "{executor.get("id", "unknown")}" references a person'
                    " that does not exist in the people array."
                ),
            })

    # --- guardian.personId must reference a person ---
    # --- guardian.childPersonId must reference a person ---
    for i, guardian in enumerate(document.get("guardians", [])):
        guardian_person_id = guardian.get("personId")
        if guardian_person_id and guardian_person_id not in person_ids:
            errors.append({
                "path": f"/guardians/{i}/personId",
                "message": f'Person "{guardian_person_id}" not found in people array.',
                "explanation": (
                    f'Guardian "{guardian.get("id", "unknown")}" references a guardian'
                    " person that does not exist in the people array."
                ),
            })

        child_person_id = guardian.get("childPersonId")
        if child_person_id and child_person_id not in person_ids:
            errors.append({
                "path": f"/guardians/{i}/childPersonId",
                "message": f'Person "{child_person_id}" not found in people array.',
                "explanation": (
                    f'Guardian "{guardian.get("id", "unknown")}" references a child'
                    " person that does not exist in the people array."
                ),
            })

    return len(errors) == 0, errors


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    main()
