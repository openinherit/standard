#!/usr/bin/env bash
# Hermetic harness for scripts/check-go-models-fresh.sh — regenerating the Go SDK
# types (packages/sdk-go/models/types.gen.go) from openapi/openapi-bundled.yaml
# reproduces what is committed.
#
# Every case runs in a scratch git repo built in a temp dir from the real bundle,
# generator and finishing step, so the harness cannot go green because the repo
# happens to be correct today. The baseline is regenerated there first, then
# broken one way per case.
#
# Exit contract under test: 0 fresh · 1 STALE · 2 CANNOT ANSWER. 2 is never a pass.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
FRESH="$HERE/check-go-models-fresh.sh"
PASS=0
FAIL=0

# Preflight. bash's own "no such file" exit is 127, but a gate that is missing
# must not be confused with any answer the cases expect.
for f in "$FRESH" "$ROOT/packages/sdk-go/models/generate.sh" "$HERE/lib/openapi30-for-oapi-codegen.mjs"; do
  [[ -f "$f" ]] || { echo "HARNESS ERROR: not found: $f" >&2; exit 2; }
done
command -v go >/dev/null 2>&1 || { echo "HARNESS ERROR: go is not on PATH" >&2; exit 2; }
[[ -x "$ROOT/node_modules/.bin/openapi-down-convert" ]] \
  || { echo "HARNESS ERROR: run pnpm install first — the cases need the pinned down-converter" >&2; exit 2; }

check() { # check <name> <want-exit> <needle-or-empty> <cmd...>
  local name="$1" want="$2" needle="$3"; shift 3
  local out rc
  out="$("$@" 2>&1)"; rc=$?
  if [[ "$rc" != "$want" ]]; then
    FAIL=$((FAIL+1)); printf 'FAIL %-58s exit %s (want %s)\n%s\n' "$name" "$rc" "$want" "$out"
  elif [[ -n "$needle" ]] && ! grep -qF -- "$needle" <<<"$out"; then
    FAIL=$((FAIL+1)); printf 'FAIL %-58s exit %s but did not name %s\n%s\n' "$name" "$rc" "$needle" "$out"
  else
    PASS=$((PASS+1)); printf 'ok   %-58s exit %s%s\n' "$name" "$rc" "${needle:+ · names $needle}"
  fi
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

BASE="$TMP/base"
mkdir -p "$BASE/openapi" "$BASE/scripts/lib" "$BASE/packages/sdk-go/models"
cp -a "$ROOT/openapi/openapi-bundled.yaml" "$BASE/openapi/"
cp -a "$FRESH" "$BASE/scripts/"
cp -a "$HERE/lib/openapi30-for-oapi-codegen.mjs" "$BASE/scripts/lib/"
cp -a "$ROOT/packages/sdk-go/models/generate.sh" "$BASE/packages/sdk-go/models/"
: > "$BASE/packages/sdk-go/models/types.gen.go"
ln -s "$ROOT/node_modules" "$BASE/node_modules"
printf 'node_modules\n' > "$BASE/.gitignore"
(
  cd "$BASE" &&
  git init -q && git config user.email t@t && git config user.name t &&
  git add -A && git commit -qm seed &&
  # The seed's types.gen.go is empty, so 1 (stale) is expected here; 2 means it
  # could not regenerate at all, and every case below would be meaningless.
  { bash scripts/check-go-models-fresh.sh >/dev/null 2>&1; [ $? -eq 1 ]; } &&
  git add -A && git commit -qm baseline
) || { echo "HARNESS ERROR: could not build the baseline" >&2; exit 2; }

case_tree() { local d="$TMP/$1"; cp -a "$BASE" "$d"; printf '%s' "$d"; }
fresh() { bash "$1/scripts/check-go-models-fresh.sh"; }

T="$(case_tree clean)"
check "regenerating reproduces the commit exactly" 0 "fresh" fresh "$T"

T="$(case_tree hand-edit)"
printf '\n// hand edit\ntype HandEdited bool\n' >> "$T/packages/sdk-go/models/types.gen.go"
git -C "$T" commit -qam "hand edit"
check "a hand edit to the committed types" 1 "STALE" fresh "$T"

T="$(case_tree unregenerated)"
sed -i 's/Reference to the Property.id that contains or is associated with this space/& (changed upstream)/' \
  "$T/openapi/openapi-bundled.yaml"
git -C "$T" diff --quiet && { echo "HARNESS ERROR: the bundle edit matched nothing" >&2; exit 2; }
git -C "$T" commit -qam "bundle change, no regenerate"
check "a bundle change committed without regenerating" 1 "packages/sdk-go/models/types.gen.go" fresh "$T"

T="$(case_tree missing)"
git -C "$T" rm -q packages/sdk-go/models/types.gen.go && git -C "$T" commit -qm "drop the generated file"
check "the generated file missing from the commit" 1 "STALE" fresh "$T"

T="$(case_tree no-down-convert)"; rm "$T/node_modules"
check "down-converter absent (never a pass)" 2 "CANNOT ANSWER" fresh "$T"

T="$(case_tree no-go)"
mkdir "$T/.bin"
for b in bash git dirname node; do ln -s "$(command -v "$b")" "$T/.bin/$b"; done
check "go absent (never a pass)" 2 "CANNOT ANSWER" env PATH="$T/.bin" bash "$T/scripts/check-go-models-fresh.sh"

T="$(case_tree broken-bundle)"
printf 'not: [valid\n' > "$T/openapi/openapi-bundled.yaml"; git -C "$T" commit -qam "broken bundle"
check "the generator fails (never a pass)" 2 "CANNOT ANSWER" fresh "$T"

T="$(case_tree not-git)"; rm -rf "$T/.git"
check "not a git checkout (never a pass)" 2 "CANNOT ANSWER" fresh "$T"

printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"
[[ "$FAIL" == 0 ]]
