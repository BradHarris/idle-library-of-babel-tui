## Why

Maintaining both an Ink-based terminal UI and a Vite/React web app duplicates layout, input, and packaging concerns while the web build already delivers the full game. Focusing on the web surface simplifies dependencies, scripts, and specs so effort goes toward one polished client.

## What Changes

- **BREAKING**: Remove the Ink/TUI entrypoint (`src/index.tsx`, `src/ui.tsx`), TUI-only dependencies (`ink`, `chalk`), and npm scripts that run the terminal app (`start`, `dev` as TUI).
- Make the Vite web app the only supported runtime: `dev:web` / `build:web` become the primary dev/build commands (names may be simplified to `dev` / `build`).
- Update `package.json` metadata (`description`, `main`/`module` entry) to describe a web-first library idle game.
- Align OpenSpec capabilities: retire terminal-only specs, add explicit web UI requirements, and update cross-cutting specs (types, phrase search, tick-rate upgrade, number formatting) that still reference the TUI.

## Capabilities

### New Capabilities

- `web-display`: Normative requirements for the browser-based dashboard (layout, responsiveness, panels, updates, and interaction patterns) as the single shipped UI.

### Modified Capabilities

- `tui-display`: Remove all terminal/Ink dashboard requirements (**BREAKING**).
- `adaptive-terminal-layout`: Remove terminal resize and column-width layout requirements (**BREAKING**).
- `typescript-types`: Wording and file paths that assume a TUI alongside web; adjust or remove `SearchOverlay`-centric props in favor of the web search UI and store-driven panels.
- `phrase-search`: Replace `[S]` overlay / `src/index.tsx` requirements with web search dialog behavior and file paths.
- `tick-rate-upgrade`: Replace keyboard `u` purchase with web UI control (e.g. Stats panel control), keeping economy rules unchanged.
- `ui-number-formatting`: Clarify that formatting rules apply to the web UI as the live display surface (remove TUI-only framing).

## Impact

- **Code**: Delete or stop shipping TUI modules; keep `web/`, `src/` game logic, store, LCG, formatters, and shared types.
- **Dependencies**: Remove `ink`, `chalk`; keep React, Vite, Zustand, Radix/Tailwind used by the web app.
- **Developer workflow**: Default `npm run dev` should run Vite; CI/docs references to `tsx src/index.tsx` go away.
- **Specs**: `openspec/specs/tui-display` and `openspec/specs/adaptive-terminal-layout` retired when the change is archived; new `web-display` added.
