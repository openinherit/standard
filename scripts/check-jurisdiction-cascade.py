#!/usr/bin/env python3
"""Declared jurisdiction containment, and the per-axis resolution over it (ICP-0060).

The standard keys succession law at one granularity and death taxation at another:
`jurisdiction-profiles.json` knows GB-ENG and GB-SCT; `tax-rates.json` knows GB. Nothing
in the repo declares how a consumer crosses that gap, so the only route available is
string surgery on the key -- and hyphen-truncation lands on a real tax row for every
subdivision-keyed profile row, including US-TX, where a federal-only answer is silently
wrong. A heuristic that is right often enough to be trusted and wrong exactly where it
matters is the failure this file exists to make impossible: the relation is DECLARED per
axis, or the consumer is REFUSED.

What it checks:
  1. Coverage   -- every jurisdiction token the standard ships has a cascade entry, or a
                   declared exclusion carrying a reason. Omission is never an exclusion.
  2. Shape      -- every entry answers every declared axis, and `resolvesTo: null` carries
                   a non-empty `reason`. That is the difference between a declared refusal
                   and an unfilled hole, and it is the whole point of the file.
  3. Structure  -- a union has constituents, an atom has none, and every constituent has an
                   entry of its own.
  4. Honesty    -- a non-null `resolvesTo` must name a token that actually has a row in
                   that axis's source file.
  5. Relation   -- every extensions-registry row declares whether its applicableJurisdictions
                   list CONSTITUTES one jurisdiction or lists jurisdictions it applies
                   WITHIN, and a `constitutes` row must match a declared union exactly.
  6. Membership -- optional, --authority: every token is a member of the derived
                   jurisdiction authority. CONSUMED from TT-1456, never minted here.

Exit: 0 clear - 1 REFUSED - 2 CANNOT ANSWER. 2 is NEVER a pass.

Fixture note: the cascade declares TERRITORIAL containment only. It never adjudicates
legal precedence between extensions -- see docs/implement/extension-composition.md.
"""
import argparse
import json
import pathlib
import sys

CASCADE = "reference-data/jurisdiction-cascade.json"
REGISTRY = "extensions-registry.json"
RELATIONS = ("constitutes", "applies-within")

# Where the shipped tokens live: path -> how to pull the token list out of it.
TOKEN_SOURCES = (
    ("reference-data/jurisdiction-profiles.json", "jurisdictions"),
    ("reference-data/tax-rates.json", "jurisdictions"),
    ("reference-data/tax-thresholds.json", "jurisdictions"),
)


class CannotAnswer(Exception):
    """The gate could not reach a verdict. Never reported as clear."""


def load(path):
    if not path.is_file():
        raise CannotAnswer(f"required file is missing: {path}")
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise CannotAnswer(f"{path} is not readable JSON: {exc}") from exc


def blank(value):
    return not isinstance(value, str) or not value.strip()


def shipped_tokens(tree):
    """Every jurisdiction token the standard ships, and the axis rows behind them."""
    tokens, rows = {}, {}
    for rel, key in TOKEN_SOURCES:
        data = load(tree / rel)
        found = data.get(key)
        if not isinstance(found, dict):
            raise CannotAnswer(f"{rel} has no '{key}' object to read tokens from")
        rows[rel] = set(found)
        for token in found:
            tokens.setdefault(token, []).append(rel)

    registry = load(tree / REGISTRY)
    extensions = registry.get("extensions")
    if not isinstance(extensions, list):
        raise CannotAnswer(f"{REGISTRY} has no 'extensions' array")
    for ext in extensions:
        for token in ext.get("applicableJurisdictions", []):
            tokens.setdefault(token, []).append(REGISTRY)
    return tokens, rows, extensions


def check(tree, authority_path, min_tokens):
    tokens, rows, extensions = shipped_tokens(tree)

    # Anti-vacuity: a broken discovery glob prints the same "nothing to check" a correct
    # run on an empty repo would. The floor turns that into CANNOT ANSWER.
    if len(tokens) < min_tokens:
        raise CannotAnswer(
            f"discovered {len(tokens)} tokens, floor is {min_tokens} -- discovery is broken, "
            "not the data"
        )

    cascade_path = tree / CASCADE
    if not cascade_path.is_file():
        return [f"{CASCADE} does not exist: {len(tokens)} shipped tokens have no declared "
                f"containment or resolution"]
    cascade = load(cascade_path)

    axes = cascade.get("axes")
    entries = cascade.get("jurisdictions")
    exclusions = cascade.get("exclusions", {})
    if not isinstance(axes, dict) or not axes:
        raise CannotAnswer(f"{CASCADE} declares no 'axes'")
    if not isinstance(entries, dict):
        raise CannotAnswer(f"{CASCADE} has no 'jurisdictions' object")
    if not isinstance(exclusions, dict):
        raise CannotAnswer(f"{CASCADE} 'exclusions' is not an object")

    refusals = []

    # An exclusion is a declaration. A blank reason is an omission wearing its clothes.
    for token, reason in sorted(exclusions.items()):
        if blank(reason):
            refusals.append(f"exclusion {token}: declared with no reason -- an exclusion "
                            "must say why, or it is just an omission")

    # 1. Coverage.
    for token, seen_in in sorted(tokens.items()):
        if token in entries or token in exclusions:
            continue
        refusals.append(f"{token}: shipped in {', '.join(sorted(set(seen_in)))} with no "
                        f"cascade entry and no declared exclusion")

    # 2-4. Entry shape, structure and resolution honesty.
    for token, entry in sorted(entries.items()):
        if not isinstance(entry, dict):
            refusals.append(f"{token}: entry is not an object")
            continue

        kind = entry.get("kind")
        constituents = entry.get("constituents")
        if kind not in ("atom", "union"):
            refusals.append(f"{token}: kind is {kind!r}, must be 'atom' or 'union'")
        if not isinstance(constituents, list):
            refusals.append(f"{token}: constituents must be a list")
            constituents = []
        if kind == "union" and not constituents:
            refusals.append(f"{token}: declared a union but lists no constituents")
        if kind == "atom" and constituents:
            refusals.append(f"{token}: declared an atom but lists constituents "
                            f"{constituents} -- an atom constitutes nothing")
        for constituent in constituents:
            if constituent not in entries:
                refusals.append(f"{token}: constituent {constituent} has no cascade entry "
                                "of its own")

        resolution = entry.get("resolution")
        if not isinstance(resolution, dict):
            refusals.append(f"{token}: no resolution object")
            continue
        for axis, spec in sorted(axes.items()):
            rule = resolution.get(axis)
            if not isinstance(rule, dict):
                refusals.append(f"{token}: silent on declared axis '{axis}'")
                continue
            if "resolvesTo" not in rule:
                refusals.append(f"{token}/{axis}: no resolvesTo")
                continue
            target = rule["resolvesTo"]
            if target is None:
                if blank(rule.get("reason")):
                    refusals.append(
                        f"{token}/{axis}: resolvesTo is null with no reason -- a refusal "
                        "must be declared, and an unfilled hole must not read as one")
                continue
            # An edge is a claim that a value may travel up a containment relation. The
            # gate cannot know whether a given edge is substantively right -- GB-ENG -> GB
            # and US-TX -> US are the same shape and only one is true -- so it enforces
            # that asserting one is a VISIBLE act: name the reason and the instrument.
            if blank(rule.get("reason")):
                refusals.append(f"{token}/{axis}: declares an edge to {target} with no "
                                "reason")
            if blank(rule.get("authority")):
                refusals.append(
                    f"{token}/{axis}: declares an edge to {target} with no authority -- "
                    "an edge must name the instrument that makes it true, so that "
                    "hyphen-truncation cannot be smuggled in as a resolution")
            if target not in entries:
                refusals.append(f"{token}/{axis}: resolves to {target}, which has no "
                                "cascade entry")
            source = spec.get("source", "") if isinstance(spec, dict) else ""
            axis_rows = set()
            for rel in [s.strip() for s in source.split(",") if s.strip()]:
                axis_rows |= rows.get(rel, set())
            if axis_rows and target not in axis_rows:
                refusals.append(f"{token}/{axis}: resolves to {target}, which has no row "
                                f"in {source}")

    # 5. The registry must say what its list MEANS.
    unions = {
        frozenset(e.get("constituents", []))
        for e in entries.values()
        if isinstance(e, dict) and e.get("kind") == "union"
    }
    for ext in extensions:
        name = ext.get("name", "<unnamed>")
        relation = ext.get("jurisdictionRelation")
        if relation not in RELATIONS:
            refusals.append(
                f"extension {name!r}: jurisdictionRelation is {relation!r}, must be one of "
                f"{list(RELATIONS)} -- a list of tokens cannot say on its own whether they "
                "constitute one jurisdiction or are an audience")
            continue
        if relation == "constitutes":
            listed = frozenset(ext.get("applicableJurisdictions", []))
            if listed not in unions:
                refusals.append(
                    f"extension {name!r}: declares it CONSTITUTES "
                    f"{sorted(listed)}, but no cascade union has exactly those constituents")

    # 6. Membership, consumed from TT-1456's derived authority.
    if authority_path is not None:
        if not authority_path.is_file():
            raise CannotAnswer(f"--authority {authority_path} does not exist -- an absent "
                               "authority is not an empty one")
        members = set()
        for line in authority_path.read_text().splitlines():
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            members.add(line.split("\t")[0].strip())
        if not members:
            raise CannotAnswer(f"--authority {authority_path} yielded no members")
        for token in sorted(entries):
            if token not in members:
                refusals.append(f"{token}: not a member of the jurisdiction authority "
                                f"({authority_path.name})")

    return refusals


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--tree", required=True, help="path to a checkout of the standard")
    ap.add_argument("--authority", default=None,
                    help="jurisdiction-authority.txt to check membership against (TT-1456)")
    ap.add_argument("--min-tokens", type=int, default=0,
                    help="floor on discovered tokens; below it the run is CANNOT ANSWER")
    args = ap.parse_args(argv)

    tree = pathlib.Path(args.tree)
    authority = pathlib.Path(args.authority) if args.authority else None
    try:
        if not tree.is_dir():
            raise CannotAnswer(f"--tree {tree} is not a directory")
        refusals = check(tree, authority, args.min_tokens)
    except CannotAnswer as exc:
        print(f"⚠️  CANNOT ANSWER — {exc}", file=sys.stderr)
        return 2

    if refusals:
        print(f"⛔ REFUSED — {len(refusals)} jurisdiction cascade defect(s):")
        for line in refusals:
            print(f"  - {line}")
        return 1
    print("✅ clear — every shipped jurisdiction token has a declared cascade entry or a "
          "declared exclusion, and every resolution is declared or refused")
    return 0


if __name__ == "__main__":
    sys.exit(main())
