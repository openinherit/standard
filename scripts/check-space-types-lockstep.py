#!/usr/bin/env python3
"""TT-1671 lockstep gate for reference-data/space-types.json.

exit 0 = clean · 1 = REFUSED · 2 = CANNOT ANSWER. Never read 2 as clean.

Reads a policy file whose `verdict:` line selects the contract:
  UNANSWERED   -> freeze: entry count and field-set must match the pins
  V-OPEN       -> coverage: every spaceType enum value has an entry (minus
                  declared exclusions), and every entry carries open-fields
  V-COMMERCIAL -> removal: no entry carries a commercial field, every entry
  / V-SPLIT       carries every open field, and (with --commercial-home) the
                  removed content exists on the engine side

Single file with no local imports on purpose: it is vendored into the public
repo openinherit/standard, where docs-strategy is not on the path.

⚠️ VENDORED COPY. The source of truth is testatetech/docs-strategy at
scripts/check-space-types-lockstep.py, together with its 26 hermetic assertions
in scripts/test-check-space-types-lockstep.sh. Fix it there and re-copy; a fix
made only here has no test covering it.
"""

import argparse
import json
import re
import sys
from pathlib import Path

VERDICTS = {"UNANSWERED", "V-OPEN", "V-COMMERCIAL", "V-SPLIT"}
# A verdict must cite a LOOKUP-ABLE record, not a session's recollection. Two
# forms are accepted because the estate has two decision surfaces:
#   * a Linear COMMENT -- the #comment-<id> fragment is required, because the
#     issue URL alone is one every session already knows; and
#   * a coordinator decision record -- `coordinator-decision:<n>`, a row in the
#     coordinator's state.db `pending_decisions` carrying prompt, options,
#     chosen_option and answered_at.
# ⚠️ The Linear form ALONE made the gate unsatisfiable. TT-1671's verdict was
# taken through decision record 535 and was never posted as a Linear comment,
# and agents are forbidden to write to Linear (the API key posts as Josh). So
# the only accepted evidence was evidence no permitted party could produce.
# Free text stays REFUSED: widening the forms must not admit recollection.
DECIDED_BY = re.compile(
    r"^(?:https://linear\.app/\S*#comment-\S+|coordinator-decision:\d+)$"
)

# The commercial home is a TypeScript project, so a correct relocation may land
# as .ts/.yaml rather than .json. Globbing *.json alone REDs a correct
# relocation, and the Stage-C session's next move is to drop the flag.
# (This file is vendored into a PUBLIC repo — it names no private repository.)
CARRIER_SUFFIXES = (
    ".json",
    ".jsonc",
    ".yaml",
    ".yml",
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".py",
)


def cannot(msg):
    print(f"CANNOT ANSWER: {msg}", file=sys.stderr)
    sys.exit(2)


def refuse(lines):
    for line in lines:
        print(f"REFUSED: {line}", file=sys.stderr)
    sys.exit(1)


def strip_comment(raw):
    """Drop a trailing `# ...` comment WITHOUT eating a URL fragment.

    A bare split on "#" discards the `#comment-<id>` of a decided-by URL -- the
    only part that makes it a COMMENT link rather than the issue link every
    session already knows. Only a `#` at line start, or one preceded by
    whitespace, opens a comment.
    """
    if raw.lstrip().startswith("#"):
        return ""
    for i, ch in enumerate(raw):
        if ch == "#" and i > 0 and raw[i - 1].isspace():
            return raw[:i]
    return raw


def read_policy(path):
    if not path.is_file():
        cannot(f"policy file {path} not found")
    pol = {}
    for raw in path.read_text().splitlines():
        line = strip_comment(raw).strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        # Last-wins means the header a reviewer reads is not the header the gate
        # obeys: a `verdict:` appended at EOF, far below the DO-NOT-EDIT block,
        # would silently flip a frozen gate.
        if key in pol:
            cannot(
                f"policy declares {key!r} more than once — "
                f"the header read is not the header obeyed"
            )
        pol[key] = value.strip()
    verdict = pol.get("verdict")
    if verdict not in VERDICTS:
        cannot(f"policy verdict {verdict!r} is not one of {sorted(VERDICTS)}")
    return pol


def csv(pol, key):
    return [v.strip() for v in pol.get(key, "").split(",") if v.strip()]


def space_type_enum(schema):
    """Read the spaceType enum. It lives inside anyOf[], beside an
    ^x-inherit-.+ pattern branch -- a top-level ['enum'] read returns nothing
    and every downstream assertion then passes on zero values."""
    st = schema.get("properties", {}).get("spaceType")
    if st is None:
        cannot("v3/space.json has no properties.spaceType")
    if "enum" in st:
        return list(st["enum"])
    for branch in st.get("anyOf", []):
        if "enum" in branch:
            return list(branch["enum"])
    cannot("spaceType declares no enum, at top level or inside anyOf")


def field_in_tree(directory, field):
    """True if any carrier file under `directory` mentions `field` as a key.

    ⚠️ A FLOOR, not a proof. It answers "does the engine mention this key
    anywhere", not "does the engine carry the relocated values, per id". A stub
    satisfies it. The real per-id engine-side test is the plan's Task 7.
    """
    needles = (f'"{field}"', f"'{field}'", f"{field}:")
    for path in Path(directory).rglob("*"):
        if not path.is_file() or path.suffix not in CARRIER_SUFFIXES:
            continue
        try:
            text = path.read_text(errors="replace")
        except OSError:
            continue
        if any(n in text for n in needles):
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tree", required=True)
    ap.add_argument("--policy", required=True)
    ap.add_argument("--commercial-home", default=None)
    args = ap.parse_args()

    pol = read_policy(Path(args.policy))
    verdict = pol["verdict"]

    # A verdict is only obeyed if it is sourced. This is the only thing
    # standing between "frozen" and "a session flipped the header".
    if verdict != "UNANSWERED" and not DECIDED_BY.match(pol.get("decided-by", "")):
        refuse(
            [
                f"verdict {verdict} carries no decided-by citation (expected "
                f"https://linear.app/.../TT-1671#comment-<id> or "
                f"coordinator-decision:<n> — the issue URL alone, or a sentence "
                f"saying who decided, is not evidence of a verdict)"
            ]
        )

    tree = Path(args.tree)
    sp, rd = tree / "v3/space.json", tree / "reference-data/space-types.json"
    for p in (sp, rd):
        if not p.is_file():
            cannot(f"{p} not found")
    try:
        enum = space_type_enum(json.loads(sp.read_text()))
        types = json.loads(rd.read_text())["types"]
    except (json.JSONDecodeError, KeyError) as exc:
        cannot(f"unreadable: {exc}")

    ids = [t["id"] for t in types]
    # Every assertion below is per entry. Over zero entries they are all vacuous,
    # so an EMPTIED artefact would satisfy D3b -- "id/label/aliases/category
    # remain available in the open artefact" -- by deleting the contents.
    if not types:
        cannot(
            "reference-data/space-types.json carries zero entries — "
            "every per-entry assertion would be vacuous"
        )
    problems = []

    if verdict == "UNANSWERED":
        # A malformed pin is CANNOT ANSWER, not REFUSED. An uncaught ValueError
        # here exits 1, which reads as "the file drifted" and sends the next
        # session hunting drift in a file that has not moved.
        try:
            want_n = int(pol.get("frozen-entry-count", -1))
        except ValueError:
            cannot(
                f"policy frozen-entry-count "
                f"{pol.get('frozen-entry-count')!r} is not an integer"
            )
        if len(types) != want_n:
            problems.append(f"entry count {len(types)} != frozen-entry-count {want_n}")
        want_f = set(csv(pol, "frozen-fields"))
        if not want_f:
            cannot("policy names no frozen-fields — the freeze would assert nothing")
        # ⚠️ PER ENTRY, not over the union. `{k for t in types for k in t}` is
        # unchanged when a field is stripped from 99 of 100 entries, so a union
        # assertion greenlights 99% of a V-COMMERCIAL strip taken before the verdict.
        for t in types:
            seen = set(t)
            if seen != want_f:
                added, gone = sorted(seen - want_f), sorted(want_f - seen)
                problems.append(
                    f"entry '{t.get('id', '?')}' field-set drift — "
                    f"added {added or '[]'}, removed {gone or '[]'}; "
                    f"TT-1671 D0 is unanswered, so this file is frozen"
                )
        # ⚠️ The COUNT alone does not pin WHICH entries. Swapping `loft` out for a
        # newly-authored `portable` leaves the count at 100 -- and authoring
        # portable's prompt/tier is the literal example D0-RED forbids.
        want_ids = csv(pol, "frozen-ids")
        if not want_ids:
            cannot(
                "policy names no frozen-ids — the entry count alone does not pin "
                "WHICH entries, so an entry swap would pass the freeze"
            )
        if sorted(ids) != sorted(want_ids):
            added, gone = (
                sorted(set(ids) - set(want_ids)),
                sorted(set(want_ids) - set(ids)),
            )
            problems.append(
                f"entry-set drift — added {added or '[]'}, removed {gone or '[]'}; "
                f"TT-1671 D0 is unanswered, so this file is frozen"
            )
    else:
        # A mode's field lists are REQUIRED input, not optional decoration. With
        # them empty every loop below iterates zero times and the gate reports
        # clean on a file it has not actually checked -- the "passes on zero
        # values" defect this gate exists to prevent, reproduced inside it.
        open_fields = csv(pol, "open-fields")
        if not open_fields:
            cannot(
                f"policy verdict {verdict} names no open-fields — "
                f"nothing would be asserted per entry"
            )
        if verdict != "V-OPEN" and not csv(pol, "commercial-fields"):
            cannot(
                f"policy verdict {verdict} names no commercial-fields — "
                f"the field-removal contract would assert nothing"
            )
        for t in types:
            for f in open_fields:
                if f not in t:
                    problems.append(
                        f"entry '{t.get('id', '?')}' is missing open field '{f}'"
                    )

        if verdict == "V-OPEN":
            uncovered = sorted(set(enum) - set(ids) - set(csv(pol, "exclusions")))
            for value in uncovered:
                problems.append(f"enum value '{value}' has no reference-data entry")
        else:  # V-COMMERCIAL / V-SPLIT
            commercial = csv(pol, "commercial-fields")
            for t in types:
                for f in commercial:
                    if f in t:
                        problems.append(
                            f"entry '{t.get('id', '?')}' still carries commercial field '{f}'"
                        )
            # NOT opt-in. Without it the D3c carrier assertion does not run at
            # all, and a fully thinned artefact with no engine-side home is clean.
            if not args.commercial_home:
                cannot(
                    f"verdict {verdict} requires --commercial-home — without it "
                    f"the D3c carrier assertion does not run"
                )
            home = Path(args.commercial_home)
            if not home.is_dir():
                cannot(f"--commercial-home {home} is not a directory")
            if True:
                for f in commercial:
                    if not field_in_tree(home, f):
                        problems.append(
                            f"'{f}' removed from the open artefact and absent from {home} "
                            f"— relocated content has no home (D3c)"
                        )

    if problems:
        refuse(problems)

    print(
        f"space-types lockstep OK — verdict {verdict}, "
        f"{len(types)} entries, {len(enum)} enum values"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
