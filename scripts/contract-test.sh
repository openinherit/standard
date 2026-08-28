#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACT_DIR="$ROOT_DIR/tests/contract"
SCHEMA="$ROOT_DIR/v3/schema.json"

export PATH="$HOME/.local/bin:$PATH"

# Prefer sourcemeta-jsonschema (collision-proof) over jsonschema (may be Python CLI)
if command -v sourcemeta-jsonschema &>/dev/null; then
  JSONSCHEMA_CLI="sourcemeta-jsonschema"
elif command -v jsonschema &>/dev/null; then
  # Verify it's the Sourcemeta CLI, not the Python jsonschema wrapper
  if jsonschema --version 2>&1 | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    JSONSCHEMA_CLI="jsonschema"
  else
    echo "ERROR: 'jsonschema' found but it's the Python CLI, not Sourcemeta."
    echo "Install Sourcemeta: https://github.com/sourcemeta/jsonschema"
    echo "Or copy it to ~/.local/bin/sourcemeta-jsonschema"
    exit 1
  fi
else
  echo "ERROR: No jsonschema CLI found. Install Sourcemeta jsonschema CLI."
  exit 1
fi

PASS=0
FAIL=0
ERRORS=""

for fixture in "$CONTRACT_DIR"/golden-*.json; do
  name="$(basename "$fixture")"
  echo -n "  $name ... "

  if $JSONSCHEMA_CLI validate "$SCHEMA" "$fixture" \
    --resolve "$ROOT_DIR/v3/" \
    --resolve "$ROOT_DIR/v3/common/" \
    --resolve "$ROOT_DIR/v3/asset-categories/" \
    --resolve "$ROOT_DIR/v3/extensions/" 2>/dev/null; then
    echo "PASS"
    PASS=$((PASS + 1))
  else
    echo "FAIL"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  FAIL: $name"
  fi
done

echo ""
echo "Contract tests: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  echo -e "\nFailing golden documents:$ERRORS"
  echo ""
  echo "A golden document failure means this change breaks backwards compatibility."
  echo "If intentional, bump the major version and update the golden documents."
  exit 1
fi
