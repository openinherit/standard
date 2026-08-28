import json
from pathlib import Path

import pytest

from openinherit import validate

FIXTURES = Path(__file__).parent.parent.parent.parent / "examples" / "fixtures"


def test_valid_english_estate():
    with open(FIXTURES / "english-family-estate.json") as f:
        doc = json.load(f)
    result = validate(doc)
    assert result["valid"] is True
    assert result["schemaMode"] == "estate"
    assert result["errors"] == []
    assert "informational" in result["disclaimer"]


def test_valid_minimal_estate():
    with open(FIXTURES / "minimal-estate.json") as f:
        doc = json.load(f)
    result = validate(doc)
    assert result["valid"] is True
    assert result["schemaMode"] == "estate"


def test_auto_detect_estate_from_schema_field():
    with open(FIXTURES / "english-family-estate.json") as f:
        doc = json.load(f)
    assert doc["$schema"] == "https://openinherit.org/v3/schema.json"
    result = validate(doc)
    assert result["schemaMode"] == "estate"


def test_disclaimer_always_present():
    result = validate({"schemaVersion": "1.0.0", "estate": {}, "people": []})
    assert "disclaimer" in result
    assert result["disclaimer"].startswith("Validation results are informational")
