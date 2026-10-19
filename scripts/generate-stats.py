#!/usr/bin/env python3
"""
Generate reference-data/schema-stats.json from the v3/ tree.

The counts in that file are what documentation and the website quote. The
derivation itself lives in scripts/lib/schema_stats.py, shared with
scripts/check-stale-counts.py, so the file and its checker cannot disagree
about what a count is.

Failover: every stat has a floor (FLOORS in the shared module). A count below
its floor is published as "???" and listed in _healthWarnings, so docs still
build but readers see "??? entity schemas" instead of a wrong number, and the
checker goes red.

Exit 0 written · 2 CANNOT ANSWER (no v3/ tree or no package version; nothing
is written).
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from schema_stats import COUNT_KEYS, STATS_FILE, CannotAnswer, derive  # noqa: E402


def main():
    repo_root = Path(__file__).resolve().parent.parent
    try:
        stats = derive(repo_root)
    except CannotAnswer as e:
        print(f"CANNOT ANSWER: {e}", file=sys.stderr)
        sys.exit(2)

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    out = {}
    for key, value in stats.items():
        if key == "_generator":
            out["_generatedAt"] = generated_at
        out[key] = value

    with open(repo_root / STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
        f.write("\n")

    print(f"schema-stats.json updated ({generated_at})")
    for key in COUNT_KEYS:
        flag = " ⚠ UNKNOWN" if out[key] == "???" else ""
        print(f"  {key.ljust(22)}{out[key]}{flag}")
    print(f"  {'version'.ljust(22)}{out['version']}")

    for w in out["_healthWarnings"]:
        print(f"WARNING: {w}", file=sys.stderr)
    if out["_healthWarnings"]:
        print(f"\n⚠ {len(out['_healthWarnings'])} stat(s) below their floor — published as '???'.")
        print("  scripts/check-stale-counts.py will fail until this is resolved.")
    else:
        print("\n✓ All stats healthy.")


if __name__ == "__main__":
    main()
