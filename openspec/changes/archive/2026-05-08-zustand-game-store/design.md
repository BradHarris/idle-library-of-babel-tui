## Context

The Library of Babel idle game currently lives in a single `index.jsx` component (React/Ink TUI) with game logic in `game.js`. State management uses React `useState` paired with a `useRef` work-around for the game tick closure — a known anti-pattern for real-time game loops. Game logic has two patterns side-by-side: some functions mutate state (`tick`, `purchaseWorker`) and some return new state objects (`purchaseWorkerPure`, `purchaseTickRateUpgrade`). This split exists because the tick loop needs performance while the UI prefers immutability, but it creates maintenance overhead.

Numbers are formatted inconsistently: logs use `game.js`'s `formatMoney` (10K threshold, always 2dp), the UI uses `format.js`'s `formatMoney` (1K threshold), and some values use `String(count).padStart(5)` or raw `.toFixed()` calls. This makes the codebase look fragmented and makes future formatting changes error-prone.

## Goals / Non-Goals

**Goals:**
- Extract all game logic into a Zustand store — single source of truth for state + actions
- Make the store fully testable — `tick(deltaMs)` accepts elapsed time, no hidden dependencies on `Date.now()`
- Unify number formatting — all large numbers go through `formatNumber` / `formatMoney` from `format.js`
- Remove `game.js` entirely — no dual patterns
- Add unit tests using Node's built-in `--test` runner
- Prepare the engine for a future web frontend (no Node-specific APIs in game logic)

**Non-Goals:**
- Saving/loading game state (persist to disk) — not in scope
- Multi-store split — single store with computed selectors
- Web UI implementation — just make the engine portable
- Changing game balance or rules
- Adding new worker tiers or mechanics

## Decisions

### 1. Single Zustand store with computed getters

```
gameStore.ts
├── state: GameState (raw values)
├── actions: tick, hire, upgradeTickRate, reset
└── getters: pps, canAfford, tickInterval, latestPage
```

**Why not multiple stores?** The game state is one coherent model. Splitting into "game store" + "UI store" would duplicate derived computation. Zustand's `useStore(selector)` pattern already handles efficient re-rendering — subscribing to `s => s.pps` only re-renders when pps changes.

**Rationale:** Simple, testable, zero duplication. Web UI can subscribe to fine-grained selectors. TUI can subscribe to the whole store on its render interval.

### 2. `tick(deltaMs: number)` — time parameter, no hidden dependencies

```
// Before: tick() reads Date.now() internally
// After:  tick(state, deltaMs) accepts elapsed time
```

**Why parameter instead of global time source?** Cleaner API — callers explicitly pass delta, making it obvious that tick is a pure-ish function. No module-level state to manage. Tests just pass `1000` for one second. Runtime code passes `Date.now() - lastTick`.

**Alternatives considered:**
- Global `setTimeSource(fn)` pattern — adds indirection, harder to test in parallel
- Store manages its own `setInterval` — ties store to Node.js, harder to test

### 3. Immutable state in Zustand with `produce` (immer)

```ts
import { produce } from 'zustand/middleware';

const useGameStore = create(produce((state, actions) => ({
  // ... actions can mutate state directly, immer creates new object
})));
```

**Why immer?** Tick runs ~1-30 times per second. Pure spread (`{...state, workers: {...state.workers}}`) creates garbage every tick. `produce` only copies changed branches, giving us the best of both worlds: mutable-style code with immutable semantics.

**Alternatives considered:**
- Pure spread everywhere — simplest code but highest GC pressure
- Fully mutable state in store — loses React's reactivity guarantees

### 4. Worker cascade as cumulative sum from top

```
// Current: in-place mutation, top-to-bottom (reverse TIERS)
// for i from 5 down to 0: workers[TIERS[i]] += workers[TIERS[i+1]]
//
// New: compute from original snapshot
// newWorkers[i] = original[i] + Σ(original[j] for j > i)
```

**Why this formula?** The in-place cascade has transitive effects — a spawned manager also spawns writers in the same tick. The cumulative sum formula captures the same math: each tier receives all workers from tiers above it. This is correct and simpler to implement immutably.

**Verification:** `{writer:1, manager:2, overseer:1}` → `{writer:4, manager:3, overseer:1}` — verified identical to in-place cascade.

### 5. Unified formatting: 1K threshold, `formatNumber` for all large numbers

```
formatNumber(n) from format.js (existing, already used by UI):
  0-999   → "42"        (raw)
  1K-999K → "1.50K"     (K suffix, 2dp)
  1M-999M → "2.50M"     (M suffix, 2dp)
  ...
  >1000T  → scientific

formatMoney(n) = "$" + formatNumber(n)
```

**Why 1K threshold?** Consistency. The UI already uses it. Log messages showing "$1500.00" while the UI shows "$1.50K" for the same value is confusing. All formatting should come from one source of truth.

**Worker counts:** Replace `String(count).padStart(5)` with `formatNumber(count)`. For small counts (0-999) this is identical to the raw string. For large counts (1000+), it becomes "1.00K" instead of "1000" — more readable.

### 6. File structure

```
src/
├── config.js              ← TIERS, constants, getWorkerCost, getTickInterval,
│                           calcPagesPerSecond, createInitialState
├── stores/
│   └── gameStore.ts       ← Zustand store (new)
├── page.js                ← generatePage (unchanged)
├── format.js              ← formatMoney (absorbed), formatNumber, formatPageNumber
├── format.test.js         ← existing format tests
├── game.test.js           ← NEW: game logic tests
├── ui.jsx                 ← panels (receives store selectors)
└── index.jsx              ← App (uses store)
```

### 7. Test runner: Node built-in `--test`

```bash
node --test src/game.test.js
node --test src/format.test.js
```

**Why not Vitest?** Node's test runner is zero-dependency, already available, and sufficient for our test scope (assertions, describe/it, beforeEach/afterEach). We can migrate to Vitest later if needed.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Zustand adds a runtime dependency | Small bundle (~3KB gzipped), no build step needed, already used with Ink/React |
| `produce` (immer) adds overhead | Only copies changed branches — typically much less than full spread. Profiling if tick performance becomes an issue |
| Migration breaks running game | Atomic swap — replace imports in index.jsx, remove game.js, run once. No gradual migration needed |
| Test coverage gaps in cascade logic | Explicit test cases that verify exact worker counts after known tick sequences with mixed tier populations |
| `formatNumber` changes log history messages | Logs store plain text messages, not formatted values. Only new log entries use new formatting — no backward compatibility issue |

## Migration Plan

1. Create `stores/gameStore.ts` with all game logic
2. Create `game.test.js` with tests for tick, purchases, cascade, formatting
3. Update `format.js` to absorb `formatMoney` and standardize thresholds
4. Move `createInitialState()` to `config.js`
5. Update `index.jsx` to use store instead of useState/useRef
6. Update `ui.jsx` panel props to receive data from store selectors
7. Remove `game.js`
8. Run `node --test src/*.test.js` to verify all tests pass
9. Run the game to verify it works
