/**
 * Decimal: an immutable big number stored as mantissa × 10^exponent.
 *
 * Plain JS numbers lose integer precision past 2^53 (~9e15) and overflow to
 * Infinity past ~1.8e308. Idle-game values (money, workers, prices,
 * multipliers) outgrow both, and many are fractional, so bigint doesn't fit
 * either. A Decimal keeps ~15 significant digits over an exponent range of
 * ±9e15 — plenty for anything the game can reach.
 *
 * Invariants: `m` is 0, or 1 ≤ |m| < 10; `e` is an integer (0 when m is 0).
 * Values are never mutated; every operation returns a new Decimal.
 */

export type DecimalSource = Decimal | number | bigint;

/** Beyond this many orders of magnitude apart, adding the smaller changes nothing. */
const MAX_DIGITS = 17;

export class Decimal {
  readonly m: number;
  readonly e: number;

  private constructor(m: number, e: number) {
    this.m = m;
    this.e = e;
  }

  /**
   * Marks Decimals as opaque values: Solid stores wrap anything that stringifies
   * as "[object Object]" in a proxy, which we don't want for an immutable number.
   */
  get [Symbol.toStringTag](): string {
    return 'Decimal';
  }

  static readonly ZERO = new Decimal(0, 0);
  static readonly ONE = new Decimal(1, 0);

  /** Build from mantissa and exponent, normalising the mantissa into [1, 10). */
  static fromParts(m: number, e: number): Decimal {
    if (m === 0 || !Number.isFinite(m)) {
      if (Number.isNaN(m)) throw new RangeError('Decimal: NaN');
      if (m === 0) return Decimal.ZERO;
      throw new RangeError('Decimal: infinite mantissa');
    }
    const shift = Math.floor(Math.log10(Math.abs(m)));
    let mantissa = m / 10 ** shift;
    let exponent = e + shift;
    // Float error can leave the mantissa just outside [1, 10)
    if (Math.abs(mantissa) >= 10) {
      mantissa /= 10;
      exponent += 1;
    } else if (Math.abs(mantissa) < 1) {
      mantissa *= 10;
      exponent -= 1;
    }
    return new Decimal(mantissa, exponent);
  }

  static from(x: DecimalSource): Decimal {
    if (x instanceof Decimal) return x;
    if (typeof x === 'bigint') return Decimal.fromBigInt(x);
    if (Number.isNaN(x)) throw new RangeError('Decimal: NaN');
    if (!Number.isFinite(x)) throw new RangeError('Decimal: infinite number');
    return x === 0 ? Decimal.ZERO : Decimal.fromParts(x, 0);
  }

  static fromBigInt(x: bigint): Decimal {
    if (x === 0n) return Decimal.ZERO;
    const negative = x < 0n;
    const digits = (negative ? -x : x).toString();
    const head = Number(`${digits[0]}.${digits.slice(1, MAX_DIGITS)}`);
    return Decimal.fromParts(negative ? -head : head, digits.length - 1);
  }

  /** 10^exponent. */
  static pow10(exponent: number): Decimal {
    return new Decimal(1, Math.floor(exponent)).mul(10 ** (exponent - Math.floor(exponent)));
  }

  isZero(): boolean {
    return this.m === 0;
  }

  sign(): -1 | 0 | 1 {
    return this.m === 0 ? 0 : this.m > 0 ? 1 : -1;
  }

  neg(): Decimal {
    return this.m === 0 ? this : new Decimal(-this.m, this.e);
  }

  abs(): Decimal {
    return this.m < 0 ? this.neg() : this;
  }

  add(other: DecimalSource): Decimal {
    const b = Decimal.from(other);
    if (b.m === 0) return this;
    if (this.m === 0) return b;
    // Within the float range, add as plain numbers: exact wherever a JS number is
    // (100 − 80 = 20), where aligning mantissas (1.0 − 0.8) would add float error
    if (Math.abs(this.e) < 300 && Math.abs(b.e) < 300) return Decimal.from(this.toNumber() + b.toNumber());
    const [big, small] = this.e >= b.e ? [this, b] : [b, this];
    const gap = big.e - small.e;
    if (gap > MAX_DIGITS) return big;
    return Decimal.fromParts(big.m + small.m / 10 ** gap, big.e);
  }

  sub(other: DecimalSource): Decimal {
    return this.add(Decimal.from(other).neg());
  }

  mul(other: DecimalSource): Decimal {
    const b = Decimal.from(other);
    if (this.m === 0 || b.m === 0) return Decimal.ZERO;
    return Decimal.fromParts(this.m * b.m, this.e + b.e);
  }

  div(other: DecimalSource): Decimal {
    const b = Decimal.from(other);
    if (b.m === 0) throw new RangeError('Decimal: division by zero');
    if (this.m === 0) return Decimal.ZERO;
    return Decimal.fromParts(this.m / b.m, this.e - b.e);
  }

  /** this^power, for a non-negative base. */
  pow(power: number): Decimal {
    if (power === 0) return Decimal.ONE;
    if (this.m === 0) return Decimal.ZERO;
    if (this.m < 0) throw new RangeError('Decimal: pow of a negative base');
    // Exact path for small results keeps e.g. 1.5^2 = 2.25 free of log rounding
    const direct = this.toNumber() ** power;
    if (Number.isFinite(direct) && direct !== 0 && Math.abs(Math.log10(direct)) < 300) return Decimal.from(direct);
    return Decimal.pow10(power * this.log10());
  }

  /** log10 of a positive value, as a plain number. */
  log10(): number {
    if (this.m <= 0) throw new RangeError('Decimal: log10 of a non-positive value');
    return this.e + Math.log10(this.m);
  }

  cmp(other: DecimalSource): -1 | 0 | 1 {
    const b = Decimal.from(other);
    if (this.m === b.m && this.e === b.e) return 0;
    const sa = this.sign();
    const sb = b.sign();
    if (sa !== sb) return sa > sb ? 1 : -1;
    // Same sign, both non-zero: compare magnitudes, flipping for negatives
    const magnitude = this.e !== b.e ? (this.e > b.e ? 1 : -1) : Math.abs(this.m) > Math.abs(b.m) ? 1 : -1;
    return (sa > 0 ? magnitude : -magnitude) as -1 | 1;
  }

  eq(other: DecimalSource): boolean {
    return this.cmp(other) === 0;
  }
  lt(other: DecimalSource): boolean {
    return this.cmp(other) < 0;
  }
  lte(other: DecimalSource): boolean {
    return this.cmp(other) <= 0;
  }
  gt(other: DecimalSource): boolean {
    return this.cmp(other) > 0;
  }
  gte(other: DecimalSource): boolean {
    return this.cmp(other) >= 0;
  }

  static max(a: DecimalSource, b: DecimalSource): Decimal {
    const x = Decimal.from(a);
    const y = Decimal.from(b);
    return x.gte(y) ? x : y;
  }

  static min(a: DecimalSource, b: DecimalSource): Decimal {
    const x = Decimal.from(a);
    const y = Decimal.from(b);
    return x.lte(y) ? x : y;
  }

  /** Round down to an integer. Values past ~1e16 have no fractional digits left and are returned as is. */
  floor(): Decimal {
    if (this.e >= 16) return this;
    return Decimal.from(Math.floor(this.toNumber()));
  }

  /** Round up to an integer. */
  ceil(): Decimal {
    if (this.e >= 16) return this;
    return Decimal.from(Math.ceil(this.toNumber()));
  }

  /** As a plain number: may lose precision, and is ±Infinity past ~1.8e308. */
  toNumber(): number {
    if (this.e > 308) return this.m > 0 ? Infinity : -Infinity;
    if (this.e < -324) return 0;
    // Parsing "m e e" rounds correctly, unlike m * 10 ** e (1.23456789 * 1e8 = 123456788.99999999)
    return Number(`${this.m}e${this.e}`);
  }

  /** The integer part as a bigint (exact up to the ~15 significant digits kept). */
  toBigInt(): bigint {
    if (this.m === 0 || this.e < 0) return 0n;
    if (this.e < 15) return BigInt(Math.trunc(this.toNumber()));
    const digits = BigInt(Math.trunc(this.m * 1e15));
    return digits * 10n ** BigInt(this.e - 15);
  }

  toString(): string {
    return this.e >= -6 && this.e < 21 ? String(this.toNumber()) : `${this.m}e${this.e}`;
  }

  /**
   * Throws, so `a < b`, `a + b` or `Math.max(a, b)` on Decimals fail loudly
   * instead of silently comparing NaN. Use cmp/lt/add/Decimal.max instead.
   */
  valueOf(): never {
    throw new TypeError('Decimal: use lt/gt/add/... instead of operators or Math functions');
  }

  toJSON(): string {
    return this.toString();
  }
}

/** Shorthand for Decimal.from. */
export const D = (x: DecimalSource): Decimal => Decimal.from(x);
