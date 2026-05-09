import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ALPHABET } from './page.js';
import {
  geoPair,
  lcgState,
  stateToPage,
  generatePage,
  LCG_M,
  LCG_A,
  LCG_C,
} from './lcg.js';

describe('LCG — geoPair', () => {
  it('n=0 returns {sum: 0n, pow: 1n}', () => {
    const result = geoPair(44n, 0n, LCG_M);
    assert.deepStrictEqual(result, { sum: 0n, pow: 1n });
  });

  it('n=1 returns {sum: 1n, pow: 44n}', () => {
    const result = geoPair(44n, 1n, LCG_M);
    assert.deepStrictEqual(result, { sum: 1n, pow: 44n });
  });

  it('n=2 returns {sum: 45n, pow: 1936n}', () => {
    const result = geoPair(44n, 2n, LCG_M);
    // S(2) = 1 + 44 = 45
    // a^2 = 44 * 44 = 1936
    assert.deepStrictEqual(result, { sum: 45n, pow: 1936n });
  });

  it('n=3 returns {sum: 1981n, pow: 85184n}', () => {
    const result = geoPair(44n, 3n, LCG_M);
    // S(3) = 1 + 44 + 1936 = 1981
    // a^3 = 44^3 = 85184
    assert.deepStrictEqual(result, { sum: 1981n, pow: 85184n });
  });

  it('n=10 matches manual computation', () => {
    const result = geoPair(44n, 10n, LCG_M);
    // Manual: S(10) = (44^10 - 1) / 43
    const a10 = 44n ** 10n;
    const expectedSum = (a10 - 1n) / 43n;
    assert.strictEqual(result.sum, expectedSum);
    assert.strictEqual(result.pow, a10);
  });

  it('geoPair correctness: matches sequential iteration for N = 0..20', () => {
    const a = LCG_A;
    const c = LCG_C;
    const m = LCG_M;

    // Sequential iteration from X_0 = 0
    let seqState = 0n;
    for (let n = 0n; n <= 20n; n++) {
      const result = geoPair(a, n, m);
      assert.strictEqual(result.sum, seqState, `n=${n}: geoPair sum matches sequential`);
      // Next sequential state
      seqState = (a * seqState + c) % m;
    }
  });

  it('geoPair correctness: larger N matches sequential', () => {
    const a = LCG_A;
    const c = LCG_C;
    const m = LCG_M;

    let seqState = 0n;
    for (let n = 0n; n <= 100n; n++) {
      const result = geoPair(a, n, m);
      assert.strictEqual(result.sum, seqState, `n=${n}: geoPair sum matches sequential`);
      seqState = (a * seqState + c) % m;
    }
  });

  it('geoPair correctness: large N (1 billion) via modular exponentiation', () => {
    const n = 1000000000n;
    const result = geoPair(LCG_A, n, LCG_M);

    // Verify pow via BigInt modular exponentiation
    // Node.js has no built-in modPow, so use a simple binary method
    function modPow(base, exp, mod) {
      let result = 1n;
      let b = base % mod;
      let e = exp;
      while (e > 0n) {
        if (e % 2n === 1n) result = (result * b) % mod;
        b = (b * b) % mod;
        e = e / 2n;
      }
      return result;
    }

    const expectedPow = modPow(LCG_A, n, LCG_M);
    assert.strictEqual(result.pow, expectedPow);
  });
});

describe('LCG — stateToPage', () => {
  it('state 0n returns 280 spaces (first char of new alphabet)', () => {
    const page = stateToPage(0n, ALPHABET);
    assert.strictEqual(page.length, 280, 'length is 280');
    assert.strictEqual(page, ' '.repeat(280), 'all characters are space');
  });

  it('state 1n returns 279 spaces followed by "."', () => {
    const page = stateToPage(1n, ALPHABET);
    assert.strictEqual(page.length, 280);
    assert.strictEqual(page, ' '.repeat(279) + '.');
  });

  it('stateToPage length is always 280', () => {
    for (const state of [0n, 1n, 42n, 43n, 44n, 100n, 999n, 1000n]) {
      const page = stateToPage(state, ALPHABET);
      assert.strictEqual(page.length, 280, `state=${state}: length is 280`);
    }
  });

  it('all output characters are from the valid alphabet', () => {
    const alphabetSet = new Set(ALPHABET.split(''));
    for (const state of [0n, 1n, 42n, 43n, 44n, 100n, 999n, 1000n, 12345n]) {
      const page = stateToPage(state, ALPHABET);
      for (let i = 0; i < page.length; i++) {
        assert.ok(
          alphabetSet.has(page[i]),
          `state=${state}, pos=${i}: character "${page[i]}" is in alphabet`
        );
      }
    }
  });

  it('stateToPage round-trips via base-43 conversion', () => {
    // Test a few known states
    const testStates = [0n, 1n, 42n, 100n, 999n, 1000n, 12345n];
    for (const state of testStates) {
      const page = stateToPage(state, ALPHABET);
      // Re-convert page to state
      let reconstructed = 0n;
      for (let i = 0; i < page.length; i++) {
        const idx = ALPHABET.indexOf(page[i]);
        reconstructed = reconstructed * 43n + BigInt(idx);
      }
      assert.strictEqual(reconstructed, state, `state ${state} round-trips correctly`);
    }
  });
});

describe('LCG — generatePage', () => {
  it('generates deterministic page from page number', () => {
    const page1 = generatePage(1n, ALPHABET);
    const page2 = generatePage(2n, ALPHABET);

    assert.strictEqual(page1.length, 280, 'page length is 280');
    assert.notStrictEqual(page1, page2, 'different pages have different content');
  });

  it('same page number produces same content', () => {
    const page1a = generatePage(42n, ALPHABET);
    const page1b = generatePage(42n, ALPHABET);

    assert.strictEqual(page1a, page1b, 'same page number produces identical content');
  });

  it('page 0 produces valid content (all spaces)', () => {
    const page = generatePage(0n, ALPHABET);
    assert.strictEqual(page, ' '.repeat(280));
  });

  it('adjacent page numbers produce different content', () => {
    for (let n = 0n; n < 100n; n++) {
      const pageA = generatePage(n, ALPHABET);
      const pageB = generatePage(n + 1n, ALPHABET);
      assert.notStrictEqual(pageA, pageB, `n=${n}: adjacent pages differ`);
    }
  });

  it('performance: generatePage(1000000000n) completes in under 10ms', () => {
    const start = Date.now();
    const page = generatePage(1000000000n, ALPHABET);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 10, `generatePage(1e9) took ${elapsed}ms (must be < 10ms)`);
    assert.strictEqual(page.length, 280);
  });

  it('edge case: very large page number (MAX_SAFE_INTEGER) returns valid page', () => {
    const maxSafe = 9007199254740991n;
    const page = generatePage(maxSafe, ALPHABET);
    assert.strictEqual(page.length, 280);
    // Verify all characters are valid
    for (const ch of page) {
      assert.ok(ALPHABET.includes(ch), `character "${ch}" is in alphabet`);
    }
  });

  it('page numbers far apart produce different content', () => {
    const pageA = generatePage(0n, ALPHABET);
    const pageB = generatePage(1000000n, ALPHABET);
    assert.notStrictEqual(pageA, pageB);
  });
});

describe('LCG — parameters', () => {
  it('LCG_A = 44n, LCG_C = 1n', () => {
    assert.strictEqual(LCG_A, 44n);
    assert.strictEqual(LCG_C, 1n);
  });

  it('LCG_C is coprime with LCG_M', () => {
    // gcd(1, anything) = 1
    assert.strictEqual(LCG_C, 1n);
  });

  it('LCG_A - 1 = 43, which is the only prime factor of LCG_M', () => {
    assert.strictEqual(LCG_A - 1n, 43n);
    // Verify 43 is prime and divides 43^280
    assert.strictEqual(LCG_M % 43n, 0n, '43^280 is divisible by 43');
  });

  it('LCG_M = 43^280', () => {
    assert.strictEqual(LCG_M, 43n ** 280n);
  });
});
