import json
from pathlib import Path

from openinherit import validate

FIXTURES = Path(__file__).parent.parent.parent.parent / "examples" / "fixtures"


def test_valid_catalogue():
    with open(FIXTURES / "catalogue-only.json") as f:
        doc = json.load(f)
    result = validate(doc)
    assert result["valid"] is True
    assert result["schemaMode"] == "catalogue"


def test_auto_detect_catalogue_from_schema_field():
    doc = {
        "$schema": "https://openinherit.org/v3/catalogue.json",
        "assets": [],
    }
    result = validate(doc)
    assert result["schemaMode"] == "catalogue"
    assert result["valid"] is True


def test_explicit_catalogue_mode():
    doc = {"assets": []}
    result = validate(doc, mode="catalogue")
    assert result["schemaMode"] == "catalogue"
    assert result["valid"] is True
