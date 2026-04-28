# Heirloom Quant
A cross-platform financial calculator suite. The same codebase compiles to a macOS `.app` (and `.dmg`) and a Windows `.exe` (NSIS installer + portable) with **zero logic changes**.
## Highlights
- **Three-layer architecture** (`/core`, `/calculators`, `/app`) - calculation engine is 100% pure TypeScript, no UI or OS dependencies.
- **16 tabs**, dozens of calculators - Investment, Inflation, Real Estate, Insurance, Net Worth, Financial Goals, Budgeting, Valuation, Tools of Estate Planning, Trusts, Charitable, Estate Planning Techniques, Taxes, Retirement, Present/Future Value, §199A.
- **Modular calculator registry** - add a new module under `src/calculators/`, export it from `registry.ts`, and it appears in the UI automatically.
- **Save / load client scenarios** as JSON, **export schedules to CSV**.
- **Tested** financial primitives (Jest): IRR/NPV/PMT/Amortization/Tax brackets/Registry.
- **CI builds** for both macOS and Windows on every push.
## Architecture
```text
src/
├── core/            Pure calculation engine (no UI, no Electron, no fs)
│   ├── financial.ts   IRR, NPV, PV/FV, annuities, MIRR, CAGR, …
│   ├── amortization.ts Schedule builder
│   ├── tax.ts         Generic bracket application, FICA
│   ├── format.ts      Currency / percent / number formatters
│   └── types.ts       Calculator/Scenario shared types
├── data/            IRS tables, constants - decoupled from logic
│   ├── taxBrackets2024.ts
│   └── irsRates.ts    §7520, AFR, RMD divisors, life expectancy, retirement limits
├── calculators/     Each module owns its own calculators
│   ├── investment.ts inflation.ts realEstate.ts insurance.ts netWorth.ts
│   ├── goals.ts budgeting.ts valuation.ts estate.ts trusts.ts
│   ├── charitable.ts techniques.ts taxes.ts retirement.ts pvfv.ts
│   ├── section199a.ts
│   └── registry.ts    Tabs + listCalculators() + getCalculator(id)
└── app/             UI layer (Electron). Talks to /core via IPC only.
    ├── main.ts        Electron main process + IPC handlers
    ├── preload.ts     contextBridge - exposes window.cruncher
    └── renderer/      Browser-side: HTML + CSS + TS (ESM, no Node)
```

The renderer never imports `fs`, `electron`, or anything from `/core` directly. To swap to a different shell (e.g. Tauri or PySide6), only `src/app/` would change.

## Prerequisites
- **Node.js 18+** (20 LTS recommended)
- **npm** (bundled with Node)
- **macOS** for `.app`/`.dmg` builds, **Windows** for `.exe` builds. Cross-compilation Mac→Windows is intentionally avoided per electron-builder's recommendation; use the GitHub Actions matrix for both.

## Quick start
```sh
# 1. Install
npm install
# 2. Run the desktop app in dev
npm start
# 3. Run the test suite
npm test
```

## Building installers

### macOS (`.app` + `.dmg`)
Run on a Mac:
```sh
./scripts/build-mac.sh
# OR equivalently
npm run dist:mac
```
Artifacts (in `release/`):
- `Heirloom Quant-2024.0.37.dmg` (x64 + arm64)
- `Heirloom Quant-2024.0.37-mac.zip`
- `mac/Heirloom Quant.app/`
- `mac-arm64/Heirloom Quant.app/`

### Windows (`.exe` NSIS + portable)
Run on a Windows machine (or Windows VM, or via the included GitHub Actions workflow):
```powershell
# PowerShell
.\scripts\build-win.ps1
# OR equivalently
npm run dist:win
```
Artifacts (in `release/`):
- `Heirloom Quant Setup 2024.0.37.exe` (NSIS installer)
- `Heirloom Quant 2024.0.37.exe` (portable single-exe)

### Both at once via CI
Push to GitHub and `.github/workflows/build.yml` will:
1. Run unit tests on both `macos-latest` and `windows-latest`.
2. Build platform-native installers.
3. Upload them as workflow artifacts (`heirloom-quant-mac`, `heirloom-quant-win`).

## Adding a new calculator
1. Create `src/calculators/myCalc.ts`:
    ```ts
    import { defineCalculator, num } from './_helpers';
    export const myCalculators = [
      defineCalculator({
        id: 'mine.example',
        name: 'My Calculator',
        category: 'investment',     // tab id
        description: 'Does a thing.',
        inputs: [
          { name: 'x', label: 'X', type: 'currency', default: 1000 },
        ],
        run: (i) => ({ summary: { 'Result': num(i.x) * 2 } }),
      }),
    ];
    ```
2. Register it in `src/calculators/registry.ts`:
    ```ts
    import { myCalculators } from './myCalc';
    // …
    const ALL: Calculator[] = [..., ...myCalculators];
    ```
3. The tab and form render automatically. No UI code required.

## Project scripts
| script | purpose |
| --- | --- |
| `npm run build` | Compile TS for main + renderer, copy assets to `dist/` |
| `npm start` | Build + launch Electron |
| `npm test` | Jest unit tests |
| `npm run lint` | ESLint over `src/` |
| `npm run dist` | Build installers for the current OS |
| `npm run dist:mac` | macOS targets |
| `npm run dist:win` | Windows targets |
| `npm run dist:all` | Both (cross-compile, requires extra tooling) |

## Notes on accuracy
The financial primitives in `/core` match Excel to within sub-cent precision (see tests in `tests/`). The estate/trust calculators use simplified formulas suitable for client illustrations; production use should reference the latest IRS Tables 2010CM/90CM and current §7520 rate (override the default in any calculator's input).

The 2024 tax tables come from Rev. Proc. 2023-34. Update annually in `src/data/taxBrackets2024.ts`.

## License
MIT
