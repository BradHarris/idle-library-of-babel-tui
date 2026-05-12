## 1. Implement pageOffsetFromLocation

- [x] 1.1 Add `pageOffsetFromLocation(location)` function to `storageScale.js` that computes `hardDrive × PAGES_PER_DRIVE` using bigint arithmetic
- [x] 1.2 Export `pageOffsetFromLocation` from `storageScale.js`

## 2. Implement locationFromPageOffset

- [x] 2.1 Add `locationFromPageOffset(pageOffset)` function to `storageScale.js` that computes hardDrive = pageOffset / PAGES_PER_DRIVE, then derives each subsequent level by successive division by tier multipliers
- [x] 2.2 Export `locationFromPageOffset` from `storageScale.js`

## 3. Add tests

- [x] 3.1 Test: `pageOffsetFromLocation(allZeros) === 0n`
- [x] 3.2 Test: `pageOffsetFromLocation({hardDrive: 1n, server: 0n, ...}) === STORAGE_TIERS[0].multiplier`
- [x] 3.3 Test: `locationFromPageOffset(0n)` returns all zeros
- [x] 3.4 Test: forward-then-backward round-trip: `locationFromPageOffset(pageOffsetFromLocation(loc)) === loc` for multiple locations
- [x] 3.5 Test: backward-then-forward round-trip: `pageOffsetFromLocation(locationFromPageOffset(n)) === n` for multiple page numbers
- [x] 3.6 Test: boundary case — `pageOffsetFromLocation(locationFromPageOffset(STORAGE_TIERS[0].multiplier)) === STORAGE_TIERS[0].multiplier` (first page of second drive round-trips)
- [x] 3.7 Test: large page offset exceeding `Number.MAX_SAFE_INTEGER` is handled correctly (uses PAGES_PER_DRIVE × 999999999999n)
