## 1. Add cascade logic to tick()

- [x] 1.1 Snapshot `workers` at the start of `tick()` (before cascade)
- [x] 1.2 Loop tiers top-to-bottom (skip writer) and add each tier-above's old count to the current tier's count
- [x] 1.3 Verify cascade chains correctly (rector → overseer → manager → writer in one tick)

## 2. Fix calcPagesPerSecond

- [x] 2.1 Change `calcPagesPerSecond` to return `workers.writer ?? 0` instead of summing all tiers
- [x] 2.2 Verify no other function depends on the old behavior (grep for usages)

## 3. Remove auto-hire system

- [x] 3.1 Remove the auto-hire timer loop from `tick()`
- [x] 3.2 Remove `_autoHireTimers` from `createInitialState()`
- [x] 3.3 Remove `autoHireBelow` from all tier definitions in `config.js`
- [x] 3.4 Remove `AUTO_HIRE_INTERVAL` constant from `config.js`

## 4. Clean up and verify

- [x] 4.1 Run the game (`npm start`) and confirm: buying a manager immediately causes writers to grow each tick, cascading works through all tiers
- [x] 4.2 Confirm pages/sec equals writer count exactly
- [x] 4.3 Run existing tests (`node --test src/format.test.js`) to ensure no regressions
