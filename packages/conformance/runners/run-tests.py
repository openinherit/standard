#!/usr/bin/env python3
"""INHERIT Conformance Test Runner (Python).

Usage: python run-tests.py
Requires: pip install jsonschema

Validates INHERIT conformance fixtures against the bundled schemas
using the standard Python jsonschema library. Any JSON Schema 2020-12
compliant validator can be substituted.
"""
import json
import sys
from pathlib import Path

try:
    from jsonschema import Draft202012Validator, ValidationError
    from jsonschema.validators import RefResolver
except ImportError:
    print("Error: jsonschema package not installed. Run: pip install jsonschema")
    sys.exit(2)

KIT_DIR = Path(__file__).parent.parent
MANIFEST = json.loads((KIT_DIR / "manifest.json").read_text())

# Load bundled schemas
ESTATE_SCHEMA = json.loads((KIT_DIR / "schemas" / "inherit-v3-bundled.json").read_text())
CATALOGUE_SCHEMA = json.loads((KIT_DIR / "schemas" / "catalogue-v3-bundled.json").read_text())

passed = 0
failed = 0

print(f"INHERIT Conformance Test Kit v{MANIFEST['version']}")
print("Runner: Python (jsonschema)")
print("---")

for test in MANIFEST["tests"]:
    fixture_path = KIT_DIR / test["file"]
    expected_path = KIT_DIR / test["expected"]

    with open(fixture_path) as f:
        doc = json.load(f)
    expected = json.loads(expected_path.read_text())

    # Pick schema based on schemaMode in expected result
    schema_mode = expected.get("schemaMode", "estate")
    schema = CATALOGUE_SCHEMA if schema_mode == "catalogue" else ESTATE_SCHEMA

    # Validate
    validator = Draft202012Validator(schema)
    errors = list(validator.iter_errors(doc))
    actual_valid = len(errors) == 0
    expected_valid = expected["valid"]

    if actual_valid == expected_valid:
        passed += 1
        print(f"  PASS  {test['file']}")
    else:
        failed += 1
        print(f"  FAIL  {test['file']} (expected valid={expected_valid}, got valid={actual_valid})")
        if errors:
            for e in errors[:3]:
                print(f"        -> {e.message[:120]}")

print("---")
print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")

if failed > 0:
    sys.exit(1)
