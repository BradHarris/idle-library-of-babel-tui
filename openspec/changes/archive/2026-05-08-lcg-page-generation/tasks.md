## 1. Create LCG core module

- [x] 1.1 Create `src/lcg.js` with LCG constants: `A = 44n`, `C = 1n`, `M = 43n ** 280n`
- [x] 1.2 Implement `geoPair(base, n, mod)` — binary splitting geometric series with simultaneous power computation (returns `{sum, pow}`)
  - Handle `n == 0` (returns `{0n, 1n}`) and `n == 1` (returns `{1n, base % mod}`)
  - For even n: `sum = half.sum * (1 + half.pow) % mod`, `pow = half.pow * half.pow % mod`
  - For odd n: compute even intermediate, add `powEven` to `sumEven`, multiply `powEven` by `base`
- [x] 1.3 Implement `lcgState(pageNum)` — call `geoPair(44n, pageNum, M)`, return the `sum` (which is X_n)
- [x] 1.4 Implement `stateToPage(state)` — convert LCG state to 280-char page via base-43 (repeated `state % 43n` and `state / 43n` BigInt operations)
- [x] 1.5 Implement `generatePage(pageNum)` — compose `lcgState(pageNum)` → `stateToPage(state)`

## 2. Rewrite page.js to use LCG

- [x] 2.1 Remove `createHash` import from `src/page.js`
- [x] 2.2 Remove `mulberry32` function from `src/page.js`
- [x] 2.3 Remove `deriveSeed` function from `src/page.js`
- [x] 2.4 Import `generatePage` from `src/lcg.js` (or inline the LCG module)
- [x] 2.5 Replace the body of `generatePage` in `src/page.js` with the LCG-based implementation
- [x] 2.6 Keep the same `ALPHABET` constant and `PAGE_LENGTH = 280`

## 3. Write LCG tests

- [x] 3.1 Create `src/lcg.test.js`
- [x] 3.2 Test `geoPair` for n=0 (returns `{sum: 0n, pow: 1n}`)
- [x] 3.3 Test `geoPair` for n=1 (returns `{sum: 1n, pow: 44n}`)
- [x] 3.4 Test `geoPair` for n=2 (returns `{sum: 45n, pow: 1936n}`)
- [x] 3.5 Test `geoPair` correctness: verify `geoPair(44n, N, M).sum` matches manual LCG iteration for N = 0..20
- [x] 3.6 Test `stateToPage` for state = 0n (returns 280 copies of first alphabet character)
- [x] 3.7 Test `stateToPage` length is always 280
- [x] 3.8 Test all output characters are from the valid alphabet
- [x] 3.9 Test determinism: `generatePage(42n) === generatePage(42n)`
- [x] 3.10 Test uniqueness: `generatePage(42n) !== generatePage(43n)`
- [x] 3.11 Test performance: `generatePage(1000000000n)` completes in under 10ms
- [x] 3.12 Test edge case: `generatePage(9007199254740991n)` returns valid page

## 4. Update existing tests and verify

- [x] 4.1 Review `src/game.test.js` "Game Engine — Page Generation" tests — may need to update assertions (page content changes but determinism/length should still hold)
- [x] 4.2 Run full test suite: `npm test` and verify all tests pass
- [x] 4.3 Verify page display in the TUI looks correct and readable
- [x] 4.4 Verify game save/load still works (no LCG state in save data needed — closed-form from scratch)
