## Context

The repo ships shared game logic under `src/` (Zustand store, LCG, formatting) and a Vite React app under `web/` (`web/src/App.tsx`, Radix/Tailwind panels). The TUI is an Ink app rooted at `src/index.tsx` with `src/ui.tsx` and `tsx`-based scripts in `package.json`. OpenSpec still centers many UX requirements on the terminal.

## Goals / Non-Goals

**Goals:**

- Remove Ink, terminal entrypoints, and TUI-only scripts so the web app is the only runnable product.
- Preserve game rules, store API, and tests that target pure logic (tick, hire, LCG) without the TUI.
- Update specs so requirements describe `web/src` components and browser interaction instead of keybinds and terminal geometry.

**Non-Goals:**

- Renaming the repository or folder (optional follow-up).
- Changing idle economy formulas, LCG correctness, or storage math.
- Visual redesign beyond what is needed to remove TUI assumptions from specs.

## Decisions

1. **Single entry via Vite** — Default development uses `vite` with `web/vite.config.ts` (or renamed root config). Rationale: one bundler, one DOM renderer, fewer Node-only concerns than Ink on stdout.
2. **Delete TUI source rather than feature-flag** — Rationale: avoids dead code and dual maintenance; git history retains the old UI if needed.
3. **Store-first web panels** — Web components already use `useGameStore`; specs should not require prop-drilling interfaces that the web code does not use. Rationale: matches implementation and avoids fictitious `*Props` usage on every panel.
4. **Phrase search: Radix `SearchDialog`** — Replace overlay/hotkey spec text with open/submit/close behavior for the existing dialog pattern (trigger control in header, Enter to search, Escape to dismiss).
5. **Tick rate: button in `StatsPanel`** — Replace `u` keybind spec with explicit click/tap on an upgrade control already present or added in the web stats panel.

**Alternatives considered:** Keep TUI behind a `npm run tui` script (rejected: user asked to drop TUI support). Move web into `src/` (deferred: larger churn than deleting TUI).

## Risks / Trade-offs

- [Loss of zero-dependency CLI play] → Mitigation: document `npm run dev:web` (or `dev`) and optional static hosting of `build:web` output.
- [Specs drift during deletion] → Mitigation: land delta specs in this change and run `/opsx:verify` before archive.
- [Residual imports of `ink`/`chalk` in shared code] → Mitigation: grep and remove; typecheck and web build in CI.

## Migration Plan

1. Implement tasks: remove packages and TUI files, adjust scripts and README if present.
2. Run `npm run typecheck` and `npm run build:web` (or renamed equivalents).
3. Run tests (`node --test` on game tests).
4. Archive change and merge specs so `tui-display` / `adaptive-terminal-layout` are removed from main `openspec/specs/`.

## Open Questions

- Whether to rename `dev:web` → `dev` and `build:web` → `build` immediately or in a follow-up micro-change (proposal allows either; tasks will pick one for consistency).
