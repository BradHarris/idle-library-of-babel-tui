## Why

The game logic is entangled with the terminal UI layer — state management, game ticks, purchasing, and formatting all live inside `index.jsx` and `game.js`. This makes unit testing fragile (real `Date.now()` in tick logic), prevents reusing the game engine on other frontsends (e.g., a web UI), and has led to two competing patterns (mutable vs. immutable state mutations) and inconsistent number formatting across log messages and the display.

## What Changes

- Extract all game state and logic into a Zustand store (`stores/gameStore.ts`)
- Redesign `tick(state, deltaMs)` to accept elapsed time as a parameter (instead of reading `Date.now()` internally) — makes testing trivial
- Consolidate number formatting: move `formatMoney` from `game.js` into `format.js` and unify the formatting threshold (1K → "1.50K" instead of "$1500.00")
- Replace all ad-hoc `String(count).padStart(5)` and raw large numbers with `formatNumber()` for consistent display
- Move `createInitialState()` from `game.js` into `config.js` alongside other pure utility functions
- Remove `game.js` entirely after migration (no backward compat — single source of truth)
- Add unit tests using Node's built-in `--test` runner for game logic (tick, purchases, worker cascade, formatting)

## Capabilities

### New Capabilities

- `game-store`: Zustand store encapsulating all game state, actions (tick, hire, upgrade tick rate, reset), and computed getters (pps, canAfford, tickInterval, latestPage)
- `game-testing`: Unit tests for game logic using Node's built-in test runner — deterministic tests via `tick(deltaMs)` parameterization

### Modified Capabilities

- `page-generation`: No requirement changes, but the store will call `generatePage()` from `page.js` as a pure dependency — no spec delta needed

## Impact

**Removed:** `game.js` (entire file), the mutable/immutable pattern split in game logic

**Modified:** `src/index.jsx` — replaces `useState`/`useRef` game state with Zustand store; replaces manual tick/re-render intervals with store-based approach

**Modified:** `src/ui.jsx` — receives data from store selectors instead of props threaded through state

**Added:** `src/stores/gameStore.ts` — Zustand store with state, actions, and memoized getters

**Modified:** `src/format.js` — absorbs `formatMoney` and standardizes formatting thresholds

**Modified:** `src/config.js` — absorbs `createInitialState()`

**Added:** `src/game.test.js` — unit tests for game logic (tick, purchases, cascade, formatting)

**Dependency:** Adds `zustand` as a runtime dependency (no build step needed for Ink)
