#!/usr/bin/env python3
"""Every rule body and verdict fixture declares the ONE jurisdiction it is written for.

A rule scoped to a jurisdiction it does not declare cannot be checked: divergent
amendment has nothing to amend against, coverage is inferred from filenames a rename
silently breaks, and a deliberately jurisdiction-neutral module looks exactly like one
nobody filled in. So the jurisdiction is a structured slot, one per carrier:

  .catala_en              a prose line `Jurisdiction: <KEY>` outside any code block,
                          beside the SPDX lines (a leading `>` is reserved for Catala
                          directives, so the slot is not one)
  .cedar                  `@jurisdiction("<KEY>")` on EVERY policy in the file, all equal
                          (a Cedar annotation, so it survives parsing and a consumer
                          loading the policy set can read it)
  *.test-fixtures.json    a top-level `"jurisdiction": "<KEY>"`; a `jurisdiction` nested
  *.expected-output.json  inside a case is input data, not the fixture's own scope
  *.verdict.json

<KEY> is a non-deprecated key of reference-data/jurisdiction-profiles.json, or the literal
`jurisdiction-neutral`, which a shared module uses to say it has no jurisdiction BY DESIGN.
Silence is always refused. Exact key membership means a composite (`XA+XB`,
`uk-eng-wales-and-scotland`) is refused as an unknown key; no token heuristic is needed.

A fixture beside a Catala body (same stem) must declare what the body declares.

Exit: 0 clear - 1 REFUSED - 2 CANNOT ANSWER. 2 is NEVER a pass.
"""
import argparse
import json
import re
import sys
from pathlib import Path

PROFILES = "reference-data/jurisdiction-profiles.json"
NEUTRAL = "jurisdiction-neutral"
# The same discovery as the external one-jurisdiction fence, so both count one population.
RULE_DIRS = ("catala", "cedar", "rules", "fixtures", "verdicts")
RULE_SUFFIXES = (".catala_en", ".cedar")
FIXTURE_SUFFIXES = (".test-fixtures.json", ".verdict.json", ".expected-output.json")

CATALA_SLOT = re.compile(r"^Jurisdiction:\s*(\S+)\s*$")
CEDAR_ANNOTATION = re.compile(r'@\s*([A-Za-z_]\w*)\s*(?:\(\s*"((?:[^"\\]|\\.)*)"\s*\))?\s*')
CEDAR_EFFECT = re.compile(r"(permit|forbid)\s*\(")
CEDAR_STRING = re.compile(r'"(?:[^"\\]|\\.)*"')
# A second effect inside one statement means a `;` is missing, so the second
# policy would otherwise be read as part of the first and never checked.
CEDAR_ANOTHER_EFFECT = re.compile(r"(?<![\w.:])(permit|forbid)\s*\(")


class CannotAnswer(Exception):
    """The gate could not reach a verdict. Never reported as clear."""


def load_keys(tree):
    path = tree / PROFILES
    try:
        rows = json.loads(path.read_text(encoding="utf-8"))["jurisdictions"]
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise CannotAnswer(f"cannot read the jurisdiction keys from {PROFILES}: {exc}") from exc
    if not isinstance(rows, dict) or not rows:
        raise CannotAnswer(f"{PROFILES} holds no jurisdictions")
    live = {k for k, v in rows.items() if not (isinstance(v, dict) and v.get("deprecated"))}
    return live, set(rows) - live


def rule_files(tree):
    for path in sorted(tree.rglob("*")):
        if not path.is_file() or ".git" in path.parts or "node_modules" in path.parts:
            continue
        if not any(part in RULE_DIRS for part in path.relative_to(tree).parts):
            continue
        if path.name.endswith(RULE_SUFFIXES + FIXTURE_SUFFIXES):
            yield path


def catala_slot(text):
    """-> (value | None, problem | None). Lines inside ``` blocks are code, not slots."""
    found, in_code = [], False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_code = not in_code
            continue
        if not in_code:
            match = CATALA_SLOT.match(line)
            if match:
                found.append(match.group(1))
    if not found:
        return None, "no jurisdiction slot (want a line `Jurisdiction: <KEY>`)"
    if len(found) > 1:
        return None, f"{len(found)} jurisdiction slots {found}; a body declares exactly one"
    return found[0], None


def cedar_statements(text):
    """Strip // comments and split on ; -- both only outside string literals."""
    out, buf, i, in_str = [], [], 0, False
    while i < len(text):
        ch = text[i]
        if in_str:
            buf.append(ch)
            if ch == "\\" and i + 1 < len(text):
                buf.append(text[i + 1])
                i += 1
            elif ch == '"':
                in_str = False
        elif ch == '"':
            in_str = True
            buf.append(ch)
        elif text.startswith("//", i):
            while i < len(text) and text[i] != "\n":
                i += 1
            continue
        elif ch == ";":
            out.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
        i += 1
    tail = "".join(buf).strip()
    if tail:
        out.append(tail)
    return [s.strip() for s in out if s.strip()]


def cedar_slot(text):
    values, problems = [], []
    statements = cedar_statements(text)
    if not statements:
        return None, "no policy in the file, so nothing carries a jurisdiction slot"
    for n, stmt in enumerate(statements, 1):
        pos, annotations = 0, {}
        while True:
            match = CEDAR_ANNOTATION.match(stmt, pos)
            if not match:
                break
            annotations[match.group(1)] = match.group(2)
            pos = match.end()
        effect = CEDAR_EFFECT.match(stmt, pos)
        if not effect:
            problems.append(f"statement {n} is not a permit/forbid policy")
        elif CEDAR_ANOTHER_EFFECT.search(CEDAR_STRING.sub('""', stmt[effect.end():])):
            problems.append(f"statement {n} holds more than one policy (a `;` is missing)")
        elif annotations.get("jurisdiction") is None:
            problems.append(f'policy {n} has no @jurisdiction("<KEY>") annotation')
        else:
            values.append(annotations["jurisdiction"])
    if problems:
        return None, "; ".join(problems)
    if len(set(values)) > 1:
        return None, f"policies disagree: {sorted(set(values))}; a file declares exactly one"
    return values[0], None


def fixture_slot(text):
    try:
        data = json.loads(text)
    except ValueError as exc:
        raise CannotAnswer(f"unparseable JSON: {exc}") from exc
    if not isinstance(data, dict) or "jurisdiction" not in data:
        return None, 'no top-level "jurisdiction" key'
    value = data["jurisdiction"]
    if not isinstance(value, str):
        return None, f'"jurisdiction" must be one key as a string, not {json.dumps(value)}'
    return value, None


def sibling_body(path):
    for suffix in FIXTURE_SUFFIXES:
        if path.name.endswith(suffix):
            return path.with_name(path.name[: -len(suffix)] + ".catala_en")
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--tree", required=True, help="repo checkout to check")
    ap.add_argument("--min-files", type=int, default=0, metavar="N",
                    help="discovery floor: fewer than N rule/fixture files -> exit 2, because "
                         "a broken glob that finds nothing would otherwise pass")
    args = ap.parse_args()
    tree = Path(args.tree)

    try:
        if not tree.is_dir():
            raise CannotAnswer(f"--tree {tree} is not a directory")
        live, deprecated = load_keys(tree)
        files = list(rule_files(tree))
        declared, refused = {}, []
        for path in files:
            rel = path.relative_to(tree)
            try:
                text = path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError) as exc:
                raise CannotAnswer(f"{rel}: unreadable: {exc}") from exc
            if path.name.endswith(".catala_en"):
                value, problem = catala_slot(text)
            elif path.name.endswith(".cedar"):
                value, problem = cedar_slot(text)
            else:
                try:
                    value, problem = fixture_slot(text)
                except CannotAnswer as exc:
                    raise CannotAnswer(f"{rel}: {exc}") from exc
            if problem is None and value != NEUTRAL and value not in live:
                why = "is deprecated in" if value in deprecated else "is not a key of"
                problem = f"{value!r} {why} {PROFILES} (nor {NEUTRAL!r})"
            if problem:
                refused.append(f"{rel}: {problem}")
            else:
                declared[path] = value
    except CannotAnswer as exc:
        print(f"CANNOT ANSWER: {exc}", file=sys.stderr)
        return 2

    for path, value in declared.items():
        body = sibling_body(path)
        if body is not None and body in declared and declared[body] != value:
            refused.append(f"{path.relative_to(tree)}: declares {value!r} but its rule body "
                           f"{body.relative_to(tree)} declares {declared[body]!r}")

    print(f"scanned {len(files)} rule/fixture file(s)")
    for line in refused:
        print(f"REFUSED  {line}")
    if len(files) < args.min_files:
        print(f"CANNOT ANSWER: discovery found {len(files)} rule/fixture file(s), floor is "
              f"{args.min_files}. A rule was deleted (lower the floor knowingly) or the "
              f"discovery no longer matches the tree (fix the gate).", file=sys.stderr)
        return 2
    return 1 if refused else 0


if __name__ == "__main__":
    sys.exit(main())
