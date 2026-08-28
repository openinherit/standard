#!/usr/bin/env python3
"""
Add missing root properties to all fixtures with safe defaults.

Run after adding any new optional root property to schema.json.
Uses absolute paths — never depends on the current working directory.

When you add a new optional root property, update OPTIONAL_DEFAULTS below.
"""

import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FIXTURES_DIR = REPO / "examples" / "fixtures"

# Default values for optional root properties.
# Update this dict when new optional root properties are added to schema.json.
OPTIONAL_DEFAULTS = {
    "valuations": [],
    "lifetimeTransfers": [],
    "assetCollections": [],
    "assetInterests": [],
    "completeness": {},
    "taxPosition": {},
    "recommendedActions": [],
    "conformance": {},
}


def main():
    if not FIXTURES_DIR.is_dir():
        print(f"FATAL: {FIXTURES_DIR} not found. Are you in the right repo?")
        raise SystemExit(1)

    fixed = 0
    total = 0

    for fixture_path in sorted(FIXTURES_DIR.glob("*.json")):
        total += 1
        doc = json.loads(fixture_path.read_text())
        changed = False

        for prop, default in OPTIONAL_DEFAULTS.items():
            if prop not in doc:
                doc[prop] = default
                changed = True

        if changed:
            fixture_path.write_text(json.dumps(doc, indent=2) + "\n")
            missing = [p for p in OPTIONAL_DEFAULTS if p not in json.loads(fixture_path.read_text())]
            print(f"FIXED: {fixture_path.name}")
            fixed += 1
        else:
            print(f"OK: {fixture_path.name}")

    print(f"\n{fixed}/{total} fixture(s) updated." if fixed else f"\nAll {total} fixtures up to date.")


if __name__ == "__main__":
    main()
