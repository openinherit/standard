#!/usr/bin/env python3
"""Lockstep gate for reference-data/space-types.json.

exit 0 = clean · 1 = REFUSED · 2 = CANNOT ANSWER. Never read 2 as clean.

Reads a policy file whose `verdict:` line selects the contract:
  UNANSWERED   -> freeze: entry count and field-set must match the pins
  V-OPEN       -> every entry carries open-fields
  V-COMMERCIAL -> removal too: no entry carries a commercial field, and (with
  / V-SPLIT       --commercial-home) the removed content exists on the engine

COVERAGE runs under ALL THREE answered verdicts, not just V-OPEN: every
spaceType enum value has an entry (minus declared exclusions) and every entry's
id is an enum value. It was fenced inside V-OPEN until 2026-09-29, which meant
the 28 September flip to V-SPLIT silently turned the D2b coverage check off.

Single file with no local imports on purpose: it is vendored into the public
repo openinherit/standard, where none of its upstream's other modules exist.

⚠️ VENDORED COPY. The source of truth is an upstream copy maintained together
with its 54 hermetic assertions. Fix it there and re-copy; a fix made only here
has no test covering it.
"""

import argparse
import json
import re
import sys
from pathlib import Path

VERDICTS = {"UNANSWERED", "V-OPEN", "V-COMMERCIAL", "V-SPLIT"}
# A verdict must cite a LOOKUP-ABLE record, not a session's recollection. Two
# forms are accepted because decisions are recorded in two places:
#   * a Linear COMMENT -- the #comment-<id> fragment is required, because the
#     issue URL alone does not identify a decision; and
#   * a numbered decision record -- `coordinator-decision:<n>`, an entry in the
#     maintainers' decision log carrying the prompt, the options, the chosen
#     option and when it was answered.
# ⚠️ The Linear form ALONE made the gate unsatisfiable: the space-types verdict
# was taken as a numbered decision record and was never posted as a Linear
# comment, so the only accepted evidence was evidence that did not exist.
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


def extension_patterns(schema):
    """The `pattern` branches declared beside the spaceType enum.

    v3/space.json permits vendor extensions as `^x-inherit-.+` in an anyOf
    branch of its own. A reference-data entry for one is therefore a legitimate
    id that is absent from the enum list, and the stray-entry assertion must not
    red it. Reading the pattern from the schema rather than hard-coding it means
    the exemption disappears the day the schema stops granting it.
    """
    st = schema.get("properties", {}).get("spaceType", {})
    out = []
    for branch in st.get("anyOf", []):
        if "pattern" in branch:
            out.append(re.compile(branch["pattern"]))
    if "pattern" in st:
        out.append(re.compile(st["pattern"]))
    return out


# ── Extracting carrier rows from a file that is NOT JSON. T21b's contract is
# that a TypeScript engine-side home is a correct relocation, so a parser that
# handled JSON alone would RED a correct one. (This file is vendored into a
# PUBLIC repo -- it names no private repository, and the carrier is found by
# SHAPE, never by path.)
#
# ⚠️ THIS IS A BRACE WALKER, NOT A REGEX, AND THE REGEX IS WHY. The first cut
# was `\{[^{}]*\}`, which cannot match a block containing a brace: one nested
# `meta: {...}` deleted the whole row and the id was reported unhomed. Its value
# grammar admitted only JSON scalars, so a backtick template literal or
# `tier: Tier.ONE` -- both ordinary in the language this exists to support --
# were dropped the same way. Every one of those is a FALSE RED on a correct
# relocation, which is the failure that gets a gate switched off rather than
# fixed.


def _scan_objects(text):
    """Yield `{key: raw-value-text}` for each object literal in `text`.

    Depth-aware and string-aware: nested objects and arrays are skipped whole,
    quotes (including backticks) are respected, so a brace or a comma inside a
    string cannot end a value. Keys are read at the object's OWN depth only --
    a `promptText` nested inside a row's `meta` is not that row's `promptText`.
    """
    quotes = "\"'`"
    i, n = 0, len(text)
    stack = []  # open objects: list of dicts being filled
    key = None
    while i < n:
        c = text[i]
        if c in quotes:  # a string at structural position: key, or a value
            j = i + 1
            while j < n and text[j] != c:
                j += 2 if text[j] == "\\" else 1
            token, i = text[i + 1:j], j + 1
            if stack:
                # `key :` vs a bare value -- look ahead past spaces for a colon.
                k = i
                while k < n and text[k] in " \t\r\n":
                    k += 1
                if k < n and text[k] == ":":
                    key, i = token, k + 1
                elif key is not None:
                    stack[-1][key] = token
                    key = None
            continue
        if c == "{":
            stack.append({})
            key = None
            i += 1
            continue
        if c == "}":
            if stack:
                yield stack.pop()
            key = None
            i += 1
            continue
        if c == "[":
            # ⛔ DO NOT SKIP THE BRACKETED RUN. The rows LIVE inside an array --
            # `export const e = [{ id: … }]` -- so skipping it whole extracted
            # nothing at all and reported every id unhomed. Record that the key
            # has a list value and keep walking into it.
            if stack and key is not None:
                stack[-1][key] = "[…]"
            key = None
            i += 1
            continue
        if c == "]":
            key = None
            i += 1
            continue
        if stack and (c.isalnum() or c in "_$-."):
            j = i
            while j < n and (text[j].isalnum() or text[j] in "_$-."):
                j += 1
            token, i = text[i:j], j
            if stack:
                k = i
                while k < n and text[k] in " \t\r\n":
                    k += 1
                if k < n and text[k] == ":":
                    key, i = token, k + 1
                elif key is not None:
                    stack[-1][key] = token
                    key = None
            continue
        if c == "," :
            key = None
        i += 1


def _value_present(value):
    """Present AND with something behind it.

    ⛔ NOT a truthiness test. `urgencyFlag` is `false` on 98 of the real
    carrier's 101 rows and `tier` is an integer, so `if value:` would refuse the
    very artefact this assertion exists to protect. What does not count is
    absent, null, or a string with only whitespace in it -- a key written with
    nothing behind it being the cheapest way to green a gate that asks only
    whether the key exists.
    """
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() not in ("", "null", "undefined")
    if isinstance(value, (list, dict)):
        return bool(value)
    return True


def _merge(out, rid, pairs):
    """Union a row into `out` WITHOUT letting an absent value clobber a real one.

    ⛔ Last-file-wins is wrong here and it is not theoretical. Rows are unioned
    across the whole tree and the ids are generic words (`loft`, `garage`,
    `office`). An unrelated later-sorted file carrying `{"id": "garage"}` with a
    null would overwrite what the real carrier homed, and the gate would refuse
    the artefact because of a file that has nothing to do with it.
    """
    row = out.setdefault(rid, {})
    for k, v in pairs.items():
        if k not in row or not _value_present(row[k]):
            row[k] = v


def _rows_from_json(node, out):
    """Collect every dict carrying a string `id`, at any depth."""
    if isinstance(node, dict):
        rid = node.get("id")
        if isinstance(rid, str) and rid:
            _merge(out, rid, node)
        for v in node.values():
            _rows_from_json(v, out)
    elif isinstance(node, list):
        for v in node:
            _rows_from_json(v, out)


def _rows_from_text(text, out):
    for pairs in _scan_objects(text):
        rid = pairs.get("id")
        if isinstance(rid, str) and rid and not rid.isdigit():
            _merge(out, rid, pairs)


def carrier_rows(directory):
    """`id` -> the merged key/value row the carrier tree holds for that id.

    ⭐ THIS IS A JOIN, NOT A KEYWORD SEARCH, AND THAT IS THE WHOLE POINT. It
    replaced `field_in_tree`, which returned True when ANY file under the tree
    contained the string `"tier"`. Measured against the real public tree on
    2026-09-29, that gate emitted byte-identical clean output for an engine
    carrying all 101 relocated rows and for an engine carrying one four-line
    stub with three nulls in it -- while being the only assertion standing
    between a public deletion and the content being lost. Worse: with the real
    carrier file DELETED it still passed `tier`, because five unrelated engine
    files contain `tier:`.

    Rows are UNIONED across files: an engine keeping the walk order in one file
    and the prompts in another has homed the content, and a gate demanding a
    single file would refuse a correct relocation.

    ⚠️ THE CONTRACT, stated because a miss message otherwise sends the next
    session hunting an engine defect that is really a parser limit: a commercial
    field must be a DIRECT SIBLING of `id` in the same object literal. A field
    nested one level deeper is not that row's field. Block YAML is not extracted
    at all -- nothing here parses it, and adding a YAML dependency to a script
    vendored into a public repo is not worth it for a carrier that does not
    exist; such a tree yields no rows and is REFUSED by name, not passed.
    """
    out = {}
    for path in sorted(Path(directory).rglob("*")):
        if not path.is_file() or path.suffix not in CARRIER_SUFFIXES:
            continue
        try:
            text = path.read_text(errors="replace")
        except OSError:
            continue
        try:
            _rows_from_json(json.loads(text), out)
        except (ValueError, RecursionError):
            _rows_from_text(text, out)
    return out


def carried(row, field):
    return field in row and _value_present(row[field])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tree", required=True)
    ap.add_argument("--policy", required=True)
    ap.add_argument("--commercial-home", default=None)
    # Takes a REQUIRED value naming where D3c IS asserted. A bare
    # skip would recreate the defect the comment below describes.
    ap.add_argument("--carrier-elsewhere", default=None)
    args = ap.parse_args()

    pol = read_policy(Path(args.policy))
    verdict = pol["verdict"]

    # A verdict is only obeyed if it is sourced. This is the only thing
    # standing between "frozen" and "a session flipped the header".
    if verdict != "UNANSWERED" and not DECIDED_BY.match(pol.get("decided-by", "")):
        refuse(
            [
                f"verdict {verdict} carries no decided-by citation (expected "
                f"https://linear.app/.../<issue>#comment-<id> or "
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
        schema = json.loads(sp.read_text())
        enum = space_type_enum(schema)
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
                    f"the space-types verdict (D0) is unanswered, so this file is frozen"
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
                f"the space-types verdict (D0) is unanswered, so this file is frozen"
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

        # ⭐ COVERAGE IS A PROPERTY OF THE ARTEFACT, NOT OF THE VERDICT, and it
        # runs for EVERY answered verdict. It used to sit inside the V-OPEN
        # branch, so the 28 September flip to V-SPLIT turned D2b off -- the
        # clause reads "a lockstep check fails when enum and reference-data
        # drift again", and on the real public tree that day, deleting an entry
        # printed "OK -- verdict V-SPLIT, 100 entries, 101 enum values" at exit
        # 0. It stated both numbers and still said OK. Every answered verdict
        # keeps a populated open artefact -- open-fields is asserted per entry
        # in all three -- so WHICH ENTRIES MUST EXIST cannot depend on which
        # fields are open. `exclusions:` stays the only way to narrow it.
        uncovered = sorted(set(enum) - set(ids) - set(csv(pol, "exclusions")))
        for value in uncovered:
            problems.append(f"enum value '{value}' has no reference-data entry")

        # The reverse direction, which nothing checked at all: `enum - ids` says
        # nothing about an entry whose id is NOT a valid spaceType. That is
        # drift too, and it is the side a count cannot catch -- a stray entry
        # and a missing one net to the same total. Extension ids are exempt
        # because the schema itself declares them valid (the ^x-inherit-.+
        # branch beside the enum); the exemption is READ FROM THE SCHEMA rather
        # than hard-coded, so a schema that stops permitting them stops
        # exempting them.
        for stray in sorted(set(ids) - set(enum)):
            if any(pat.match(stray) for pat in extension_patterns(schema)):
                continue
            problems.append(
                f"entry '{stray}' is not a spaceType enum value — "
                f"reference-data has drifted ahead of the schema"
            )

        if verdict != "V-OPEN":  # V-COMMERCIAL / V-SPLIT
            commercial = csv(pol, "commercial-fields")
            for t in types:
                for f in commercial:
                    if f in t:
                        problems.append(
                            f"entry '{t.get('id', '?')}' still carries commercial field '{f}'"
                        )
            # NOT opt-in. Without it the D3c carrier assertion does not run at
            # all, and a fully thinned artefact with no engine-side home is clean.
            #
            # ⭐ ONE EXCEPTION, AND IT MUST NAME ITSELF. --commercial-home is a
            # local path to the PRIVATE engine repo, so the copy of this gate
            # vendored into the PUBLIC openinherit/standard can never supply it.
            # --carrier-elsewhere declares that D3c is asserted by a checkout
            # that CAN see the engine, and takes a required value saying which.
            # The absence half above still runs here -- that is the leak
            # direction, and it is answerable from the public tree alone.
            if not args.commercial_home and not args.carrier_elsewhere:
                cannot(
                    f"verdict {verdict} requires --commercial-home — without it "
                    f"the D3c carrier assertion does not run"
                )
            if not args.commercial_home:
                where = str(args.carrier_elsewhere or "").strip()
                if not where:
                    cannot(
                        "--carrier-elsewhere must NAME where D3c is asserted; "
                        "an empty value is a silent skip"
                    )
                carrier_note = where
            else:
                carrier_note = None
                home = Path(args.commercial_home)
                if not home.is_dir():
                    cannot(f"--commercial-home {home} is not a directory")
                rows = carrier_rows(home)
                if not rows:
                    problems.append(
                        f"no per-id carrier row found under {home} — D3c is a join "
                        f"on id, and a tree that merely mentions "
                        f"{','.join(commercial)} homes nothing (D3c)"
                    )
                else:
                    # Bounded. 101 unhomed ids is one defect, not 101, and a
                    # refusal that scrolls off the log is a refusal nobody reads.
                    misses = []
                    for t in types:
                        tid = t.get("id", "?")
                        row = rows.get(tid)
                        if row is None:
                            misses.append(
                                f"'{tid}' has no carrier row under {home} — "
                                f"relocated content has no home (D3c)"
                            )
                            continue
                        for f in commercial:
                            if not carried(row, f):
                                misses.append(
                                    f"'{tid}' carrier row does not carry '{f}' "
                                    f"— relocated content has no home (D3c)"
                                )
                    problems.extend(misses[:10])
                    if len(misses) > 10:
                        problems.append(
                            f"… and {len(misses) - 10} further D3c carrier miss(es)"
                        )

    if problems:
        refuse(problems)

    tail = ""
    if locals().get("carrier_note"):
        # ⛔ A GREEN LINE MUST NOT READ AS "D3c PASSED". It did not run here.
        tail = (f" — D3c NOT asserted here; the carrier assertion is "
                f"{carrier_note}")
    print(
        f"space-types lockstep OK — verdict {verdict}, "
        f"{len(types)} entries, {len(enum)} enum values{tail}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
