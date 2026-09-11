#!/usr/bin/env bash
# scripts/setup-hooks.sh — point git at this repo's tracked hooks.
#
# WHY THIS EXISTS. `package.json` declares `husky` and a `prepare` script, which
# is the right design: `npm install` runs `prepare`, husky creates `.husky/_`
# and sets `core.hooksPath` to it, and the tracked hooks start working.
#
# Measured Friday 11 September 2026 in a working checkout of this repo:
#   core.hooksPath        .husky/_
#   .husky/_              DOES NOT EXIST
#   node_modules/husky    absent
#   .git/hooks/pre-commit absent
#
# So git was looking for hooks in a directory that was not there and finding
# none. `.husky/pre-commit` — which runs the secret/artefact guard, the
# publication redline and the v3 sync — had not executed on a single commit.
# Nothing was wrong with the hook: the mechanism that invokes it was never
# provisioned, because `npm install` had not been run in that checkout.
#
# ⭐ THE FIX IS TO REMOVE THE DEPENDENCY, NOT TO REMEMBER THE STEP.
# `.husky/pre-commit` is a standalone executable script with its own shebang, so
# `core.hooksPath=.husky` runs it directly and husky need not be installed at
# all. `prepare` tries husky first and falls back to this script, so the hooks
# work whether or not node modules are present.
#
# ⚠️ AND THE HONEST LIMIT. `core.hooksPath` is LOCAL git config. It is not
# tracked and cannot be, so no repository can force its own hooks on a fresh
# clone. A local hook is therefore a convenience, never the guarantee:
# `.github/workflows/redline.yml` is the non-bypassable backstop, and it runs on
# every push and pull request. That is by design — a local hook is also
# `--no-verify`-able.
#
# Usage:  bash scripts/setup-hooks.sh          # set it
#         bash scripts/setup-hooks.sh --check  # report only, exit 1 if wrong
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

WANT=.husky
HOOK="$WANT/pre-commit"
mode="${1:-set}"

if [ ! -f "$HOOK" ]; then
  printf 'setup-hooks: %s is missing — nothing to point git at.\n' "$HOOK" >&2
  exit 1
fi

current="$(git config --local core.hooksPath 2>/dev/null || true)"

# A resolvable hooksPath is one whose directory actually exists. husky's own
# `.husky/_` counts, so a properly installed husky is left alone.
resolvable=no
if [ -n "$current" ] && [ -d "$current" ]; then
  resolvable=yes
fi

if [ "$mode" = "--check" ]; then
  if [ "$resolvable" = yes ]; then
    printf 'setup-hooks: OK — core.hooksPath=%s and that directory exists.\n' "$current"
    exit 0
  fi
  printf 'setup-hooks: NOT WIRED — core.hooksPath=%s\n' "${current:-(unset)}" >&2
  printf '  Hooks are not running. Fix with: bash scripts/setup-hooks.sh\n' >&2
  exit 1
fi

if [ "$resolvable" = yes ]; then
  printf 'setup-hooks: already wired — core.hooksPath=%s\n' "$current"
else
  chmod +x "$HOOK" 2>/dev/null || true
  git config --local core.hooksPath "$WANT"
  printf 'setup-hooks: core.hooksPath set to %s\n' "$WANT"
  if [ -n "$current" ]; then
    printf '  (was %s, which does not exist — that is why hooks were silent)\n' "$current"
  fi
fi

printf '  Tracked hooks now active: %s\n' "$HOOK"
printf '  Reminder: this is a convenience and is --no-verify-able.\n'
printf '  CI (.github/workflows/redline.yml) is the backstop that is not.\n'
