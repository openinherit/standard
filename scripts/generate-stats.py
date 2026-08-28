#!/usr/bin/env python3
"""
Generate schema-stats.json from the INHERIT spec file system.

This is the single source of truth for all counts referenced in
documentation and the website. Run after any schema change.

Failover: every stat has a minimum floor based on known history.
If a count drops below its floor, the stat is replaced with "???"
and a warning is printed. This means docs still publish, but readers
see "??? entity schemas" instead of a wrong number — an obvious
signal that something needs fixing.

The warnings array in the output lists every stat that failed,
so automated checks can detect the problem too.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Minimum floors — these represent the lowest plausible value.
# Update these when you INTENTIONALLY remove schemas or properties.
FLOORS = {
    "entitySchemas": (15, "Started with 20, grew to 22+. Below 15 means files are missing."),
    "commonTypes": (5, "Started with 7. Below 5 means common/ was deleted or moved."),
    "extensionDirectories": (10, "Started with 13. Below 10 means extensions were removed."),
    "referenceDataFiles": (8, "Started with 11. Below 8 means reference-data/ lost files."),
    "rootProperties": (20, "Started with 29. Below 20 means schema.json was restructured."),
    "fixtures": (5, "Started with 10. Below 5 means fixtures were deleted."),
}


def count_json_files(directory: str) -> int:
    """Count .json files in a directory (non-recursive)."""
    p = Path(directory)
    if not p.is_dir():
        return 0
    return len(list(p.glob("*.json")))


def count_subdirectories(directory: str) -> int:
    """Count immediate subdirectories."""
    p = Path(directory)
    if not p.is_dir():
        return 0
    return len([d for d in p.iterdir() if d.is_dir()])


def list_basenames(directory: str, suffix: str = ".json") -> list[str]:
    """List basenames (without extension) of files in a directory."""
    p = Path(directory)
    if not p.is_dir():
        return []
    return sorted(f.stem for f in p.glob(f"*{suffix}"))


def main():
    # Resolve repo root (script lives in scripts/)
    repo_root = Path(__file__).resolve().parent.parent
    os.chdir(repo_root)

    # Read root schema for property count
    schema_path = Path("v1/schema.json")
    if not schema_path.exists():
        print("FATAL: v1/schema.json not found. Are you in the right directory?", file=sys.stderr)
        sys.exit(1)

    with open(schema_path) as f:
        schema = json.load(f)

    root_properties = schema.get("properties")
    if not isinstance(root_properties, dict):
        print("FATAL: v1/schema.json has no 'properties' object. Schema structure has changed.", file=sys.stderr)
        sys.exit(1)

    # Read package version
    pkg_version = "unknown"
    pkg_path = Path("packages/schema/package.json")
    if pkg_path.exists():
        with open(pkg_path) as f:
            pkg = json.load(f)
            pkg_version = pkg.get("version", "unknown")

    # Compute raw stats
    raw = {
        "entitySchemas": count_json_files("v1"),
        "commonTypes": count_json_files("v1/common"),
        "extensionDirectories": count_subdirectories("v1/extensions"),
        "referenceDataFiles": count_json_files("reference-data"),
        "rootProperties": len(root_properties),
        "fixtures": count_json_files("examples/fixtures"),
    }

    # Failover: check every stat against its floor.
    # Stats below floor become "???" — docs still publish, but the
    # problem is visible to every reader.
    warnings = []
    stats = {}

    for stat_name, value in raw.items():
        floor_entry = FLOORS.get(stat_name)
        if floor_entry:
            floor, explanation = floor_entry
            if value < floor:
                stats[stat_name] = "???"
                warning = f"{stat_name}: got {value}, floor is {floor}. {explanation}"
                warnings.append(warning)
                print(f"WARNING: {warning}", file=sys.stderr)
                print(f"  → Set to '???' in schema-stats.json. Please investigate and report.", file=sys.stderr)
            else:
                stats[stat_name] = value
        else:
            stats[stat_name] = value

    # Derived stats — only compute if inputs are valid
    entity_count = stats["entitySchemas"]
    common_count = stats["commonTypes"]
    ext_count = stats["extensionDirectories"]

    if all(isinstance(v, int) for v in [entity_count, common_count, ext_count]):
        stats["totalSchemas"] = entity_count + common_count + ext_count
    else:
        stats["totalSchemas"] = "???"

    # Lists for programmatic use (these don't need floors — empty is valid)
    stats["entities"] = list_basenames("v1")
    stats["commonTypeNames"] = list_basenames("v1/common")
    stats["extensionNames"] = sorted(
        d.name for d in Path("v1/extensions").iterdir() if d.is_dir()
    ) if Path("v1/extensions").is_dir() else []
    stats["rootPropertyNames"] = sorted(root_properties.keys())
    stats["fixtureNames"] = list_basenames("examples/fixtures")

    # Metadata
    stats["_generatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    stats["_generator"] = "scripts/generate-stats.py"
    stats["_warning"] = "Auto-generated. Do not edit manually. Run: python3 scripts/generate-stats.py"
    stats["version"] = pkg_version

    # Warnings array — empty means all healthy
    stats["_healthWarnings"] = warnings

    # Write output
    output_path = Path("reference-data/schema-stats.json")
    with open(output_path, "w") as f:
        json.dump(stats, f, indent=2)
        f.write("\n")

    # Print summary to stdout
    print(f"schema-stats.json updated ({stats['_generatedAt']})")
    for key in ["entitySchemas", "commonTypes", "extensionDirectories",
                "referenceDataFiles", "rootProperties", "fixtures", "totalSchemas"]:
        value = stats[key]
        flag = " ⚠ UNKNOWN" if value == "???" else ""
        label = key.ljust(22)
        print(f"  {label}{value}{flag}")
    print(f"  {'version'.ljust(22)}{stats['version']}")

    if warnings:
        print(f"\n⚠ {len(warnings)} stat(s) could not be determined — set to '???'")
        print("  Readers will see '???' in place of numbers. Please investigate.")
        # Exit 0 — we still published, the damage is visible, not silent
    else:
        print("\n✓ All stats healthy.")


if __name__ == "__main__":
    main()
