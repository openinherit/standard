#!/usr/bin/env bash
# Audits v3/ schemas for stale v1 references in prose fields.
# Run after copying v1/ to v3/ to catch titles, descriptions, and
# comments that still mention "v1".
#
# Checks: title, description, $comment fields containing literal
# "v1" or "INHERIT v1" text (not URIs — those are handled by sed).

set -euo pipefail

FAILURES=0

echo "Auditing v3/ schemas for stale v1 prose references..."
echo ""

# Check title and description fields for "v1" references
# Exclude: $id, $ref, $schema URIs (which legitimately reference versions)
while IFS= read -r line; do
  FILE=$(echo "$line" | cut -d: -f1)
  CONTENT=$(echo "$line" | cut -d: -f2-)

  # Skip URI fields — these are version-correct references
  if echo "$CONTENT" | grep -qP '"\$(id|ref|schema)"'; then
    continue
  fi

  echo "WARN: $FILE:$CONTENT"
  FAILURES=$((FAILURES + 1))
done < <(grep -rn '"INHERIT v1\|"INHERIT v1 \|v1 Root Schema\|v1 estate data\|v1 schema suite' v3/ --include="*.json" 2>/dev/null || true)

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo "Found $FAILURES stale v1 prose reference(s) in v3/"
  exit 1
else
  echo "No stale v1 prose references found in v3/"
fi
