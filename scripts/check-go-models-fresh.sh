#!/usr/bin/env bash
# RED when the Go SDK's generated types (packages/sdk-go/models/types.gen.go) are
# not what regenerating from openapi/openapi-bundled.yaml produces. The bundle is
# itself held to v3/ by scripts/check-openapi-fresh.sh, so the two together keep
# the Go types current with the schemas.
#
# Until this existed nothing compared the file with anything: it sat at the
# 28 August publication commit while v3/ changed underneath it.
#
# The command is packages/sdk-go/models/generate.sh, the one home for how the
# file is made; both generators it calls are pinned there. Compares against the
# index (what is committed, in CI).
#
# exit 0 fresh · 1 stale (the diff is printed) · 2 could not regenerate — never a pass
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
GENERATED=packages/sdk-go/models/types.gen.go

cannot() { echo "CANNOT ANSWER — $*" >&2; exit 2; }

git rev-parse --git-dir >/dev/null 2>&1 || cannot "$ROOT is not a git checkout"
command -v go >/dev/null 2>&1 || cannot "go is not on PATH"
[ -x node_modules/.bin/openapi-down-convert ] \
  || cannot "node_modules/.bin/openapi-down-convert missing — run pnpm install --frozen-lockfile"
[ -f openapi/openapi-bundled.yaml ] || cannot "openapi/openapi-bundled.yaml is missing"

if ! out="$(bash packages/sdk-go/models/generate.sh 2>&1)"; then
  echo "$out" >&2
  cannot "packages/sdk-go/models/generate.sh failed"
fi

STALE="$(git diff --name-only -- "$GENERATED"; git ls-files --others --exclude-standard -- "$GENERATED")"
if [ -n "$STALE" ]; then
  echo "STALE — $GENERATED does not match what openapi/openapi-bundled.yaml regenerates:" >&2
  git --no-pager diff --stat -- "$GENERATED" >&2
  echo "Run 'bash packages/sdk-go/models/generate.sh' and commit the result. Do not edit it by hand." >&2
  exit 1
fi
echo "Go SDK types: fresh"
