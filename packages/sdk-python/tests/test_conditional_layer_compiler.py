"""Tests for scripts/lib/write-conditional-layer.py, the compiler half of the
conditional layer. It must refuse any keyword it cannot evaluate, rather than
emit a layer that silently skips it. It must also never close an object over
a member it cannot see, because that would refuse valid documents."""

import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
_spec = importlib.util.spec_from_file_location(
    "write_conditional_layer", ROOT / "scripts" / "lib" / "write-conditional-layer.py"
)
layer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(layer)

A = "https://openinherit.org/v3/a.json"
B = "https://openinherit.org/v3/b.json"
DISC = {"required": ["kind"], "properties": {"kind": {"const": "x"}}}


def compiler(srcs):
    return layer.Compiler({sid: "N" for sid in srcs}, srcs)


def test_a_const_discriminator_is_compiled():
    assert layer.is_discriminator({"if": DISC, "then": {}})


def test_an_enum_if_is_not_a_discriminator():
    assert not layer.is_discriminator({"if": {"properties": {"kind": {"enum": ["x", "y"]}}}})


def test_a_presence_if_is_compiled_but_only_on_one_member():
    # The root's core-extension members: "if x-inherit-uk is present, it is a
    # UK extension block". Without them neither validator looked inside one.
    assert layer.is_discriminator({"if": {"required": ["x-inherit-uk"]}})
    assert not layer.is_discriminator({"if": {"required": ["a", "b"]}})


def test_a_presence_conditional_delegates_to_the_extension_schema():
    doc = {"$id": A, "allOf": [{"if": {"required": ["x-inherit-b"]},
                                "then": {"properties": {"x-inherit-b": {"$ref": "b.json"}}}}]}
    rule = compiler({A: doc, B: {"$id": B}}).rule(A)
    assert rule["conditionals"] == [{"if": {"required": ["x-inherit-b"]},
                                     "then": {"properties": {"x-inherit-b": {"$ref": B}}}}]


def test_top_level_pattern_properties_are_an_assertion():
    block = {"type": "object", "maxProperties": 2, "propertyNames": {"pattern": "^[a-z]+$", "maxLength": 8}}
    doc = {"$id": A, "patternProperties": {"^x-inherit-": block}}
    assert compiler({A: doc}).rule(A)["asserts"] == [{"patternProperties": {"^x-inherit-": block}}]


def test_an_unsupported_keyword_in_a_branch_fails_generation():
    doc = {"$id": A, "allOf": [{"if": DISC, "then": {"properties": {"n": {"minLength": 1}}}}]}
    with pytest.raises(SystemExit):
        compiler({A: doc}).rule(A)


def test_a_ref_to_a_fragment_fails_generation():
    doc = {"$id": A, "allOf": [{"if": DISC, "then": {"$ref": "b.json#/properties/x"}}]}
    with pytest.raises(SystemExit):
        compiler({A: doc, B: {"$id": B}}).rule(A)


def test_annotations_are_ignored():
    doc = {"$id": A, "allOf": [{"if": DISC, "then": {"$comment": "c", "description": "d", "required": ["v"]}}]}
    assert compiler({A: doc}).rule(A)["conditionals"][0]["then"] == {"required": ["v"]}


def test_closed_counts_names_from_members_the_layer_does_not_compile():
    other = {"if": {"properties": {"k": {"enum": ["a", "b"]}}}, "then": {"properties": {"extra": {}}}}
    doc = {"$id": A, "unevaluatedProperties": False, "properties": {"kind": {}},
           "allOf": [{"if": DISC, "then": {"$ref": "b.json"}}, other]}
    rule = compiler({A: doc, B: {"$id": B, "properties": {"fromB": {}}}}).rule(A)
    assert "extra" in rule["closed"]["props"]
    # Names a compiled branch evaluates are added per document, not up front.
    assert "fromB" not in rule["closed"]["props"]


def test_closed_is_left_to_the_generator_when_a_member_is_unknowable():
    doc = {"$id": A, "unevaluatedProperties": False,
           "allOf": [{"if": DISC, "then": {}}, {"$ref": "b.json#/$defs/x"}]}
    assert compiler({A: doc}).rule(A)["closed"] is None


def test_nonnull_only_when_the_schema_certainly_refuses_null():
    c = compiler({A: {"$id": A, "type": "object"}, B: {"$id": B}})
    assert c.nonnull({"type": "object"}, A, set())
    assert c.nonnull({"$ref": "a.json"}, A, set())
    assert c.nonnull({"enum": ["x"]}, A, set())
    assert not c.nonnull({"type": ["object", "null"]}, A, set())
    assert not c.nonnull({"enum": ["x", None]}, A, set())
    assert not c.nonnull({"description": "anything"}, A, set())
    # An untyped target: unsure, so null is left to the generated validator.
    assert not c.nonnull({"$ref": "b.json"}, A, set())
