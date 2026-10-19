#!/usr/bin/env bash
# Hermetic harness for scripts/check-stale-counts.py and scripts/generate-stats.py.
#
# Every case builds a SYNTHETIC tree in a temp dir and copies the scripts into
# its scripts/ directory, so the harness runs the scripts exactly as they sit in
# the repo (they resolve the tree from their own location). Nothing here reads
# the real v3/, so it cannot go green because the repo happens to be correct
# today, and cannot go red because someone added a schema.
#
# The synthetic tree is sized to the checker's floors (see FLOORS in
# scripts/lib/schema_stats.py), so a case that removes one file is a real
# regression and not an artefact of a too-small fixture.
#
# Exit contract under test: 0 clean · 1 problems · 2 CANNOT ANSWER. 2 is never a pass.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PASS=0
FAIL=0

# Preflight: python3's own "no such file" exit is 2, so an absent gate would
# score every CANNOT-ANSWER assertion for free.
for s in check-stale-counts.py generate-stats.py; do
  if [[ ! -f "$HERE/$s" ]]; then
    echo "HARNESS ERROR: $s not found at $HERE" >&2
    exit 2
  fi
done

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# mktree <dir> — a v3 tree with 34 entity schemas, 16 common types,
# 22 extension directories, 38 reference-data files, 45 root properties and
# 37 fixtures; package version 9.9.9. No schema-stats.json is written.
mktree() {
  local d="$1" i props
  mkdir -p "$d/v3/common" "$d/v3/extensions" "$d/reference-data" \
           "$d/examples/fixtures" "$d/packages/schema" "$d/scripts"
  cp "$HERE/check-stale-counts.py" "$HERE/generate-stats.py" "$d/scripts/"
  if [[ -d "$HERE/lib" ]]; then
    mkdir -p "$d/scripts/lib"
    cp "$HERE"/lib/*.py "$d/scripts/lib/" 2>/dev/null || true
  fi
  props=""
  for i in $(seq 1 45); do props+="\"p$i\":{},"; done
  printf '{"properties":{%s}}\n' "${props%,}" > "$d/v3/schema.json"
  for i in $(seq 1 33); do echo '{}' > "$d/v3/entity-$i.json"; done
  for i in $(seq 1 16); do echo '{}' > "$d/v3/common/type-$i.json"; done
  for i in $(seq 1 21); do
    mkdir -p "$d/v3/extensions/ext-$i"; echo '{}' > "$d/v3/extensions/ext-$i/ext-$i.json"
  done
  mkdir -p "$d/v3/extensions/scotland"; echo '{}' > "$d/v3/extensions/scotland/scotland.json"
  # 37 data files + schema-stats.json itself = 38, as in the real tree
  for i in $(seq 1 37); do echo '{}' > "$d/reference-data/data-$i.json"; done
  for i in $(seq 1 37); do echo '{}' > "$d/examples/fixtures/fixture-$i.json"; done
  echo '{"name":"@openinherit/schema","version":"9.9.9"}' > "$d/packages/schema/package.json"
}

# stale_stats <dir> — the artefact as published in March 2026: 13 extensions.
stale_stats() {
  cat > "$1/reference-data/schema-stats.json" <<'JSON'
{"entitySchemas":22,"commonTypes":9,"extensionDirectories":13,"referenceDataFiles":15,
 "rootProperties":33,"fixtures":10,"totalSchemas":44,"version":"1.2.0","_healthWarnings":[]}
JSON
}

run() { # run <dir> <script> -> sets OUT, RC
  OUT="$(cd "$WORK" && python3 "$1/scripts/$2" 2>&1)"; RC=$?
}

ok()   { PASS=$((PASS+1)); printf 'ok   %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf 'FAIL %s\n%s\n' "$1" "$OUT" | sed 's/^/     /;1s/^     //'; }

expect_rc() { # expect_rc <name> <want>
  if [[ "$RC" == "$2" ]]; then ok "$1 (exit $RC)"; else bad "$1 (exit $RC, want $2)"; fi
}
expect_says() { # expect_says <name> <needle>
  if grep -qF -- "$2" <<<"$OUT"; then ok "$1"; else bad "$1 — missing: $2"; fi
}
expect_not_says() {
  if grep -qF -- "$2" <<<"$OUT"; then bad "$1 — must not say: $2"; else ok "$1"; fi
}

# ── 1. THE INVERTED VERDICT (ROADMAP.md:19, measured 15 Sep 2026) ────────────
# Tree has 22 extensions, the stale artefact says 13, the prose says 22.
# The old checker told the maintainer to change correct prose DOWN to 13.
T="$WORK/inverted"; mktree "$T"; stale_stats "$T"
echo '- Homepage, 39 example scenarios, 22 jurisdiction extensions, partners.' > "$T/ROADMAP.md"
run "$T" check-stale-counts.py
expect_not_says "1a correct prose is never pushed down to the stale artefact" 'should be 13'
expect_not_says "1b ROADMAP.md is not flagged at all" 'ROADMAP.md:1'
expect_rc       "1c the stale artefact itself is a problem" 1
expect_says     "1d the stale artefact is named as drifted from the tree" 'DRIFT: reference-data/schema-stats.json'

# ── 2. The generator runs on a v3/ tree and re-derives every stat ────────────
T="$WORK/fresh"; mktree "$T"
run "$T" generate-stats.py
expect_rc "2a generate-stats.py runs on a v3/ tree" 0
S="$T/reference-data/schema-stats.json"
if [[ -f "$S" ]] && python3 - "$S" <<'PY'
import json, sys
s = json.load(open(sys.argv[1]))
want = {"entitySchemas": 34, "commonTypes": 16, "extensionDirectories": 22,
        "referenceDataFiles": 38, "rootProperties": 45, "fixtures": 37,
        "totalSchemas": 72, "version": "9.9.9"}
bad = {k: (s.get(k), v) for k, v in want.items() if s.get(k) != v}
assert not bad, bad
assert "scotland" in s["extensionNames"] and len(s["extensionNames"]) == 22
assert len(s["entities"]) == 34 and len(s["commonTypeNames"]) == 16
assert len(s["rootPropertyNames"]) == 45 and len(s["fixtureNames"]) == 37
assert s["_healthWarnings"] == []
PY
then ok "2b all seven stats, the version and the five name lists come from the tree"
else OUT="$(cat "$S" 2>/dev/null)"; bad "2b all seven stats, the version and the five name lists come from the tree"; fi

# ── 3. A freshly generated tree with correct prose is clean ──────────────────
cat > "$T/ROADMAP.md" <<'MD'
It defines 34 core entity schemas, 16 common types and 22 jurisdiction/cultural extensions.
The [extension guide](docs/extension-guide.md) documents how to write an extension.
MD
run "$T" check-stale-counts.py
expect_rc "3a regenerated artefact + correct prose is clean" 0

# ── 4. Wrong prose is corrected TOWARDS the tree ─────────────────────────────
echo 'INHERIT supports 13 jurisdiction extensions.' > "$T/docs.md"
run "$T" check-stale-counts.py
expect_rc   "4a a prose undercount is refused" 1
expect_says "4b and the correction points at the tree's number" 'docs.md:1 says "13 extension directories" — should be 22'
rm "$T/docs.md"

# ── 5. Historical sections are point-in-time, never corrected ───────────────
cat > "$T/ROADMAP.md" <<'MD'
## Current: v9.9.9

- 22 jurisdiction extensions

## Delivered in v3.0.0 (April 2026)

- 31 core entity schemas, 14 common types
- 17 jurisdiction/cultural extensions

## Next: v10

- 22 jurisdiction extensions
MD
run "$T" check-stale-counts.py
expect_rc "5a counts under a 'Delivered in' heading are exempt" 0
echo '- 13 jurisdiction extensions' >> "$T/ROADMAP.md"
run "$T" check-stale-counts.py
expect_says "5b the exemption ends at the next heading" 'ROADMAP.md:13 says "13 extension directories"'
rm "$T/ROADMAP.md"

# ── 6. "JSON Schema 2020-12 entity schemas" is a date, not a count ───────────
echo '- `v3/` — the JSON Schema 2020-12 entity schemas and extensions.' > "$T/README.md"
run "$T" check-stale-counts.py
expect_rc "6a a version number ending in digits is not read as a count" 0
rm "$T/README.md"

# ── 7. A schema added without regenerating is drift ─────────────────────────
mkdir -p "$T/v3/extensions/wales"; echo '{}' > "$T/v3/extensions/wales/wales.json"
run "$T" check-stale-counts.py
expect_rc   "7a a new extension without regenerating reds" 1
expect_says "7b and names the drifted stat" 'extensionDirectories'
rm -rf "$T/v3/extensions/wales"

# ── 8. A removal below the floor reds, even after regenerating ──────────────
rm -rf "$T/v3/extensions/scotland"
run "$T" generate-stats.py
run "$T" check-stale-counts.py
expect_rc   "8a an extension removed below the floor reds" 1
expect_says "8b and says which floor" 'extensionDirectories'

# ── 9. No v3/ tree → CANNOT ANSWER, from both scripts ───────────────────────
T="$WORK/empty"; mkdir -p "$T/scripts" "$T/reference-data"
cp "$HERE/check-stale-counts.py" "$HERE/generate-stats.py" "$T/scripts/"
[[ -d "$HERE/lib" ]] && mkdir -p "$T/scripts/lib" && cp "$HERE"/lib/*.py "$T/scripts/lib/" 2>/dev/null
stale_stats "$T"
run "$T" generate-stats.py
expect_rc "9a generator with no v3/schema.json cannot answer" 2
run "$T" check-stale-counts.py
expect_rc "9b checker with no v3/schema.json cannot answer" 2

echo
echo "$PASS passed, $FAIL failed"
[[ "$FAIL" == 0 ]]
