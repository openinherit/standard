#!/usr/bin/env python3
"""Publication redline check.

Refuses, in a public repository, content in four categories:
  1. moat/stealth reasoning (positioning against competitors, camouflage,
     timing of reveals);
  2. unlaunched-brand commercials (pricing, revenue models, launch sequencing,
     partner terms);
  3. internal planning artefacts (docs/superpowers/**, handoffs/, agent
     instruction files such as CLAUDE.md / AGENTS.md / .claude/ / .cursor/ /
     copilot-instructions.md);
  4. local-machine paths or operator identifiers (/mnt/c/Users, C:\\Users,
     /home/<name>/).

A brand NAME is not a hit — a product name in a schema example is the standard
doing its job. The test is whether the text reveals strategy, not whether it
mentions a product. Categories 1/2/4 are term-based heuristics: "0 hits" means
no known phrasing matched, not that no strategy content exists.

EXIT CODES: 0 clean · 1 hits found · 2 CANNOT ANSWER (bad args / unreadable tree
/ git unavailable). Exit 2 is never "no hits".

USAGE
  check-publication-redline.py --tree .
  check-publication-redline.py --staged      # pre-commit hook mode
  check-publication-redline.py FILE [FILE ...]
  check-publication-redline.py --tree . --json
"""

import json
import os
import re
import subprocess
import sys

VERSION = "1.0"

# --- Category 3: PATH globs. Mechanical, no judgement. ----------------------
_PATH_RULES = [
    (re.compile(r"^docs/superpowers/"), "docs/superpowers/** — internal planning artefacts"),
    (re.compile(r"^handoffs/"), "handoffs/** — session handoff documents"),
    (re.compile(r"(^|/)CLAUDE(\.local)?\.md$"), "CLAUDE.md — agent instruction file"),
    (re.compile(r"(^|/)AGENTS\.md$"), "AGENTS.md — agent instruction file"),
    (re.compile(r"(^|/)\.claude/"), ".claude/** — agent configuration + rules"),
    (re.compile(r"(^|/)\.cursor/"), ".cursor/** — agent configuration + rules"),
    (
        re.compile(r"(^|/)copilot-instructions\.md$"),
        "copilot-instructions.md — agent instruction file",
    ),
]

# The gate's own source carries its trigger literals as detection PATTERNS, not
# content. Exempt its own EXACT relpath from term-scanning (categories 1/2/4)
# only; category-3 path scan still runs. Exact relpath, never basename.
_TOOL_SELF = {"scripts/check-publication-redline.py"}


def _norm(relpath):
    """Repo-relative, forward-slashed, leading './' removed (prefix, not a
    character set — str.lstrip('./') would eat the dot of .claude/ / .cursor/)."""
    p = relpath.replace(os.sep, "/")
    return p[2:] if p.startswith("./") else p


# --- Categories 1, 2, 4: TERM patterns. Heuristic. --------------------------
_TERM_RULES = [
    # 1. Moat / stealth reasoning
    (1, re.compile(r"\bstealth\b", re.I), "moat/stealth reasoning"),
    (1, re.compile(r"\bcamouflag", re.I), "moat/stealth reasoning"),
    (1, re.compile(r"\bmoats?\b", re.I), "moat/stealth reasoning"),
    (1, re.compile(r"competitors?[^.\n]{0,60}underestimat", re.I), "moat/stealth reasoning"),
    (1, re.compile(r"underestimat[^.\n]{0,60}competitor", re.I), "moat/stealth reasoning"),
    (1, re.compile(r"competitor\s+surprise", re.I), "moat/stealth reasoning"),
    (1, re.compile(r"staged[-\s]reveal", re.I), "moat/stealth reasoning"),
    # 2. Unlaunched-brand commercials
    (2, re.compile(r"commercially\s+launch", re.I), "unlaunched-brand commercials"),
    (2, re.compile(r"launch\s+sequenc", re.I), "unlaunched-brand commercials"),
    (2, re.compile(r"revenue\s+model", re.I), "unlaunched-brand commercials"),
    (2, re.compile(r"pricing\s+(tier|model|strategy|table)", re.I), "unlaunched-brand commercials"),
    (2, re.compile(r"partner\s+terms", re.I), "unlaunched-brand commercials"),
    (2, re.compile(r"go[-\s]to[-\s]market", re.I), "unlaunched-brand commercials"),
    (
        2,
        re.compile(r"when\s+\S[^\n]{0,40}\slaunch(es)?\s*(→|->|,\s*then)", re.I),
        "unlaunched-brand commercials (launch-coupling)",
    ),
    # 4. Local-machine paths / operator identifiers
    (4, re.compile(r"/mnt/c/Users", re.I), "local-machine path"),
    (4, re.compile(r"[A-Za-z]:\\Users\\", re.I), "local-machine path"),
]

# `/home/<name>/` is a redline hit EXCEPT well-known CI account names.
_HOME_PATH = re.compile(r"/home/([a-z][a-z0-9_.-]*)/")
_HOME_ALLOW = {"runner", "ubuntu", "vsts", "circleci", "node", "user", "linuxbrew"}

_SKIP_EXT = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz",
    ".tgz", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".wasm", ".lock",
}
_MAX_BYTES = 2_000_000


def _die_cannot_answer(msg):
    print(f"CANNOT ANSWER: {msg}", file=sys.stderr)
    sys.exit(2)


def tracked_files(tree):
    if not os.path.isdir(tree):
        _die_cannot_answer(f"not a directory: {tree}")
    try:
        out = subprocess.run(
            ["git", "-C", tree, "ls-files", "-z"], capture_output=True, check=False
        )
    except OSError as exc:
        _die_cannot_answer(f"cannot run git: {exc}")
    if out.returncode != 0:
        _die_cannot_answer(
            f"git ls-files exited {out.returncode} in {tree}: "
            f"{out.stderr.decode('utf-8', 'replace').strip()[:200]}"
        )
    names = [n for n in out.stdout.decode("utf-8", "replace").split("\0") if n]
    if not names:
        _die_cannot_answer(f"git reports zero tracked files in {tree}")
    return names


def staged_files():
    try:
        out = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
            capture_output=True,
            check=False,
        )
    except OSError as exc:
        _die_cannot_answer(f"cannot run git: {exc}")
    if out.returncode != 0:
        _die_cannot_answer(f"git diff --cached exited {out.returncode}")
    return [n for n in out.stdout.decode("utf-8", "replace").split("\0") if n]


def scan_path(relpath):
    norm = _norm(relpath)
    return [
        (3, "internal planning artefact", why)
        for rx, why in _PATH_RULES
        if rx.search(norm)
    ]


def scan_text(relpath, root):
    if os.path.splitext(relpath)[1].lower() in _SKIP_EXT:
        return []
    full = os.path.join(root, relpath) if root else relpath
    try:
        if os.path.getsize(full) > _MAX_BYTES:
            return []
        with open(full, "rb") as fh:
            raw = fh.read()
    except (OSError, ValueError):
        return []
    if b"\0" in raw[:4096]:
        return []
    text = raw.decode("utf-8", "replace")

    hits, seen = [], set()
    for cat, rx, why in _TERM_RULES:
        m = rx.search(text)
        if m and (cat, why) not in seen:
            seen.add((cat, why))
            line = text.count("\n", 0, m.start()) + 1
            hits.append((cat, why, f"line {line}: {m.group(0).strip()[:60]!r}"))
    for m in _HOME_PATH.finditer(text):
        if m.group(1) not in _HOME_ALLOW:
            line = text.count("\n", 0, m.start()) + 1
            hits.append((4, "operator directory", f"line {line}: {m.group(0)!r}"))
            break
    return hits


def run(files, root):
    findings = []
    for rel in files:
        for cat, why, detail in scan_path(rel):
            findings.append({"file": rel, "category": cat, "rule": why, "detail": detail})
        if _norm(rel) in _TOOL_SELF:
            continue
        for cat, why, detail in scan_text(rel, root):
            findings.append({"file": rel, "category": cat, "rule": why, "detail": detail})
    return findings


def main(argv):
    as_json = "--json" in argv
    argv = [a for a in argv if a != "--json"]

    root, files = "", []
    if "--tree" in argv:
        i = argv.index("--tree")
        if i + 1 >= len(argv):
            _die_cannot_answer("--tree needs a path")
        root = os.path.expanduser(argv[i + 1])
        files = tracked_files(root)
    elif "--staged" in argv:
        files = staged_files()
        if not files:
            if not as_json:
                print(f"check-publication-redline v{VERSION}: nothing staged — clean")
            return 0
    else:
        files = [a for a in argv[1:] if not a.startswith("-")]
        if not files:
            _die_cannot_answer("no files given; use --tree PATH, --staged, or list files")

    findings = run(files, root)

    if as_json:
        print(
            json.dumps(
                {
                    "version": VERSION,
                    "scanned": len(files),
                    "hit_files": len({f["file"] for f in findings}),
                    "findings": findings,
                },
                indent=2,
            )
        )
        return 1 if findings else 0

    print(f"check-publication-redline v{VERSION} — scanned {len(files)} files", file=sys.stderr)
    if not findings:
        print(f"REDLINE CLEAN — {len(files)} files, 0 hits")
        print(
            "  Categories 1/2/4 are term-based. Clean means no known phrasing "
            "matched — it does not mean no strategy content exists."
        )
        return 0

    by_cat = {}
    for f in findings:
        by_cat.setdefault(f["category"], []).append(f)
    hit_files = sorted({f["file"] for f in findings})
    print(f"REDLINE VIOLATED — {len(hit_files)} of {len(files)} files, {len(findings)} findings")
    names = {
        1: "moat/stealth reasoning",
        2: "unlaunched-brand commercials",
        3: "internal planning artefacts",
        4: "local-machine paths",
    }
    for cat in sorted(by_cat):
        rows = by_cat[cat]
        print(f"\n  [{cat}] {names[cat]} — {len({r['file'] for r in rows})} files")
        for r in sorted(rows, key=lambda x: x["file"])[:40]:
            print(f"      {r['file']}\n          {r['rule']} — {r['detail']}")
        if len(rows) > 40:
            print(f"      … and {len(rows) - 40} more findings in this category")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
