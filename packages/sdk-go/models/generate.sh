#!/usr/bin/env bash
set -euo pipefail

# Generate Go types from the INHERIT OpenAPI spec.
#
# The spec uses OpenAPI 3.1.1 with JSON Schema 2020-12, but oapi-codegen
# only supports OpenAPI 3.0.x. This script:
#   1. Downconverts the bundled spec from 3.1 to 3.0 using @apiture/openapi-down-convert
#   2. Finishes the conversion (scripts/lib/openapi30-for-oapi-codegen.mjs): drops the
#      JSON Schema if/then/else 3.0 cannot carry — left in, oapi-codegen turns Space and
#      Schema into interface{} and Catalogue into a self-alias that does not compile —
#      and rewrites numeric exclusiveMinimum/exclusiveMaximum into the 3.0 boolean form
#   3. Generates Go types using oapi-codegen
#
# Both generators are pinned, so regenerating is deterministic and
# scripts/check-go-models-fresh.sh can compare the result with the commit:
#   @apiture/openapi-down-convert — package.json devDependency (pnpm install --frozen-lockfile)
#   oapi-codegen                  — OAPI_CODEGEN_VERSION below, fetched by `go run` and
#                                   checked against the Go checksum database
# The input is openapi/openapi-bundled.yaml, so regenerate that first
# (pnpm bundle:openapi) when v3/ or openapi/openapi.yaml has changed.
#
# Prerequisites: node + pnpm install, go (the version in ../go.mod)

OAPI_CODEGEN_VERSION=v2.6.0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
INPUT="$ROOT_DIR/openapi/openapi-bundled.yaml"
OUTPUT="$SCRIPT_DIR/types.gen.go"
DOWN_CONVERT="$ROOT_DIR/node_modules/.bin/openapi-down-convert"

if [ ! -x "$DOWN_CONVERT" ]; then
  echo "openapi-down-convert missing at $DOWN_CONVERT — run pnpm install --frozen-lockfile" >&2
  exit 1
fi

TMP_DIR=$(mktemp -d /tmp/openapi-3.0-XXXXXX)
trap 'rm -rf "$TMP_DIR"' EXIT
TMP_SPEC="$TMP_DIR/openapi-3.0.json"

echo "Step 1: Downconverting OpenAPI 3.1 → 3.0..."
"$DOWN_CONVERT" -i "$INPUT" -o "$TMP_DIR/down-converted.json"

echo "Step 2: Dropping if/then/else and rewriting exclusive bounds for 3.0..."
node "$ROOT_DIR/scripts/lib/openapi30-for-oapi-codegen.mjs" "$TMP_DIR/down-converted.json" "$TMP_SPEC"

echo "Step 3: Generating Go types (oapi-codegen $OAPI_CODEGEN_VERSION)..."
go run "github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@$OAPI_CODEGEN_VERSION" \
  --package models --generate types -o "$OUTPUT" "$TMP_SPEC"

STRUCT_COUNT=$(grep -c "^type.*struct" "$OUTPUT")
LINE_COUNT=$(wc -l < "$OUTPUT")
echo "Done. Generated $STRUCT_COUNT structs ($LINE_COUNT lines) → $OUTPUT"
