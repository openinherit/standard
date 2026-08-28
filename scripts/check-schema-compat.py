#!/usr/bin/env python3
"""
Compare INHERIT v3 schemas against a baseline and report breaking changes.

Breaking changes detected:
- Removed properties
- Newly required properties (was optional, now required)
- Removed enum values
- Entirely removed schema files

Usage:
    python3 scripts/check-schema-compat.py <old-dir> <new-dir>

Example:
    git worktree add /tmp/inherit-baseline v3.0.0
    python3 scripts/check-schema-compat.py /tmp/inherit-baseline/v3 ./v3
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Set


def load_schema(path: Path) -> dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def obj_props(schema: dict[str, Any]) -> Set[str]:
    props = schema.get("properties", {})
    return set(props.keys()) if isinstance(props, dict) else set()


def required_set(schema: dict[str, Any]) -> Set[str]:
    req = schema.get("required", [])
    return {r for r in req if isinstance(r, str)} if isinstance(req, list) else set()


def check_file(old_path: Path, new_path: Path) -> list[str]:
    """Compare two schema files and return a list of breaking change descriptions."""
    old = load_schema(old_path)
    new = load_schema(new_path)
    issues: list[str] = []
    name = new_path.name

    # Removed properties
    old_props = obj_props(old)
    new_props = obj_props(new)
    removed = sorted(old_props - new_props)
    if removed:
        issues.append(f"{name}: removed properties: {removed}")

    # Newly required
    old_req = required_set(old)
    new_req = required_set(new)
    newly_required = sorted(new_req - old_req)
    if newly_required:
        issues.append(f"{name}: newly required properties: {newly_required}")

    # Removed enum values (per-property)
    old_props_dict = old.get("properties", {})
    new_props_dict = new.get("properties", {})
    if isinstance(old_props_dict, dict) and isinstance(new_props_dict, dict):
        for prop_name in old_props_dict:
            if prop_name not in new_props_dict:
                continue
            old_prop = old_props_dict[prop_name]
            new_prop = new_props_dict[prop_name]
            if isinstance(old_prop, dict) and isinstance(new_prop, dict):
                old_enum = old_prop.get("enum")
                new_enum = new_prop.get("enum")
                if isinstance(old_enum, list) and isinstance(new_enum, list):
                    old_vals = {str(v) for v in old_enum}
                    new_vals = {str(v) for v in new_enum}
                    removed_vals = sorted(old_vals - new_vals)
                    if removed_vals:
                        issues.append(
                            f"{name}.{prop_name}: removed enum values: {removed_vals}"
                        )

    return issues


def main(old_dir: str, new_dir: str) -> int:
    old_path = Path(old_dir)
    new_path = Path(new_dir)

    if not old_path.is_dir() or not new_path.is_dir():
        print(f"Usage: {sys.argv[0]} <old-schema-dir> <new-schema-dir>")
        return 2

    all_issues: list[str] = []

    # Check all JSON files in the new directory (and subdirectories)
    for new_file in sorted(new_path.rglob("*.json")):
        rel = new_file.relative_to(new_path)
        old_file = old_path / rel
        if old_file.exists():
            issues = check_file(old_file, new_file)
            all_issues.extend(issues)

    # Check for entirely removed schema files
    for old_file in sorted(old_path.rglob("*.json")):
        rel = old_file.relative_to(old_path)
        new_file = new_path / rel
        if not new_file.exists():
            all_issues.append(f"REMOVED SCHEMA: {rel}")

    if all_issues:
        print("BREAKING CHANGES DETECTED:")
        for issue in all_issues:
            print(f"  - {issue}")
        return 1

    print("Schema compatibility check passed — no breaking changes detected.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <old-schema-dir> <new-schema-dir>")
        raise SystemExit(2)
    raise SystemExit(main(sys.argv[1], sys.argv[2]))
