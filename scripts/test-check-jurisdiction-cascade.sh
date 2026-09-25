#!/usr/bin/env bash
# Hermetic harness for scripts/check-jurisdiction-cascade.py (TT-735 / ICP-0060).
#
# Every case builds a SYNTHETIC tree in a temp dir. Nothing here reads the real
# reference data, so the harness cannot go green because the repo happens to be
# correct today, and cannot go red because someone edited a real row.
#
# Exit contract under test: 0 clear - 1 REFUSED - 2 CANNOT ANSWER. 2 is never a pass.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$HERE/check-jurisdiction-cascade.py"
PASS=0
FAIL=0

# Preflight. Without this, every CANNOT-ANSWER assertion below passes for the wrong
# reason: python3's own "no such file" exit is also 2, so an absent gate scores four
# free greens. A harness that can pass when the thing under test is missing is the
# vacuous green this repo keeps learning about.
if [[ ! -f "$GATE" ]]; then
  echo "HARNESS ERROR: gate not found at $GATE" >&2
  exit 2
fi

t() { # t <name> <expected-exit> <tree> [extra args...]
  local name="$1" want="$2" tree="$3"; shift 3
  local out rc
  out="$(python3 "$GATE" --tree "$tree" "$@" 2>&1)"; rc=$?
  if [[ "$rc" == "$want" ]]; then
    PASS=$((PASS+1)); printf 'ok   %-58s exit %s\n' "$name" "$rc"
  else
    FAIL=$((FAIL+1)); printf 'FAIL %-58s exit %s (want %s)\n%s\n' "$name" "$rc" "$want" "$out"
  fi
}

t_says() { # t_says <name> <needle> <tree> [extra args...]
  local name="$1" needle="$2" tree="$3"; shift 3
  local out
  out="$(python3 "$GATE" --tree "$tree" "$@" 2>&1)"
  if grep -q -- "$needle" <<<"$out"; then
    PASS=$((PASS+1)); printf 'ok   %-58s names %s\n' "$name" "$needle"
  else
    FAIL=$((FAIL+1)); printf 'FAIL %-58s did not name %s\n%s\n' "$name" "$needle" "$out"
  fi
}

# --- tree builder -----------------------------------------------------------
# build <dir> <profiles-json> <rates-json> <registry-json> [cascade-json]
build() {
  local d="$1"
  mkdir -p "$d/reference-data"
  printf '%s' "$2" > "$d/reference-data/jurisdiction-profiles.json"
  printf '%s' "$3" > "$d/reference-data/tax-rates.json"
  printf '%s' "$3" > "$d/reference-data/tax-thresholds.json"
  printf '%s' "$4" > "$d/extensions-registry.json"
  if [[ $# -ge 5 ]]; then printf '%s' "$5" > "$d/reference-data/jurisdiction-cascade.json"; fi
}

PROF='{"jurisdictions":{"XA-N":{},"XA-S":{},"XB":{}}}'
RATES='{"jurisdictions":{"XA":{},"XB":{}}}'
REG_OK='{"extensions":[{"name":"North","applicableJurisdictions":["XA-N","XA-S"],"jurisdictionRelation":"constitutes"},{"name":"Faith","applicableJurisdictions":["XB"],"jurisdictionRelation":"applies-within"}]}'
REG_NOREL='{"extensions":[{"name":"North","applicableJurisdictions":["XA-N","XA-S"]},{"name":"Faith","applicableJurisdictions":["XB"],"jurisdictionRelation":"applies-within"}]}'

# A cascade covering every token of PROF+RATES+REG, shaped per the spec.
cascade() { # cascade <extra-entries-json-fragment-or-empty>
  cat <<JSON
{
  "version": "0.0.0-test",
  "axes": {
    "succession": { "source": "reference-data/jurisdiction-profiles.json" },
    "tax": { "source": "reference-data/tax-rates.json" }
  },
  "jurisdictions": {
    "XA": { "kind": "atom", "constituents": [],
      "resolution": { "succession": { "resolvesTo": null, "reason": "no federal succession law" },
                      "tax": { "resolvesTo": null, "reason": "XA is itself the tax row" } } },
    "XA-N": { "kind": "atom", "constituents": [],
      "resolution": { "succession": { "resolvesTo": null, "reason": "distinct succession law" },
                      "tax": { "resolvesTo": "XA", "reason": "one fiscal territory", "authority": "Test Act 1999 s.1" } } },
    "XA-S": { "kind": "atom", "constituents": [],
      "resolution": { "succession": { "resolvesTo": null, "reason": "distinct succession law" },
                      "tax": { "resolvesTo": "XA", "reason": "one fiscal territory", "authority": "Test Act 1999 s.1" } } },
    "XA-NS": { "kind": "union", "constituents": ["XA-N", "XA-S"],
      "resolution": { "succession": { "resolvesTo": null, "reason": "the union IS the succession jurisdiction" },
                      "tax": { "resolvesTo": "XA", "reason": "one fiscal territory", "authority": "Test Act 1999 s.1" } } },
    "XB": { "kind": "atom", "constituents": [],
      "resolution": { "succession": { "resolvesTo": null, "reason": "sovereign" },
                      "tax": { "resolvesTo": null, "reason": "XB is itself the tax row" } } }${1:-}
  },
  "exclusions": {}
}
JSON
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- 1. the happy path must be clear, or every red below proves nothing -----
build "$TMP/ok" "$PROF" "$RATES" "$REG_OK" "$(cascade)"
t "a complete, well-formed cascade is clear" 0 "$TMP/ok"

# --- 2. coverage: DW-1 / DW-6 ----------------------------------------------
build "$TMP/missing-profile" '{"jurisdictions":{"XA-N":{},"XA-S":{},"XB":{},"XC":{}}}' "$RATES" "$REG_OK" "$(cascade)"
t       "a profile token with no cascade entry is REFUSED"      1 "$TMP/missing-profile"
t_says  "...and the refusal names the token"                 "XC" "$TMP/missing-profile"

build "$TMP/missing-registry" "$PROF" "$RATES" \
  '{"extensions":[{"name":"North","applicableJurisdictions":["XA-N","XA-S"],"jurisdictionRelation":"constitutes"},{"name":"Faith","applicableJurisdictions":["XB","XZ"],"jurisdictionRelation":"applies-within"}]}' "$(cascade)"
t      "a registry token with no cascade entry is REFUSED"      1 "$TMP/missing-registry"
t_says "...and the refusal names the token"                  "XZ" "$TMP/missing-registry"

# --- 3. DW-2: a refusal must be declared, never an empty hole ---------------
build "$TMP/null-no-reason" "$PROF" "$RATES" "$REG_OK" \
  "$(cascade | python3 -c 'import json,sys; d=json.load(sys.stdin); del d["jurisdictions"]["XB"]["resolution"]["tax"]["reason"]; print(json.dumps(d))')"
t "resolvesTo null with NO reason is REFUSED"                   1 "$TMP/null-no-reason"

build "$TMP/null-blank-reason" "$PROF" "$RATES" "$REG_OK" \
  "$(cascade | python3 -c 'import json,sys; d=json.load(sys.stdin); d["jurisdictions"]["XB"]["resolution"]["tax"]["reason"]="   "; print(json.dumps(d))')"
t "resolvesTo null with a BLANK reason is REFUSED"              1 "$TMP/null-blank-reason"

build "$TMP/axis-missing" "$PROF" "$RATES" "$REG_OK" \
  "$(cascade | python3 -c 'import json,sys; d=json.load(sys.stdin); del d["jurisdictions"]["XB"]["resolution"]["tax"]; print(json.dumps(d))')"
t "an entry silent on a declared axis is REFUSED"               1 "$TMP/axis-missing"

# --- 4. kind / constituents integrity --------------------------------------
build "$TMP/empty-union" "$PROF" "$RATES" "$REG_OK" \
  "$(cascade | python3 -c 'import json,sys; d=json.load(sys.stdin); d["jurisdictions"]["XA-NS"]["constituents"]=[]; print(json.dumps(d))')"
t "a union with no constituents is REFUSED"                     1 "$TMP/empty-union"

build "$TMP/fat-atom" "$PROF" "$RATES" "$REG_OK" \
  "$(cascade | python3 -c 'import json,sys; d=json.load(sys.stdin); d["jurisdictions"]["XB"]["constituents"]=["XA-N"]; print(json.dumps(d))')"
t "an atom carrying constituents is REFUSED"                    1 "$TMP/fat-atom"

build "$TMP/dangling-constituent" "$PROF" "$RATES" "$REG_OK" \
  "$(cascade | python3 -c 'import json,sys; d=json.load(sys.stdin); d["jurisdictions"]["XA-NS"]["constituents"]=["XA-N","XA-W"]; print(json.dumps(d))')"
t "a constituent with no entry of its own is REFUSED"           1 "$TMP/dangling-constituent"

# --- 5. DW-4: resolution may never point at a row that is not there --------
build "$TMP/phantom-target" "$PROF" "$RATES" "$REG_OK" \
  "$(cascade | python3 -c 'import json,sys; d=json.load(sys.stdin); d["jurisdictions"]["XA-N"]["resolution"]["tax"]["resolvesTo"]="XQ"; print(json.dumps(d))')"
t "resolving to a token with no row in that axis is REFUSED"    1 "$TMP/phantom-target"

# --- 5b. DW-4, the real trap: an EDGE must be attested, not merely well-formed ------
# M4 against the live tree: US-TX/tax -> US with reason "truncate" scored CLEAR. That is
# precisely hyphen-truncation, and precisely the silently-wrong answer this issue exists
# to prevent. A gate cannot know that edge is substantively wrong -- GB-ENG -> GB is the
# same shape and is right -- so what it enforces is that introducing one is a VISIBLE act:
# a non-null resolvesTo must name the instrument that makes it true.
build "$TMP/edge-no-authority" "$PROF" "$RATES" "$REG_OK" \
  "$(cascade | python3 -c 'import json,sys; d=json.load(sys.stdin); del d["jurisdictions"]["XA-N"]["resolution"]["tax"]["authority"]; print(json.dumps(d))')"
t "a declared edge with no authority is REFUSED"                1 "$TMP/edge-no-authority"

build "$TMP/edge-blank-authority" "$PROF" "$RATES" "$REG_OK" \
  "$(cascade | python3 -c 'import json,sys; d=json.load(sys.stdin); d["jurisdictions"]["XA-N"]["resolution"]["tax"]["authority"]="  "; print(json.dumps(d))')"
t "a declared edge with a blank authority is REFUSED"           1 "$TMP/edge-blank-authority"

build "$TMP/edge-no-reason" "$PROF" "$RATES" "$REG_OK" \
  "$(cascade | python3 -c 'import json,sys; d=json.load(sys.stdin); del d["jurisdictions"]["XA-N"]["resolution"]["tax"]["reason"]; print(json.dumps(d))')"
t "a declared edge with no reason is REFUSED"                   1 "$TMP/edge-no-reason"

# --- 6. DW-3: the registry must say what its list MEANS --------------------
build "$TMP/no-relation" "$PROF" "$RATES" "$REG_NOREL" "$(cascade)"
t      "a registry row with no jurisdictionRelation is REFUSED"  1 "$TMP/no-relation"
t_says "...and the refusal names the row"                "North" "$TMP/no-relation"

build "$TMP/false-constitutes" "$PROF" "$RATES" \
  '{"extensions":[{"name":"North","applicableJurisdictions":["XA-N","XA-S"],"jurisdictionRelation":"constitutes"},{"name":"Faith","applicableJurisdictions":["XB","XA-N"],"jurisdictionRelation":"constitutes"}]}' "$(cascade)"
t "a constitutes row matching no declared union is REFUSED"      1 "$TMP/false-constitutes"

# --- 7. exclusions are declared, never inferred ----------------------------
build "$TMP/excl-blank" '{"jurisdictions":{"XA-N":{},"XA-S":{},"XB":{},"XC":{}}}' "$RATES" "$REG_OK" \
  "$(cascade | python3 -c 'import json,sys; d=json.load(sys.stdin); d["exclusions"]={"XC":"  "}; print(json.dumps(d))')"
t "an exclusion with a blank reason is REFUSED"                  1 "$TMP/excl-blank"

build "$TMP/excl-ok" '{"jurisdictions":{"XA-N":{},"XA-S":{},"XB":{},"XC":{}}}' "$RATES" "$REG_OK" \
  "$(cascade | python3 -c 'import json,sys; d=json.load(sys.stdin); d["exclusions"]={"XC":"placeholder row, no territory"}; print(json.dumps(d))')"
t "an exclusion with a stated reason is clear"                   0 "$TMP/excl-ok"

# --- 8. absence and malformation are never a pass --------------------------
build "$TMP/no-cascade" "$PROF" "$RATES" "$REG_OK"
t "an absent cascade file is REFUSED, not clear"                 1 "$TMP/no-cascade"

build "$TMP/bad-json" "$PROF" "$RATES" "$REG_OK" '{"jurisdictions": {'
t "malformed cascade JSON is CANNOT ANSWER, never clear"         2 "$TMP/bad-json"

t "an absent tree is CANNOT ANSWER"                              2 "$TMP/does-not-exist"

# --- 9. the anti-vacuity floor (TT-1456 13.6) ------------------------------
build "$TMP/floor" "$PROF" "$RATES" "$REG_OK" "$(cascade)"
t "discovering fewer tokens than the pinned floor is CANNOT ANSWER" 2 "$TMP/floor" --min-tokens 99
t "discovering at least the pinned floor is clear"                  0 "$TMP/floor" --min-tokens 4

# --- 10. DW-5: membership is CONSUMED from TT-1456's authority -------------
printf 'XA\tcountry\tAlpha\nXA-N\tsubdivision\tNorth\nXA-S\tsubdivision\tSouth\nXB\tcountry\tBravo\nXA-NS\tlegal-extension\tNorth and South\n' > "$TMP/authority.txt"
build "$TMP/auth" "$PROF" "$RATES" "$REG_OK" "$(cascade)"
t "every cascade token in the authority is clear"        0 "$TMP/auth" --authority "$TMP/authority.txt"

printf 'XA\tcountry\tAlpha\nXA-N\tsubdivision\tNorth\nXA-S\tsubdivision\tSouth\nXB\tcountry\tBravo\n' > "$TMP/authority-thin.txt"
t      "a cascade token absent from the authority is REFUSED" 1 "$TMP/auth" --authority "$TMP/authority-thin.txt"
t_says "...and the refusal names it"                  "XA-NS" "$TMP/auth" --authority "$TMP/authority-thin.txt"

t "an --authority file that is not there is CANNOT ANSWER" 2 "$TMP/auth" --authority "$TMP/nope.txt"

printf '\n===\n%d passed, %d failed\n' "$PASS" "$FAIL"
[[ "$FAIL" == 0 ]]
