#!/usr/bin/env bash
set -euo pipefail

# Extension Guard Release Script
# Usage: ./scripts/release.sh [patch|minor|major]

BUMP_TYPE="${1:-patch}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Validate bump type
if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
  log_error "Invalid bump type: $BUMP_TYPE. Use patch, minor, or major."
fi

cd "$ROOT_DIR"

# Check for uncommitted changes
if [[ -n "$(git status --porcelain)" ]]; then
  log_error "Working directory is not clean. Please commit or stash changes first."
fi

# Check we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  log_warn "Not on main branch (currently on: $CURRENT_BRANCH)"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Get current version from core package
CURRENT_VERSION=$(node -p "require('./packages/core/package.json').version")
log_info "Current version: $CURRENT_VERSION"

# Calculate new version
IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
case "$BUMP_TYPE" in
  major) NEW_VERSION="$((major + 1)).0.0" ;;
  minor) NEW_VERSION="${major}.$((minor + 1)).0" ;;
  patch) NEW_VERSION="${major}.${minor}.$((patch + 1))" ;;
esac
log_info "New version: $NEW_VERSION"

# Confirm with user
echo ""
echo "This will:"
echo "  1. Update version in all packages to $NEW_VERSION"
echo "  2. Update VERSION constant in core/src/index.ts"
echo "  3. Run tests"
echo "  4. Create git commit and tag v$NEW_VERSION"
echo "  5. Push to origin"
echo ""
read -p "Proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  log_info "Aborted."
  exit 0
fi

# Update package.json versions
log_info "Updating package versions..."
for pkg in packages/core packages/cli packages/vscode; do
  if [[ -f "$pkg/package.json" ]]; then
    node -e "
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync('$pkg/package.json', 'utf8'));
      pkg.version = '$NEW_VERSION';
      fs.writeFileSync('$pkg/package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    log_success "Updated $pkg/package.json"
  fi
done

# Update VERSION constant in core
log_info "Updating VERSION constant..."
sed -i "s/export const VERSION = '[^']*'/export const VERSION = '$NEW_VERSION'/" packages/core/src/index.ts
log_success "Updated packages/core/src/index.ts"

# Build and test
log_info "Building..."
pnpm build

log_info "Running tests..."
pnpm test

# Package VSCode extension
log_info "Packaging VSCode extension..."
cd packages/vscode
pnpm package
cd "$ROOT_DIR"
log_success "Created extension-guard-vscode-$NEW_VERSION.vsix"

# Git commit and tag
log_info "Creating git commit..."
git add -A
git commit -m "chore: release v$NEW_VERSION"

log_info "Creating git tag..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Push
log_info "Pushing to origin..."
git push origin "$CURRENT_BRANCH"
git push origin "v$NEW_VERSION"

log_success "Released v$NEW_VERSION!"
echo ""
echo "GitHub Actions will now:"
echo "  - Publish @aspect-guard/core to npm"
echo "  - Publish extension-guard CLI to npm"
echo "  - Create GitHub Release"
echo ""
echo "To publish VSCode extension manually:"
echo "  cd packages/vscode && vsce publish"
echo ""
echo "VSIX file: packages/vscode/extension-guard-vscode-$NEW_VERSION.vsix"
