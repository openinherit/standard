#!/usr/bin/env bash
# INHERIT Release Script
# Orchestrates a version bump across both repos (spec + website).
# Usage: ./scripts/release.sh 1.7.0
#
# What it does:
#   1. Validates the new version format
#   2. In repo/: bumps ALL package.json files (root + workspace packages),
#      updates ROADMAP.md heading, closes CHANGELOG.md [Unreleased] section
#   3. Runs pre-release checks (duplicate keys, prose audit, tests)
#   4. Commits, pushes via PR if branch-protected
#   5. Creates a git tag and GitHub Release (triggers npm publish via CI)
#   6. Verifies everything matches
#
# The publish.yml workflow (triggered by the tag) handles:
#   - npm publish of @openinherit/schema and @openinherit/sdk
#   - repository_dispatch to openinherit.org (website submodule update)
#
# Prerequisites:
#   - gh CLI authenticated
#   - On main branch in repo/
#   - No uncommitted changes
#
# Resume mode:
#   If the version is already bumped (e.g. bumped in a feature branch),
#   the script skips steps 1-3 and proceeds to tag + release.
#   Use: ./scripts/release.sh 2.0.0 --resume

set -euo pipefail

SCRIPT_VERSION="2.0.0"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# ── Colours ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[release]${NC} $1"; }
warn() { echo -e "${YELLOW}[release]${NC} $1"; }
fail() { echo -e "${RED}[release]${NC} $1"; exit 1; }

# ── Validate arguments ─────────────────────────────────────────────
echo "INHERIT Release Script v${SCRIPT_VERSION}"
echo ""

if [ $# -lt 1 ]; then
  echo "Usage: $0 <new-version> [--resume]"
  echo "Example: $0 2.0.0"
  echo "Example: $0 2.0.0 --resume  (skip bump, just tag + release)"
  exit 1
fi

NEW_VERSION="$1"
RESUME_MODE=false
if [ "${2:-}" = "--resume" ]; then
  RESUME_MODE=true
fi

if ! echo "$NEW_VERSION" | grep -qP '^\d+\.\d+\.\d+$'; then
  fail "Invalid version format: $NEW_VERSION (expected X.Y.Z)"
fi

# ── Pre-flight checks ──────────────────────────────────────────────
log "Pre-flight checks..."

CURRENT_VERSION=$(node -p "require('$REPO_DIR/package.json').version")
log "  Current version: $CURRENT_VERSION"
log "  New version:     $NEW_VERSION"
log "  Resume mode:     $RESUME_MODE"

# Check repo/ is clean and on main
cd "$REPO_DIR"
if [ -n "$(git status --porcelain)" ]; then
  fail "repo/ has uncommitted changes. Commit or stash first."
fi
REPO_BRANCH=$(git branch --show-current)
if [ "$REPO_BRANCH" != "main" ]; then
  fail "repo/ is on branch '$REPO_BRANCH', not main"
fi
git pull --quiet origin main

# ── Resume mode: skip to tag + release ─────────────────────────────
if [ "$RESUME_MODE" = "true" ]; then
  if [ "$CURRENT_VERSION" != "$NEW_VERSION" ]; then
    fail "Resume mode but package.json is at $CURRENT_VERSION, not $NEW_VERSION. Bump first or drop --resume."
  fi
  log "Resume mode — skipping bump, proceeding to tag + release"
  log ""
  # Jump to step 5
else
  if [ "$CURRENT_VERSION" = "$NEW_VERSION" ]; then
    warn "Already at version $NEW_VERSION."
    warn "If you bumped in a feature branch, use: $0 $NEW_VERSION --resume"
    fail "Nothing to bump. Use --resume to skip to tag + release."
  fi

  log "Pre-flight checks passed"
  echo ""

  # ── Step 1: Bump version in ALL package.json files ───────────────
  log "[1/8] Bumping all package.json files to $NEW_VERSION..."
  cd "$REPO_DIR"

  for PKG_FILE in package.json packages/schema/package.json packages/sdk/package.json packages/conformance/package.json; do
    if [ -f "$PKG_FILE" ]; then
      node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('$PKG_FILE', 'utf-8'));
        pkg.version = '$NEW_VERSION';
        fs.writeFileSync('$PKG_FILE', JSON.stringify(pkg, null, 2) + '\n');
      "
      log "  Bumped $PKG_FILE"
    fi
  done

  # Verify all match
  for PKG_FILE in package.json packages/schema/package.json packages/sdk/package.json packages/conformance/package.json; do
    if [ -f "$PKG_FILE" ]; then
      PKG_VER=$(node -p "require('./$PKG_FILE').version")
      if [ "$PKG_VER" != "$NEW_VERSION" ]; then
        fail "$PKG_FILE is at $PKG_VER, expected $NEW_VERSION"
      fi
    fi
  done

  # ── Step 2: Update ROADMAP.md heading ────────────────────────────
  log "[2/8] Updating ROADMAP.md heading..."

  TODAY=$(date +"%B %Y")
  sed -i "s/## Current: v${CURRENT_VERSION}.*/## Current: v${NEW_VERSION} (${TODAY})/" ROADMAP.md

  if ! grep -q "## Current: v${NEW_VERSION}" ROADMAP.md; then
    fail "Failed to update ROADMAP.md heading"
  fi

  # ── Step 3: Close CHANGELOG.md [Unreleased] section ─────────────
  log "[3/8] Closing CHANGELOG.md [Unreleased] as [$NEW_VERSION]..."

  TODAY_ISO=$(date +"%Y-%m-%d")
  sed -i "s/## \[Unreleased\]/## [Unreleased]\n\n## [$NEW_VERSION] — $TODAY_ISO/" CHANGELOG.md

  if ! grep -q "## \[$NEW_VERSION\]" CHANGELOG.md; then
    fail "Failed to update CHANGELOG.md"
  fi

  # ── Step 4: Pre-release checks ──────────────────────────────────
  log "[4/8] Running pre-release checks..."

  if [ -f scripts/check-duplicate-keys.mjs ]; then
    log "  Checking for duplicate JSON keys..."
    node scripts/check-duplicate-keys.mjs
  fi

  if [ -f scripts/audit-v2-prose.sh ]; then
    log "  Auditing v2 prose for stale references..."
    bash scripts/audit-v2-prose.sh
  fi

  log "  Running test suite..."
  pnpm test

  log "  Pre-release checks passed"

  # ── Step 5: Commit and push ──────────────────────────────────────
  log "[5/8] Committing and pushing..."

  git add package.json packages/schema/package.json packages/sdk/package.json packages/conformance/package.json ROADMAP.md CHANGELOG.md

  git commit -m "chore: release v${NEW_VERSION}

Bump all package.json files to ${NEW_VERSION}.
Update ROADMAP.md heading and close CHANGELOG.md [Unreleased] section."

  # Try direct push first; fall back to PR if branch-protected
  if git push origin main 2>/dev/null; then
    log "  Pushed directly to main"
  else
    warn "  main is branch-protected — creating PR..."
    BRANCH="chore/release-v${NEW_VERSION}"
    git checkout -b "$BRANCH"
    git push -u origin "$BRANCH"
    gh pr create --repo openinherit/standard \
      --title "chore: release v${NEW_VERSION}" \
      --body "Version bump to ${NEW_VERSION}. Merge to create the release."
    echo ""
    warn "  PR created. Merge it, then re-run: $0 $NEW_VERSION --resume"
    exit 0
  fi
fi

# ── Step 6: Build release assets ─────────────────────────────────
log "[6/8] Building release assets..."

RELEASE_DIR=$(mktemp -d)
log "  Asset staging: $RELEASE_DIR"

# Bundled schema (the most important download — validate without cloning)
cp dist/inherit-v3-bundled.json "$RELEASE_DIR/"
cp dist/catalogue-v3-bundled.json "$RELEASE_DIR/"
cd "$RELEASE_DIR"
zip inherit-v3-bundled-schema.zip inherit-v3-bundled.json catalogue-v3-bundled.json
log "  Built: inherit-v3-bundled-schema.zip ($(du -h inherit-v3-bundled-schema.zip | cut -f1))"
cd "$REPO_DIR"

# OpenAPI specs
zip -j "$RELEASE_DIR/openapi-specs.zip" openapi/*.yaml
log "  Built: openapi-specs.zip ($(du -h "$RELEASE_DIR/openapi-specs.zip" | cut -f1))"

# SDK (pre-built — consumers shouldn't need to build from source)
cd packages/sdk
pnpm build 2>/dev/null || true
zip -r "$RELEASE_DIR/openinherit-sdk-${NEW_VERSION}.zip" dist/ package.json tsup.config.ts tsconfig.json 2>/dev/null
cd "$REPO_DIR"
log "  Built: openinherit-sdk-${NEW_VERSION}.zip ($(du -h "$RELEASE_DIR/openinherit-sdk-${NEW_VERSION}.zip" | cut -f1))"

# Conformance test suite
cd packages/conformance
zip -r "$RELEASE_DIR/openinherit-conformance-${NEW_VERSION}.zip" schemas/ package.json README.md 2>/dev/null
cd "$REPO_DIR"
log "  Built: openinherit-conformance-${NEW_VERSION}.zip ($(du -h "$RELEASE_DIR/openinherit-conformance-${NEW_VERSION}.zip" | cut -f1))"

# Example fixtures (32 worked examples)
zip -j "$RELEASE_DIR/example-fixtures.zip" examples/fixtures/*.json
log "  Built: example-fixtures.zip ($(du -h "$RELEASE_DIR/example-fixtures.zip" | cut -f1))"

# SHA-256 checksums
cd "$RELEASE_DIR"
sha256sum *.zip > SHA256SUMS.txt
cd "$REPO_DIR"
log "  Built: SHA256SUMS.txt"

# ── Step 7: Create GitHub Release with assets ────────────────────
log "[7/8] Creating GitHub Release with assets..."

# Build release notes from CHANGELOG
NOTES_FILE="$RELEASE_DIR/RELEASE_NOTES.md"
cat > "$NOTES_FILE" <<NOTES_EOF
## Release assets

| Asset | Contents | Use case |
|-------|----------|----------|
| \`inherit-v3-bundled-schema.zip\` | Bundled JSON Schema (inherit + catalogue) | Validate INHERIT documents — one file, no git clone |
| \`openapi-specs.zip\` | OpenAPI 3.1 specs | Generate API clients in any language |
| \`openinherit-sdk-${NEW_VERSION}.zip\` | Pre-built TypeScript SDK (ESM) | Use directly — no build step required |
| \`openinherit-conformance-${NEW_VERSION}.zip\` | Conformance test kit | Validate your implementation against the standard |
| \`example-fixtures.zip\` | Example INHERIT documents | Learn by example — Singapore, UK, Islamic, Hindu, Japanese, and more |
| \`SHA256SUMS.txt\` | SHA-256 checksums for all assets | Verify download integrity |

## Install via npm

\`\`\`bash
npm install @openinherit/schema@${NEW_VERSION}
npm install @openinherit/sdk@${NEW_VERSION}
\`\`\`

**Full Changelog**: https://github.com/openinherit/standard/compare/v${CURRENT_VERSION}...v${NEW_VERSION}
NOTES_EOF

# Check if release already exists
if gh release view "v${NEW_VERSION}" --repo openinherit/standard >/dev/null 2>&1; then
  warn "  Release v${NEW_VERSION} already exists — uploading assets to it"
  gh release upload "v${NEW_VERSION}" \
    "$RELEASE_DIR/inherit-v3-bundled-schema.zip" \
    "$RELEASE_DIR/openapi-specs.zip" \
    "$RELEASE_DIR/openinherit-sdk-${NEW_VERSION}.zip" \
    "$RELEASE_DIR/openinherit-conformance-${NEW_VERSION}.zip" \
    "$RELEASE_DIR/example-fixtures.zip" \
    "$RELEASE_DIR/SHA256SUMS.txt" \
    --repo openinherit/standard \
    --clobber
  # Update the release notes
  gh release edit "v${NEW_VERSION}" \
    --repo openinherit/standard \
    --notes-file "$NOTES_FILE"
  log "  Assets uploaded and notes updated for v${NEW_VERSION}"
else
  gh release create "v${NEW_VERSION}" \
    "$RELEASE_DIR/inherit-v3-bundled-schema.zip" \
    "$RELEASE_DIR/openapi-specs.zip" \
    "$RELEASE_DIR/openinherit-sdk-${NEW_VERSION}.zip" \
    "$RELEASE_DIR/openinherit-conformance-${NEW_VERSION}.zip" \
    "$RELEASE_DIR/example-fixtures.zip" \
    "$RELEASE_DIR/SHA256SUMS.txt" \
    --repo openinherit/standard \
    --title "v${NEW_VERSION}" \
    --target main \
    --notes-file "$NOTES_FILE"
  log "  Release v${NEW_VERSION} created with assets"
fi

# Clean up
rm -rf "$RELEASE_DIR"

# ── Step 8: Verify ────────────────────────────────────────────────
log "[8/8] Verifying..."

cd "$REPO_DIR"
REPO_PKG=$(node -p "require('./package.json').version")
SCHEMA_PKG=$(node -p "require('./packages/schema/package.json').version")
SDK_PKG=$(node -p "require('./packages/sdk/package.json').version")
REPO_TAG=$(gh release view --repo openinherit/standard --json tagName -q '.tagName')
ROADMAP_VER=$(grep -oP '## Current: v\K[0-9]+\.[0-9]+\.[0-9]+' ROADMAP.md)

echo ""
echo "  package.json:         $REPO_PKG"
echo "  schema/package.json:  $SCHEMA_PKG"
echo "  sdk/package.json:     $SDK_PKG"
echo "  GitHub Release:       $REPO_TAG"
echo "  ROADMAP.md:           $ROADMAP_VER"

PASS=true
[ "$REPO_PKG" != "$NEW_VERSION" ] && fail "root package.json mismatch" && PASS=false
[ "$SCHEMA_PKG" != "$NEW_VERSION" ] && fail "schema package.json mismatch" && PASS=false
[ "$SDK_PKG" != "$NEW_VERSION" ] && fail "sdk package.json mismatch" && PASS=false
[ "$REPO_TAG" != "v${NEW_VERSION}" ] && fail "GitHub Release tag mismatch" && PASS=false
[ "$ROADMAP_VER" != "$NEW_VERSION" ] && fail "ROADMAP.md mismatch" && PASS=false

echo ""
log "Release v${NEW_VERSION} complete. All sources match."
log ""
log "What happens next (automated):"
log "  1. publish.yml publishes @openinherit/schema and @openinherit/sdk to npm"
log "  2. publish.yml triggers repository_dispatch to openinherit.org"
log "  3. update-spec-submodule.yml creates a PR on openinherit.org"
log "  4. Merge that PR → Vercel deploys the website"
log ""
log "Verify npm (after CI completes):"
log "  npm view @openinherit/schema version  # should be $NEW_VERSION"
log "  npm view @openinherit/sdk version     # should be $NEW_VERSION"
