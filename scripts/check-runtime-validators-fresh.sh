#!/usr/bin/env bash
# RED when a generated runtime validator is older than the schema it was
# generated from. Regenerates everything scripts/generate-runtime-validators.sh
# owns and fails if the working tree then differs from the index (what is
# committed, in CI) or leaves a new untracked file behind.
#
# exit 0 fresh · 1 stale (the diff is printed) · 2 could not regenerate
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
GENERATED=(
  openapi/openapi-bundled.yaml
  packages/sdk/src/zod
  packages/sdk-python/openinherit/models.py
  packages/sdk-python/openinherit/models_by_id.py
)
if ! bash scripts/generate-runtime-validators.sh; then
  echo "CANNOT ANSWER — regeneration failed" >&2
  exit 2
fi
STALE="$(git diff --name-only -- "${GENERATED[@]}"; git ls-files --others --exclude-standard -- "${GENERATED[@]}")"
if [ -n "$STALE" ]; then
  echo "STALE — these generated files do not match the v3/ schemas they come from:" >&2
  echo "$STALE" >&2
  git --no-pager diff --stat -- "${GENERATED[@]}" >&2
  echo "Run scripts/generate-runtime-validators.sh and commit the result." >&2
  exit 1
fi
echo "Runtime validators: fresh"
