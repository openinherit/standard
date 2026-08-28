#!/usr/bin/env bash
set -euo pipefail

# Validate referential integrity (Level 2) on all estate fixtures.
# Runs node scripts/validate-refs.mjs on every JSON fixture that is
# a valid root INHERIT document (not extension fixtures, not catalogues,
# not plain text, not intentionally broken references).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SKIP="broken-references.json catalogue-only.json sample-will-text.txt"
SKIP_PREFIX="extension-"

PASSED=0
WARNED=0
FAILED=0
SKIPPED=0
WARNINGS=""
ERRORS=""

echo "Referential integrity check (Level 2)"
echo ""

# Examples are advisory — report warnings but do not fail the build.
# Some example fixtures (e.g., platform integration demos) have
# intentionally incomplete cross-references.
echo "Examples (advisory — warnings only):"
for fixture in "$ROOT_DIR"/examples/fixtures/*.json; do
  filename=$(basename "$fixture")

  if echo "$SKIP" | grep -qw "$filename"; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  if echo "$filename" | grep -q "^${SKIP_PREFIX}"; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo -n "  $filename ... "
  if node "$ROOT_DIR/scripts/validate-refs.mjs" "$fixture" >/dev/null 2>&1; then
    echo "PASS"
    PASSED=$((PASSED + 1))
  else
    echo "WARN (broken refs)"
    WARNED=$((WARNED + 1))
    WARNINGS="$WARNINGS\n  WARN: $filename"
  fi
done

echo ""
echo "Will companion fixtures (advisory — warnings only):"
for fixture in $(find "$ROOT_DIR/examples/wills" -name '*-inherit-*.json' 2>/dev/null); do
  filename=$(basename "$fixture")
  relative="${fixture#$ROOT_DIR/}"

  result=$(node "$SCRIPT_DIR/validate-refs.mjs" "$fixture" 2>&1) || true

  if echo "$result" | grep -q "ERROR"; then
    echo "  $relative ... WARN (broken refs)"
    WARNED=$((WARNED + 1))
    WARNINGS="${WARNINGS}\n  ${relative}: $(echo "$result" | grep ERROR | head -3)"
  else
    echo "  $relative ... PASS"
    PASSED=$((PASSED + 1))
  fi
done

# Conformance fixtures MUST pass — these are the standard's contract.
# Skip broken-references.json — it is intentionally Level 2 invalid.
echo ""
echo "Conformance (mandatory — failures block CI):"
for fixture in "$ROOT_DIR"/packages/conformance/estate/valid/*.json; do
  filename=$(basename "$fixture")
  if [ "$filename" = "broken-references.json" ]; then
    echo "  $filename ... SKIP (intentionally broken)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  filename=$(basename "$fixture")
  echo -n "  $filename ... "
  if node "$ROOT_DIR/scripts/validate-refs.mjs" "$fixture" >/dev/null 2>&1; then
    echo "PASS"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL"
    FAILED=$((FAILED + 1))
    ERRORS="$ERRORS\n  FAIL: $filename"
  fi
done

echo ""
echo "Referential integrity: $PASSED passed, $FAILED failed, $WARNED warned, $SKIPPED skipped"

if [ "$WARNED" -gt 0 ]; then
  echo -e "\nExample fixtures with broken refs (advisory):$WARNINGS"
fi

if [ "$FAILED" -gt 0 ]; then
  echo -e "\nConformance fixtures with broken refs (blocking):$ERRORS"
  exit 1
fi
