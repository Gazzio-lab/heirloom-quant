#!/usr/bin/env bash
# Development launcher — runs Vite in watch mode and Electron side-by-side.
# Usage: ./scripts/dev.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Installing dependencies (if needed)"
[ -d node_modules ] || npm install

echo "==> Initial build of main process"
npx tsc -p tsconfig.main.json

echo "==> Launching dev environment (Vite watch + Electron)"
exec npx concurrently \
  --kill-others \
  --names "vite,electron" \
  --prefix-colors "cyan,yellow" \
  "npx vite build --watch" \
  "npx wait-on dist/renderer/index.html && NC_DEVTOOLS=1 npx electron . --enable-logging"
