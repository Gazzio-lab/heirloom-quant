#!/usr/bin/env bash
# Build Heirloom Quant for macOS (.app + .dmg).
# Usage: ./scripts/build-mac.sh
# Output artifacts go to ./release/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Verifying environment"
node --version && npm --version

echo "==> Installing dependencies"
[ -d node_modules ] || npm ci || npm install

echo "==> Cleaning previous build"
npm run clean

echo "==> Building main process (TypeScript)"
npm run build:main

echo "==> Building renderer (Vite + React + TailwindCSS)"
npm run build:renderer

echo "==> Packaging macOS targets (x64 + arm64)"
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --x64 --arm64

echo
echo "==> Build complete. Artifacts in ./release/"
ls -lh release/ | grep -E '\.(dmg|zip|app)' 2>/dev/null || true
echo
echo "Installation:"
echo "  1. Open the .dmg file."
echo "  2. Drag Heirloom Quant.app into /Applications."
echo "  3. On first launch: right-click → Open to bypass Gatekeeper."
