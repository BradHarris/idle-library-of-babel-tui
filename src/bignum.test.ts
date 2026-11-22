import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { D, Decimal } from './bignum.js';

const close = (a: Decimal, b: number | Decimal, digits = 12) => {
  const x = Decimal.from(b);
  if (x.isZero()) return assert.ok(a.isZero(), `${a} ≈ 0`);
  assert.strictEqual(a.e, x.e, `exponent of ${a} vs ${x}`);
  assert.ok(Math.abs(a.m - x.m) < 10 ** -digits * 10, `${a} ≈ ${x}`);
};

describe('Decimal', () => {
  it('normalises the mantissa into [1, 10)', () => {
    const x = D(12345);
    assert.strictEqual(x.e, 4);
    assert.ok(Math.abs(x.m - 1.2345) < 1e-12);
    assert.deepStrictEqual([D(0).m, D(0).e], [0, 0]);
    assert.strictEqual(D(0.05).e, -2);
  });

  it('does exact-enough arithmetic on small numbers', () => {
    close(D(1.5).add(2.25), 3.75);
    close(D(10).sub(2.5), 7.5);
    close(D(1.15).mul(10), 11.5);
    close(D(1).div(4), 0.25);
    assert.strictEqual(D(1.5).pow(2).toNumber(), 2.25);
  });

  it('goes far beyond the float range', () => {
    const huge = D(1e300).mul(1e300);
    assert.strictEqual(huge.e, 600);
    close(huge.div(1e300), 1e300);
    close(D(10).pow(1000), Decimal.fromParts(1, 1000));
    close(D(2.5).pow(400), Decimal.pow10(400 * Math.log10(2.5)));
    assert.strictEqual(huge.toNumber(), Infinity);
  });

  it('adding a far smaller value is a no-op', () => {
    assert.ok(Decimal.fromParts(1, 50).add(1).eq(Decimal.fromParts(1, 50)));
    const huge = Decimal.fromParts(1, 400);
    assert.strictEqual(huge.add(1), huge);
    close(huge.add(Decimal.fromParts(5, 399)), Decimal.fromParts(1.5, 400));
  });

  it('compares across signs and exponents', () => {
    assert.ok(D(2).gt(1));
    assert.ok(D(1e20).gt(9e19));
    assert.ok(D(-5).lt(1));
    assert.ok(D(-5).lt(-1));
    assert.ok(D(3).eq(3));
    assert.ok(D(0).lt(0.001));
    assert.ok(Decimal.fromParts(1, 400).gt(Decimal.fromParts(9, 399)));
    assert.ok(Decimal.max(1, 2).eq(2));
    assert.ok(Decimal.min(1, 2).eq(1));
  });

  it('adds ordinary values exactly', () => {
    assert.strictEqual(D(100).sub(80).toNumber(), 20);
    assert.strictEqual(D(0.1).add(0.2).toNumber(), 0.1 + 0.2);
  });

  it('subtracting to zero gives exactly zero', () => {
    assert.ok(D(11.5).sub(11.5).isZero());
  });

  it('round-trips bigint, keeping 15+ significant digits', () => {
    assert.strictEqual(D(123_456_789n).toBigInt(), 123_456_789n);
    const big = 10n ** 60n * 7n;
    assert.strictEqual(D(big).toBigInt(), big);
    const digits = 123456789012345678901234567890n;
    assert.strictEqual(D(digits).toBigInt().toString().slice(0, 15), digits.toString().slice(0, 15));
    assert.strictEqual(D(-42n).toNumber(), -42);
  });

  it('floors and ceils', () => {
    assert.strictEqual(D(11.5).floor().toNumber(), 11);
    assert.strictEqual(D(11.5).ceil().toNumber(), 12);
    const huge = Decimal.fromParts(1.5, 40);
    assert.strictEqual(huge.floor(), huge);
  });

  it('log10 and pow10 are inverses', () => {
    assert.ok(Math.abs(D(1234).log10() - Math.log10(1234)) < 1e-12);
    close(Decimal.pow10(Decimal.fromParts(3.3, 500).log10()), Decimal.fromParts(3.3, 500));
  });

  it('rejects NaN and Infinity', () => {
    assert.throws(() => D(NaN));
    assert.throws(() => D(Infinity));
    assert.throws(() => D(1).div(0));
  });
});
