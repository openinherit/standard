#!/usr/bin/env bash
# Regenerates both runtime validators from the v3/ schemas, in one place:
#
#   v3/*.json → openapi/openapi-bundled.yaml        (redocly bundle)
#             → packages/sdk/src/zod/zod.gen.ts      (hey-api zod plugin)
#             → packages/sdk/src/zod/index.ts        (schemasById, from the bundle's $ids)
#             → packages/sdk-python/openinherit/models.py  (datamodel-codegen)
#             → packages/sdk-python/openinherit/models_by_id.py (MODELS_BY_ID)
#
# CI runs this and fails on any diff, so a generated validator can never again
# be older than the schema it claims to describe.
#
# Needs: pnpm install done; python3 with packages/sdk-python/requirements-codegen.txt.
#   PYTHON=/path/to/python scripts/generate-runtime-validators.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PYTHON="${PYTHON:-python3}"
BIN="$ROOT/node_modules/.bin"

echo "1/4 bundle openapi/openapi.yaml"
"$BIN/redocly" bundle openapi/openapi.yaml -o openapi/openapi-bundled.yaml >/dev/null

echo "2/4 zod  → packages/sdk/src/zod/zod.gen.ts"
"$BIN/openapi-ts" -f scripts/openapi-ts.zod.config.mjs >/dev/null
GEN=packages/sdk/src/zod/zod.gen.ts
# Two post-generation edits, both mechanical and both re-applied on every run:
#  - z.uuid() → z.guid(). Zod's uuid() demands RFC 9562 version and variant
#    bits; JSON Schema's "uuid" format is the RFC 4122 8-4-4-4-12 hex syntax
#    and does not. z.guid() is that syntax exactly. Without this, 363 VALID
#    corpus documents were refused.
#  - // @ts-nocheck. The generator writes .default([...]) literals whose string
#    members TypeScript widens past the enum they belong to (TS2769), so the
#    declaration build fails on code nobody can edit. Runtime behaviour is
#    unaffected, and the inferred types are still emitted.
sed -i 's/z\.uuid()/z.guid()/g' "$GEN"
sed -i '1a // @ts-nocheck' "$GEN"

echo "3/4 index → packages/sdk/src/zod/index.ts"
"$PYTHON" scripts/lib/write-validator-indexes.py zod openapi/openapi-bundled.yaml packages/sdk/src/zod

echo "4/4 pydantic → packages/sdk-python/openinherit/models.py"
# --field-constraints is deliberately ABSENT. With it, the generator writes
# Field(pattern=...) onto date / datetime / UUID fields, which recent pydantic (measured: 2.13.5)
# refuses at validation time ("Unable to apply constraint 'pattern'"), so the
# published models could not validate a single document carrying a date.
# Without it the generator drops the redundant pattern on typed fields and
# keeps it (as constr) on plain strings.
# The generator reads a prepared copy of the bundle — see the docstring of
# scripts/lib/open-unevaluable-objects.py for what is changed and why. The
# copy keeps the bundle's file name so models.py's header stays stable.
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
"$PYTHON" scripts/lib/open-unevaluable-objects.py openapi/openapi-bundled.yaml "$TMP/openapi-bundled.yaml"
"$PYTHON" -m datamodel_code_generator \
  --input "$TMP/openapi-bundled.yaml" --input-file-type openapi \
  --output packages/sdk-python/openinherit/models.py \
  --output-model-type pydantic_v2.BaseModel --target-python-version 3.11 \
  --use-standard-collections --use-union-operator --use-subclass-enum \
  --formatters builtin --disable-timestamp 2>/dev/null
"$PYTHON" scripts/lib/write-validator-indexes.py pydantic openapi/openapi-bundled.yaml \
  packages/sdk-python/openinherit/models.py

echo "done"
