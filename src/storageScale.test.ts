import { computeStorageScale, pageOffsetFromLocation, locationFromPageOffset } from './storageScale.js';
import { STORAGE_TIERS } from './config.js';
import type { LocationTuple } from './types.js';

function stringify(val: unknown): string {
  return JSON.stringify(val, (_: string, v: unknown) => (typeof v === 'bigint' ? v.toString() + 'n' : v));
}

interface ScaleEntry {
  name: string;
  emoji: string;
  count: bigint;
}

function test(name: string, fn: ((...args: any[]) => any) | (() => boolean), args: any[], expected: any): void {
  const result = typeof fn === 'function' ? (fn as (...args: any[]) => any)(...args) : fn;
  let match: boolean;
  if (Array.isArray(result) && Array.isArray(expected)) {
    match = stringify(result) === stringify(expected);
  } else {
    match = String(result) === String(expected);
  }
  if (match) {
    passed++;
    console.log(`  ✓ ${name}(${args.map(a => String(a)).join(', ')})`);
  } else {
    failed++;
    console.log(`  ✗ ${name}(${args.map(a => String(a)).join(', ')}) = ${stringify(result)} (expected ${stringify(expected)})`);
  }
}

let passed = 0;
let failed = 0;

// Pages per 32TB drive constant
const PAGES_PER_DRIVE = (32n * 1024n ** 4n) / 280n; // 125,658,471,745

function makeLocation(partial: Record<string, bigint>): LocationTuple {
  const loc: LocationTuple = {};
  for (const tier of STORAGE_TIERS) {
    loc[tier.id] = partial[tier.id] ?? 0n;
  }
  return loc;
}

const STORAGE_TIERS_KEYS = STORAGE_TIERS.map(t => t.id);

function equalLoc(a: LocationTuple, b: LocationTuple): boolean {
  for (const key of STORAGE_TIERS_KEYS) {
    if ((a[key] || 0n) !== (b[key] || 0n)) return false;
  }
  return true;
}

// Zero pages — all tiers show 0
test('zero pages', computeStorageScale, [0n], [
  { name: 'Enterprise Hard Drives',   emoji: '💾',  count: 0n },
  { name: 'Servers',                  emoji: '🖥️',  count: 0n },
  { name: 'Server Racks',             emoji: '🗄️',  count: 0n },
  { name: 'Server Floors',            emoji: '🏢',  count: 0n },
  { name: 'Buildings',                emoji: '🏗️',  count: 0n },
  { name: 'Cities',                   emoji: '🌆',  count: 0n },
  { name: 'Planets',                  emoji: '🌍',  count: 0n },
  { name: 'Solar Systems',            emoji: '🪐',  count: 0n },
  { name: 'Galaxies',                 emoji: '🌌',  count: 0n },
  { name: 'Universes',                emoji: '🔭',  count: 0n },
] as ScaleEntry[]);

// 1 page — still 0 full hard drives (each holds 125,658,471,745 pages)
test('1 page', computeStorageScale, [1n], [
  { name: 'Enterprise Hard Drives',   emoji: '💾',  count: 0n },
  { name: 'Servers',                  emoji: '🖥️',  count: 0n },
  { name: 'Server Racks',             emoji: '🗄️',  count: 0n },
  { name: 'Server Floors',            emoji: '🏢',  count: 0n },
  { name: 'Buildings',                emoji: '🏗️',  count: 0n },
  { name: 'Cities',                   emoji: '🌆',  count: 0n },
  { name: 'Planets',                  emoji: '🌍',  count: 0n },
  { name: 'Solar Systems',            emoji: '🪐',  count: 0n },
  { name: 'Galaxies',                 emoji: '🌌',  count: 0n },
  { name: 'Universes',                emoji: '🔭',  count: 0n },
] as ScaleEntry[]);

// Exactly 1 hard drive filled
test('exactly 1 hard drive', computeStorageScale, [PAGES_PER_DRIVE], [
  { name: 'Enterprise Hard Drives',   emoji: '💾',  count: 1n },
  { name: 'Servers',                  emoji: '🖥️',  count: 0n },
  { name: 'Server Racks',             emoji: '🗄️',  count: 0n },
  { name: 'Server Floors',            emoji: '🏢',  count: 0n },
  { name: 'Buildings',                emoji: '🏗️',  count: 0n },
  { name: 'Cities',                   emoji: '🌆',  count: 0n },
  { name: 'Planets',                  emoji: '🌍',  count: 0n },
  { name: 'Solar Systems',            emoji: '🪐',  count: 0n },
  { name: 'Galaxies',                 emoji: '🌌',  count: 0n },
  { name: 'Universes',                emoji: '🔭',  count: 0n },
] as ScaleEntry[]);

// 2 hard drives — 2/20 = 0 servers
test('2 hard drives', computeStorageScale, [PAGES_PER_DRIVE * 2n], [
  { name: 'Enterprise Hard Drives',   emoji: '💾',  count: 2n },
  { name: 'Servers',                  emoji: '🖥️',  count: 0n },
  { name: 'Server Racks',             emoji: '🗄️',  count: 0n },
  { name: 'Server Floors',            emoji: '🏢',  count: 0n },
  { name: 'Buildings',                emoji: '🏗️',  count: 0n },
  { name: 'Cities',                   emoji: '🌆',  count: 0n },
  { name: 'Planets',                  emoji: '🌍',  count: 0n },
  { name: 'Solar Systems',            emoji: '🪐',  count: 0n },
  { name: 'Galaxies',                 emoji: '🌌',  count: 0n },
  { name: 'Universes',                emoji: '🔭',  count: 0n },
] as ScaleEntry[]);

// Exactly 1 server worth (20 hard drives = 20 × PAGES_PER_DRIVE)
test('exactly 1 server (20 drives)', computeStorageScale, [PAGES_PER_DRIVE * 20n], [
  { name: 'Enterprise Hard Drives',   emoji: '💾',  count: 20n },
  { name: 'Servers',                  emoji: '🖥️',  count: 1n },
  { name: 'Server Racks',             emoji: '🗄️',  count: 0n },
  { name: 'Server Floors',            emoji: '🏢',  count: 0n },
  { name: 'Buildings',                emoji: '🏗️',  count: 0n },
  { name: 'Cities',                   emoji: '🌆',  count: 0n },
  { name: 'Planets',                  emoji: '🌍',  count: 0n },
  { name: 'Solar Systems',            emoji: '🪐',  count: 0n },
  { name: 'Galaxies',                 emoji: '🌌',  count: 0n },
  { name: 'Universes',                emoji: '🔭',  count: 0n },
] as ScaleEntry[]);

// 1 server + remainder (21 hard drives)
test('1 server + remainder', computeStorageScale, [PAGES_PER_DRIVE * 21n], [
  { name: 'Enterprise Hard Drives',   emoji: '💾',  count: 21n },
  { name: 'Servers',                  emoji: '🖥️',  count: 1n },
  { name: 'Server Racks',             emoji: '🗄️',  count: 0n },
  { name: 'Server Floors',            emoji: '🏢',  count: 0n },
  { name: 'Buildings',                emoji: '🏗️',  count: 0n },
  { name: 'Cities',                   emoji: '🌆',  count: 0n },
  { name: 'Planets',                  emoji: '🌍',  count: 0n },
  { name: 'Solar Systems',            emoji: '🪐',  count: 0n },
  { name: 'Galaxies',                 emoji: '🌌',  count: 0n },
  { name: 'Universes',                emoji: '🔭',  count: 0n },
] as ScaleEntry[]);

// 100 servers (2000 hard drives) = 1 server rack
test('100 servers = 1 rack', computeStorageScale, [PAGES_PER_DRIVE * 2000n], [
  { name: 'Enterprise Hard Drives',   emoji: '💾',  count: 2000n },
  { name: 'Servers',                  emoji: '🖥️',  count: 100n },
  { name: 'Server Racks',             emoji: '🗄️',  count: 10n },
  { name: 'Server Floors',            emoji: '🏢',  count: 0n },
  { name: 'Buildings',                emoji: '🏗️',  count: 0n },
  { name: 'Cities',                   emoji: '🌆',  count: 0n },
  { name: 'Planets',                  emoji: '🌍',  count: 0n },
  { name: 'Solar Systems',            emoji: '🪐',  count: 0n },
  { name: 'Galaxies',                 emoji: '🌌',  count: 0n },
  { name: 'Universes',                emoji: '🔭',  count: 0n },
] as ScaleEntry[]);

// Large: 1e18 pages — cascades through many tiers
test('1e18 pages', computeStorageScale, [1000000000000000000n], [
  { name: 'Enterprise Hard Drives',   emoji: '💾',  count: 7958078n },
  { name: 'Servers',                  emoji: '🖥️',  count: 397903n },
  { name: 'Server Racks',             emoji: '🗄️',  count: 39790n },
  { name: 'Server Floors',            emoji: '🏢',  count: 397n },
  { name: 'Buildings',                emoji: '🏗️',  count: 3n },
  { name: 'Cities',                   emoji: '🌆',  count: 0n },
  { name: 'Planets',                  emoji: '🌍',  count: 0n },
  { name: 'Solar Systems',            emoji: '🪐',  count: 0n },
  { name: 'Galaxies',                 emoji: '🌌',  count: 0n },
  { name: 'Universes',                emoji: '🔭',  count: 0n },
] as ScaleEntry[]);

// Even larger — cascades to cities and planets
test('huge value', () => {
  const result = computeStorageScale(560000000000000000000000000000000000n);
  const checks: [boolean, string][] = [
    [result.length === 10, 'tier count = 10'],
    [result[0]!.count === 4456524038716733957044831n, 'hard drives correct'],
    [result[4]!.count > 0n, 'buildings > 0'],
    [result[5]!.count === 2228262019358n, 'cities correct'],
    [result[6]!.count === 2228262n, 'planets correct'],
    [result[7]!.count === 222826n, 'solar systems correct'],
    [result[8]!.count === 0n, 'galaxies = 0'],
    [result[9]!.count === 0n, 'universes = 0'],
  ];
  let allPassed = true;
  for (const [ok, label] of checks) {
    if (ok) { console.log(`  ✓ huge value: ${label}`); }
    else { allPassed = false; failed++; console.log(`  ✗ huge value: ${label}`); }
  }
  if (allPassed) passed++;
  else failed++;
}, [], undefined);

// Verify always returns exactly 10 tiers
test('always 10 tiers', () => computeStorageScale(1256584717450n).length, [], 10);

// --- pageOffsetFromLocation tests ---

// 3.1 pageOffsetFromLocation(allZeros) === 0n
test('pageOffsetFromLocation all zeros', pageOffsetFromLocation, [makeLocation({})], 0n);

// 3.2 pageOffsetFromLocation({hardDrive: 1n, ...}) === STORAGE_TIERS[0].multiplier
test('pageOffsetFromLocation 1 hard drive', pageOffsetFromLocation, [makeLocation({ hardDrive: 1n })], STORAGE_TIERS[0]!.multiplier);

// Forward: hardDrive=5 → 5 × PAGES_PER_DRIVE
test('pageOffsetFromLocation 5 hard drives', pageOffsetFromLocation, [makeLocation({ hardDrive: 5n })], 5n * STORAGE_TIERS[0]!.multiplier);

// --- locationFromPageOffset tests ---

// 3.3 locationFromPageOffset(0n) returns all zeros
const zeroLoc = locationFromPageOffset(0n);
test('locationFromPageOffset 0n all zeros', () => equalLoc(zeroLoc, makeLocation({})), [], true);

// 3.6 boundary: location at first page of second drive round-trips
test('boundary: first page of second drive', () => {
  const boundary = STORAGE_TIERS[0]!.multiplier;
  const loc = locationFromPageOffset(boundary);
  const back = pageOffsetFromLocation(loc);
  return back === boundary;
}, [], true);

// 3.4 forward-then-backward round-trip
test('round-trip forward→backward', () => {
  const pageNumbers = [0n, PAGES_PER_DRIVE, 5n * PAGES_PER_DRIVE, 25n * PAGES_PER_DRIVE, 2000n * PAGES_PER_DRIVE, 999999n * PAGES_PER_DRIVE];
  for (const p of pageNumbers) {
    const loc = locationFromPageOffset(p);
    const back = locationFromPageOffset(pageOffsetFromLocation(loc));
    if (!equalLoc(back, loc)) return false;
  }
  return true;
}, [], true);

// 3.5 backward-then-forward round-trip
test('round-trip backward→forward (multiples of drive size)', () => {
  const pageNumbers = [0n, PAGES_PER_DRIVE, 2n * PAGES_PER_DRIVE, 20n * PAGES_PER_DRIVE, 100n * PAGES_PER_DRIVE, PAGES_PER_DRIVE * 10000000000n];
  for (const n of pageNumbers) {
    const loc = locationFromPageOffset(n);
    const back = pageOffsetFromLocation(loc);
    if (back !== n) return false;
  }
  return true;
}, [], true);

// 3.7 large page offset exceeding Number.MAX_SAFE_INTEGER
test('large page offset (> Number.MAX_SAFE_INTEGER)', () => {
  const huge = PAGES_PER_DRIVE * 999999999999n;
  const loc = locationFromPageOffset(huge);
  const back = pageOffsetFromLocation(loc);
  return back === huge;
}, [], true);

console.log(`\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
