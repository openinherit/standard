# SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
# SPDX-License-Identifier: Apache-2.0
"""The one derivation of the standard's self-counts from its own tree.

Both scripts/generate-stats.py (which writes reference-data/schema-stats.json)
and scripts/check-stale-counts.py (which judges prose and that file) call
derive(). Neither reads a count from anywhere else, so neither can inherit
the other's staleness: that is how the checker came to tell maintainers to
change correct prose down to a frozen March 2026 figure.

What each stat counts (non-recursive unless stated):
  entitySchemas         v3/*.json — every top-level schema, root and dialect included
  commonTypes           v3/common/*.json
  extensionDirectories  immediate subdirectories of v3/extensions/
  referenceDataFiles    reference-data/*.json, schema-stats.json itself included
                        whether or not it exists yet, so a first run and a re-run agree
  rootProperties        keys of "properties" in v3/schema.json
  fixtures              examples/fixtures/*.json
  totalSchemas          entitySchemas + commonTypes + extensionDirectories
"""

import json
from pathlib import Path

VERSION_DIR = "v3"
STATS_FILE = "reference-data/schema-stats.json"
PACKAGE_FILE = "packages/schema/package.json"

# Floors are the counts measured on 19 October 2026. A count below its floor is
# a removal, and the generator publishes "???" for it instead of a smaller
# number. When you remove a schema ON PURPOSE, lower its floor in the same
# commit. Never lower one to make a red go away.
FLOORS = {
    "entitySchemas": (34, "34 on 19 Oct 2026. Fewer means a top-level schema was removed."),
    "commonTypes": (16, "16 on 19 Oct 2026. Fewer means a common type was removed."),
    "extensionDirectories": (22, "22 on 19 Oct 2026. Fewer means an extension was removed."),
    "referenceDataFiles": (38, "38 on 19 Oct 2026. Fewer means reference data was removed."),
    "rootProperties": (45, "45 on 19 Oct 2026. Fewer means a root property was removed."),
    "fixtures": (37, "37 on 19 Oct 2026. Fewer means a fixture was removed."),
}

COUNT_KEYS = ["entitySchemas", "commonTypes", "extensionDirectories",
              "referenceDataFiles", "rootProperties", "fixtures", "totalSchemas"]

DISCLAIMER = ("Informational reference data only. Not legal, tax, or financial advice. "
              "Verify with qualified professionals before relying on any values. "
              "Counts are derived from the v3/ tree by scripts/generate-stats.py.")


class CannotAnswer(Exception):
    """The tree is not one this derivation can count. Never read as a pass."""


def _stems(directory: Path) -> list:
    # v3/index.json lists the schemas; it is not one (scripts/generate-schema-index.mjs).
    return sorted(f.stem for f in directory.glob("*.json") if f.name != "index.json") if directory.is_dir() else []


def derive(root: Path) -> dict:
    """Return the stats dict for the tree at root, without _generatedAt."""
    root = Path(root)
    v = root / VERSION_DIR
    schema_path = v / "schema.json"
    if not schema_path.is_file():
        raise CannotAnswer(f"{VERSION_DIR}/schema.json not found under {root}")
    try:
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise CannotAnswer(f"{VERSION_DIR}/schema.json is unreadable: {e}")
    root_properties = schema.get("properties")
    if not isinstance(root_properties, dict):
        raise CannotAnswer(f"{VERSION_DIR}/schema.json has no 'properties' object")

    pkg_path = root / PACKAGE_FILE
    try:
        version = json.loads(pkg_path.read_text(encoding="utf-8"))["version"]
    except (OSError, ValueError, KeyError) as e:
        raise CannotAnswer(f"cannot read the version from {PACKAGE_FILE}: {e}")

    ext_dir = v / "extensions"
    extension_names = sorted(d.name for d in ext_dir.iterdir() if d.is_dir()) if ext_dir.is_dir() else []
    ref_files = {f.name for f in (root / "reference-data").glob("*.json")} | {Path(STATS_FILE).name}

    raw = {
        "entitySchemas": len(_stems(v)),
        "commonTypes": len(_stems(v / "common")),
        "extensionDirectories": len(extension_names),
        "referenceDataFiles": len(ref_files),
        "rootProperties": len(root_properties),
        "fixtures": len(_stems(root / "examples" / "fixtures")),
    }

    stats = {"_disclaimer": DISCLAIMER}
    warnings = []
    for key, value in raw.items():
        floor, why = FLOORS[key]
        if value < floor:
            stats[key] = "???"
            warnings.append(f"{key}: got {value}, floor is {floor}. {why}")
        else:
            stats[key] = value
    parts = [stats["entitySchemas"], stats["commonTypes"], stats["extensionDirectories"]]
    stats["totalSchemas"] = sum(parts) if all(isinstance(p, int) for p in parts) else "???"

    stats["entities"] = _stems(v)
    stats["commonTypeNames"] = _stems(v / "common")
    stats["extensionNames"] = extension_names
    stats["rootPropertyNames"] = sorted(root_properties)
    stats["fixtureNames"] = _stems(root / "examples" / "fixtures")
    stats["_generator"] = "scripts/generate-stats.py"
    stats["_warning"] = "Auto-generated. Do not edit manually. Run: python3 scripts/generate-stats.py"
    stats["version"] = version
    stats["_healthWarnings"] = warnings
    return stats
