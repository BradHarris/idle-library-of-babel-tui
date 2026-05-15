## Why

Worker prices currently incorrectly factor in cascade-augmented worker counts, making workers artificially expensive as higher tiers auto-spawn lower-tier workers. Additionally, the UI lacks feedback on output scaling milestones — players have no visible progress indicator toward worker output doublings.

## What Changes

- **Fix worker pricing**: Worker purchase costs SHALL be calculated using only the player's directly-purchased count for each tier, excluding workers added by the cascade from higher tiers.
- **Add worker output doubling milestones**: Each worker tier gains a cumulative output multiplier that doubles at specific purchase thresholds defined by an escalating sequence (10, 20, 40, 80, 160,...). At each milestone, every worker of that tier produces 2× more output.
- **Replace tier-position progress bar with doubling progress bar**: The TUI progress bar next to each worker tier SHALL display progress toward the next output-doubling milestone based on the player's directly-purchased count.

## Capabilities

### New Capabilities
- `worker-doubling`: Output multiplier system with escalating doubling thresholds (10, 20, 40, 80, 160, ...) that multiply total tier output by 2× at each milestone. Requires tracking player-bought counts separately from cascade counts and computing per-tier multipliers.

### Modified Capabilities
- `idle-economy`: Worker purchase cost SHALL use player-bought count exclusively, not cascade-augmented count. Adds output doubling multiplier to tier production calculation.
- `game-store`: Store SHALL track player-bought worker counts separately from total (cascade-augmented) counts. Provides derived doubling progress per tier and per-tier output multipliers.
- `tui-display`: Workers panel progress bar SHALL show doubling progress instead of tier-position. Displays player-bought count and output multiplier alongside each tier.

## Impact

- `src/config.js` — `getWorkerCost` will accept player-bought count; new doubling threshold and multiplier functions added
- `src/stores/gameStore.ts` — State tracks `playerWorkers` (bought-only) separate from cascade; new derived state for doubling progress/multipliers; `computeCanAfford` uses player counts
- `src/ui.jsx` — `WorkersPanel` progress bar recalculated to show doubling progress
- `openspec/specs/idle-economy/spec.md` — Delta spec for pricing fix and doubling output requirement
- `openspec/specs/game-store/spec.md` — Delta spec for new state fields and derived computations
- `openspec/specs/tui-display/spec.md` — Delta spec for doubling progress bar
