#!/usr/bin/env bash
# RED when the OpenAPI bundle or the generated TypeScript client is not what
# regenerating from openapi/openapi.yaml (and the v3/ schemas it references)
# produces. Catches both a hand edit to a generated file and an upstream change
# committed without regenerating.
#
# The two commands are read from package.json (bundle:openapi, generate), so
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
GENERATED=(
  openapi/openapi-bundled.yaml
  generated/typescript
)

cannot() { echo "CANNOT ANSWER — $*" >&2; exit 2; }

git rev-parse --git-dir >/dev/null 2>&1 || cannot "$ROOT is not a git checkout"
for bin in redocly openapi-ts; do
  [ -x "node_modules/.bin/$bin" ] || cannot "node_modules/.bin/$bin missing — run pnpm install --frozen-lockfile"
done

export PATH="$ROOT/node_modules/.bin:$PATH" npm_config_offline=true
for script in bundle:openapi generate; do
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
  echo "STALE — these files do not match what openapi/openapi.yaml and v3/ regenerate:" >&2
  echo "$STALE" >&2
  git --no-pager diff --stat -- "${GENERATED[@]}" >&2
  echo "Run 'pnpm bundle:openapi && pnpm generate' and commit the result. Do not edit these files by hand." >&2
  exit 1
fi
echo "OpenAPI bundle and generated client: fresh"
