#!/usr/bin/env bash
# Build Heirloom Quant for macOS (.app + .dmg).
# Run on a Mac. Output goes to ./release/.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Verifying environment"
node --version
npm --version

echo "==> Installing dependencies"
if [ ! -d node_modules ]; then
  npm ci || npm install
fi

echo "==> Cleaning previous build"
npm run clean

echo "==> Compiling TypeScript (main + renderer) and copying assets"
npm run build

echo "==> Packaging mac targets via electron-builder"
npx electron-builder --mac --x64 --arm64

echo
echo "==> Build complete. Artifacts in ./release/"
ls -lh release/ | grep -E '\.(dmg|zip|app)' || true
