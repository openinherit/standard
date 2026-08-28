from openinherit import validate


def test_missing_required_fields():
    result = validate({"not": "an inherit document"})
    assert result["valid"] is False
    assert len(result["errors"]) > 0


def test_wrong_type_for_people():
    doc = {
        "$schema": "https://openinherit.org/v3/schema.json",
        "schemaVersion": "1.0.0",
        "estate": {},
        "people": "not an array",
    }
    result = validate(doc)
    assert result["valid"] is False
    assert any("people" in e["path"] or "people" in e["message"] for e in result["errors"])


def test_invalid_catalogue_missing_assets():
    doc = {"$schema": "https://openinherit.org/v3/catalogue.json"}
    result = validate(doc)
    assert result["valid"] is False


def test_string_input():
    result = validate('{"schemaVersion":"1.0.0","estate":{},"people":[]}')
    assert "valid" in result


def test_bytes_input():
    result = validate(b'{"schemaVersion":"1.0.0","estate":{},"people":[]}')
    assert "valid" in result
