#!/usr/bin/env bash
set -euo pipefail

# Schema diff: compares current branch schemas against base branch
# Usage: ./scripts/schema-diff.sh [base-branch]

BASE_BRANCH="${1:-main}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export PATH="$HOME/.local/bin:$PATH"

echo "Comparing schemas against $BASE_BRANCH..."
echo ""

# Get list of changed schema files
CHANGED_SCHEMAS=$(git diff --name-only "$BASE_BRANCH"...HEAD -- 'v3/*.json' 'v3/**/*.json' 2>/dev/null || echo "")

if [ -z "$CHANGED_SCHEMAS" ]; then
  echo "No schema files changed."
  exit 0
fi

BREAKING=0
COMPATIBLE=0

for schema_file in $CHANGED_SCHEMAS; do
  if ! git show "$BASE_BRANCH:$schema_file" >/dev/null 2>&1; then
    echo "  NEW: $schema_file (no base comparison)"
    COMPATIBLE=$((COMPATIBLE + 1))
    continue
  fi

  echo "  CHANGED: $schema_file"

  base_tmp=$(mktemp /tmp/schema-diff-base-XXXXXX.json)
  git show "$BASE_BRANCH:$schema_file" > "$base_tmp"

  # Check for new required fields (breaking)
  base_required=$(jq -r '.required // [] | sort | .[]' "$base_tmp" 2>/dev/null || echo "")
  head_required=$(jq -r '.required // [] | sort | .[]' "$schema_file" 2>/dev/null || echo "")

  new_required=$(comm -13 <(echo "$base_required") <(echo "$head_required") 2>/dev/null || echo "")

  if [ -n "$new_required" ]; then
    echo "    BREAKING: New required field(s): $new_required"
    BREAKING=$((BREAKING + 1))
  fi

  # Check for removed enum values (breaking)
  base_enums=$(jq -r '.. | .enum? // empty | .[]' "$base_tmp" 2>/dev/null | sort -u || echo "")
  head_enums=$(jq -r '.. | .enum? // empty | .[]' "$schema_file" 2>/dev/null | sort -u || echo "")

  removed_enums=$(comm -23 <(echo "$base_enums") <(echo "$head_enums") 2>/dev/null || echo "")

  if [ -n "$removed_enums" ]; then
    echo "    BREAKING: Removed enum value(s): $removed_enums"
    BREAKING=$((BREAKING + 1))
  fi

  rm -f "$base_tmp"
done

echo ""
echo "Schema diff summary: $COMPATIBLE compatible, $BREAKING breaking"

if [ "$BREAKING" -gt 0 ]; then
  echo ""
  echo "WARNING: Breaking changes detected. This requires a major version bump."
  exit 1
fi
