#!/usr/bin/env bash
set -euo pipefail

# Generate Go types from the INHERIT OpenAPI spec.
#
# The spec uses OpenAPI 3.1.1 with JSON Schema 2020-12, but oapi-codegen
# only supports OpenAPI 3.0.x. This script:
#   1. Downconverts the bundled spec from 3.1 to 3.0 using @apiture/openapi-down-convert
#   2. Patches any remaining exclusiveMinimum/exclusiveMaximum (3.1 numeric → 3.0 boolean)
#   3. Generates Go types using oapi-codegen
#
# Prerequisites:
#   npm (for npx @apiture/openapi-down-convert)
#   go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
INPUT="$ROOT_DIR/openapi/openapi-bundled.yaml"
OUTPUT="$SCRIPT_DIR/types.gen.go"

TMP_SPEC=$(mktemp /tmp/openapi-3.0-XXXXXX.yaml)

echo "Step 1: Downconverting OpenAPI 3.1 → 3.0..."
npx @apiture/openapi-down-convert -i "$INPUT" -o "$TMP_SPEC"

echo "Step 2: Patching remaining exclusiveMinimum/exclusiveMaximum..."
sed -i 's/exclusiveMinimum: \([0-9]*\)/minimum: \1\n                exclusiveMinimum: true/g' "$TMP_SPEC"
sed -i 's/exclusiveMaximum: \([0-9]*\)/maximum: \1\n                exclusiveMaximum: true/g' "$TMP_SPEC"

echo "Step 3: Generating Go types..."
oapi-codegen --package models --generate types -o "$OUTPUT" "$TMP_SPEC"

rm -f "$TMP_SPEC"

STRUCT_COUNT=$(grep -c "^type.*struct" "$OUTPUT")
LINE_COUNT=$(wc -l < "$OUTPUT")
echo "Done. Generated $STRUCT_COUNT structs ($LINE_COUNT lines) → $OUTPUT"
