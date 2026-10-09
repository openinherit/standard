#!/usr/bin/env bash
# Hermetic harness for scripts/check-rule-jurisdiction.py (rule-body jurisdiction slots).
#
# Every case builds a SYNTHETIC tree in a temp dir. Nothing here reads the real
# rule bodies or reference data, so the harness cannot go green because the repo
# happens to be correct today, and cannot go red because someone edited a real file.
#
# Exit contract under test: 0 clear - 1 REFUSED - 2 CANNOT ANSWER. 2 is never a pass.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$HERE/check-rule-jurisdiction.py"
PASS=0
FAIL=0

# Preflight. python3's own "no such file" exit is 2, so without this every
# CANNOT-ANSWER assertion below would pass against an absent gate.
if [[ ! -f "$GATE" ]]; then
  echo "HARNESS ERROR: gate not found at $GATE" >&2
  exit 2
fi

t() { # t <name> <expected-exit> <tree> [extra args...]
  local name="$1" want="$2" tree="$3"; shift 3
  local out rc
  out="$(python3 "$GATE" --tree "$tree" "$@" 2>&1)"; rc=$?
  if [[ "$rc" == "$want" ]]; then
    PASS=$((PASS+1)); printf 'ok   %-62s exit %s\n' "$name" "$rc"
  else
    FAIL=$((FAIL+1)); printf 'FAIL %-62s exit %s (want %s)\n%s\n' "$name" "$rc" "$want" "$out"
  fi
}

t_says() { # t_says <name> <needle> <tree> [extra args...]
  local name="$1" needle="$2" tree="$3"; shift 3
  local out
  out="$(python3 "$GATE" --tree "$tree" "$@" 2>&1)"
  if grep -qF -- "$needle" <<<"$out"; then
    PASS=$((PASS+1)); printf 'ok   %-62s names %s\n' "$name" "$needle"
  else
    FAIL=$((FAIL+1)); printf 'FAIL %-62s did not name %s\n%s\n' "$name" "$needle" "$out"
  fi
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

PROFILES='{"jurisdictions":{"XA":{"name":"Xa","deprecated":false},"XB":{"name":"Xb","deprecated":false},"XOLD":{"name":"Old","deprecated":true}}}'

# new_tree <name> -> path of a tree holding only the profiles file
new_tree() {
  local d="$TMP/$1"
  mkdir -p "$d/reference-data" "$d/catala/probate" "$d/cedar/pack" "$d/tests/cedar/pack"
  printf '%s' "$PROFILES" > "$d/reference-data/jurisdiction-profiles.json"
  printf '%s' "$d"
}

catala() { # catala <file> <slot-line-or-empty>
  {
    printf '> Module M\n\nSPDX-License-Identifier: Apache-2.0\n'
    [[ -n "$2" ]] && printf '%s\n' "$2"
    printf '\n# M\n\n```catala\ndeclaration scope S:\n  output x content integer\n```\n'
  } > "$1"
}

policy() { # policy <annotation-or-empty> <effect>
  [[ -n "$1" ]] && printf '%s\n' "$1"
  printf '%s (principal, action, resource) when { resource.k == "v" };\n' "$2"
}

good_tree() { # a complete, correct tree: 4 rule/fixture files, all declaring XA
  local d; d="$(new_tree "$1")"
  catala "$d/catala/probate/Rule.catala_en" 'Jurisdiction: XA'
  printf '{"jurisdiction":"XA","rule_name":"Rule"}' > "$d/catala/probate/Rule.test-fixtures.json"
  printf '{"jurisdiction":"XA","rule_name":"Rule"}' > "$d/catala/probate/Rule.expected-output.json"
  { printf '// header comment\n'; policy '@jurisdiction("XA")' permit; policy '@id("f1")
@jurisdiction("XA")' forbid; } > "$d/cedar/pack/p.cedar"
  printf '%s' "$d"
}

# --- clean ------------------------------------------------------------------
G="$(good_tree good)"
t      "a fully slotted tree is clear"                          0 "$G"
t_says "it reports how many files it scanned"   "scanned 4"     "$G"
t      "the discovery floor is met"                             0 "$G" --min-files 4
t      "discovery below the floor cannot answer"                2 "$G" --min-files 5

D="$(good_tree neutral)"
catala "$D/catala/probate/Contract.catala_en" 'Jurisdiction: jurisdiction-neutral'
t      "a body may declare itself jurisdiction-neutral"         0 "$D"

D="$(good_tree outside)"
mkdir -p "$D/examples/fixtures"
printf 'permit (principal, action, resource);' > "$D/examples/x.cedar"
printf '{"estate":{}}' > "$D/examples/fixtures/estate.json"
t      "files outside the rule directories are not scanned"     0 "$D" --min-files 4
t      "...and are not counted"                                 2 "$D" --min-files 5

# --- Catala carrier ---------------------------------------------------------
D="$(good_tree cat-none)"; catala "$D/catala/probate/Rule.catala_en" ''
t      "a Catala body with no slot is refused"                  1 "$D"
t_says "...naming the missing slot" "no jurisdiction slot"      "$D"

D="$(good_tree cat-incode)"
catala "$D/catala/probate/Rule.catala_en" ''
printf '```catala\nJurisdiction: XA\n```\n' >> "$D/catala/probate/Rule.catala_en"
t      "a slot inside a catala code block does not count"       1 "$D"

D="$(good_tree cat-two)"
catala "$D/catala/probate/Rule.catala_en" 'Jurisdiction: XA
Jurisdiction: XB'
t      "a Catala body declaring two slots is refused"           1 "$D"

D="$(good_tree cat-prose)"
catala "$D/catala/probate/Rule.catala_en" 'This rule applies in XA (jurisdiction: XA).'
t      "a jurisdiction mentioned in prose is not a slot"        1 "$D"

D="$(good_tree cat-unknown)"
catala "$D/catala/probate/Rule.catala_en" 'Jurisdiction: XZ'
t      "a key absent from the profiles is refused"              1 "$D"
t_says "...naming the profiles file" "jurisdiction-profiles.json" "$D"

D="$(good_tree cat-composite)"
catala "$D/catala/probate/Rule.catala_en" 'Jurisdiction: XA+XB'
t      "a composite key is refused"                             1 "$D"

D="$(good_tree cat-deprecated)"
catala "$D/catala/probate/Rule.catala_en" 'Jurisdiction: XOLD'
printf '{"jurisdiction":"XOLD"}' > "$D/catala/probate/Rule.test-fixtures.json"
printf '{"jurisdiction":"XOLD"}' > "$D/catala/probate/Rule.expected-output.json"
t      "a deprecated profile key is refused"                    1 "$D"

# --- Cedar carrier ----------------------------------------------------------
D="$(good_tree ced-missing)"
{ policy '@jurisdiction("XA")' permit; policy '' forbid; } > "$D/cedar/pack/p.cedar"
t      "one unannotated policy in a file is refused"            1 "$D"
t_says "...naming the policy" "policy 2"                        "$D"

D="$(good_tree ced-disagree)"
{ policy '@jurisdiction("XA")' permit; policy '@jurisdiction("XB")' forbid; } > "$D/cedar/pack/p.cedar"
t      "policies in one file that disagree are refused"         1 "$D"

D="$(good_tree ced-comment)"
{ printf '// @jurisdiction("XA")\n'; policy '' permit; } > "$D/cedar/pack/p.cedar"
t      "an annotation inside a comment does not count"          1 "$D"

D="$(good_tree ced-string)"
{ policy '@jurisdiction("XA")' permit
  printf '@jurisdiction("XA")\nforbid (principal, action, resource) when { resource.k == "a;b // c" };\n'; } > "$D/cedar/pack/p.cedar"
t      "a ; or // inside a string literal does not split"       0 "$D"

D="$(good_tree ced-empty)"
printf '// nothing but a comment\n' > "$D/tests/cedar/pack/empty.cedar"
t      "a Cedar file holding no policy is refused"              1 "$D"

D="$(good_tree ced-test)"
{ policy '@jurisdiction("XA")' permit; } > "$D/tests/cedar/pack/oracle.cedar"
t      "Cedar under tests/ is scanned too"                      0 "$D" --min-files 5

# --- JSON verdict fixtures --------------------------------------------------
D="$(good_tree fx-none)"
printf '{"rule_name":"Rule"}' > "$D/catala/probate/Rule.test-fixtures.json"
t      "a fixture with no jurisdiction key is refused"          1 "$D"

D="$(good_tree fx-nested)"
printf '{"rule_name":"Rule","positive":[{"jurisdiction":"XA"}]}' > "$D/catala/probate/Rule.test-fixtures.json"
t      "a nested jurisdiction is input data, not the slot"      1 "$D"

D="$(good_tree fx-list)"
printf '{"jurisdiction":["XA","XB"]}' > "$D/catala/probate/Rule.test-fixtures.json"
t      "a fixture declaring a list is refused"                  1 "$D"

D="$(good_tree fx-composite)"
printf '{"jurisdiction":"uk-eng-wales-and-scotland"}' > "$D/catala/probate/Rule.test-fixtures.json"
t      "a fixture keyed to a composite is refused"              1 "$D"

D="$(good_tree fx-sibling)"
printf '{"jurisdiction":"XB"}' > "$D/catala/probate/Rule.expected-output.json"
t      "a fixture that disagrees with its rule body is refused" 1 "$D"
t_says "...naming the rule body" "Rule.catala_en"               "$D"

D="$(good_tree fx-bad)"
printf '{not json' > "$D/catala/probate/Rule.test-fixtures.json"
t      "an unparseable fixture cannot answer"                   2 "$D"

# --- cannot answer ----------------------------------------------------------
D="$(good_tree no-profiles)"; rm "$D/reference-data/jurisdiction-profiles.json"
t      "no profiles file cannot answer"                         2 "$D"
t      "a missing tree cannot answer"                           2 "$TMP/does-not-exist"

echo
echo "$PASS passed, $FAIL failed"
[[ "$FAIL" -eq 0 ]]
