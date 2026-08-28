import json
from pathlib import Path
from openinherit import validate

FIXTURES = Path(__file__).parent.parent.parent.parent / "examples" / "fixtures"


def test_level2_valid_estate():
    """A valid estate document should pass Level 2."""
    with open(FIXTURES / "english-family-estate.json") as f:
        doc = json.load(f)
    result = validate(doc, level=2)
    assert result["conformanceLevel"] >= 2, f"errors: {result['errors']}"


def test_level2_broken_references():
    """broken-references.json should fail Level 2."""
    with open(FIXTURES / "broken-references.json") as f:
        doc = json.load(f)
    result = validate(doc, level=2)
    assert result["conformanceLevel"] < 2
    level2_errors = [e for e in result["errors"] if e.get("level") == 2]
    assert len(level2_errors) > 0


def test_level2_only_runs_after_level1():
    """If Level 1 fails, Level 2 doesn't run."""
    result = validate({"not": "valid"}, level=2)
    assert result["conformanceLevel"] == 0
    # No level-2 errors — Level 1 failed first
    level2_errors = [e for e in result["errors"] if e.get("level") == 2]
    assert len(level2_errors) == 0


def test_level1_default():
    """Default level=1 doesn't include conformanceLevel=2."""
    with open(FIXTURES / "english-family-estate.json") as f:
        doc = json.load(f)
    result = validate(doc)
    assert result["conformanceLevel"] == 1


def test_level2_catalogue():
    """Catalogue documents can also be checked at Level 2."""
    with open(FIXTURES / "catalogue-only.json") as f:
        doc = json.load(f)
    result = validate(doc, level=2)
    assert result["valid"] is True
    assert result["conformanceLevel"] >= 2


def test_level2_result_has_valid_false_when_broken():
    """valid should be False when Level 2 fails."""
    with open(FIXTURES / "broken-references.json") as f:
        doc = json.load(f)
    result = validate(doc, level=2)
    assert result["valid"] is False


def test_level2_errors_include_path_and_message():
    """Level 2 errors must have path, message, and level fields."""
    with open(FIXTURES / "broken-references.json") as f:
        doc = json.load(f)
    result = validate(doc, level=2)
    level2_errors = [e for e in result["errors"] if e.get("level") == 2]
    for err in level2_errors:
        assert "path" in err, f"Missing path in error: {err}"
        assert "message" in err, f"Missing message in error: {err}"
        assert err["level"] == 2


def test_level2_conformance_level_in_result():
    """conformanceLevel key is always present in result."""
    with open(FIXTURES / "english-family-estate.json") as f:
        doc = json.load(f)
    result = validate(doc, level=1)
    assert "conformanceLevel" in result

    result2 = validate(doc, level=2)
    assert "conformanceLevel" in result2


def test_level2_broken_references_identifies_specific_ids():
    """Level 2 errors should reference the unresolved IDs in the message."""
    with open(FIXTURES / "broken-references.json") as f:
        doc = json.load(f)
    result = validate(doc, level=2)
    level2_errors = [e for e in result["errors"] if e.get("level") == 2]
    messages = " ".join(e["message"] for e in level2_errors)
    # The fixture has a beneficiaryId pointing to a non-existent person
    assert "00000000-0000-4000-a000-999999999999" in messages
