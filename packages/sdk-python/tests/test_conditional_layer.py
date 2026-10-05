"""The root's conformance profile, as the published pydantic models enforce it.

v3/schema.json requires schemaVersion, estate and people only in the else
branch of an if on conformanceProfile (proposal 0003). datamodel-codegen drops
if/then/else, so without the conditional layer
(scripts/lib/write-conditional-layer.py) a root with no estate is accepted.
The Zod twin is scripts/test-runtime-validator-profile.mjs.
"""

import copy
import json
from pathlib import Path

import pytest
from pydantic import TypeAdapter, ValidationError

from openinherit import models
from openinherit.models_by_id import MODELS_BY_ID

CORPUS = Path(__file__).resolve().parents[3] / "tests" / "v3" / "schema" / "schema.test.json"
CASES = {t["description"]: t["data"] for t in json.loads(CORPUS.read_text())["tests"]}
MINIMAL = "valid — truly minimal document (no optional entity arrays)"
CATALOGUE = (
    "valid — catalogue profile: a catalogue-only document conforms to the root"
    " by declaring conformanceProfile, no estate envelope"
)
ROOT_ID = "https://openinherit.org/v3/schema.json"


def fixture(name):
    return copy.deepcopy(CASES[name])


def accepts(model, doc):
    try:
        TypeAdapter(model).validate_json(json.dumps(doc), strict=True)
        return True
    except ValidationError:
        return False


ROOTS = [pytest.param(models.Schema, id="models.Schema"), pytest.param(MODELS_BY_ID[ROOT_ID], id="MODELS_BY_ID")]


@pytest.mark.parametrize("model", ROOTS)
def test_minimal_estate_document_accepted(model):
    assert accepts(model, fixture(MINIMAL))


@pytest.mark.parametrize("model", ROOTS)
@pytest.mark.parametrize("member", ["estate", "people", "schemaVersion"])
def test_default_profile_missing_member_refused(model, member):
    doc = fixture(MINIMAL)
    del doc[member]
    assert not accepts(model, doc)


@pytest.mark.parametrize("model", ROOTS)
def test_explicit_estate_profile_missing_estate_refused(model):
    doc = {**fixture(MINIMAL), "conformanceProfile": "estate"}
    del doc["estate"]
    assert not accepts(model, doc)


@pytest.mark.parametrize("model", ROOTS)
def test_valid_catalogue_profile_document_accepted(model):
    assert accepts(model, fixture(CATALOGUE))


@pytest.mark.parametrize("model", ROOTS)
def test_catalogue_profile_carrying_people_refused(model):
    assert not accepts(model, {**fixture(CATALOGUE), "people": []})


@pytest.mark.parametrize("model", ROOTS)
def test_catalogue_profile_without_assets_refused(model):
    doc = fixture(CATALOGUE)
    del doc["assets"]
    assert not accepts(model, doc)


def test_catalogue_certificate_cannot_claim_estate_profile():
    doc = fixture(CATALOGUE)
    doc["conformance"] = {
        "level": "level_1", "validatedAt": "2026-10-05T00:00:00Z",
        "validatedBy": "t", "schemaVersion": "6.6.0", "profile": "estate",
    }
    assert not accepts(models.Catalogue, doc)
    doc["conformance"]["profile"] = "catalogue"
    assert accepts(models.Catalogue, doc)
