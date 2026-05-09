## Context

The idle game currently ticks every 50ms (20 ticks/sec), with the interval hardcoded in both `src/config.js` and `src/index.jsx`. The tick loop drives all game progress: page generation, money accumulation, auto-hiring, and log cleanup. The current fast tick rate means players see instant progress, removing the tension and anticipation that makes idle games compelling.

## Goals / Non-Goals

**Goals:**
- Start the game at 1 tick/second (1000ms interval) so progress feels earned
- Provide a purchasable upgrade that speeds up the tick rate by 50ms per purchase
- Cap the maximum tick rate at 30 ticks/second (~33.33ms interval)
- Make the upgrade progressively more expensive to balance the power spike
- Display current tick rate and upgrade cost in the UI
- Keep implementation simple and contained within existing modules

**Non-Goals:**
- Changing the tick loop to use requestAnimationFrame or variable delta (delta-based timing already works correctly)
- Adding other speed-related upgrades (multipliers, automation, etc.)
- Persisting tick rate upgrades across sessions (can be added later)
- Changing worker tier economics or page generation logic

## Decisions

### Decision 1: Tick rate as a game state field
**Choice:** Track `tickRateLevel` (number of upgrades purchased) and `tickRateCost` (cost of next purchase) in the game state.
**Rationale:** This keeps the upgrade data co-located with all other game state, making it serializable and consistent with the existing state model. The tick interval is derived: `Math.max(33, Math.round(1000 - (tickRateLevel * 50)))`.
**Alternatives considered:**
- Store tick interval directly — but deriving it from level makes it easier to reason about and display.
- Separate tick rate config — but it's player-dependent, not a constant.

### Decision 2: Exponential cost scaling
**Choice:** Tick rate upgrade cost = baseCost × 2^(level), where baseCost = 100,000.
**Rationale:** Starting at $100K makes it a meaningful late-game purchase. Doubling each level creates a steep but achievable curve: $100K, $200K, $400K, $800K, $1.6M, $3.2M, $6.4M. To reach max (19 purchases at $19M total cost), players need significant accumulation — which is the intended challenge.
**Alternatives considered:**
- Linear scaling — too easy to max out.
- Cubic scaling — too steep, potentially unreachable.

### Decision 3: Dynamic interval in the tick loop
**Choice:** Replace the hardcoded `TICK_INTERVAL = 50` in `src/index.jsx` with `Math.max(33, Math.round(1000 - (gameState.tickRateLevel * 50)))`.
**Rationale:** The tick interval is player-dependent, so it belongs in the component state access path, not in config constants. The config `TICK_INTERVAL` can be repurposed as the base (initial) value.
**Alternatives considered:**
- Keep config constant and use it as initial value — cleaner config, but requires passing state into the effect or using a ref.

### Decision 4: Keybind for tick rate upgrade
**Choice:** Use key `u` (for "upgrade") to purchase the tick rate upgrade, with affordance shown in the UI.
**Rationale:** Keys 1-7 are taken by worker tiers. `u` is mnemonic and doesn't conflict.
**Alternatives considered:**
- Click/button in UI — but this is keyboard-first.
- Another key like `t` — `u` is more mnemonic for "upgrade".

## Risks / Trade-offs

[Risk] The slow initial tick rate (1/sec) may feel unresponsive to new players.
→ [Mitigation] The UI updates at 10 ticks/sec (100ms render interval), so the display feels responsive even though game logic only advances once per second. The page text and stats still update smoothly.

[Risk] Players may rush to buy the upgrade too early, trivializing the game.
→ [Mitigation] The $100K base cost ensures it's only available after significant accumulation. The exponential scaling ensures each additional purchase requires exponentially more progress.

[Risk] The upgrade cost formula needs playtesting.
→ [Mitigation] The formula is a single constant in config, easy to adjust without code changes.

## Migration Plan

This is a behavioral change with no data migration needed — it modifies game mechanics only. New games start with the new behavior automatically.
