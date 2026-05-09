## 1. Reorder the alphabet

- [x] 1.1 Change `ALPHABET` in `src/page.js` to ` .,!?()abcdefghijklmnopqrstuvwxyz0123456789` (space first)

## 2. Reverse page content before returning

- [x] 2.1 Add `.split('').reverse().join('')` to the return value in `generatePage()` in `src/page.js`

## 3. Update LCG tests

- [x] 3.1 Update `stateToPage` test in `src/lcg.test.js` — `stateToPage(0n, ALPHABET)` should return 280 spaces (index 0 maps to space in new alphabet)
- [x] 3.2 Update determinism test in `src/lcg.test.js` — still valid, no change needed
- [x] 3.3 Verify uniqueness test in `src/lcg.test.js` — still valid, no change needed
- [x] 3.4 Verify `generatePage(0n)` test — new expected value due to reversed space-first alphabet

## 4. Run full test suite

- [x] 4.1 Run `npm test` and verify all tests pass (67/67 passed)
- [x] 4.2 Verify page display in the TUI looks correct and visually improved
