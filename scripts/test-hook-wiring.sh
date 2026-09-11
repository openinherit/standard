#!/usr/bin/env bash
# scripts/test-hook-wiring.sh — a gate on the gate.
#
# WHAT THIS CAN AND CANNOT DO. CI runs on a fresh clone, so it can never check
# whether a contributor's LOCAL `core.hooksPath` is set — that is local config
# and untrackable. What it CAN check, and what rotted here, is whether the
# wiring in the repository is still intact:
#
#   · `.husky/pre-commit` exists and is executable
#   · it actually invokes the publication redline
#   · it FAILS on a non-zero exit rather than warning
#   · `package.json`'s `prepare` reaches the setup script when husky is absent
#   · `scripts/setup-hooks.sh` exists and sets core.hooksPath
#
# Measured 11 September 2026: the hook file was correct and had never run, so
# every claim about it was unfalsifiable. These assertions make the wiring
# un-rottable even though the installation cannot be enforced.
#
# ⭐ It also RED-PROVES the redline end to end, in a throwaway clone, by seeding
# a real category-3 path and asserting the commit is refused. That is the one
# assertion that would have caught the original failure.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

pass=0; fail=0
ok()  { printf '  ok   %s\n' "$1"; pass=$((pass+1)); }
bad() { printf '  FAIL %s\n       %s\n' "$1" "$2"; fail=$((fail+1)); }

HOOK=.husky/pre-commit

[ -f "$HOOK" ] && ok "1 $HOOK exists" \
               || bad "1 $HOOK exists" "the tracked hook is gone"

[ -x "$HOOK" ] && ok "2 $HOOK is executable" \
               || bad "2 $HOOK is executable" "core.hooksPath=.husky runs it directly, so the bit matters"

grep -q 'check-publication-redline.py' "$HOOK" \
  && ok "3 the hook invokes the publication redline" \
  || bad "3 the hook invokes the publication redline" "the redline call is not in $HOOK"

grep -qE 'check-publication-redline\.py"? --staged \|\| exit 1' "$HOOK" \
  && ok "4 the hook FAILS on any non-zero (so exit 2 blocks too)" \
  || bad "4 the hook FAILS on any non-zero" "the redline call is not guarded by || exit 1"

grep -q 'githooks/pre-commit' "$HOOK" \
  && ok "5 the hook still chains the secret/artefact guard" \
  || bad "5 the hook still chains the secret/artefact guard" ".githooks/pre-commit is no longer invoked"

[ -f scripts/setup-hooks.sh ] && ok "6 scripts/setup-hooks.sh exists" \
                              || bad "6 scripts/setup-hooks.sh exists" "the husky-independent fallback is gone"

grep -q 'core.hooksPath' scripts/setup-hooks.sh \
  && ok "7 the setup script sets core.hooksPath" \
  || bad "7 the setup script sets core.hooksPath" "it no longer wires anything"

node -e '
  const p = require("./package.json");
  const prep = (p.scripts || {}).prepare || "";
  if (!prep.includes("setup-hooks")) {
    console.error("prepare does not reach the setup script: " + JSON.stringify(prep));
    process.exit(1);
  }
' 2>/dev/null \
  && ok "8 package.json prepare falls back to the setup script" \
  || bad "8 package.json prepare falls back to the setup script" "an install with husky absent would leave hooks silent"

# ── 9. ⭐ RED-PROOF, end to end, in a throwaway clone ───────────────────────
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# Pin the SAME commit this checkout is on. A plain clone of a worktree would
# resolve to the shared repository and check out ITS default branch, which is a
# different tree -- and the probe would then test the wrong thing.
head_sha="$(git rev-parse HEAD)"
if git clone -q --no-hardlinks "$ROOT_DIR" "$tmp/probe" 2>/dev/null    && git -C "$tmp/probe" checkout -q --detach "$head_sha" 2>/dev/null; then
  (
    cd "$tmp/probe"
    git config user.email ci@example.invalid
    git config user.name CI
    bash scripts/setup-hooks.sh >/dev/null 2>&1
    mkdir -p docs/superpowers/plans
    printf 'Innocuous content. The PATH is the violation.\n' \
      > docs/superpowers/plans/wiring-probe.md
    git add docs/superpowers/plans/wiring-probe.md
    if git commit -q -m "probe: must be refused" >/dev/null 2>&1; then
      exit 7   # the commit landed — the gate did not fire
    fi
    exit 0
  )
  rc=$?
  [ "$rc" = "0" ] \
    && ok "9 RED-PROOF: a category-3 path is refused by a real git commit" \
    || bad "9 RED-PROOF: a category-3 path is refused by a real git commit" \
           "the commit SUCCEEDED in a fresh clone — the gate is inert"
else
  bad "9 RED-PROOF" "could not clone the repo to probe it"
fi

printf '\n  %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
