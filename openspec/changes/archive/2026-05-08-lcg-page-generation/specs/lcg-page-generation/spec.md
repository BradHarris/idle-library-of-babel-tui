## ADDED Requirements

### Requirement: LCG parameters produce a full-period permutation over all page combinations

The system SHALL generate deterministic page content using a Linear Congruential Generator (LCG) with parameters satisfying the Hull-Dobell Theorem. The modulus `m` equals `43^280` — the total number of possible 280-character strings using the 43-character alphabet.

The LCG formula is: `X_{n+1} = (a * X_n + c) mod m`

Parameters:
- `m = 43^280` (approximately 10^458, a ~1475-bit number)
- `a = 44` (Knuth-style: `a - 1 = 43`, the only prime factor of `m`)
- `c = 1` (coprime with `m`)
- `X_0 = 0` (initial seed)

The page number `N` represents the iteration count. The LCG state at step N is computed using the closed-form jump-ahead formula (see Requirement 3) rather than sequential iteration.

#### Scenario: LCG parameters satisfy Hull-Dobell Theorem
- **WHEN** parameters `a = 44`, `c = 1`, `m = 43^280` are used
- **THEN** `gcd(c, m) = 1` (c is 1, coprime with everything)
- **AND** `a - 1 = 43`, and 43 is the only prime factor of `43^280`
- **AND** `m = 43^280` is odd, so the "divisible by 4" condition does not apply

#### Scenario: LCG produces full-period permutation
- **WHEN** the LCG is iterated `43^280` times starting from `X_0 = 0`
- **THEN** every integer value from 0 to `43^280 - 1` appears exactly once in the sequence

### Requirement: Page content is a bijection from LCG state via base-43 conversion

The `generatePage(pageNum)` function SHALL:
1. Compute the LCG state at iteration `pageNum` using the closed-form jump-ahead formula
2. Convert the LCG state to a 280-character page string by expressing the state as a 280-digit base-43 number
3. Map each base-43 digit to the corresponding character in `ALPHABET`

The conversion SHALL be: for each position from 279 down to 0, compute `digit = state mod 43`, set `chars[position] = ALPHABET[digit]`, then `state = floor(state / 43)`.

The mapping SHALL be a bijection: every state in `[0, 43^280 - 1]` maps to exactly one unique 280-character string, and every such string maps back to exactly one state.

#### Scenario: generatePage returns 280 characters
- **WHEN** `generatePage(0n)` is called
- **THEN** the result is exactly 280 characters long

#### Scenario: All characters are from the valid alphabet
- **WHEN** `generatePage(N)` is called for any non-negative page number N
- **THEN** every character in the result is in the 43-character alphabet: `abcdefghijklmnopqrstuvwxyz.,!()?0123456789 `

#### Scenario: Adjacent page numbers produce different content
- **WHEN** `generatePage(42n)` and `generatePage(43n)` are called
- **THEN** the results differ (full-period guarantee ensures no premature repetition)

### Requirement: Closed-form jump-ahead for O(log n) LCG state computation

The system SHALL compute the LCG state at iteration N in O(log N) time using the closed-form formula:

```
X_n = ((a^n - 1) / (a - 1)) mod m   (with X_0 = 0, c = 1)
```

This SHALL be computed using:
- **Modular exponentiation** for `a^n mod m` (O(log n) steps)
- **Binary splitting** for the geometric series sum `1 + a + a^2 + ... + a^(n-1)` (O(log n) steps), used instead of modular inverse since `a - 1 = 43` divides `m = 43^280`

The `geoPair(base, n, mod)` function SHALL return both `S(n) mod m` (the geometric sum) and `base^n mod m` simultaneously to avoid redundant computation.

#### Scenario: Jump-ahead matches sequential iteration
- **WHEN** `geoPair(44n, N, 43n ** 280n)` returns `{sum, pow}` for any N
- **THEN** `sum` equals the LCG state `X_N` obtained by iteratively applying `X_{k+1} = (44 * X_k + 1) mod m` exactly N times from `X_0 = 0`

#### Scenario: Large page number computes in bounded time
- **WHEN** `generatePage(1000000000n)` (1 billion pages) is called
- **THEN** the function returns a result in under 10ms on standard hardware

#### Scenario: geoPair is correct for small values
- **WHEN** `geoPair(44n, 0, 43n ** 280n)` is called
- **THEN** it returns `{ sum: 0n, pow: 1n }`

#### Scenario: geoPair is correct for n=1
- **WHEN** `geoPair(44n, 1, 43n ** 280n)` is called
- **THEN** it returns `{ sum: 1n, pow: 44n }`

#### Scenario: geoPair is correct for n=2
- **WHEN** `geoPair(44n, 2, 43n ** 280n)` is called
- **THEN** it returns `{ sum: 45n, pow: 1936n }` (S(2) = 1+44 = 45, a^2 = 1936)

### Requirement: BigInt page number support

The `generatePage` function SHALL accept `bigint` page numbers. Internally, all LCG arithmetic uses JavaScript `BigInt` to handle the ~1475-bit modulus `43^280`.

#### Scenario: Zero page number produces valid content
- **WHEN** `generatePage(0n)` is called
- **THEN** the function returns a 280-character string using the initial state `X_0 = 0` (all zeros in base-43, mapping to the first character of the alphabet repeated)

#### Scenario: Large page numbers are handled correctly
- **WHEN** `generatePage(9007199254740991n)` (Number.MAX_SAFE_INTEGER) is called
- **THEN** the function returns a valid 280-character page string without error

### Requirement: Deterministic page generation

The `generatePage(pageNum)` function SHALL produce identical output for identical inputs, regardless of game state, elapsed time, or call order.

#### Scenario: Same page number produces identical content
- **WHEN** `generatePage(12345n)` is called twice
- **THEN** both calls return the exact same 280-character string

#### Scenario: Page generation is independent of game state
- **WHEN** `generatePage(999n)` is called with 0 workers, 1000 workers, and after reset
- **THEN** all three calls return the identical result
