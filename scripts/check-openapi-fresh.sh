#!/usr/bin/env bash
# RED when an OpenAPI bundle or a generated TypeScript client is not what
# regenerating from openapi/openapi.yaml (and the v3/ schemas it references) and
# openapi/reference-api.yaml produces. Covers the published @openinherit/sdk
# clients (packages/sdk/src/estate and /reference) as well as generated/typescript.
# Catches both a hand edit to a generated file and an upstream change committed
# without regenerating.
#
# packages/sdk/src/estate-v2 (@openinherit/sdk/v2) is not here: its source
# document is not in this repo, so it cannot be regenerated.
#
# The commands are read from package.json (the SCRIPTS below), so
# there is one home for how these files are made. Generators must already be
# installed (pnpm install --frozen-lockfile): the lockfile is what pins them, so
# this refuses to fall back to fetching whatever npx would download.
#
# Compares against the index (what is committed, in CI), and also fails on a
# generated file the commit lacks.
#
# exit 0 fresh · 1 stale (the diff is printed) · 2 could not regenerate — never a pass
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
SCRIPTS=(bundle:openapi generate generate:sdk bundle:reference-api generate:sdk:reference)
GENERATED=(
  openapi/openapi-bundled.yaml
  generated/typescript
  packages/sdk/src/estate
  openapi/reference-api-bundled.yaml
  packages/sdk/src/reference
)

cannot() { echo "CANNOT ANSWER — $*" >&2; exit 2; }

git rev-parse --git-dir >/dev/null 2>&1 || cannot "$ROOT is not a git checkout"
for bin in redocly openapi-ts; do
  [ -x "node_modules/.bin/$bin" ] || cannot "node_modules/.bin/$bin missing — run pnpm install --frozen-lockfile"
done

export PATH="$ROOT/node_modules/.bin:$PATH" npm_config_offline=true
for script in "${SCRIPTS[@]}"; do
  cmd="$(node -p "require('./package.json').scripts['$script'] || ''")" \
    || cannot "could not read package.json"
  [ -n "$cmd" ] || cannot "package.json has no '$script' script"
  echo "regenerate: $script" >&2
  if ! out="$(sh -c "$cmd" 2>&1)"; then
    echo "$out" >&2
    cannot "'$script' failed"
  fi
done

STALE="$(git diff --name-only -- "${GENERATED[@]}"; git ls-files --others --exclude-standard -- "${GENERATED[@]}")"
if [ -n "$STALE" ]; then
  echo "STALE — these files do not match what openapi/*.yaml and v3/ regenerate:" >&2
  echo "$STALE" >&2
  git --no-pager diff --stat -- "${GENERATED[@]}" >&2
  echo "Run 'pnpm bundle:openapi && pnpm generate && pnpm generate:sdk && pnpm bundle:reference-api && pnpm generate:sdk:reference' and commit the result. Do not edit these files by hand." >&2
  exit 1
fi
echo "OpenAPI bundles and generated clients: fresh"
