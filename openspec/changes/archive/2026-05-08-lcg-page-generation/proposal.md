## Why

The current page generation uses a hash of the page number as a seed for a PRNG (Mulberry32). This produces deterministic but unpredictable content — adjacent page numbers have no relationship in their content. Switching to a Linear Congruential Generator (LCG) with full-period guarantees makes the page number itself part of a deterministic permutation cycle, ensuring every possible page content is visited exactly once before any repetition. Using the closed-form jump-ahead formula, page content is computed in O(log n) time directly, without iterating through intermediate states.

## What Changes

- Replace `deriveSeed()` (SHA-256 hash + 32-bit truncation) with an LCG with modulus `m = 43^280` (all possible page combinations)
- Replace `mulberry32()` PRNG with LCG closed-form computation: `X_n = (a^n - 1) / (a - 1) mod m`, computed via modular exponentiation and binary splitting
- Generate page content by converting the LCG state from big integer to base-43, mapping each digit to the alphabet
- Remove checkpoint/resume logic (no longer needed — O(log n) computation from scratch is fast enough)

## Capabilities

### New Capabilities
- `lcg-page-generation`: Deterministic page content derived via a full-period LCG with modulus `43^280` using O(log n) closed-form jump-ahead. Every possible 280-character page content is visited exactly once before any repetition.

### Modified Capabilities
<!-- None — existing page-generation spec covers game mechanics (cascade, pps), not content generation algorithm -->

## Impact

- **Affected files**: `src/lcg.js` (new), `src/page.js` (rewritten), `src/lcg.test.js` (new)
- **No API changes**: `generatePage(pageNum: bigint)` signature stays the same
- **No spec-level behavior changes** for the game: pages are still deterministic, still 280 characters, still use the same alphabet
- **No breaking changes for saved data**: page content is purely cosmetic; the page number sequence itself is unchanged
