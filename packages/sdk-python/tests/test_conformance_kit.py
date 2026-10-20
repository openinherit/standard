"""@openinherit/conformance, run through the Python validators.

Every case in packages/conformance/manifest.json must get the kit's verdict --
VALID accepted, every one-rule INVALID refused -- from:
  - JSON Schema: Draft202012Validator over the kit's own bundled schema
  - pydantic: the generated model for that bundle's $id, as a caller receiving
    JSON should (validate_json, strict), and through model_validate (lax)
The Zod leg is scripts/test-conformance-kit-zod.mjs, over the same manifest.
There is no divergence register here: a kit case a validator gets wrong fails.
"""

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from pydantic import TypeAdapter, ValidationError

from openinherit.models_by_id import MODELS_BY_ID

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "packages" / "conformance"
MANIFEST = json.loads((KIT / "manifest.json").read_text())
BUNDLES = {
    mode: json.loads((KIT / "schemas" / f).read_text())
    for mode, f in (("estate", "inherit-v3-bundled.json"), ("catalogue", "catalogue-v3-bundled.json"))
}
JSON_SCHEMA = {mode: Draft202012Validator(b) for mode, b in BUNDLES.items()}
CASES = [pytest.param(t, id=t["file"]) for t in MANIFEST["tests"]]


def raw(case):
    return (KIT / case["file"]).read_text()


def model(case):
    return MODELS_BY_ID[BUNDLES[case["schemaMode"]]["$id"]]


def accepts(fn):
    try:
        fn()
        return True
    except ValidationError:
        return False


def test_both_verdicts_present():
    assert {t["valid"] for t in MANIFEST["tests"]} == {True, False}


@pytest.mark.parametrize("case", CASES)
def test_json_schema(case):
    assert JSON_SCHEMA[case["schemaMode"]].is_valid(json.loads(raw(case))) is case["valid"]


@pytest.mark.parametrize("case", CASES)
def test_pydantic_strict_json(case):
    assert accepts(lambda: TypeAdapter(model(case)).validate_json(raw(case), strict=True)) is case["valid"]


@pytest.mark.parametrize("case", CASES)
def test_pydantic_lax_python(case):
    assert accepts(lambda: model(case).model_validate(json.loads(raw(case)))) is case["valid"]
