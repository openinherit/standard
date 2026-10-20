# SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
# SPDX-License-Identifier: Apache-2.0
"""Shared by build-conformance-kit.py and check-conformance-kit.py."""
import copy
import hashlib
import json
import re
from pathlib import Path


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def dump_json(value):
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def sha256_of(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _tokens(pointer):
    if pointer == "":
        return []
    if not pointer.startswith("/"):
        raise ValueError(f"{pointer!r} is not a JSON Pointer")
    return [t.replace("~1", "/").replace("~0", "~") for t in pointer[1:].split("/")]


def apply_op(document, op):
    """Apply ONE JSON Patch operation (add, replace or remove; RFC 6902) to a copy."""
    doc = copy.deepcopy(document)
    *parents, last = _tokens(op["path"]) or [None]
    if last is None:
        raise ValueError("an operation on the whole document is not a single-rule mutation")
    target = doc
    for token in parents:
        target = target[int(token)] if isinstance(target, list) else target[token]
    kind = op["op"]
    if isinstance(target, list):
        if last == "-" and kind == "add":
            index = len(target)
        elif re.fullmatch(r"0|[1-9][0-9]*", last):
            index = int(last)
        else:
            raise ValueError(f"{op['path']}: {last!r} is not an array index")
        if index > len(target) or (kind != "add" and index == len(target)):
            raise IndexError(f"{op['path']}: index {index} is out of range")
        if kind == "add":
            target.insert(index, op["value"])
        elif kind == "replace":
            target[index] = op["value"]
        elif kind == "remove":
            del target[index]
        else:
            raise ValueError(f"unsupported op {kind!r}")
        return doc
    if kind == "add":
        if last in target:
            raise ValueError(f"add: {op['path']} already exists (use replace)")
        target[last] = op["value"]
    elif kind == "replace":
        if last not in target:
            raise KeyError(op["path"])
        target[last] = op["value"]
    elif kind == "remove":
        del target[last]
    else:
        raise ValueError(f"unsupported op {kind!r}")
    return doc
