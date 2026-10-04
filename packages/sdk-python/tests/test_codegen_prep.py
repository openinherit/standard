"""Tests for scripts/lib/open-unevaluable-objects.py — the bundle preparation
the pydantic generator runs on. If it opens too little, the models refuse
valid documents; if it opens too much, they stop refusing invalid ones."""

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
_spec = importlib.util.spec_from_file_location(
    "open_unevaluable_objects", ROOT / "scripts" / "lib" / "open-unevaluable-objects.py"
)
prep = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(prep)

EXT = {"^x-inherit-[a-z]+$": {"type": "object"}}


def test_extension_keys_beside_additional_properties_false_are_opened():
    assert prep.needs_opening({"patternProperties": EXT, "additionalProperties": False})


def test_extension_keys_beside_unevaluated_properties_false_are_opened():
    assert prep.needs_opening({"patternProperties": EXT, "unevaluatedProperties": False})


def test_unevaluated_properties_over_a_conditional_is_opened():
    assert prep.needs_opening({"unevaluatedProperties": False, "allOf": [{"if": {}, "then": {}}]})


def test_a_plain_closed_object_stays_closed():
    assert not prep.needs_opening({"properties": {"a": {}}, "additionalProperties": False})
    assert not prep.needs_opening({"properties": {"a": {}}, "unevaluatedProperties": False})


def test_an_open_object_with_extension_keys_is_left_alone():
    assert not prep.needs_opening({"patternProperties": EXT})


def test_walk_opens_nested_objects_and_drops_unevaluated():
    doc = {"a": {"b": [{"patternProperties": EXT, "unevaluatedProperties": False}]}}
    counter = [0]
    prep.walk(doc, counter)
    node = doc["a"]["b"][0]
    assert counter == [1]
    assert node["additionalProperties"] is True
    assert "unevaluatedProperties" not in node
