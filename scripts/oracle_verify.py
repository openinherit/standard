#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
# SPDX-License-Identifier: Apache-2.0
#
# oracle_verify.py — the T032 LEGAL gov-oracle harness (TT-478).
#
# Asserts that a Catala-computed legal answer equals the AUTHORITATIVE published
# gov.uk/HMRC figure cited in tests/oracles/*.oracle.json — not merely that the
# rule is structurally valid. This is the net that makes "the answer is legally
# right" checkable: a rule can be structurally conformant and compile cleanly yet
# compute the wrong number; this harness turns that red.
#
# How it works (per oracle file):
#   1. Resolve the rule module + its contract-module deps in --standard.
#   2. Build a throwaway clerk project (mktemp): copy the contract module(s) +
#      the rule file (keeping their filenames — a Catala module name must equal
#      its filename), then APPEND a generated #[test] driver scope INTO A COPY of
#      the rule file. The driver must live in the SAME module as the rule because
#      cross-module sub-scope calls (`output of Mod.Scope`) do not resolve in
#      clerk 1.2.0 — only intra-module `output of Scope` does (TT-478 finding).
#   3. Per case, the driver computes the rule for the case `inputs` and, from the
#      ComputedOrNeedsHuman.Verdict, asserts BOTH that the arm is `Computed` AND
#      that its money equals `expected_money_gbp`. (Asserting the arm too stops a
#      NeedsHuman result spuriously passing the £0 case.)
#   4. clerk start + clerk test. Success == rc 0 AND output contains
#      "ALL TESTS PASSED" (the same predicate as scripts/check-catala-contract.sh
#      in code-inherit-standard).
#
# Fail-closed: a missing toolchain, a missing rule/contract file, a malformed or
# empty oracle, or a clean build that is not GREEN all exit non-zero. The teeth:
# flip a rule literal (or an oracle figure) and the harness goes RED.
#
# Exit codes: 0 = all oracles GREEN; 1 = a legal-figure mismatch (RED, the teeth);
#             3 = fail-closed (toolchain/inputs/oracle structure).
#
# Usage:
#   python scripts/oracle_verify.py [--oracle 'tests/oracles/*.oracle.json'] \
#                                   [--standard /path/to/code-inherit-standard]
#   (run inside `opam exec --` or after `eval $(opam env)` so clerk is on PATH).

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import NoReturn

VERSION = "1.2.0"

EXIT_OK = 0
EXIT_RED = 1
EXIT_FAILCLOSED = 3


def fail_closed(msg: str) -> NoReturn:
    print(f"FAIL-CLOSED: {msg}", file=sys.stderr)
    sys.exit(EXIT_FAILCLOSED)


# --- TT-463 per-heir multiset helpers ------------------------------------------
#
# The per_heir result_kind asserts the *allocation* of a distribution rule, not
# just the conserved total — closing the C1 gameable-conservation hole (a wrong
# split with the right sum AND right heir-count would pass a sum/length check).
# The harness extracts the rule's per-branch money list, expands it to the
# per-heir multiset, and compares value->count (collections.Counter), which is
# the only comparison that distinguishes {£300k,£300k,£150k,£150k} from
# {£300k,£300k,£200k,£100k} (same sum £900k, same length 4). Mirrors TT-472.

_MONEY_RE = re.compile(r"\$\s*([\d,]+(?:\.\d+)?)")


def to_pence(gbp) -> int:
    """Canonical integer-pence representation for exact money comparison.

    Accepts ints, floats (clerk JSON emits pounds-as-float, e.g. 300000.0) and
    comma-grouped strings (the pretty `$300,000.00` form)."""
    return int((Decimal(str(gbp).replace(",", "").strip()) * 100).to_integral_value())


def parse_money_list(text: str, field: str) -> list[int]:
    """Extract the money list printed for `field` from clerk output, in pence.

    Primary path: clerk's `-F json` output is a `{ "<field>": [pounds, ...] }`
    object (TT-463 Task 1 probe) — located and JSON-decoded. Fallback: the
    `clerk run` pretty form (`field = [ $a; $b; ... ]`, possibly multi-line with
    box-drawing prefixes) is bracket-scanned for `$` money tokens. Fail-closed if
    neither surfaces the list (a missing rule output must never pass vacuously)."""
    for m in re.finditer(r"\{[^{}]*\}", text, re.DOTALL):
        try:
            obj = json.loads(m.group(0))
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and isinstance(obj.get(field), list):
            return [to_pence(v) for v in obj[field]]
    idx = text.find(field)
    if idx == -1:
        fail_closed(f"field {field!r} not found in rule output")
    after = text[idx:]
    start = after.find("[")
    end = after.find("]", start)
    if start == -1 or end == -1:
        fail_closed(f"no bracketed money list after field {field!r}")
    return [to_pence(t) for t in _MONEY_RE.findall(after[start : end + 1])]


def expand_per_heir(per_branch: list[int], repeat_counts: list[int] | None) -> list[int]:
    """Expand a per-branch list to the per-heir multiset by repeating each branch
    amount branch_size times. None ⇒ the list is already per-heir (class gift)."""
    if repeat_counts is None:
        return list(per_branch)
    if len(per_branch) != len(repeat_counts):
        fail_closed(f"list length {len(per_branch)} != repeat_by length {len(repeat_counts)}")
    heirs: list[int] = []
    for amt, n in zip(per_branch, repeat_counts, strict=True):
        heirs.extend([amt] * int(n))
    return heirs


def judge_per_heir(computed: list[int], claimed: list[int], expect: str) -> tuple[bool, str]:
    """Multiset comparison (in pence). `match` passes iff the multisets are equal;
    `wrong_split` passes iff sum AND count are conserved but the split differs —
    so a wrong_split case proves, non-vacuously, that the gameable-conservation
    property (right sum + right count, wrong allocation) is actually caught."""
    c_comp, c_claim = Counter(computed), Counter(claimed)
    same = c_comp == c_claim
    if expect == "match":
        return same, ("multiset equal" if same else f"multiset differs: {c_comp} vs {c_claim}")
    if expect == "wrong_split":
        conserved = sum(computed) == sum(claimed) and len(computed) == len(claimed)
        if not conserved:
            return False, "wrong_split case is not sum+count conserving (not the C1 property)"
        ok = not same
        return ok, ("split correctly caught as differing" if ok else "split unexpectedly matched")
    fail_closed(f"unknown expect value: {expect!r}")


def format_money_display(value: str | int) -> str:
    """Normalise a GBP amount to a thousands-separated string WITHOUT a currency
    marker. Whole pounds render as `n,nnn`; a value with up to 2 decimal places
    renders as `n,nnn.dd`. Fail-closed on a non-numeric value or >2 decimal places.

    This is the single money-parsing point shared by `money_literal` (the
    driver-generation path, which prepends Catala's `$` marker) and `main()`'s
    PASS-line reporting. Keeping them on one code path is load-bearing: the TT-863
    regression was `main()` formatting the amount with a hard-coded
    `int(str(value).replace(",", ""))`, which raised `ValueError` on the fractional
    `0.40` boundary-probe figure that `money_literal` already accepted — a green
    clerk result the display path then crashed on. Delegating both paths here means
    the accepted-money set can never diverge between them again."""
    s = str(value).replace(",", "").strip()
    try:
        n = int(s)
        return f"{n:,}"
    except ValueError:
        pass
    try:
        d = Decimal(s)
    except InvalidOperation:
        fail_closed(f"non-numeric money value in oracle: {value!r}")
    if -d.as_tuple().exponent > 2:
        fail_closed(f"money value has more than 2 decimal places: {value!r}")
    return f"{d:,.2f}"


def money_literal(value: str | int) -> str:
    """Render a GBP amount as a Catala money literal — `format_money_display` with the
    Catala `$` money marker prepended (`$n,nnn` for whole pounds, `$n,nnn.dd` for a
    value with up to 2 decimal places).

    Whole-pound behaviour is unchanged for every existing whole-pound oracle fixture.
    Fractional-pence support (TT-863) is needed for boundary-probe fixtures whose
    expected figure is genuinely fractional (Catala's money type supports
    pence-precision natively). Trade-off, stated explicitly: fractional support is
    also MORE PERMISSIVE than the old whole-pound-only parse — a typo like
    `"70000.00"` in a future oracle fixture would previously `fail_closed` (the old
    `int()`-only parse rejects any decimal point); it now silently succeeds,
    rendering `$70,000.00`. Accepted for this issue's scope (no currently-committed
    fixture is affected); a stricter validator (e.g. reject a `.00`/`.0` suffix
    specifically, which is never a genuinely fractional pence value) is a reasonable
    follow-up if this proves to matter in practice, not built here."""
    return f"${format_money_display(value)}"


def bool_literal(value) -> str:
    if not isinstance(value, bool):
        fail_closed(f"expected a JSON boolean, got {value!r}")
    return "true" if value else "false"


_ENUM_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")

# Currency is display + provenance metadata only: Catala's money type is
# currency-agnostic (the `$` literal is just the money marker), so EUR/USD figures
# assert identically to GBP. This is the closed set of supported currencies.
_CCY_SYMBOL = {"GBP": "£", "EUR": "€", "USD": "$"}


def enum_literal(value: dict) -> str:
    """Render an enum input {"enum": "Constructor"} as the bare Catala constructor
    (e.g. {"enum": "GroupA"} -> GroupA) for a sub-scope record literal. Fail-closed
    on a missing/empty/non-identifier value so a malformed wrapper never injects
    arbitrary text into the generated Catala source."""
    name = value.get("enum")
    if not isinstance(name, str) or not _ENUM_RE.fullmatch(name.strip()):
        fail_closed(
            f"enum input must be {{'enum': '<Constructor>'}} with an identifier, got {value!r}"
        )
    return name.strip()


def oracle_currency(oracle: dict) -> str:
    """The oracle's ISO-4217 currency (default GBP for legacy oracles). Fail-closed
    on an unsupported code so a typo is caught, not silently displayed."""
    ccy = oracle.get("currency", "GBP")
    if ccy not in _CCY_SYMBOL:
        fail_closed(f"unsupported currency {ccy!r} (expected one of {sorted(_CCY_SYMBOL)})")
    return ccy


def case_expected_money(case: dict):
    """The case's expected amount: `expected_money` (canonical) or the legacy
    `expected_money_gbp` alias. Fail-closed if neither is present (a driver with no
    assertion target would pass vacuously)."""
    if "expected_money" in case:
        return case["expected_money"]
    if "expected_money_gbp" in case:
        return case["expected_money_gbp"]
    fail_closed(f"case {case.get('label')!r} has neither expected_money nor expected_money_gbp")


def input_literal(value) -> str:
    """Money inputs arrive as numeric strings; booleans as JSON booleans; integer
    lists (e.g. branch_sizes / members) as a Catala list literal `[a; b; c]`; enum
    inputs as a {"enum": "<Constructor>"} wrapper rendering the bare constructor."""
    if isinstance(value, bool):
        return bool_literal(value)
    if isinstance(value, dict):
        return enum_literal(value)
    if isinstance(value, list):
        return "[" + "; ".join(str(int(x)) for x in value) + "]"
    return money_literal(value)


# --- G6 certification floor (TT-1079) -----------------------------------------
# After code-inherit-standard's G6 gate, an L3 characterisation input's declared
# type is a `Certified<Type> | NotCharacterised` enum, so a bare literal no
# longer typechecks. The renderer wraps each case literal iff the RULE SOURCE
# declares that input with a certification enum — the declared type text is the
# constructor qualification prefix (`ComputedOrNeedsHuman.CertifiedMoney` ->
# `ComputedOrNeedsHuman.CertifiedMoney.Certified content $x`). Auto-detected
# per rule file, so oracle fixtures stay unchanged and the harness keeps
# working against BOTH pre- and post-G6 rule shapes (no cross-repo deadlock).

_INPUT_DECL_RE = re.compile(r"^\s+input\s+(\w+)\s+content\s+(.+?)\s*$")
_DECL_SCOPE_RE = re.compile(r"^declaration scope (\w+):")
_CERT_TYPE_RE = re.compile(r"^(?:\w+\.)?Certified\w*$")


def scope_input_types(rule_text: str, scope: str) -> dict:
    """{input_name: declared_type} for one `declaration scope <scope>:` block."""
    types: dict = {}
    current = None
    for line in rule_text.splitlines():
        m = _DECL_SCOPE_RE.match(line)
        if m:
            current = m.group(1)
            continue
        if line and not line[0].isspace():
            current = None
            continue
        if current != scope:
            continue
        d = _INPUT_DECL_RE.match(line)
        if d:
            types[d.group(1)] = d.group(2)
    return types


def wrap_certified(literal: str, declared_type) -> str:
    """Wrap a rendered literal in `<DeclaredType>.Certified content ...` iff the
    declared input type is a certification enum; otherwise pass through (bare
    inputs and `context` overrides are unaffected)."""
    t = (declared_type or "").strip()
    if _CERT_TYPE_RE.match(t):
        return f"{t}.Certified content {literal}"
    return literal


def build_driver(
    cases: list[dict], scope: str, result_field: str, input_types: dict | None = None
) -> str:
    """Generate a #[test] driver scope (same module as the rule) over the cases."""
    outputs: list[str] = []
    defs: list[str] = []
    asserts: list[str] = []
    types = input_types or {}
    for i, case in enumerate(cases):
        inputs = case["inputs"]
        amt_field = f"c{i}_amt"
        ok_field = f"c{i}_ok"
        # The 'with { ... }' record literal feeding the sub-scope call.
        record = " ".join(
            f"-- {k}: {wrap_certified(input_literal(v), types.get(k))}" for k, v in inputs.items()
        )
        call = f"(output of {scope} with {{ {record} }}).{result_field}"
        outputs.append(f"  output {amt_field} content money")
        outputs.append(f"  output {ok_field} content boolean")
        # amount: the Computed money (NeedsHuman -> $0, but the _ok assertion below
        # makes a NeedsHuman result fail regardless of the expected figure).
        defs.append(
            f"  definition {amt_field} equals\n"
            f"    match {call} with pattern\n"
            f"    -- Computed content m: m\n"
            f"    -- NeedsHuman: $0"
        )
        defs.append(
            f"  definition {ok_field} equals\n"
            f"    match {call} with pattern\n"
            f"    -- Computed content m: true\n"
            f"    -- NeedsHuman: false"
        )
        asserts.append(f"  assertion {ok_field} = true")
        asserts.append(f"  assertion {amt_field} = {money_literal(case_expected_money(case))}")

    return (
        "\n# --- generated T032 oracle driver (TT-478) ---\n\n"
        "```catala\n"
        "#[test]\n"
        "declaration scope OracleVerifyDriver:\n"
        + "\n".join(outputs)
        + "\nscope OracleVerifyDriver:\n"
        + "\n".join(defs)
        + "\n"
        + "\n".join(asserts)
        + "\n```\n"
    )


def build_per_heir_driver(
    case: dict, scope: str, list_field: str, input_types: dict | None = None
) -> str:
    """Generate a non-#[test] driver scope (same module as the rule) that exposes
    the rule's per-branch money list for the case inputs, so `clerk run -F json`
    prints it. Intra-module `output of <scope>` resolves (cross-module sub-scope
    calls do not, in clerk 1.2.0 — TT-478 finding), so the driver is appended into
    a copy of the rule file."""
    types = input_types or {}
    record = " ".join(
        f"-- {k}: {wrap_certified(input_literal(v), types.get(k))}"
        for k, v in case["inputs"].items()
    )
    return (
        "\n# --- generated TT-463 per-heir driver ---\n\n"
        "```catala\n"
        "declaration scope OraclePerHeirDriver:\n"
        "  output per_member content list of money\n"
        "scope OraclePerHeirDriver:\n"
        f"  definition per_member equals (output of {scope} with {{ {record} }}).{list_field}\n"
        "```\n"
    )


def verify_per_heir(
    oracle_path: Path, oracle: dict, standard_root: Path, rule_src: Path, scope: str
) -> tuple[bool, str]:
    """Run the distribution rule per case, extract its per-branch money list,
    expand to the per-heir multiset, and judge it against the oracle's expected
    multiset. Returns (all_passed, pre-formatted per-case report)."""
    rule = oracle["rule"]
    cases = oracle["cases"]
    list_field = rule.get("list_field", "per_member_amounts")
    repeat_by = rule.get("repeat_by")  # name of an integer-list input, or None
    deps = rule.get("depends_modules") or []
    dep_srcs = []
    for d in deps:
        dp = standard_root / d
        if not dp.is_file():
            fail_closed(f"{oracle_path}: contract module not found: {dp}")
        dep_srcs.append(dp)

    all_pass = True
    lines: list[str] = []
    for case in cases:
        expect = case.get("expect", "match")
        if repeat_by is not None and repeat_by not in case["inputs"]:
            fail_closed(
                f"{oracle_path}: case {case['label']!r} lacks repeat_by input {repeat_by!r}"
            )
        with tempfile.TemporaryDirectory() as work:
            workdir = Path(work)
            for dp in dep_srcs:
                shutil.copy(dp, workdir / dp.name)
            rule_dst = workdir / rule_src.name
            rule_text = rule_src.read_text(encoding="utf-8")
            driver = build_per_heir_driver(
                case, scope, list_field, input_types=scope_input_types(rule_text, scope)
            )
            rule_dst.write_text(rule_text + "\n" + driver, encoding="utf-8")
            subprocess.run(
                ["clerk", "start"],
                cwd=workdir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            proc = subprocess.run(
                ["clerk", "run", rule_dst.name, "-s", "OraclePerHeirDriver", "-F", "json"],
                cwd=workdir,
                capture_output=True,
                text=True,
            )
        per_branch = parse_money_list(proc.stdout or "", "per_member")
        repeat_counts = case["inputs"][repeat_by] if repeat_by is not None else None
        computed = expand_per_heir(per_branch, repeat_counts)
        claimed = [to_pence(x) for x in case["expected_per_heir_gbp"]]
        passed, detail = judge_per_heir(computed, claimed, expect)
        all_pass = all_pass and passed
        tag = "PASS" if passed else "FAIL"
        comp_gbp = [c / 100 for c in computed]
        claim_gbp = [c / 100 for c in claimed]
        lines.append(f"   {tag}  {case['label']} [{expect}]: {detail}")
        lines.append(f"         computed £{comp_gbp}  claimed £{claim_gbp}")
    return all_pass, "\n".join(lines)


def _run_clerk_check(
    rule_text: str,
    rule_filename: str,
    cases: list[dict],
    scope: str,
    result_field: str,
    dep_srcs: list[Path],
) -> tuple[bool, str]:
    """Write rule_text + a generated #[test] assertion driver into a temp clerk project; run
    clerk start + clerk test; return (passed, raw_output). Shared by verify_one (original rule
    text) and scripts.mutation.mutate_rule (mutated rule text) — ONE clerk-invocation code path,
    not two (TT-863)."""
    with tempfile.TemporaryDirectory() as work:
        workdir = Path(work)
        # Copy contract modules (filename == module name; keep basenames).
        for dp in dep_srcs:
            shutil.copy(dp, workdir / dp.name)
        # Write the rule file and APPEND the generated driver (same module).
        rule_dst = workdir / rule_filename
        driver = build_driver(
            cases, scope, result_field, input_types=scope_input_types(rule_text, scope)
        )
        rule_dst.write_text(rule_text + "\n" + driver, encoding="utf-8")

        # clerk start scaffolds the project + stdlib (tolerate non-zero, mirror
        # check-catala-contract.sh).
        subprocess.run(
            ["clerk", "start"], cwd=workdir, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        proc = subprocess.run(["clerk", "test"], cwd=workdir, capture_output=True, text=True)
        out = (proc.stdout or "") + (proc.stderr or "")
        passed = proc.returncode == 0 and "ALL TESTS PASSED" in out
        return passed, out


def verify_one(oracle_path: Path, standard_root: Path) -> tuple[bool, str]:
    """Returns (passed, detail). Fail-closed exits directly."""
    try:
        oracle = json.loads(oracle_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        fail_closed(f"cannot read/parse oracle {oracle_path}: {e}")

    rule = oracle.get("rule") or {}
    cases = oracle.get("cases") or []
    rule_file = rule.get("rule_file")
    scope = rule.get("scope")
    result_field = rule.get("result_field", "verdict")
    result_kind = rule.get("result_kind", "scalar")
    deps = rule.get("depends_modules") or []
    if not rule_file or not scope:
        fail_closed(f"{oracle_path}: oracle.rule must set rule_file + scope")
    if not cases:
        fail_closed(f"{oracle_path}: oracle has no cases (would vacuously pass)")

    rule_src = standard_root / rule_file
    if not rule_src.is_file():
        fail_closed(f"{oracle_path}: rule file not found: {rule_src}")

    if result_kind == "per_heir":
        return verify_per_heir(oracle_path, oracle, standard_root, rule_src, scope)

    dep_srcs = []
    for d in deps:
        dp = standard_root / d
        if not dp.is_file():
            fail_closed(f"{oracle_path}: contract module not found: {dp}")
        dep_srcs.append(dp)

    rule_text = rule_src.read_text(encoding="utf-8")
    return _run_clerk_check(rule_text, rule_src.name, cases, scope, result_field, dep_srcs)


def _coverage_dispatch(args) -> int:
    """TT-497 Tier-0: --verify-denominator / --coverage-report.

    Resolves the coverage_grader package by inserting the repo root on sys.path —
    when run as `python scripts/oracle_verify.py`, sys.path[0] is scripts/, not the
    root, so `from scripts.coverage_grader…` would not otherwise resolve."""
    repo_root = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(repo_root))
    from scripts.coverage_grader.checked_coverage import (  # noqa: E402
        CoverageError as CheckedCoverageError,
    )
    from scripts.coverage_grader.checked_coverage import (  # noqa: E402
        checked_coverage,
        drift_fail_report,
    )
    from scripts.coverage_grader.denominator import (  # noqa: E402
        CoverageError,
        load_denominator,
        verify_manifest,
    )
    from scripts.coverage_grader.grader import grade  # noqa: E402

    corpus_dir = (repo_root / args.corpus).resolve()

    if args.verify_denominator:
        try:
            ok, mism = verify_manifest(corpus_dir)
        except CoverageError as e:
            fail_closed(str(e))
        if ok:
            print("DENOMINATOR OK — every ground-truth file matches MANIFEST.json")
            return EXIT_OK
        print("DENOMINATOR MISMATCH:\n  " + "\n  ".join(mism))
        return EXIT_FAILCLOSED

    # --coverage-report
    try:
        ok, mism = verify_manifest(corpus_dir)
        if not ok:
            fail_closed("denominator manifest mismatch: " + "; ".join(mism))
        n, wills = load_denominator(corpus_dir)
    except CoverageError as e:
        fail_closed(str(e))

    toolchain = shutil.which("clerk") is not None
    standard_root = Path(args.standard).expanduser().resolve()
    try:
        checked = checked_coverage(
            snapshot_path=repo_root / "coverage-floor" / "rule-universe.json",
            oracle_glob=str(repo_root / "tests" / "oracles" / "*.oracle.json"),
            verdict_glob=str(standard_root / "catala" / "**" / "*.test-fixtures.json"),
            standard_root=standard_root if standard_root.is_dir() else None,
            toolchain_available=toolchain,
        )
    except CheckedCoverageError as e:
        # Drift vs the live sibling ⇒ FAIL, surfaced legibly, never a crashed report.
        # (checked_coverage's CoverageError is a DISTINCT class from denominator's above.)
        checked = drift_fail_report(str(e))
    report = grade(wills, checked=checked)

    if args.format == "json":
        print(json.dumps(report, indent=2, sort_keys=True, ensure_ascii=False))
    else:
        tc = "on" if toolchain else "MISSING"
        print(f"Coverage report — N={report['N']} wills  (gov-oracle toolchain: {tc})")
        for d in report["dimensions"]:
            print(f"  {d['dimension']:<19}{d['coverage_pct']:>3}%  [{d['band']:>6}]  {d['status']}")
        print(
            f"  checked-coverage: {checked['status']} {checked['covered']}/{checked['total']} "
            f"({checked['pct']}%) [oracle {len(checked['covered_oracle_grade'])} / "
            f"verdict {len(checked['covered_verdict_grade'])}]"
        )
    return EXIT_OK


def main() -> int:
    ap = argparse.ArgumentParser(description="T032 gov-oracle harness (TT-478)")
    ap.add_argument(
        "--oracle",
        default="tests/oracles/*.oracle.json",
        help="glob of oracle files (default: tests/oracles/*.oracle.json)",
    )
    ap.add_argument(
        "--standard",
        default=os.environ.get("CODE_INHERIT_STANDARD", "../code-inherit-standard"),
        help="path to code-inherit-standard root (env CODE_INHERIT_STANDARD)",
    )
    # TT-497 Tier-0 coverage grader (toolchain-optional; runs before the clerk/catala
    # check below so --coverage-report works without opam present).
    ap.add_argument(
        "--coverage-report",
        action="store_true",
        help="emit the §7 per-dimension coverage record over the committed denominator",
    )
    ap.add_argument(
        "--verify-denominator",
        action="store_true",
        help="re-hash the committed denominator vs MANIFEST.json (sha256)",
    )
    ap.add_argument("--format", choices=("json", "table"), default="table")
    ap.add_argument(
        "--corpus",
        default="corpus/synthetic-uk-will-v0.2-seed42-n200",
        help="denominator dir, relative to repo root",
    )
    args = ap.parse_args()

    if args.coverage_report or args.verify_denominator:
        return _coverage_dispatch(args)

    print(f"oracle_verify.py v{VERSION} — T032 LEGAL gov-oracle harness (TT-478)")

    for tool in ("clerk", "catala"):
        if shutil.which(tool) is None:
            fail_closed(f"{tool} not on PATH (need catala/clerk 1.2.0; run inside `opam exec --`)")
    try:
        ver = subprocess.run(["clerk", "--version"], capture_output=True, text=True).stdout.strip()
        print(f"clerk: {ver}")
    except OSError as e:
        fail_closed(f"cannot run clerk: {e}")

    standard_root = Path(args.standard).expanduser().resolve()
    if not standard_root.is_dir():
        fail_closed(f"--standard is not a directory: {standard_root}")

    # Glob relative to this script's repo root (parent of scripts/), then cwd.
    repo_root = Path(__file__).resolve().parent.parent
    matches = sorted(glob.glob(str(repo_root / args.oracle)) or glob.glob(args.oracle))
    if not matches:
        fail_closed(f"no oracle files matched: {args.oracle}")

    print(f"standard: {standard_root}")
    print(f"oracles:  {len(matches)} file(s)\n")

    any_red = False
    for m in matches:
        op = Path(m)
        oracle = json.loads(op.read_text(encoding="utf-8"))
        cases = oracle.get("cases") or []
        result_kind = (oracle.get("rule") or {}).get("result_kind", "scalar")
        sym = _CCY_SYMBOL[oracle_currency(oracle)]
        passed, out = verify_one(op, standard_root)
        if result_kind == "per_heir":
            # `out` is the pre-formatted per-case report from verify_per_heir; a
            # wrong_split PASS reads "split correctly caught as differing".
            head = "GREEN " if passed else "RED   "
            print(f"{head} {op.name}  ({len(cases)} per-heir case(s))  [per_heir]")
            print(out)
            if not passed:
                any_red = True
                print("   (a per-heir multiset does NOT match the oracle — see lines above)")
        elif passed:
            print(f"GREEN  {op.name}  ({len(cases)} case(s))")
            for c in cases:
                amt = format_money_display(case_expected_money(c))
                url = c.get("citation_url", "")
                print(f"   PASS  {c['label']}: computed == {sym}{amt}  [{url}]")
        else:
            any_red = True
            print(
                f"RED    {op.name}  — computed answer does NOT match the cited authoritative figure"
            )
            for c in cases:
                url = c.get("citation_url", "")
                print(f"   case {c['label']}: expected {sym}{case_expected_money(c)}  [{url}]")
            print("   ---- clerk output ----")
            for line in out.splitlines():
                if any(k in line for k in ("FAILED", "Assertion", "PASSED", "error", "tests")):
                    print(f"   {line}")
        print()

    if any_red:
        print(
            "GATE FAILED: a computed legal figure or per-heir allocation does not match its oracle."
        )
        return EXIT_RED
    print("GATE PASSED: every computed legal figure and per-heir allocation matches its oracle.")
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
