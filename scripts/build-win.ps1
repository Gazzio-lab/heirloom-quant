# Build Heirloom Quant for Windows (.exe NSIS installer + portable).
# Run on a Windows machine (or Windows VM / GitHub Actions runner).
# Artifacts go to .\release\
#
# Prerequisites:
#   - Node.js 18+ (https://nodejs.org)
#   - PowerShell 5+ or PowerShell 7+

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "==> Verifying environment"
node --version
npm --version

Write-Host "==> Installing dependencies"
if (-not (Test-Path node_modules)) {
  try { npm ci } catch { npm install }
}

Write-Host "==> Cleaning previous build"
npm run clean

Write-Host "==> Compiling TypeScript (main + renderer) and copying assets"
npm run build

Write-Host "==> Packaging Windows targets via electron-builder"
npx electron-builder --win --x64

Write-Host ""
Write-Host "==> Build complete. Artifacts in .\release\"
Get-ChildItem release -Filter *.exe | Format-Table Name, Length, LastWriteTime
