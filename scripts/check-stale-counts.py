#!/usr/bin/env python3
"""
Check the standard's published self-counts against its own v3/ tree.

Truth is the TREE, never reference-data/schema-stats.json. Until October 2026
this checker took that file as truth, and the file had been frozen since March
2026 because its generator still read v1/: run on a correct ROADMAP line it
said "21 extension directories — should be 13", i.e. it pushed correct prose
down to the stale figure. Both are now judged against one derivation
(scripts/lib/schema_stats.py):

  FLOOR  a count fell below its floor (something was removed)
  DRIFT  schema-stats.json disagrees with the tree (regenerate it)
  STALE  a .md file states a count the tree does not have

Point-in-time text is exempt: CHANGELOG.md, docs/_archive_/, and any section
under a heading that starts "Delivered in" (until the next heading of the same
or a higher level). Those record what was true then.

Exit 0 clean · 1 problems found · 2 CANNOT ANSWER (no v3/ tree, or no
schema-stats.json to compare). 2 is never a pass.
"""

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from schema_stats import STATS_FILE, CannotAnswer, derive  # noqa: E402

# A count must not be the tail of a version or date ("JSON Schema 2020-12
# entity schemas" is not "12 entity schemas").
N = r"(?<![\d.\-])(\d+)"
PATTERNS = [
    (N + r"\s+(?:core\s+)?entit(?:y|ies)\s+schema", "entitySchemas", "entity schemas"),
    (N + r"\s+common\s+type", "commonTypes", "common types"),
    (N + r"\s+(?:jurisdiction(?:al)?(?:/cultural)?\s+)?extensions?\b(?!\s+guide)",
     "extensionDirectories", "extension directories"),
    (N + r"\s+reference[- ]data\s+file", "referenceDataFiles", "reference data files"),
    (N + r"\s+(?:root\s+)?propert(?:y|ies)\s+(?:on|in)\s+(?:root|schema)", "rootProperties", "root properties"),
    (N + r"\s+(?:validated\s+)?fixture", "fixtures", "fixtures"),
    (N + r"\s+total\s+schema", "totalSchemas", "total schemas"),
]
SKIP_DIRS = {".git", "node_modules", ".next", "reference-data", "packages", "_archive_"}
SKIP_FILES = {"CHANGELOG.md"}
HEADING = re.compile(r"^(#{1,6})\s+(.*)")
HISTORICAL = re.compile(r"^Delivered in\b", re.IGNORECASE)


def prose_problems(repo_root: Path, truth: dict):
    problems, checked = [], 0
    for md in sorted(repo_root.rglob("*.md")):
        rel = md.relative_to(repo_root)
        if any(part in SKIP_DIRS for part in rel.parts) or md.name in SKIP_FILES:
            continue
        try:
            lines = md.read_text(encoding="utf-8").splitlines()
        except (UnicodeDecodeError, PermissionError):
            continue
        historical_level = None
        for n, line in enumerate(lines, 1):
            h = HEADING.match(line)
            if h:
                level = len(h.group(1))
                if historical_level is not None and level <= historical_level:
                    historical_level = None
                if historical_level is None and HISTORICAL.match(h.group(2)):
                    historical_level = level
            if historical_level is not None:
                continue
            for regex, key, desc in PATTERNS:
                for m in re.finditer(regex, line, re.IGNORECASE):
                    checked += 1
                    expected = truth[key]
                    if expected == "???":
                        continue  # already reported as FLOOR
                    if int(m.group(1)) != expected:
                        problems.append(f'STALE: {rel}:{n} says "{m.group(1)} {desc}" — should be {expected}')
    return problems, checked


def main():
    repo_root = Path(__file__).resolve().parent.parent
    try:
        truth = derive(repo_root)
    except CannotAnswer as e:
        print(f"CANNOT ANSWER: {e}", file=sys.stderr)
        sys.exit(2)

    stats_path = repo_root / STATS_FILE
    try:
        published = json.loads(stats_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        print(f"CANNOT ANSWER: {STATS_FILE} is missing or unreadable ({e}).", file=sys.stderr)
        print("Run: python3 scripts/generate-stats.py", file=sys.stderr)
        sys.exit(2)

    problems = [f"FLOOR: {w}" for w in truth["_healthWarnings"]]

    for key in sorted(set(truth) | set(published)):
        if key == "_generatedAt":
            continue
        if published.get(key) != truth.get(key):
            problems.append(f"DRIFT: {STATS_FILE} {key} is {json.dumps(published.get(key))[:120]}, "
                            f"the tree says {json.dumps(truth.get(key))[:120]}")

    stale, checked = prose_problems(repo_root, truth)
    problems += stale

    if problems:
        print(f"Found {len(problems)} problem(s):\n")
        for p in problems:
            print(f"  {p}")
        print(f"\nChecked {checked} count references across .md files.")
        if any(p.startswith("DRIFT") for p in problems):
            print("\nDRIFT: run python3 scripts/generate-stats.py and commit the result.")
        if stale:
            print(f"\n{len(stale)} stale count(s) in .md files — correct them to the tree's number,")
            print("or, if the text records what was true at a past release, put it under a")
            print("'Delivered in …' heading.")
        sys.exit(1)

    print(f"All clean. schema-stats.json matches the tree; checked {checked} count references.")
    sys.exit(0)


if __name__ == "__main__":
    main()
