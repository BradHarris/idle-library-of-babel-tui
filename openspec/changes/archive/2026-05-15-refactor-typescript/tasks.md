## 1. Project Setup

- [x] 1.1 Add `typescript` as devDependency in `package.json`
- [x] 1.2 Create `tsconfig.json` with strict mode, `noUncheckedIndexedAccess`, `noEmit`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, and `@game/*` path alias
- [x] 1.3 Add `"typecheck": "tsc --noEmit"` script to `package.json`
- [x] 1.4 Create `src/types.ts` with all shared type definitions: `Tier`, `TierId`, `StorageTier`, `StorageTierId`, `GameState`, `LogEntry`, `HireResult`, `GameActions`, `SearchResult`, `StatsPanelProps`, `LatestPagePanelProps`, `WorkersPanelProps`, `LogPanelProps`, `StorageScalePanelProps`, `SearchOverlayProps`, `LocationTuple`

## 2. Core Library Modules (No Game Dependencies)

- [x] 2.1 Convert `src/lcg.js` → `src/lcg.ts`: add explicit `bigint` type annotations to all functions (`geoPair`, `lcgState`, `stateToPage`), type constants as `bigint`, remove JSDoc `@param`/`@returns` annotations
- [x] 2.2 Convert `src/config.js` → `src/config.ts`: import `Tier` and `StorageTier` from `./types.js`, type `TIERS` as `Tier[]`, type `STORAGE_TIERS` as `StorageTier[]`, add explicit types to all exported functions, remove JSDoc annotations
- [x] 2.3 Convert `src/format.js` → `src/format.ts`: add explicit types to `formatNumber`, `formatMoney`, `formatPageNumber`, `formatPagesPerSecond`, `formatLocationDisplay`, `wrapText`, remove JSDoc annotations

## 3. Game Logic Modules

- [x] 3.1 Convert `src/page.js` → `src/page.ts`: add explicit types to `queryToPageAddress` and `generatePage`, type `ALPHABET` as `string`, remove JSDoc annotations, update import paths to `./lcg.js`
- [x] 3.2 Convert `src/storageScale.js` → `src/storageScale.ts`: add explicit types to `computeStorageScale`, `pageOffsetFromLocation`, `locationFromPageOffset` with `bigint` parameters, remove JSDoc annotations

## 4. Store Module

- [x] 4.1 Update `src/stores/gameStore.ts`: import `GameState`, `GameActions`, `LogEntry`, `HireResult` from `../types.js` instead of defining local interfaces, add explicit types to helper functions (`addLogEntry`, `computeCascade`, `computeCanAfford`, `computeDoublingMultipliers`, `computeDoublingProgress`), remove local interface definitions
- [x] 4.2 Verify store still compiles and runtime behavior is unchanged

## 5. TUI Components

- [x] 5.1 Convert `src/ui.jsx` → `src/ui.tsx`: import prop interfaces from `./types.js`, type all component parameters (`StatsPanel`, `LatestPagePanel`, `WorkersPanel`, `LogPanel`, `StorageScalePanel`, `SearchOverlay`), remove JSDoc comments describing props
- [x] 5.2 Verify all Ink components still render correctly with typed props

## 6. TUI Entry Point

- [x] 6.1 Convert `src/index.jsx` → `src/index.tsx`: import `SearchResult` from `./types.js`, add type annotation to `searchResult` state (`useState<SearchResult | null>`), add explicit types to handler functions (`handleHire`, `handleTickRateUpgrade`, `handleSearch`), update imports to `.js` extensions
- [x] 6.2 Verify game boots and tick/keybind behavior unchanged

## 7. Test Files

- [x] 7.1 Convert `src/lcg.test.js` → `src/lcg.test.ts`: update imports to `.js` extensions, fix any type errors from strict mode
- [x] 7.2 Convert `src/format.test.js` → `src/format.test.ts`: update imports, fix type errors
- [x] 7.3 Convert `src/storageScale.test.js` → `src/storageScale.test.ts`: update imports, fix type errors
- [x] 7.4 Convert `src/game.test.js` → `src/game.test.ts`: update imports, fix type errors from store changes

## 8. Web Frontend

- [x] 8.1 Convert `web/vite.config.js` → `web/vite.config.ts`: add type annotations for config
- [x] 8.2 Convert `web/src/main.jsx` → `web/src/main.tsx`: update imports
- [x] 8.3 Convert `web/src/App.jsx` → `web/src/App.tsx`: update imports, verify typed store selectors work
- [x] 8.4 Convert web components to TypeScript: `web/src/components/StatsPanel.jsx` → `.tsx`, `WorkersPanel.jsx` → `.tsx`, `StorageScalePanel.jsx` → `.tsx`, `LogPanel.jsx` → `.tsx`, `LatestPagePanel.jsx` → `.tsx`, `SearchDialog.jsx` → `.tsx` — add typed props from shared types, update imports

## 9. Cleanup and Verification

- [x] 9.1 Delete remaining `.js` and `.jsx` source files from `src/` and `web/src/` after confirming `.ts`/`.tsx` versions work
- [x] 9.2 Run `npm run typecheck` and fix all remaining type errors
- [x] 9.3 Run all tests with `tsx` to verify no regressions
- [x] 9.4 Run `npm run dev` and verify TUI works as before
- [x] 9.5 Run `npm run dev:web` and verify web UI works as before
- [x] 9.6 Verify `npm run build:web` produces a working web build
