## 1. Config Updates

- [x] 1.1 Update `src/config.js`: Change `TICK_INTERVAL` from 50 to 1000 (base tick interval in ms)
- [x] 1.2 Add to `src/config.js`: `TICK_RATE_BASE_COST = 100000` and `TICK_RATE_MIN_INTERVAL = 33`
- [x] 1.3 Add to `src/config.js`: `TICK_RATE_IMPROVEMENT_MS = 50`
- [x] 1.4 Add to `src/config.js`: export `TICK_RATE_MAX_TICKS_PER_SECOND = 30`

## 2. Game State Changes

- [x] 2.1 Update `src/game.js` `createInitialState()`: Add `tickRateLevel: 0` and `tickRateCost: 100000`
- [x] 2.2 Create `src/game.js` function `getTickInterval(tickRateLevel)`: returns `Math.max(33, Math.round(1000 - tickRateLevel * 50))`
- [x] 2.3 Create `src/game.js` function `getTickRateCost(level)`: returns `100000 * Math.pow(2, level)`
- [x] 2.4 Create `src/game.js` function `purchaseTickRateUpgrade(state)`: deducts money, increments level, updates cost, logs event; returns `{ success, message }`

## 3. UI Panel Updates

- [x] 3.1 Update `src/ui.jsx` `StatsPanel`: Add `tickRate` prop; display current tick rate (e.g., "Tick rate: 1.0/s")
- [x] 3.2 Update `src/ui.jsx` `StatsPanel`: Add `tickRateAffordable` prop; color the tick rate display green if affordable, dim otherwise
- [x] 3.3 Update `src/ui.jsx` `StatsPanel`: Display upgrade cost below tick rate (e.g., "Upgrade: $100K [U]")

## 4. Tick Loop and Input Handling

- [x] 4.1 Update `src/index.jsx`: Replace hardcoded `TICK_INTERVAL = 50` in the tick `useEffect` with dynamic interval based on `gameState.tickRateLevel`
- [x] 4.2 Update `src/index.jsx`: Use `useRef` for `gameStateRef` in the tick interval callback to avoid stale closures (use a ref for the level or a functional update pattern)
- [x] 4.3 Update `src/index.jsx`: Add tick rate upgrade purchase handler using `purchaseTickRateUpgrade` from game.js
- [x] 4.4 Update `src/index.jsx`: Extend `useInput` key handler to listen for 'u' key to purchase tick rate upgrade
- [x] 4.5 Update `src/index.jsx`: Pass tick rate props (`tickRateLevel`, `tickRateCost`, `canAffordTickRateUpgrade`) to StatsPanel
- [x] 4.6 Update `src/index.jsx`: Show tick rate upgrade keybind in the bottom key prompt area

## 5. Integration and Polish

- [x] 5.1 Run the game and verify initial tick rate is 1/sec
- [x] 5.2 Test purchasing tick rate upgrade (verify cost, level increment, interval reduction)
- [x] 5.3 Test exponential cost scaling across multiple purchases
- [x] 5.4 Verify tick rate display updates correctly after each purchase
- [x] 5.5 Test that tick rate caps at 30 ticks/sec (verify minimum interval is 33ms)
- [x] 5.6 Verify all game mechanics (page generation, auto-hire) still work correctly with the slower tick rate
