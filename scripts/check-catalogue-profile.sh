#!/usr/bin/env bash
# check-catalogue-profile.sh — proposal 0003: a catalogue-only document is the
# catalogue conformance PROFILE of the one INHERIT root, not a second root.
#
# For every catalogue fixture this proves, without wrapping it in an estate:
#   1. it declares  conformanceProfile: "catalogue"
#   2. it carries no estate envelope
#   3. it validates against v3/schema.json (the root) AS IT STANDS
#   4. it still validates against v3/catalogue.json (the entry point)
#   5. with the declaration stripped, v3/schema.json REFUSES it — so the
#      profile is what admits it, not a root that has stopped checking.
#
# Exit 0 all hold · 1 a fixture fails · 2 CANNOT ANSWER (missing tool or file,
# or fewer fixtures than --min). Never read 2 as a pass.
set -uo pipefail

cd "$(dirname "$0")/.."

MIN=2
while [ $# -gt 0 ]; do
  case "$1" in
    --min) [ $# -ge 2 ] || { echo "CANNOT ANSWER: --min needs a value" >&2; exit 2; }; MIN="$2"; shift 2 ;;
    *) echo "CANNOT ANSWER: unknown argument $1" >&2; exit 2 ;;
  esac
done

JSONSCHEMA="node_modules/.bin/jsonschema"
[ -x "$JSONSCHEMA" ] || { echo "CANNOT ANSWER: $JSONSCHEMA not found — run pnpm install" >&2; exit 2; }
command -v jq >/dev/null || { echo "CANNOT ANSWER: jq not found" >&2; exit 2; }

ROOT="v3/schema.json"
CATALOGUE="v3/catalogue.json"
CATALOGUE_URL="https://openinherit.org/v3/catalogue.json"
for f in "$ROOT" "$CATALOGUE"; do
  [ -f "$f" ] || { echo "CANNOT ANSWER: $f missing" >&2; exit 2; }
done

# Every schema in v3/, so cross-file $refs resolve.
RESOLVE=()
while IFS= read -r f; do RESOLVE+=(--resolve "$f"); done < <(find v3 -name '*.json' -not -path 'v3/context/*' | sort)

# Discover catalogue fixtures by what they say they are, not by a hand list:
# a hand list is how the room-gap fixture was skipped for a release.
FIXTURES=()
while IFS= read -r f; do
  if jq -e --arg u "$CATALOGUE_URL" '(."$schema" == $u) or (.conformanceProfile == "catalogue")' "$f" >/dev/null 2>&1; then
    FIXTURES+=("$f")
  fi
done < <(find examples/fixtures packages/conformance/catalogue/valid -name '*.json' | sort)

if [ "${#FIXTURES[@]}" -lt "$MIN" ]; then
  echo "CANNOT ANSWER: found ${#FIXTURES[@]} catalogue fixture(s), expected at least $MIN" >&2
  exit 2
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
FAILED=0

fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

for f in "${FIXTURES[@]}"; do
  ok=1
  if ! jq -e '.conformanceProfile == "catalogue"' "$f" >/dev/null; then
    fail "$f" "does not declare conformanceProfile \"catalogue\""; ok=0
  fi
  if jq -e 'has("estate")' "$f" >/dev/null; then
    fail "$f" "carries an estate envelope"; ok=0
  fi
  if ! "$JSONSCHEMA" validate "$ROOT" "$f" "${RESOLVE[@]}" >/dev/null 2>&1; then
    fail "$f" "does not validate against $ROOT"; ok=0
  fi
  if ! "$JSONSCHEMA" validate "$CATALOGUE" "$f" "${RESOLVE[@]}" >/dev/null 2>&1; then
    fail "$f" "does not validate against $CATALOGUE"; ok=0
  fi
  jq 'del(.conformanceProfile)' "$f" > "$TMP"
  if "$JSONSCHEMA" validate "$ROOT" "$TMP" "${RESOLVE[@]}" >/dev/null 2>&1; then
    fail "$f" "$ROOT accepts it with the declaration stripped — the profile is not load-bearing"; ok=0
  fi
  [ "$ok" -eq 1 ] && echo "PASS: $f — catalogue profile of $ROOT, unwrapped"
done

echo ""
echo "Results: ${#FIXTURES[@]} catalogue fixture(s), $FAILED failure(s)"
[ "$FAILED" -eq 0 ] || exit 1
