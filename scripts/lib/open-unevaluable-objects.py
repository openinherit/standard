#!/usr/bin/env python3
"""Prepare the OpenAPI bundle for datamodel-codegen (the pydantic leg only).

A pydantic model can forbid unknown keys or allow them, and nothing between.
Two JSON Schema shapes in v3/ need something between, and the generator turns
both into extra="forbid" — so the published models refused VALID documents:

  1. patternProperties beside additionalProperties: false or
     unevaluatedProperties: false. The x-inherit-*
     extension keys are allowed; everything else is not. Forbidding all
     extras refuses every document that uses an extension.
  2. unevaluatedProperties: false over allOf / anyOf / oneOf / if. Keys
     defined inside a conditional branch (asset.vehicle, kinship.lineage)
     are allowed, but the generator cannot see them, so it forbids them.

For exactly those objects this marks additionalProperties: true. The model
then accepts the valid documents, at the cost of also accepting some invalid
ones (a misspelt key on one of these objects). Every such case is visible in
scripts/runtime-validator-divergences.json under pydantic.false_accept.
Refusing a valid document is the worse failure for an interchange format.

Usage: open-unevaluable-objects.py <in.yaml> <out.yaml>
"""
import sys

import yaml

COMPOSITION = ("allOf", "anyOf", "oneOf", "if")


def needs_opening(node: dict) -> bool:
    closed = node.get("additionalProperties") is False or node.get("unevaluatedProperties") is False
    if node.get("patternProperties") and closed:
        return True
    return node.get("unevaluatedProperties") is False and any(k in node for k in COMPOSITION)


def walk(node, counter):
    if isinstance(node, dict):
        if needs_opening(node):
            node["additionalProperties"] = True
            node.pop("unevaluatedProperties", None)
            counter[0] += 1
        for v in node.values():
            walk(v, counter)
    elif isinstance(node, list):
        for v in node:
            walk(v, counter)


def main() -> int:
    src, dst = sys.argv[1], sys.argv[2]
    with open(src) as fh:
        doc = yaml.safe_load(fh)
    counter = [0]
    walk(doc, counter)
    with open(dst, "w") as fh:
        yaml.safe_dump(doc, fh, sort_keys=False, allow_unicode=True)
    print(f"open-unevaluable-objects: {counter[0]} objects opened for the pydantic leg")
    return 0


if __name__ == "__main__":
    sys.exit(main())
