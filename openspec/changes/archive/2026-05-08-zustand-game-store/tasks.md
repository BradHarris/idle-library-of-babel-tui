## 1. Setup — dependencies and structure

- [x] 1.1 Install zustand dependency (`npm install zustand`)
- [x] 1.2 Create `src/stores/` directory
- [x] 1.3 Move `createInitialState()` from `game.js` to `config.js`

## 2. Consolidate number formatting

- [x] 2.1 Move `formatMoney` from `game.js` into `format.js`
- [x] 2.2 Standardize 1K threshold in formatMoney (was 10K in game.js)
- [x] 2.3 Update `format.js` to use consistent decimal places (always 2dp for suffixes)
- [x] 2.4 Update `format.test.js` with new boundary tests ($999, $1000)

## 3. Build the Zustand store

- [x] 3.1 Create `src/stores/gameStore.ts` with store structure (state interface, initial state import)
- [x] 3.2 Implement `tick(deltaMs)` action — pages production, money update, fractional tracking
- [x] 3.3 Implement worker cascade logic as immutable cumulative sum from top
- [x] 3.4 Implement `hire(tierId)` action with cost calculation and log entry
- [x] 3.5 Implement `upgradeTickRate()` action with cost check and state update
- [x] 3.6 Implement `reset()` action that restores initial state
- [x] 3.7 Add computed getters: `pps`, `canAfford`, `tickInterval`, `latestPage`
- [x] 3.8 Use immer/produce middleware for efficient immutable updates

## 4. Update the terminal UI to use the store

- [x] 4.1 Update `src/index.jsx` — replace `useState`/`useRef` game state with `useGameStore`
- [x] 4.2 Update `src/index.jsx` — replace manual tick interval logic with store-based approach
- [x] 4.3 Update `src/index.jsx` — replace manual render interval with store selector subscriptions
- [x] 4.4 Update `src/ui.jsx` — change panel props to use store selector patterns
- [x] 4.5 Update `src/index.jsx` — replace `String(count).padStart(5)` with `formatNumber(count)` for worker display
- [x] 4.6 Update `src/index.jsx` — replace raw `String(currentPage)` padding with `formatPageNumber`
- [x] 4.7 Update `src/index.jsx` — replace inline tick rate display with store's `tickInterval` getter

## 5. Remove deprecated code

- [x] 5.1 Delete `src/game.js` entirely
- [x] 5.2 Verify no remaining imports of `game.js` exist in the codebase
- [x] 5.3 Verify no remaining calls to `formatMoney` from game.js context

## 6. Write unit tests

- [ ] 6.1 Create `src/game.test.js` with Node built-in test runner setup
- [ ] 6.2 Write tick tests: zero-delta cascade, 1-second with 1 writer, 0.5-second with 2 writers
- [ ] 6.3 Write worker cost tests: base cost, scaling at count 1, 2, 3, all tiers
- [ ] 6.4 Write purchase tests: successful hire, failed hire, log entry creation
- [ ] 6.5 Write purchase tests: tick rate upgrade success/failure, cost doubling
- [ ] 6.6 Write cascade tests: single tier above, three tiers, all tiers, gap through missing tier
- [ ] 6.7 Write format tests: 1K boundary ($999/$1000), large numbers, scientific notation
- [ ] 6.8 Write format tests: worker count formatting with `formatNumber`
- [ ] 6.9 Verify all tests pass with `node --test src/game.test.js`
- [ ] 6.10 Verify existing format tests still pass with `node --test src/format.test.js`

## 7. Integration verification

- [ ] 7.1 Start the game with `npm start` and verify it runs
- [ ] 7.2 Test all key bindings (1-7 for hire, U for tick upgrade)
- [ ] 7.3 Verify log messages show correct formatting with unified `formatMoney`
- [ ] 7.4 Verify worker counts display with `formatNumber` instead of raw padding
- [ ] 7.5 Verify tick rate upgrades work and interval changes correctly
- [ ] 7.6 Verify terminal resize handling still works
