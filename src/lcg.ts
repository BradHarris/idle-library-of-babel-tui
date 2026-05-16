/**
 * Linear Congruential Generator (LCG) with full-period over all page combinations.
 *
 * Modulus: m = 43^280  (every possible 280-char string, ~10^458)
 * Multiplier: a = 44    (a - 1 = 43, the only prime factor of m)
 * Increment: c = 1      (coprime with m)
 *
 * Hull-Dobell Theorem satisfied:
 *   gcd(c, m) = 1  ✓
 *   a - 1 = 43 divides 43^280  ✓
 *   m is odd → "divisible by 4" condition does not apply  ✓
 *
 * Closed-form jump-ahead: X_n = geoPair(44, n, m).sum
 *   O(log n) via binary splitting geometric series.
 */

/** Total page combination space: 43^280 */
export const LCG_M: bigint = 43n ** 280n;

/** LCG multiplier: a = 44 */
export const LCG_A: bigint = 44n;

/** LCG increment: c = 1 */
export const LCG_C: bigint = 1n;

/**
 * Binary splitting to compute the geometric series sum and power simultaneously.
 *
 * Returns { sum, pow } where:
 *   sum = (1 + base + base^2 + ... + base^(n-1)) mod mod  (= S(n))
 *   pow = base^n mod mod
 *
 * Uses the identities:
 *   S(2k) = (1 + a^k) * S(k)
 *   a^(2k) = (a^k)^2
 *
 * O(log n) recursive steps, all modular arithmetic.
 */
export function geoPair(base: bigint, n: bigint, mod: bigint): { sum: bigint; pow: bigint } {
  if (n === 0n) return { sum: 0n, pow: 1n };
  if (n === 1n) return { sum: 1n, pow: base % mod };

  const half = geoPair(base, n / 2n, mod);

  if (n % 2n === 0n) {
    // Even: n = 2k
    // S(2k) = (1 + a^k) * S(k)
    // a^(2k) = (a^k)^2
    return {
      sum: (half.sum * (1n + half.pow)) % mod,
      pow: (half.pow * half.pow) % mod,
    };
  } else {
    // Odd: n = 2k + 1
    // S(2k+1) = S(2k) + a^(2k)
    // a^(2k+1) = a^(2k) * a
    const sumEven = (half.sum * (1n + half.pow)) % mod;
    const powEven = (half.pow * half.pow) % mod;
    return {
      sum: (sumEven + powEven) % mod,
      pow: (powEven * base) % mod,
    };
  }
}

/**
 * Compute the LCG state at iteration `pageNum` using closed-form jump-ahead.
 *
 * X_n = ((a^n - 1) / (a - 1)) mod m   (with X_0 = 0, c = 1)
 *       = geoPair(a, n, m).sum
 */
export function lcgState(pageNum: bigint): bigint {
  if (pageNum === 0n) return 0n;
  return geoPair(LCG_A, pageNum, LCG_M).sum;
}

/**
 * Convert an LCG state (big integer) to a 280-character page string.
 *
 * Converts the state to base-43, then maps each digit to a character
 * in the 43-character alphabet. This is a perfect bijection between
 * [0, 43^280 - 1] and all possible 280-character strings.
 */
export function stateToPage(state: bigint, alphabet: string): string {
  const chars = new Array<string>(280);
  let temp = state;
  for (let i = 279; i >= 0; i--) {
    chars[i] = alphabet[Number(temp % 43n)]!;
    temp = temp / 43n;
  }
  return chars.join('');
}
