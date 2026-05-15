## Context

The game stores worker counts in a single `state.workers` map. During each tick, `computeCascade()` overwrites this map with cascade-augmented values (player-bought + workers spawned from higher tiers). Subsequent calls to `computeCanAfford()` and `getWorkerCost()` use these augmented values, meaning higher-tier workers inflate the prices of lower-tier workers. 

The TUI WorkersPanel currently displays a progress bar based on tier position (tier index / total tiers), which provides no meaningful gameplay feedback.

## Goals / Non-Goals

**Goals:**
- Decouple worker pricing from cascade by tracking player-bought counts independently
- Implement a doubling milestone system where reaching specific purchase thresholds doubles all worker output for that tier
- Display a meaningful doubling-progress bar in the UI
- Maintain backward compatibility with existing save/load and game state

**Non-Goals:**
- Changing the cascade mechanic itself (cascade still produces output workers)
- Changing auto-hire behavior or intervals
- Modifying the page generation or storage scale systems

## Decisions

### Decision 1: Track `playerWorkers` separately from `workers`
The store adds a new top-level state field `playerWorkers: Record<string, number>` tracking only directly-purchased counts. The existing `workers` field continues to hold cascade-augmented counts for PPS calculations. `getWorkerCost()` and `computeCanAfford()` receive `playerWorkers` instead.

**Alternatives considered:**
- Revert `state.workers` to player-only after cascade: Fragile — cascade is needed during the same tick for PPS.
- Add a parameter to `getWorkerCost` to pick which count to use: More stateful and error-prone at call sites.
- Compute cascade purely in `calcPagesPerSecond`: Would require changing the cascade function to not overwrite state, adding complexity to the tick loop.

**Rationale:** Clean separation of concerns — `playerWorkers` for pricing/doubling, `workers` for cascade/output. Minimum changes to the tick loop.

### Decision 2: Doubling thresholds as a geometric escalation sequence
The threshold sequence is: 10, 20, 40, 80, 160, 320... where each threshold doubles the previous. Specifically, threshold(n) = 10 × 2^n (for n = 0, 1, 2,...). The multiplier at count c is 2^(milestonesReached(c)) where milestonesReached counts how many thresholds are ≤ c.

**Alternatives considered:**
- Fixed absolute thresholds (every 10, 20, 30...): Less scaling, becomes trivial at high counts.
- Thresholds based on total output rather than count: Harder to plan and predict for players.

**Rationale:** The user explicitly specified this escalation (10, 20, 40, 80, 160...). It creates satisfying exponential progression matching the idle game genre.

### Decision 3: Progress bar shows player-bought count within current doubling bracket
For example, if player has bought 5 writers, the first doubling is at 10. The bar shows 5/10 = 50%. If player has 30 writers (doubled at 10, doubled at 20, next doubling at 40), the bar shows (30-20)/(40-20) = 50%.

**Rationale:** Directly communicates the next meaningful milestone. Matches the user's examples exactly.

### Decision 4: Per-tier multiplier applied to `calcPagesPerSecond`
Instead of multiplying individual worker counts, we add a `getDoublingMultiplier(playerCount: number): number` function and apply it to the tier's output. For writers (the only PPS-producing tier currently), this means PPS = writer_count × multiplier.

**Rationale:** Simple to extend if other tiers gain production output later. Keeps multiplier logic in config.js alongside cost scaling.

## Risks / Trade-offs

- **State migration [Risk]**: Existing save data lacks `playerWorkers`. → **Mitigation**: On load, if `playerWorkers` is missing, derive it from `workers` by taking the minimum of each tier's value across all tiers above it (reverse cascade). For the first release, initialize `playerWorkers` from `workers` at startup since cascade hasn't run yet.
- **Performance [Trade-off]**: Two separate worker maps increase state size slightly. → **Mitigation**: Negligible for 7 tiers; no performance concern.
- **UI complexity [Risk]**: The doubling progress bar adds visual elements to an already dense WorkersPanel. → **Mitigation**: Replace the existing progress bar rather than adding alongside it.
