import { Decimal, type DecimalSource } from './bignum.js';
import type { LocationTuple } from './types.js';

/**
 * Number formatting. Every number the player sees goes through formatNumber,
 * so all values read the same way however large they get:
 * - below 1,000: plain (integers, or a fixed number of decimals for rates)
 * - 1K up to 999.99T: suffixes with 2 decimals ("1.50K", "12.30M")
 * - from 1e15 up: scientific with 2 decimals ("1.23e45"), never long digit strings
 */

const SUFFIXES = ['', 'K', 'M', 'B', 'T'];

export interface FormatOptions {
  /** Decimals shown below 1,000 (default 0: integer counts). */
  decimals?: number;
}

export function formatNumber(value: DecimalSource, { decimals = 0 }: FormatOptions = {}): string {
  const x = Decimal.from(value);
  if (x.sign() < 0) return '-' + formatNumber(x.neg(), { decimals });
  if (x.isZero()) return (0).toFixed(decimals);

  if (x.e < 3) {
    const n = x.toNumber();
    const shown = decimals === 0 ? String(Math.floor(n)) : n.toFixed(decimals);
    // 999.996 with 2 decimals rounds to 1000.00: carry into the suffix range instead
    if (Number(shown) < 1000) return shown;
  }

  let group = Math.max(1, Math.floor(x.e / 3));
  if (group < SUFFIXES.length) {
    let scaled = x.div(Decimal.fromParts(1, group * 3)).toNumber();
    if (Number(scaled.toFixed(2)) >= 1000) {
      group += 1;
      scaled /= 1000;
    }
    if (group < SUFFIXES.length) return scaled.toFixed(2) + SUFFIXES[group];
  }

  // Scientific: 9.995e20 rounds to "10.00": carry into the exponent
  let mantissa = Number(x.m.toFixed(2));
  let exponent = x.e;
  if (mantissa >= 10) {
    mantissa /= 10;
    exponent += 1;
  }
  return `${mantissa.toFixed(2)}e${exponent}`;
}

/** A whole-number count (workers, items). */
export function formatCount(value: DecimalSource): string {
  return formatNumber(value);
}

/** A rate or amount that can be fractional: always 2 decimals below 1,000 ("1.05", "0.05"). */
export function formatRate(value: DecimalSource): string {
  return formatNumber(value, { decimals: 2 });
}

/** A multiplier, e.g. "×1.05". */
export function formatMultiplier(value: DecimalSource): string {
  return '×' + formatRate(value);
}

/** Money: "$" + a whole-dollar amount. */
export function formatMoney(value: DecimalSource): string {
  return '$' + formatNumber(value);
}

/** A price: like formatMoney, but rounded up so it never reads as cheaper than it is. */
export function formatPrice(value: DecimalSource): string {
  return formatMoney(Decimal.from(value).ceil());
}

/**
 * Format a page number: exact with commas up to 15 digits (999 trillion),
 * then scientific like every other large number.
 */
export function formatPageNumber(page: bigint): string {
  const str = page.toString();
  if (str.length > 15) return formatNumber(page);
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format pages per second with 2 decimal places.
 */
export function formatPagesPerSecond(pps: DecimalSource): string {
  return formatRate(pps);
}

/**
 * Map from location tier id to display label (singular form).
 */
const LOCATION_LABELS: Record<string, string> = {
  hardDrive: 'Drive',
  server: 'Server',
  serverRack: 'Rack',
  serverFloor: 'Floor',
  building: 'Building',
  city: 'City',
  planet: 'Planet',
  solarSystem: 'Solar System',
  galaxy: 'Galaxy',
  universe: 'Universe',
};

/**
 * Format a location tuple as a comma-separated string showing non-zero levels
 * from highest to lowest. Example: "Building 12, Floor 3, Rack 7, Server 2, Drive 0".
 */
export function formatLocationDisplay(location: LocationTuple): string {
  const parts: string[] = [];
  // Iterate from highest tier to lowest (reverse of STORAGE_TIERS order)
  const tierIds = Object.keys(LOCATION_LABELS);
  for (let i = tierIds.length - 1; i >= 0; i--) {
    const id = tierIds[i]!;
    const value = location[id];
    if (value !== undefined && (value > 0n || id === 'hardDrive')) {
      parts.push(`${LOCATION_LABELS[id]} ${formatPageNumber(value)}`);
    }
  }
  return parts.length > 0 ? parts.join(', ') : 'Drive 0';
}

/**
 * Wrap a string into lines of a given width at character boundaries.
 */
export function wrapText(text: string, width: number): string[] {
  if (!text) return [''];
  if (text.length <= width) return [text];
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += width) {
    lines.push(text.slice(i, i + width));
  }
  return lines;
}

/** A length of time for messages: "20h 4m", "42m 17s", "9s". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

/** A countdown clock: "42:17", or "1:00:00" from an hour up. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
