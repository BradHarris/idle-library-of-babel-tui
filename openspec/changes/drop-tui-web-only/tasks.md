## 1. Dependencies and package metadata

- [x] 1.1 Remove TUI-only dependencies (`ink`, `chalk`) from `package.json` and refresh the lockfile
- [x] 1.2 Point default scripts at Vite (e.g. make `dev` / `build` run the web app, or keep `dev:web`/`build:web` but remove `start`/`dev` that invoke `tsx src/index.tsx`)
- [x] 1.3 Update `package.json` `description`, `main` (or remove `main` if inappropriate for a web-only package), and any metadata that still says "terminal"

## 2. Remove TUI source

- [x] 2.1 Delete `src/index.tsx` and `src/ui.tsx` (and any TUI-only helpers only referenced from those files)
- [x] 2.2 Grep the repo for `ink`, `chalk`, `useInput`, and `SearchOverlay`; remove or replace remaining references

## 3. Web UI and types

- [x] 3.1 Ensure `web/src/App.tsx` drives ticks and uses typed Zustand selectors (`typescript-types` delta)
- [x] 3.2 Align `SearchDialog` with `phrase-search` delta (typed `SearchResult | null`, no `SearchOverlay`)
- [x] 3.3 Ensure tick rate upgrade is only purchased via web Stats control (`tick-rate-upgrade` delta); remove global `u` key handling if still present
- [x] 3.4 Update `src/types.ts`: drop `SearchOverlayProps` if unused; keep or adjust panel shape interfaces per delta

## 4. Verification

- [x] 4.1 Run `npm run typecheck` (or `npx tsc --noEmit`) and fix any path/import issues from deleted files
- [x] 4.2 Run `npm run build:web` (or renamed build script) successfully
- [x] 4.3 Run game logic tests (`node --test` on relevant `src/*.test.ts` / `.js` as configured in the repo)

## 5. Documentation and specs follow-up

- [x] 5.1 Update README or contributor docs if they reference the TUI or `tsx src/index.tsx`
- [x] 5.2 After implementation, run `/opsx:verify` for this change, then archive when satisfied so main `openspec/specs/` gains `web-display` and drops retired capabilities
