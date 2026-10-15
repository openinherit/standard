#!/usr/bin/env bash
# Hermetic harness for the two OpenAPI drift gates:
#
#   scripts/check-openapi-components.py — the component list in openapi/openapi.yaml
#                                         matches the JSON Schemas in v3/
#   scripts/check-openapi-fresh.sh      — regenerating the two OpenAPI bundles, generated/typescript
#                                         and the @openinherit/sdk clients reproduces what is committed
#
# Every case runs against a tree built in a temp dir, so the harness cannot go green
# because the repo happens to be correct today, nor red because someone edited a real
# file. The freshness cases copy the real openapi.yaml + v3/ into a scratch git repo and
# regenerate a baseline there first, then break it one way per case.
#
# Exit contract under test: 0 clear · 1 REFUSED/STALE · 2 CANNOT ANSWER. 2 is never a pass.
#
#   bash scripts/test-check-openapi-drift.sh              # all cases
#   bash scripts/test-check-openapi-drift.sh --components # skip the slow freshness cases
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
COMPONENTS="$HERE/check-openapi-components.py"
FRESH="$HERE/check-openapi-fresh.sh"
PASS=0
FAIL=0

# Preflight. python3's and bash's own "no such file" exits are 2, so without this
# every CANNOT-ANSWER assertion below would pass against an absent gate.
for g in "$COMPONENTS" "$FRESH"; do
  if [[ ! -f "$g" ]]; then
    echo "HARNESS ERROR: gate not found at $g" >&2
    exit 2
  fi
done

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

# ── component list ↔ v3/ ────────────────────────────────────────────────────────

schema() { # schema <file> — a minimal JSON Schema with a top-level $schema
  mkdir -p "$(dirname "$1")"
  printf '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}\n' > "$1"
}

new_tree() { # new_tree <name> — v3/{a,b}.json, a manifest, both schemas as components
  local d="$TMP/c-$1"
  schema "$d/v3/a.json"
  schema "$d/v3/common/b.json"
  schema "$d/v3/dialect.json"
  mkdir -p "$d/v3/extensions/x" "$d/openapi" "$d/scripts/data"
  printf '{"name":"X","id":"x"}\n' > "$d/v3/extensions/x/extension.json"
  cat > "$d/openapi/openapi.yaml" <<'YAML'
openapi: '3.1.1'
info: {title: t, version: '1'}
paths: {}
components:
  schemas:
    A:
      $ref: '../v3/a.json'
    B:
      $ref: '../v3/common/b.json'
    Local:
      type: object
YAML
  printf '{"excluded":[{"path":"v3/dialect.json","reason":"meta-schema"}]}\n' \
    > "$d/scripts/data/openapi-component-exclusions.json"
  printf '%s' "$d"
}

comp() { python3 "$COMPONENTS" --root "$1"; }

T="$(new_tree clean)"
check "components: every schema is a component or excluded" 0 "" comp "$T"

T="$(new_tree missing)"; schema "$T/v3/common/c.json"
check "components: a new v3 schema with no component" 1 "MISSING v3/common/c.json" comp "$T"

T="$(new_tree dangling)"; rm "$T/v3/common/b.json"
check "components: a component \$ref to a v3 file that is gone" 1 "DANGLING" comp "$T"

T="$(new_tree duplicate)"
printf "    A2:\n      \$ref: '../v3/a.json'\n" >> "$T/openapi/openapi.yaml"
check "components: two components on one schema" 1 "DUPLICATE v3/a.json" comp "$T"

T="$(new_tree stale-absent)"; rm "$T/v3/dialect.json"
check "components: an exclusion naming an absent file" 1 "STALE-EXCLUSION v3/dialect.json" comp "$T"

T="$(new_tree stale-referenced)"
printf "    Dialect:\n      \$ref: '../v3/dialect.json'\n" >> "$T/openapi/openapi.yaml"
check "components: an exclusion naming a file that IS a component" 1 "STALE-EXCLUSION v3/dialect.json" comp "$T"

T="$(new_tree no-reason)"
printf '{"excluded":[{"path":"v3/dialect.json","reason":""}]}\n' \
  > "$T/scripts/data/openapi-component-exclusions.json"
check "components: an exclusion with no reason" 1 "no reason" comp "$T"

T="$(new_tree no-schemas)"; rm -rf "$T/v3"; mkdir -p "$T/v3"
check "components: v3/ holds no schemas (never a pass)" 2 "CANNOT ANSWER" comp "$T"

T="$(new_tree no-openapi)"; rm "$T/openapi/openapi.yaml"
check "components: openapi.yaml absent (never a pass)" 2 "CANNOT ANSWER" comp "$T"

T="$(new_tree no-register)"; rm "$T/scripts/data/openapi-component-exclusions.json"
check "components: exclusion register absent (never a pass)" 2 "CANNOT ANSWER" comp "$T"

T="$(new_tree manifest)"
check "components: a file with no \$schema is not a candidate" 0 "1 non-schema" comp "$T"

if [[ "${1:-}" == "--components" ]]; then
  printf '\n%d passed, %d failed (freshness cases skipped)\n' "$PASS" "$FAIL"
  [[ "$FAIL" == 0 ]]; exit $?
fi

# ── regenerate-and-diff ─────────────────────────────────────────────────────────

if [[ ! -x "$ROOT/node_modules/.bin/redocly" || ! -x "$ROOT/node_modules/.bin/openapi-ts" ]]; then
  echo "HARNESS ERROR: run pnpm install first — the freshness cases need the pinned generators" >&2
  exit 2
fi

BASE="$TMP/f-base"
mkdir -p "$BASE/openapi" "$BASE/scripts" "$BASE/generated"
cp -a "$ROOT/package.json" "$ROOT/redocly.yaml" "$BASE/"
cp -a "$ROOT/v3" "$BASE/v3"
cp -a "$ROOT/openapi/openapi.yaml" "$ROOT/openapi/reference-api.yaml" "$BASE/openapi/"
mkdir -p "$BASE/packages/sdk/src"
cp -a "$FRESH" "$BASE/scripts/"
ln -s "$ROOT/node_modules" "$BASE/node_modules"
printf 'node_modules\n' > "$BASE/.gitignore"
(
  cd "$BASE" &&
  git init -q && git config user.email t@t && git config user.name t &&
  git add -A && git commit -qm seed &&
  # The baseline is whatever the pinned generators produce from these inputs,
  # committed — so the clean case asserts determinism, not the real repo's state.
  # Exit 1 (stale against the seed) is expected here; 2 means it could not
  # regenerate at all, and every case below would then be meaningless.
  { bash scripts/check-openapi-fresh.sh >/dev/null 2>&1; [ $? -ne 2 ]; } &&
  git add -A && git commit -qm baseline
) || { echo "HARNESS ERROR: could not build the freshness baseline" >&2; exit 2; }

case_tree() { local d="$TMP/f-$1"; cp -a "$BASE" "$d"; printf '%s' "$d"; }
fresh() { bash "$1/scripts/check-openapi-fresh.sh"; }

T="$(case_tree clean)"
check "fresh: regenerating reproduces the commit exactly" 0 "" fresh "$T"

T="$(case_tree bundle-hand-edit)"
sed -i '0,/description:/s//description: HAND EDIT/' "$T/openapi/openapi-bundled.yaml"
git -C "$T" commit -qam "hand edit"
check "fresh: a hand edit to the committed bundle" 1 "openapi/openapi-bundled.yaml" fresh "$T"

T="$(case_tree client-hand-edit)"
printf '\nexport type HandEdited = true;\n' >> "$T/generated/typescript/types.gen.ts"
git -C "$T" commit -qam "hand edit"
check "fresh: a hand edit to the committed client" 1 "generated/typescript/types.gen.ts" fresh "$T"

T="$(case_tree sdk-estate-hand-edit)"
printf '\nexport type HandEdited = true;\n' >> "$T/packages/sdk/src/estate/types.gen.ts"
git -C "$T" commit -qam "hand edit"
check "fresh: a hand edit to the published estate client" 1 "packages/sdk/src/estate/types.gen.ts" fresh "$T"

T="$(case_tree sdk-reference-hand-edit)"
printf '\nexport type HandEdited = true;\n' >> "$T/packages/sdk/src/reference/types.gen.ts"
git -C "$T" commit -qam "hand edit"
check "fresh: a hand edit to the published reference client" 1 "packages/sdk/src/reference/types.gen.ts" fresh "$T"

T="$(case_tree reference-bundle-hand-edit)"
sed -i '0,/description:/s//description: HAND EDIT/' "$T/openapi/reference-api-bundled.yaml"
git -C "$T" commit -qam "hand edit"
check "fresh: a hand edit to the committed reference bundle" 1 "openapi/reference-api-bundled.yaml" fresh "$T"

T="$(case_tree reference-unregenerated)"
sed -i '0,/description: Machine-readable error code$/s//description: Machine-readable error code, changed upstream/' "$T/openapi/reference-api.yaml"
git -C "$T" commit -qam "upstream change, no regenerate"
check "fresh: a reference-api change committed without regenerating" 1 "packages/sdk/src/reference" fresh "$T"

T="$(case_tree unregenerated)"
python3 - "$T/v3/person.json" <<'PY'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
d["description"] = d.get("description", "") + " (changed upstream, not regenerated)"
json.dump(d, open(p, "w"), indent=2)
PY
git -C "$T" commit -qam "upstream change, no regenerate"
check "fresh: a v3/ change committed without regenerating" 1 "STALE" fresh "$T"
check "fresh: … and the published estate client is named stale" 1 "packages/sdk/src/estate/types.gen.ts" fresh "$T"

T="$(case_tree untracked)"
rm "$T/generated/typescript/index.ts"; git -C "$T" commit -qam "drop a generated file"
check "fresh: a generated file missing from the commit" 1 "generated/typescript/index.ts" fresh "$T"

T="$(case_tree no-generator)"; rm "$T/node_modules"
check "fresh: generators absent (never a pass)" 2 "CANNOT ANSWER" fresh "$T"

printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"
[[ "$FAIL" == 0 ]]
