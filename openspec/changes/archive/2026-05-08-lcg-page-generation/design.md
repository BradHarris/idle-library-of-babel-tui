## Context

The current `src/page.js` generates deterministic page content using a two-step process:
1. Hash the page number with SHA-256 and truncate to 32 bits → seed
2. Use that seed with Mulberry32 PRNG to generate 280 random alphabet indices

This approach is fast and produces good-looking pages, but the page number has no structural relationship to the content — it's purely a hash input.

## Goals / Non-Goals

**Goals:**
- Replace hash+PRNG with LCG-based generation using the Hull-Dobell Theorem for full-period guarantees
- Modulus = total page combination space (`43^280`) — every possible 280-character string is visited exactly once before any repetition
- Compute page content in O(log n) time using the closed-form jump-ahead formula — no sequential iteration
- Maintain deterministic output: `generatePage(N)` always returns the same content
- Keep the same API: `generatePage(pageNum: bigint): string`

**Non-Goals:**
- Changing page length (stays 280)
- Changing the alphabet (stays 43 characters)
- Changing game mechanics or page number progression
- Checkpoint/resume (unnecessary with O(log n) closed-form computation)

## Architecture

### LCG Parameters

The LCG formula: `X_{n+1} = (a * X_n + c) mod m`

**Modulus `m`**: `43^280` — the total number of possible 280-character strings using the 43-character alphabet. This equals approximately `10^458`, a ~1475-bit number.

**Multiplier `a` and increment `c`**: Selected per the Hull-Dobell Theorem for modulus `m = 43^280`:
- `m = 43^280` — 43 is prime, so `m` has exactly one prime factor: 43
- Hull-Dobell requires:
  1. `gcd(c, m) = 1` → `c` must not be divisible by 43
  2. `a - 1` must be divisible by every prime factor of `m` → `a - 1` must be divisible by 43
  3. If `m` is divisible by 4, then `a - 1` must be divisible by 4 → `43^280` is odd, so this doesn't apply
- **Chosen `a = 44`**: `a - 1 = 43`, divisible by 43 ✓
- **Chosen `c = 1`**: `gcd(1, m) = 1` ✓

LCG parameters:
- `m = 43^280` (~10^458, 1475-bit number)
- `a = 44` (`a - 1 = 43`, the only prime factor of m)
- `c = 1` (coprime with m)
- `X_0 = 0` (initial seed)

### Closed-Form Jump-Ahead Formula

For an LCG, the value at any step n can be computed directly without iterating:

```
X_n = (a^n * X_0 + c * (a^n - 1) / (a - 1)) mod m
```

With `X_0 = 0` and `c = 1`:

```
X_n = ((a^n - 1) / (a - 1)) mod m
    = (1 + a + a^2 + ... + a^(n-1)) mod m   (geometric series sum)
```

### Computing the Geometric Series Sum

Since `a - 1 = 43` and `m = 43^280`, they are NOT coprime — 43 divides m. We cannot use a modular inverse to compute `(a^n - 1) / (a - 1) mod m`. Instead, we compute the geometric series sum directly using **binary splitting** in O(log n) time:

```
geoPair(a, n, m):
  // Returns {sum: S(n) mod m, pow: a^n mod m}
  // where S(n) = 1 + a + a^2 + ... + a^(n-1)

  if n == 0: return { sum: 0n, pow: 1n }
  if n == 1: return { sum: 1n, pow: a % m }

  half = geoPair(a, n / 2, m)   // integer division for BigInt

  if n is even:
    // S(2k) = (1 + a^k) * S(k)
    // a^(2k) = (a^k)^2
    return {
      sum: (half.sum * (1n + half.pow)) % m,
      pow: (half.pow * half.pow) % m
    }
  else:
    // S(2k+1) = S(2k) + a^(2k)
    // a^(2k+1) = a^(2k) * a
    sumEven = (half.sum * (1n + half.pow)) % m
    powEven = (half.pow * half.pow) % m
    return {
      sum: (sumEven + powEven) % m,
      pow: (powEven * a) % m
    }
```

The identities used:
- `S(2k) = (1 + a^k) * S(k)` — split the sum into two halves, factor out `a^k` from the second half
- `a^(2k) = (a^k)^2` — square the half-power

All operations are modulo `m`, and all identities hold in any ring.

### Base-43 Conversion as Content Generation

The LCG state `X_n` is a big integer in range `[0, 43^280 - 1]`. Converting this to base-43 produces exactly 280 "digits", each in range `[0, 42]`. Mapping each digit to `ALPHABET[digit]` gives a deterministic 280-character page.

This is a perfect bijection: every big integer in `[0, 43^280 - 1]` maps to exactly one unique 280-character string, and every such string maps back to a unique big integer.

```
stateToPage(state):
  chars = new Array(280)
  temp = state
  for pos from 279 down to 0:
    chars[pos] = ALPHABET[Number(temp % 43n)]
    temp = temp / 43n   // BigInt integer division
  return chars.join('')
```

### Full Algorithm

```
function generatePage(pageNum):
  if pageNum == 0n:
    return stateToPage(0n)  // all zeros → first alphabet char repeated

  result = geoPair(44n, pageNum, 43n ** 280n)
  state = result.sum   // this is X_n
  return stateToPage(state)
```

### Performance

For `n = 10^9` (one billion pages):
- Binary splitting does `log2(10^9) ≈ 30` recursive calls
- Each call performs 2-3 BigInt multiplications of ~1475-bit numbers
- JavaScript BigInt uses Karatsuba multiplication for large numbers
- Total time: well under 1ms

No checkpoint/resume needed — O(log n) from scratch is fast enough for any page count.

### Implementation Plan

1. **`src/lcg.js` (new file)**: LCG core logic
   - `LCG_M = 43n ** 280n` — constant modulus
   - `geoPair(base, n, mod)` — binary splitting geometric series with power computation
   - `lcgState(pageNum)` → `{sum, pow}` pair (returns full LCG state at page N)
   - `stateToPage(state)` — convert big integer state to 280-char page via base-43
   - `generatePage(pageNum)` — compose geoPair + stateToPage

2. **`src/page.js` (modified)**: Replace hash+PRNG with LCG
   - Remove `createHash` import and `mulberry32` function
   - Remove `deriveSeed` function
   - Replace `generatePage` to use LCG-based generation
   - Keep the same `ALPHABET` constant and `PAGE_LENGTH = 280`

3. **`src/lcg.test.js` (new)**: Tests for LCG correctness
   - Verify `geoPair` correctness against manual iteration for small values
   - Verify base-43 conversion round-trips correctly
   - Verify determinism and uniqueness
   - Verify performance: `generatePage(1000000000n)` completes in under 10ms

4. **`src/gameStore.ts`**: No changes needed (API surface unchanged)

## Decision Notes

**Why `m = 43^280`?**
The total number of possible 280-character strings using a 43-character alphabet. A full-period LCG with this modulus guarantees every possible page content is visited exactly once before any repetition.

**Why `a = 44` and `c = 1`?**
Smallest valid Hull-Dobell parameters for `m = 43^280`:
- `a = 44`: `a - 1 = 43`, the only prime factor of `43^280`
- `c = 1`: coprime with any modulus
- Simplest LCG formula: `X_{n+1} = (44 * X_n + 1) mod m`

**Why closed-form jump-ahead?**
- O(log n) instead of O(n) — computes any page in milliseconds regardless of page number
- No checkpoint/resume needed — simpler implementation, no save/load complexity
- Same mathematical guarantees as sequential iteration
- Used by production libraries like PCG for parallel/streamed random number generation

**Why binary splitting instead of modular inverse?**
`(a - 1) = 43` divides `m = 43^280`, so 43 has no modular inverse modulo `43^280`. Binary splitting computes the geometric series sum directly without division, avoiding this issue entirely.

**Why base-43 conversion for content?**
Natural, lossless bijection between the LCG state (big integer in `[0, 43^280 - 1]`) and page content (280 characters from a 43-character alphabet). No PRNG needed — the LCG state itself encodes the page content directly.
