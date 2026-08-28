#!/usr/bin/env python3
"""
Check all .md files in the repo for counts that contradict schema-stats.json.

Reads the generated stats file and searches for common phrasing patterns
like "22 core entity schemas", "7 common types", etc. Reports any line
where a number doesn't match the current truth.

Also checks schema-stats.json itself for "???" values — stats that
could not be determined and need investigation.

Exit code 0 = all clean. Exit code 1 = stale counts or ??? values found.
"""

import json
import re
import sys
from pathlib import Path


def main():
    repo_root = Path(__file__).resolve().parent.parent
    stats_path = repo_root / "reference-data" / "schema-stats.json"

    if not stats_path.exists():
        print("FATAL: reference-data/schema-stats.json not found.", file=sys.stderr)
        print("Run: python3 scripts/generate-stats.py", file=sys.stderr)
        sys.exit(2)

    with open(stats_path) as f:
        stats = json.load(f)

    problems = []

    # Check for ??? values first
    unknown_stats = []
    for key, value in stats.items():
        if key.startswith("_"):
            continue
        if value == "???":
            unknown_stats.append(key)
            problems.append(
                f"UNKNOWN: schema-stats.json has \"{key}\": \"???\" — "
                f"could not determine this value. Please investigate and "
                f"report at https://github.com/openinherit/standard/issues"
            )

    # Check health warnings
    for warning in stats.get("_healthWarnings", []):
        problems.append(f"HEALTH: {warning}")

    # Patterns to search for in .md files: (regex, stat key, description)
    patterns = [
        (r"(\d+)\s+(?:core\s+)?entit(?:y|ies)\s+schema", "entitySchemas", "entity schemas"),
        (r"(\d+)\s+common\s+type", "commonTypes", "common types"),
        (r"(\d+)\s+jurisdiction.*?extension", "extensionDirectories", "extension directories"),
        (r"(\d+)\s+reference[- ]data\s+file", "referenceDataFiles", "reference data files"),
        (r"(\d+)\s+(?:root\s+)?propert(?:y|ies)\s+(?:on|in)\s+(?:root|schema)", "rootProperties", "root properties"),
        (r"(\d+)\s+(?:validated\s+)?fixture", "fixtures", "fixtures"),
        # "total schemas" only matches "NN total schemas"
        (r"(\d+)\s+total\s+schema", "totalSchemas", "total schemas"),
    ]

    # Files to skip
    skip_dirs = {".git", "node_modules", ".next", "reference-data", "packages"}
    skip_files = {"CHANGELOG.md"}  # Historical records, counts are point-in-time

    checked = 0

    for md_file in sorted(repo_root.rglob("*.md")):
        rel = md_file.relative_to(repo_root)
        if any(part in skip_dirs for part in rel.parts):
            continue
        if md_file.name in skip_files:
            continue

        try:
            content = md_file.read_text(encoding="utf-8")
        except (UnicodeDecodeError, PermissionError):
            continue

        for line_num, line in enumerate(content.splitlines(), 1):
            for regex, stat_key, desc in patterns:
                for match in re.finditer(regex, line, re.IGNORECASE):
                    checked += 1
                    found_num = int(match.group(1))
                    expected = stats.get(stat_key)

                    # If the stat is "???" we can't compare — skip
                    if expected == "???":
                        continue

                    if expected is not None and found_num != expected:
                        problems.append(
                            f"STALE: {rel}:{line_num} says "
                            f"\"{found_num} {desc}\" — should be {expected}"
                        )

    if problems:
        unknown_count = len(unknown_stats)
        stale_count = len(problems) - unknown_count - len(stats.get("_healthWarnings", []))

        print(f"Found {len(problems)} problem(s):\n")
        for p in problems:
            print(f"  {p}")
        print(f"\nChecked {checked} count references across .md files.")

        if unknown_stats:
            print(f"\n⚠ {unknown_count} stat(s) are '???' — these will appear as ??? in docs.")
            print("  Readers will see the problem. Fix the underlying issue and re-run generate-stats.py.")

        if stale_count > 0:
            print(f"\n{stale_count} stale count(s) in .md files — update them to match schema-stats.json.")

        sys.exit(1)
    else:
        print(f"All clean. Checked {checked} count references across .md files.")
        print("No ??? values. No stale counts.")
        sys.exit(0)


if __name__ == "__main__":
    main()
