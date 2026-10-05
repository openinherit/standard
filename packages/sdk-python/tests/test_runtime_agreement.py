"""JSON Schema, Zod and pydantic must give every document in
tests/runtime-validators/agreement.test.json the same verdict.

This file runs two of the three legs:
  - JSON Schema: Draft202012Validator over the conformance kit's bundled
    schema, exactly as packages/conformance/runners/run-tests.py does
  - pydantic: openinherit.models.Schema, both as a caller receiving JSON
    should (validate_json, strict) and through model_validate (lax), plus
    the InheritDocument root wrapper
The Zod leg is scripts/test-runtime-validator-agreement.mjs, over the same file.
"""

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from pydantic import TypeAdapter, ValidationError

from openinherit import models
from openinherit.models_by_id import MODELS_BY_ID

ROOT = Path(__file__).resolve().parents[3]
FIXTURES = json.loads((ROOT / "tests" / "runtime-validators" / "agreement.test.json").read_text())
KIT_SCHEMA = json.loads((ROOT / "packages" / "conformance" / "schemas" / "inherit-v3-bundled.json").read_text())
JSON_SCHEMA = Draft202012Validator(KIT_SCHEMA)
CASES = [pytest.param(t, id=t["description"]) for t in FIXTURES["tests"]]


def raw(case):
    return case["raw"] if "raw" in case else json.dumps(case["data"])


def accepts(fn):
    try:
        fn()
        return True
    except ValidationError:
        return False


@pytest.mark.parametrize("case", CASES)
def test_json_schema(case):
    assert JSON_SCHEMA.is_valid(json.loads(raw(case))) is case["valid"]


@pytest.mark.parametrize("case", CASES)
def test_pydantic_strict_json(case):
    model = MODELS_BY_ID[FIXTURES["target"]]
    assert accepts(lambda: TypeAdapter(model).validate_json(raw(case), strict=True)) is case["valid"]


@pytest.mark.parametrize("case", CASES)
def test_pydantic_lax_python(case):
    assert accepts(lambda: models.Schema.model_validate(json.loads(raw(case)))) is case["valid"]


@pytest.mark.parametrize("case", CASES)
def test_pydantic_root_wrapper(case):
    assert accepts(lambda: models.InheritDocument.model_validate_json(raw(case))) is case["valid"]
