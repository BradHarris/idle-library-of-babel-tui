## 1. Doubling logic in config

- [x] 1.1 Add `getDoublingMultiplier(playerCount)` function to `config.js` — computes 2^milestonesReached where thresholds are 10, 20, 40, 80, 160...
- [x] 1.2 Add `getDoublingProgress(playerCount)` function to `config.js` — computes progress fraction (0-1) toward the next doubling milestone
- [x] 1.3 Add `getDoublingThresholds()` helper that returns the threshold array [10, 20, 40, 80, ...]
- [x] 1.4 Unit test `getDoublingMultiplier` with counts 0, 9, 10, 15, 20, 30

## 2. Game store — playerWorkers state and hire pricing fix

- [x] 2.1 Add `playerWorkers: Record<string, number>` to the GameState interface and `createInitialState`
- [x] 2.2 Add `doublingMultipliers: Record<string, number>` and `doublingProgress: Record<string, number>` to the GameState interface as derived values
- [x] 2.3 Create `computePlayerWorkers`, `computeDoublingMultipliers`, and `computeDoublingProgress` helper functions
- [x] 2.4 Fix `hire()` action to use `playerWorkers[tierId]` when calling `getWorkerCost()`
- [x] 2.5 Fix `computeCanAfford()` to accept and use `playerWorkers` instead of cascade-augmented `workers`
- [x] 2.6 Fix `tick()` to NOT modify `playerWorkers` during cascade — only `workers` is cascaded
- [x] 2.7 Fix `calcPagesPerSecond()` to multiply total writer count by doubling multiplier, updating all call sites

## 3. Game store — doubling-aware PPS and derived state

- [x] 3.1 Update `pps` derivation to use `workers.writer × getDoublingMultiplier(playerWorkers.writer)`
- [x] 3.2 Compute and set `doublingMultipliers` and `doublingProgress` in all state updates (tick, hire, reset, initial state)
- [x] 3.3 Update `reset()` action to reinitialize `playerWorkers` along with other state

## 4. UI — doubling progress bar and multiplier display

- [x] 4.1 Update `WorkersPanel` component to read `playerWorkers`, `doublingMultipliers`, and `doublingProgress` from the store
- [x] 4.2 Replace tier-position progress bar with doubling-progress bar: filled blocks = `Math.round(doublingProgress[tier.id] * progressWidth)`
- [x] 4.3 Display player-bought count instead of cascade-augmented count in the Workers panel
- [x] 4.4 Display the current doubling multiplier (e.g., "×2", "×4") next to each tier's count
- [x] 4.5 Update the cost display to reflect the corrected (player-count-based) pricing

## 5. Testing

- [x] 5.1 Verify that hiring a higher-tier worker does not increase the cost of lower-tier workers
- [x] 5.2 Verify that at 10 writers, PPS doubles (20 pages/sec with 10 writers)
- [x] 5.3 Verify progress bar displays correctly at counts 0, 5, 10, 15, 20, 30
- [x] 5.4 Verify full game tick cycle: cascade, PPS calculation, and cost computation all work together
