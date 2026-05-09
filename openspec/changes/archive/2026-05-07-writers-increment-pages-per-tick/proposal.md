# Proposal: Implement Tick Cascade and Fix Pages/Second

## Why

The idle game's progression model is a cascade: each tick, higher-tier units spawn workers of the tier below them:

```
rectors → overseers → managers → writers → pages
```

Concretely:
- Each **manager** spawns 1 **writer** per tick
- Each **overseer** spawns 1 **manager** per tick
- Each **rector** spawns 1 **overseer** per tick
- Each **writer** generates 1 **page** per tick

The user described it simply: *"each tick increment writers by the number of managers, increment the number of managers by the number of overseers, etc."*

The current implementation does **not** follow this model. Instead it uses a separate timer-based "auto-hire" system that spends money every 30s to hire one worker of the next-lower tier. This means:
- Buying a manager does **not** immediately produce writers (the timer fires 30s later, only if you have enough money)
- Pages/sec is calculated by summing ALL worker tiers, so pages go up when buying a manager even though managers don't produce pages
- The auto-hire spending mechanic is unused and confusing in the context of the cascade model

The user's reported bug — *"when I bought a manager pages incremented and writers did not"* — is symptomatic of the wrong model being implemented.

## What Changes

Replace the auto-hire timer system with a per-tick cascade and fix the pages-per-second calculation:

1. **Add cascade logic to `tick()`**: snapshot worker counts at tick start, then for each non-writer tier, add the tier-above's count to its own (top-to-bottom so cascade chains correctly).
2. **Fix `calcPagesPerSecond()`**: return only `workers.writer` (not the sum of all tiers).
3. **Remove the auto-hire timer loop** from `tick()` — no longer needed.
4. **Remove `_autoHireTimers`** from game state and `createInitialState()`.
5. **Remove `autoHireBelow`** from tier configs in `config.js`.
6. **Update log messages** to say "spawned" instead of "auto-hired".

## Impact

- **Progression model changes fundamentally**: auto-hire spent money on a 30s timer; cascade is free and instant. Players will progress much faster.
- **No money cost for spawning**: the cascade produces workers for free every tick.
- **Existing saves will be incompatible**: `_autoHireTimers` state and 30s-timer progress are discarded.
- **UI is unchanged**: the display already shows counts per tier; the cascade just makes those counts update correctly.
