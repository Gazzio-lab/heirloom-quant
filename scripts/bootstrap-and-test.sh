
#!/usr/bin/env bash
# bootstrap-and-test.sh
# End-to-end: install Homebrew (if missing) -> Node 20 -> deps -> typecheck -> tests -> build.
# Designed to be safe to re-run.

set -uo pipefail
PROJECT="/Users/gazzio/Projects/numbercruncher-2024"
LOG="$PROJECT/.bootstrap.log"
: > "$LOG"

step() { echo; echo "==> $*"; echo "==> $*" >> "$LOG"; }
ok()   { echo "    [ok] $*"; echo "    [ok] $*" >> "$LOG"; }
warn() { echo "    [warn] $*"; echo "    [warn] $*" >> "$LOG"; }
die()  { echo "    [fail] $*"; echo "    [fail] $*" >> "$LOG"; exit 1; }

cd "$PROJECT"

# ------------------------------------------------------------------ 1. Homebrew
step "1. Ensure Homebrew is available"
if ! command -v brew >/dev/null 2>&1; then
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  else
    warn "brew not installed; installing non-interactively (will prompt for sudo password)"
    NONINTERACTIVE=1 /bin/bash -c \
      "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" \
      2>&1 | tee -a "$LOG"
    if [ -x /opt/homebrew/bin/brew ]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -x /usr/local/bin/brew ]; then
      eval "$(/usr/local/bin/brew shellenv)"
    fi
  fi
fi

if command -v brew >/dev/null 2>&1; then
  ok "brew at: $(command -v brew)"
else
  warn "brew unavailable; will fall back to direct node tarball"
fi

# ------------------------------------------------------------------ 2. Node 20
step "2. Ensure Node 20 + git"
NODE_OK=0
if command -v brew >/dev/null 2>&1; then
  brew install node@20 git 2>&1 | tee -a "$LOG" || warn "brew install reported errors"
  brew link --overwrite --force node@20 2>&1 | tee -a "$LOG" || true
fi

if command -v node >/dev/null 2>&1; then
  NODE_OK=1
fi

if [ "$NODE_OK" -ne 1 ]; then
  step "2b. Fallback: download Node 20 tarball directly"
  ARCH="$(uname -m)"
  case "$ARCH" in
    arm64)  NODE_ARCH=arm64 ;;
    x86_64) NODE_ARCH=x64 ;;
    *) die "Unsupported arch $ARCH" ;;
  esac
  TARBALL="/tmp/node-v20.18.0-darwin-${NODE_ARCH}.tar.gz"
  curl -fsSL "https://nodejs.org/dist/v20.18.0/node-v20.18.0-darwin-${NODE_ARCH}.tar.gz" \
    -o "$TARBALL" 2>&1 | tee -a "$LOG" || die "curl Node tarball failed"
  sudo tar -xzf "$TARBALL" -C /usr/local --strip-components=1 2>&1 | tee -a "$LOG" \
    || die "tar extract failed"
  hash -r
fi

command -v node >/dev/null 2>&1 || die "Node still not on PATH"
command -v npm  >/dev/null 2>&1 || die "npm  still not on PATH"

ok "node: $(node --version)"
ok "npm:  $(npm  --version)"

# ------------------------------------------------------------------ 3. npm install
step "3. Install project dependencies"
# Skip the Electron postinstall binary download — tests don't need it,
# and it's the most failure-prone step on a fresh box.
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
npm install --no-fund --no-audit 2>&1 | tee -a "$LOG"
NPM_RC=${PIPESTATUS[0]}
if [ "$NPM_RC" -ne 0 ]; then
  die "npm install failed with exit code $NPM_RC"
fi
ok "deps installed"

# ------------------------------------------------------------------ 4. Type-check
step "4. TypeScript type-check (main + renderer)"
npx tsc -p tsconfig.json --noEmit 2>&1 | tee -a "$LOG"
TC_MAIN=${PIPESTATUS[0]}
npx tsc -p tsconfig.renderer.json --noEmit 2>&1 | tee -a "$LOG"
TC_REND=${PIPESTATUS[0]}
if [ "$TC_MAIN" -ne 0 ] || [ "$TC_REND" -ne 0 ]; then
  warn "type-check produced errors (main=$TC_MAIN, renderer=$TC_REND)"
else
  ok "type-check clean"
fi

# ------------------------------------------------------------------ 5. Jest
step "5. Run Jest"
npx jest --colors --verbose 2>&1 | tee -a "$LOG"
JEST_RC=${PIPESTATUS[0]}
if [ "$JEST_RC" -eq 0 ]; then
  ok "all tests passed"
else
  warn "jest exited $JEST_RC"
fi

# ------------------------------------------------------------------ 6. Build
step "6. npm run build"
npm run build 2>&1 | tee -a "$LOG"
BUILD_RC=${PIPESTATUS[0]}
if [ "$BUILD_RC" -eq 0 ]; then
  ok "build succeeded"
else
  warn "build exited $BUILD_RC"
fi

# ------------------------------------------------------------------ Summary
echo
echo "============================================================"
echo "SUMMARY"
echo "============================================================"
echo "node:    $(node --version 2>/dev/null || echo MISSING)"
echo "npm:     $(npm  --version 2>/dev/null || echo MISSING)"
echo "tsc(main):     exit $TC_MAIN"
echo "tsc(renderer): exit $TC_REND"
echo "jest:          exit $JEST_RC"
echo "build:         exit $BUILD_RC"
echo
echo "Full log: $LOG"

# Exit non-zero only if Jest failed (everything else is informational).
exit "$JEST_RC"
