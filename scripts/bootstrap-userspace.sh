#!/usr/bin/env bash
# Sudo-free bootstrap. Installs Node 20 LTS into ~/node20 and runs the full
# install / typecheck / test / build pipeline. Safe to re-run.

set -uo pipefail
PROJECT="/Users/gazzio/Projects/numbercruncher-2024"
PREFIX="$HOME/node20"
LOG="$PROJECT/.bootstrap.log"
: > "$LOG"

step() { printf '\n==> %s\n' "$*" | tee -a "$LOG"; }
ok()   { printf '    [ok] %s\n' "$*" | tee -a "$LOG"; }
warn() { printf '    [warn] %s\n' "$*" | tee -a "$LOG"; }
die()  { printf '    [fail] %s\n' "$*" | tee -a "$LOG"; exit 1; }

cd "$PROJECT"

# ----------------------------------------------------- 1. Install Node (no sudo)
step "1. Install Node 20 LTS into $PREFIX (no sudo required)"
if [ ! -x "$PREFIX/bin/node" ]; then
  ARCH="$(uname -m)"
  case "$ARCH" in
    arm64)  NODE_ARCH=arm64 ;;
    x86_64) NODE_ARCH=x64 ;;
    *) die "Unsupported arch: $ARCH" ;;
  esac
  NODE_VER="v20.18.0"
  TARBALL="/tmp/node-${NODE_VER}-darwin-${NODE_ARCH}.tar.gz"
  URL="https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-darwin-${NODE_ARCH}.tar.gz"
  echo "    downloading $URL"
  curl -fSL --retry 3 "$URL" -o "$TARBALL" 2>>"$LOG" || die "curl failed"
  mkdir -p "$PREFIX"
  tar -xzf "$TARBALL" -C "$PREFIX" --strip-components=1 2>>"$LOG" || die "tar failed"
  rm -f "$TARBALL"
fi
export PATH="$PREFIX/bin:$PATH"
ok "node: $("$PREFIX/bin/node" --version)"
ok "npm:  $("$PREFIX/bin/npm"  --version)"

# ----------------------------------------------------- 2. npm install
step "2. npm install (skipping Electron binary — not needed for tests)"
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
npm install --no-fund --no-audit --loglevel=error 2>&1 | tee -a "$LOG"
NPM_RC=${PIPESTATUS[0]}
[ "$NPM_RC" -eq 0 ] || die "npm install failed ($NPM_RC)"
ok "deps installed"

# ----------------------------------------------------- 3. Type-check
step "3. Type-check (main + renderer)"
npx tsc -p tsconfig.json --noEmit 2>&1 | tee -a "$LOG"
TC_MAIN=${PIPESTATUS[0]}
npx tsc -p tsconfig.renderer.json --noEmit 2>&1 | tee -a "$LOG"
TC_REND=${PIPESTATUS[0]}
if [ "$TC_MAIN" -eq 0 ] && [ "$TC_REND" -eq 0 ]; then
  ok "type-check clean"
else
  warn "type-check produced errors (main=$TC_MAIN, renderer=$TC_REND)"
fi

# ----------------------------------------------------- 4. Jest
step "4. Run Jest"
npx jest --colors --verbose 2>&1 | tee -a "$LOG"
JEST_RC=${PIPESTATUS[0]}
[ "$JEST_RC" -eq 0 ] && ok "all tests passed" || warn "jest exited $JEST_RC"

# ----------------------------------------------------- 5. Build
step "5. npm run build"
npm run build 2>&1 | tee -a "$LOG"
BUILD_RC=${PIPESTATUS[0]}
[ "$BUILD_RC" -eq 0 ] && ok "build succeeded" || warn "build exited $BUILD_RC"

# ----------------------------------------------------- Summary
echo
echo "============================================================"
echo "SUMMARY"
echo "============================================================"
echo "node:          $(node --version 2>/dev/null || echo MISSING)"
echo "npm:           $(npm  --version 2>/dev/null || echo MISSING)"
echo "tsc(main):     exit $TC_MAIN"
echo "tsc(renderer): exit $TC_REND"
echo "jest:          exit $JEST_RC"
echo "build:         exit $BUILD_RC"
echo
echo "Add Node to your interactive shell:"
echo "    echo 'export PATH=\"\$HOME/node20/bin:\$PATH\"' >> ~/.zshrc"
echo "    source ~/.zshrc"
echo
echo "Full log: $LOG"

exit "$JEST_RC"
