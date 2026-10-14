#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
# SPDX-License-Identifier: Apache-2.0
"""Every dated figure in a Catala rule body is bound to a point-in-time ELI that resolves.

A rule whose answer depends on a date (a figure that one statutory instrument set and a later one
replaced) must say, in machine-readable form, which version of the law each figure comes from. The
convention is one `# eli:` comment directly above each dated `definition`:

    # eli: value=$322,000 effective=2023-07-26 instrument=<ELI of the Order, as made> pit=<ELI/YYYY-MM-DD>
    exception definition fixed_net_sum
      under condition date_of_death >= |2023-07-26|
      consequence equals $322,000

STATIC checks (always run, no network), over every `*.catala_en` under <tree>/catala:
  - each `# eli:` line carries value, effective, instrument and pit, and is followed by a definition;
  - the definition carries exactly one money literal, and it equals `value` (sign included);
  - every date literal in the definition equals `effective`, and a dated `exception` has one in
    its `under condition`;
  - a citation binds only to its own definition (the block ends at the next blank line,
    definition, `# eli:` line or scope);
  - every other definition of a cited name, and every definition with a dated condition, is
    itself cited — an uncited version of a dated figure is refused;
  - instrument and pit are legislation.gov.uk identifiers, and pit ends in a /YYYY-MM-DD date;
  - pit's date is on or after `effective`, and before the next commencement for the same definition;
  - every date literal inside a ```catala block is the `effective` date of a citation in that file.
    This last rule is what makes a dated rule WITHOUT citations go red.

LIVE checks (--resolve), per citation, against legislation.gov.uk's machine-readable data
(`<identifier>/data.xml`; redirects are NOT followed):
  - instrument: HTTP 200, DocumentURI is the cited identifier, ukm:ComingIntoForce includes
    `effective`, and the text states the cited figure as a whole number (e.g. £322,000 — and
    £270 does not match £270,000);
  - pit: HTTP 200, DocumentURI ends in the cited date (not silently the current version),
    dct:valid is on or before that date, and RestrictEndDate (if any) is not before it.
  A 404/410 is a withdrawn version and a 3xx is a moved one; both fail.

What a green does NOT mean: that the figure is the right law for the question. It means each cited
version still exists, says what the rule says it says, and is in force on the dates claimed. The
as-at answers themselves are asserted by scripts/oracle_verify.py.

Exit codes: 0 clean · 1 REFUSED (a citation is wrong, missing or no longer resolves) ·
            2 CANNOT ANSWER (no catala/ dir, fewer citations than --min-citations, network failure).
            2 is never a pass.
"""

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path

EXIT_OK, EXIT_REFUSED, EXIT_CANNOT = 0, 1, 2
LGU = "https://www.legislation.gov.uk/"
FIELDS = ("value", "effective", "instrument", "pit")

ELI_LINE = re.compile(r"^\s*#\s*eli:\s*(.*)$")
DATE_LIT = re.compile(r"\|(\d{4}-\d{2}-\d{2})\|")
MONEY_LIT = re.compile(r"(-\s*)?\$\s*([\d,]+(?:\.\d+)?)")
DEF_LINE = re.compile(r"^\s*(?:exception\s+(?:\w+\s+)?)?definition\s+(\w+)")
PIT_DATE = re.compile(r"/(\d{4}-\d{2}-\d{2})$")

NS = {
    "leg": "http://www.legislation.gov.uk/namespaces/legislation",
    "ukm": "http://www.legislation.gov.uk/namespaces/metadata",
    "dct": "http://purl.org/dc/terms/",
}


class CannotAnswer(Exception):
    pass


@dataclass
class Definition:
    file: Path
    line: int
    name: str
    exception: bool
    text: str  # the definition's own lines, comments stripped

    @property
    def money(self) -> list:
        return ["-" + m if sign else m for sign, m in MONEY_LIT.findall(self.text)]

    @property
    def dates(self) -> list:
        return DATE_LIT.findall(self.text)

    @property
    def condition_dates(self) -> list:
        if "under condition" not in self.text:
            return []
        return DATE_LIT.findall(self.text.split("under condition", 1)[1].split("consequence", 1)[0])


@dataclass
class Citation:
    file: Path
    line: int
    fields: dict
    defn: Definition

    @property
    def definition(self) -> str:
        return self.defn.name

    @property
    def where(self) -> str:
        return f"{self.file}:{self.line}"


def money_key(s: str) -> str:
    """Canonical signed amount: `-$1,000.50` -> `-1000.50`, `$322,000` -> `322000`."""
    t = s.replace("$", "").replace("£", "").replace(",", "").replace(" ", "").strip()
    try:
        return str(Decimal(t).normalize())
    except InvalidOperation:
        return t


def iso(s: str) -> dt.date | None:
    try:
        return dt.date.fromisoformat(s)
    except (TypeError, ValueError):
        return None


def code_lines(text: str):
    """Yield (lineno, line) for lines inside ```catala blocks only."""
    inside = False
    for n, line in enumerate(text.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith("```"):
            inside = stripped.startswith("```catala") and not inside
            continue
        if inside:
            yield n, line


def _ends_block(line: str) -> bool:
    s = line.strip()
    return (not s or bool(DEF_LINE.match(line)) or bool(ELI_LINE.match(line))
            or s.startswith(("scope ", "declaration ", "assertion ")))


def parse_file(path: Path, rel: Path, errors: list) -> tuple[list, list, list, int]:
    """Return (citations, definitions, [(lineno, date) for every date literal in code],
    `# eli:` lines seen). The last counts malformed lines too: a broken citation is
    REFUSED, never discounted.

    A definition's block is its own line plus the lines after it, up to the next blank
    line, definition, `# eli:` line or scope/declaration/assertion — so a citation can
    never reach into a neighbouring definition."""
    lines = list(code_lines(path.read_text(encoding="utf-8")))
    defs: dict = {}  # index into lines -> Definition
    dates: list = []
    for idx, (n, line) in enumerate(lines):
        dates += [(n, d) for d in DATE_LIT.findall(line.split("#", 1)[0])]
        m = DEF_LINE.match(line)
        if not m:
            continue
        block = [line.split("#", 1)[0]]
        k = idx + 1
        while k < len(lines) and not _ends_block(lines[k][1]):
            block.append(lines[k][1].split("#", 1)[0])
            k += 1
        defs[idx] = Definition(rel, n, m.group(1), line.lstrip().startswith("exception"),
                               "\n".join(block))
    citations, seen = [], 0
    for idx, (n, line) in enumerate(lines):
        m = ELI_LINE.match(line)
        if not m:
            continue
        seen += 1
        fields = dict(kv.split("=", 1) for kv in m.group(1).split() if "=" in kv)
        missing = [f for f in FIELDS if not fields.get(f)]
        if missing:
            errors.append(f"{rel}:{n}: `# eli:` missing field(s) {', '.join(missing)}")
            continue
        j = idx + 1
        while j < len(lines) and not lines[j][1].strip():
            j += 1
        if j not in defs:
            errors.append(f"{rel}:{n}: `# eli:` is not followed by a definition")
            continue
        citations.append(Citation(rel, n, fields, defs[j]))
    return citations, list(defs.values()), dates, seen


def static_check(citations: list, definitions: list, dates_by_file: dict, errors: list) -> None:
    by_def: dict = {}
    for c in citations:
        f = c.fields
        eff = iso(f["effective"])
        if eff is None:
            errors.append(f"{c.where}: effective={f['effective']!r} is not a date")
            continue
        money = c.defn.money
        if len(money) != 1:
            errors.append(
                f"{c.where}: definition {c.definition}: a cited definition must carry exactly one "
                f"money literal, found {len(money)} ({', '.join('$' + m for m in money) or 'none'})"
            )
        elif money_key(money[0]) != money_key(f["value"]):
            errors.append(
                f"{c.where}: definition {c.definition}: literal differs from the cited value "
                f"(rule ${money[0]}, citation {f['value']})"
            )
        if c.defn.exception and not c.defn.condition_dates:
            errors.append(
                f"{c.where}: definition {c.definition}: dated exception has no date literal in its "
                f"condition, so its commencement cannot be bound to effective {f['effective']}"
            )
        for cd in c.defn.dates:
            if cd != f["effective"]:
                errors.append(
                    f"{c.where}: definition {c.definition}: condition date differs from the cited "
                    f"effective date (|{cd}| vs {f['effective']})"
                )
        for key in ("instrument", "pit"):
            if not f[key].startswith(LGU):
                errors.append(f"{c.where}: {key} is not a legislation.gov.uk identifier: {f[key]}")
        m = PIT_DATE.search(f["pit"])
        if not m or iso(m.group(1)) is None:
            errors.append(f"{c.where}: pit has no point-in-time /YYYY-MM-DD date: {f['pit']}")
        elif iso(m.group(1)) < eff:
            errors.append(
                f"{c.where}: pit date {m.group(1)} is before its effective date {f['effective']}"
            )
        by_def.setdefault((c.file, c.definition), []).append(c)
    for chain in by_def.values():
        chain.sort(key=lambda c: c.fields["effective"])
        for cur, nxt in zip(chain, chain[1:]):
            m = PIT_DATE.search(cur.fields["pit"])
            if m and m.group(1) >= nxt.fields["effective"]:
                errors.append(
                    f"{cur.where}: pit date {m.group(1)} is on or after the next commencement "
                    f"({nxt.fields['effective']}) — after the next commencement the figure is superseded"
                )
    # every definition of a cited name, and every date-conditioned definition, is cited
    cited_defs = {id(c.defn) for c in citations}
    cited_names = {(c.file, c.definition) for c in citations}
    for d in definitions:
        if id(d) in cited_defs:
            continue
        if (d.file, d.name) in cited_names or d.condition_dates:
            errors.append(
                f"{d.file}:{d.line}: definition {d.name} has no `# eli:` citation, but it is "
                f"{'a dated condition' if d.condition_dates else 'a cited figure'} — every version "
                f"of a dated figure must name its source"
            )
    for rel, dates in dates_by_file.items():
        cited = {c.fields["effective"] for c in citations if c.file == rel}
        for n, d in dates:
            if d not in cited:
                errors.append(
                    f"{rel}:{n}: date literal |{d}| is not the effective date of any `# eli:` "
                    f"citation in this file"
                )


# --- live leg -----------------------------------------------------------------


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def fetch(url: str, timeout: float) -> tuple[int, bytes, str]:
    opener = urllib.request.build_opener(_NoRedirect)
    req = urllib.request.Request(url, headers={"User-Agent": "openinherit-eli-check/1.0"})
    try:
        with opener.open(req, timeout=timeout) as r:
            return r.status, r.read(), ""
    except urllib.error.HTTPError as e:
        return e.code, b"", e.headers.get("Location", "") if e.headers else ""
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise CannotAnswer(f"{url}: {e}") from e


def norm_uri(u: str) -> str:
    return re.sub(r"^https?://", "", u).rstrip("/")


def get_xml(ident: str, base: str, timeout: float, where: str, errors: list):
    url = base + ident[len(LGU) - 1 :] + "/data.xml"
    status, body, location = fetch(url, timeout)
    if 300 <= status < 400:
        errors.append(f"{where}: {ident} moved (HTTP {status} -> {location or '?'})")
        return None
    if status == 429 or status >= 500:
        raise CannotAnswer(f"{url}: HTTP {status} (source unavailable, not a withdrawal)")
    if status != 200:
        errors.append(f"{where}: {ident} did not resolve (HTTP {status}) — withdrawn or removed")
        return None
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        root = None
    if root is None or root.tag != f"{{{NS['leg']}}}Legislation":
        errors.append(f"{where}: {ident} returned HTTP 200 but not machine-readable legislation XML")
        return None
    return root


def live_check(citations: list, base: str, timeout: float, errors: list, log) -> None:
    for c in citations:
        f = c.fields
        amount = Decimal(money_key(f["value"]))
        figure = f"£{amount:,.0f}" if amount == amount.to_integral_value() else f"£{amount:,.2f}"
        # the figure as a whole number, not the start of a bigger one (£270 is not £270,000)
        stated = re.compile(re.escape(figure) + r"(?![\d,.]*\d)")
        root = get_xml(f["instrument"], base, timeout, c.where, errors)
        if root is not None:
            doc = root.get("DocumentURI", "")
            cif = {e.get("Date") for e in root.iterfind(".//ukm:ComingIntoForce/ukm:DateTime", NS)}
            text = "".join(root.itertext())
            if norm_uri(doc) != norm_uri(f["instrument"]):
                errors.append(f"{c.where}: instrument DocumentURI {doc!r} is not {f['instrument']}")
            elif f["effective"] not in cif:
                errors.append(
                    f"{c.where}: instrument ukm:ComingIntoForce {sorted(d for d in cif if d)} "
                    f"does not include effective {f['effective']}"
                )
            elif not stated.search(text):
                errors.append(f"{c.where}: instrument text does not contain the cited figure {figure}")
            else:
                log(f"  ok  {f['instrument']}  in force {f['effective']}, states {figure}")
        pit_date = PIT_DATE.search(f["pit"]).group(1)
        root = get_xml(f["pit"], base, timeout, c.where, errors)
        if root is not None:
            doc = root.get("DocumentURI", "")
            valid = root.findtext(".//dct:valid", default="", namespaces=NS)
            end = root.get("RestrictEndDate")
            if not norm_uri(doc).endswith("/" + pit_date):
                errors.append(
                    f"{c.where}: pit DocumentURI {doc!r} does not carry the requested date "
                    f"{pit_date} — the point-in-time version was not served"
                )
            elif not valid or valid > pit_date:
                errors.append(f"{c.where}: pit dct:valid {valid!r} is after the as-at date {pit_date}")
            elif end and end < pit_date:
                errors.append(f"{c.where}: pit RestrictEndDate {end} is before the as-at date {pit_date}")
            else:
                log(f"  ok  {f['pit']}  version valid from {valid}")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--tree", required=True, type=Path)
    ap.add_argument("--min-citations", type=int, default=1,
                    help="fewer citations than this is CANNOT ANSWER (anti-vacuity floor)")
    ap.add_argument("--resolve", action="store_true", help="re-resolve every ELI live")
    ap.add_argument("--base-url", default=LGU.rstrip("/"),
                    help="fetch from this origin instead of legislation.gov.uk (tests only)")
    ap.add_argument("--timeout", type=float, default=30.0)
    a = ap.parse_args(argv)

    root = a.tree / "catala"
    if not root.is_dir():
        print(f"CANNOT ANSWER: no catala/ directory under {a.tree}")
        return EXIT_CANNOT
    errors: list = []
    citations: list = []
    definitions: list = []
    seen = 0
    dates_by_file: dict = {}
    files = sorted(root.rglob("*.catala_en"))
    for p in files:
        rel = p.relative_to(a.tree)
        cs, defs, ds, n = parse_file(p, rel, errors)
        citations += cs
        definitions += defs
        seen += n
        if ds:
            dates_by_file[rel] = ds
    print(f"check-eli-point-in-time — {len(files)} rule file(s), {seen} citation(s)")
    if seen < a.min_citations:
        print(f"CANNOT ANSWER: {seen} citation(s), floor is {a.min_citations}")
        return EXIT_CANNOT
    static_check(citations, definitions, dates_by_file, errors)
    if a.resolve and not errors:
        try:
            live_check(citations, a.base_url.rstrip("/"), a.timeout, errors, print)
        except CannotAnswer as e:
            print(f"CANNOT ANSWER: could not reach the legislation source: {e}")
            return EXIT_CANNOT
    if errors:
        print(f"REFUSED — {len(errors)} problem(s):")
        for e in errors:
            print(f"  {e}")
        return EXIT_REFUSED
    leg = "static + live re-resolution" if a.resolve else "static only (no --resolve)"
    print(f"CLEAN — every dated figure is bound to a point-in-time ELI ({leg})")
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
