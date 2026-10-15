#!/usr/bin/env python3
"""RED when the OpenAPI component list and the JSON Schemas in v3/ disagree.

openapi/openapi.yaml is the document the SDK clients are generated from, and it
reaches the schemas only through `components.schemas.<Name>.$ref: '../v3/…'`.
A schema added to v3/ without a component is therefore invisible to every
generated client, and nothing else in CI notices: the bundle, the Zod and the
pydantic models are all regenerated from this document, so they agree with it
perfectly while all missing the same type.

A v3/ file is a candidate when it carries a top-level "$schema". Files without
one (extension manifests, the JSON-LD context) are not schemas and are counted,
not checked. A candidate that deliberately has no component is named, with a
reason, in scripts/data/openapi-component-exclusions.json — positive
authorisation only: absence from both lists is a refusal.

Findings (each exits 1):
  MISSING          a v3/ schema no component references and no exclusion names
  DANGLING         a component $ref to a v3/ file that does not exist
  DUPLICATE        two components referencing one v3/ file
  STALE-EXCLUSION  an exclusion naming a file that is absent or IS a component
  an exclusion with no reason

exit 0 clear · 1 REFUSED · 2 CANNOT ANSWER (inputs absent or empty) — 2 is never a pass.
"""
from __future__ import annotations

import argparse
import json
import posixpath
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover - environment problem, not a finding
    print("CANNOT ANSWER — PyYAML is not installed", file=sys.stderr)
    sys.exit(2)


def cannot_answer(why: str) -> None:
    print(f"CANNOT ANSWER — {why}", file=sys.stderr)
    sys.exit(2)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--root", default=str(Path(__file__).resolve().parent.parent),
                    help="repo root (default: this script's repo)")
    ap.add_argument("--openapi", default="openapi/openapi.yaml")
    ap.add_argument("--exclusions", default="scripts/data/openapi-component-exclusions.json")
    args = ap.parse_args()

    root = Path(args.root)
    openapi_path = root / args.openapi
    register_path = root / args.exclusions
    v3 = root / "v3"

    if not openapi_path.is_file():
        cannot_answer(f"{args.openapi} not found")
    if not register_path.is_file():
        cannot_answer(f"{args.exclusions} not found")

    candidates: set[str] = set()
    non_schema = 0
    for f in sorted(v3.rglob("*.json")) if v3.is_dir() else []:
        rel = f.relative_to(root).as_posix()
        try:
            doc = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as e:
            cannot_answer(f"{rel} is not readable JSON: {e}")
        if isinstance(doc, dict) and "$schema" in doc:
            candidates.add(rel)
        else:
            non_schema += 1
    if not candidates:
        cannot_answer("v3/ holds no JSON Schemas — nothing to compare against")

    try:
        spec = yaml.safe_load(openapi_path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as e:
        cannot_answer(f"{args.openapi} is not readable YAML: {e}")
    schemas = ((spec or {}).get("components") or {}).get("schemas") or {}

    # component name -> repo-relative v3/ path, for refs that leave openapi/ into v3/
    base = posixpath.dirname(args.openapi)
    refs: dict[str, list[str]] = {}
    for name, body in schemas.items():
        ref = body.get("$ref") if isinstance(body, dict) else None
        if not isinstance(ref, str) or ref.startswith("#"):
            continue
        target = posixpath.normpath(posixpath.join(base, ref.split("#", 1)[0]))
        if target.startswith("v3/"):
            refs.setdefault(target, []).append(name)
    if not refs:
        cannot_answer(f"{args.openapi} has no component $ref into v3/")

    try:
        register = json.loads(register_path.read_text(encoding="utf-8"))
        excluded = {e["path"]: (e.get("reason") or "").strip() for e in register["excluded"]}
    except (OSError, json.JSONDecodeError, KeyError, TypeError) as e:
        cannot_answer(f"{args.exclusions} is not a valid register: {e}")

    findings: list[str] = []
    for path in sorted(candidates - set(refs) - set(excluded)):
        findings.append(f"MISSING {path} — a v3/ schema with no component in {args.openapi}; "
                        f"add one, or name it with a reason in {args.exclusions}")
    for path, names in sorted(refs.items()):
        if not (root / path).is_file():
            findings.append(f"DANGLING {path} — referenced by {', '.join(names)}, file does not exist")
        if len(names) > 1:
            findings.append(f"DUPLICATE {path} — referenced by {len(names)} components: {', '.join(names)}")
    for path, reason in sorted(excluded.items()):
        if path in refs:
            findings.append(f"STALE-EXCLUSION {path} — excluded, but it IS a component "
                            f"({', '.join(refs[path])}); drop the exclusion")
        elif path not in candidates:
            findings.append(f"STALE-EXCLUSION {path} — excluded, but no such v3/ schema exists")
        if not reason:
            findings.append(f"EXCLUSION {path} has no reason — every exclusion must say why")

    summary = (f"{len(candidates)} v3/ schemas · {len(refs)} referenced by a component · "
               f"{len(excluded)} excluded · {non_schema} non-schema JSON files skipped")
    if findings:
        print("REFUSED — the OpenAPI component list does not match v3/:", file=sys.stderr)
        for f in findings:
            print(f"  {f}", file=sys.stderr)
        print(summary, file=sys.stderr)
        return 1
    print(f"OpenAPI components match v3/: {summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
