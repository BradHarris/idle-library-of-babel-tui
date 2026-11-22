import { D, Decimal, type DecimalSource } from './bignum.js';
import type { Tier, StorageTier, GameState } from './types.js';

/**
 * Worker tiers. Writers make pages; every other tier makes workers of the tier
 * directly below it, `rate` per worker per second. Prices grow by `costGrowth`
 * per purchase, faster for higher tiers.
 *
 * Tuned with the simulator in src/simulate.ts (see src/balance.test.ts): a
 * player buying greedily fills the first drive in ~25 min and the first
 * building in ~1.5 h, then slows down — the point where prestige will come in.
 */
export const TIERS: Tier[] = [
  { id: 'writer',     name: 'Writer',     baseCost: 10,          costGrowth: 1.15, rate: 0 },
  { id: 'manager',    name: 'Manager',    baseCost: 80,          costGrowth: 1.2,  rate: 0.05 },
  { id: 'overseer',   name: 'Overseer',   baseCost: 640,         costGrowth: 1.25, rate: 0.03 },
  { id: 'rector',     name: 'Rector',     baseCost: 5_120,       costGrowth: 1.3,  rate: 0.02 },
  { id: 'cardinal',   name: 'Cardinal',   baseCost: 40_960,      costGrowth: 1.35, rate: 0.015 },
  { id: 'pope',       name: 'Pope',       baseCost: 327_680,     costGrowth: 1.4,  rate: 0.01 },
  { id: 'archbishop', name: 'Archbishop', baseCost: 2_621_440,   costGrowth: 1.45, rate: 0.008 },
];

/** Real-time interval between ticks. Production is per second, so this only sets how smoothly numbers move. */
export const TICK_MS = 50;
export const EARNINGS_PER_PAGE = 1;    // $1.00 per page
export const PRNG_SEED_BITS = 32;      // 32-bit seed from SHA-256
export const LOG_MAX_ENTRIES = 10;     // maximum log entries to retain

// "Faster": a global output multiplier whose price grows super-exponentially,
// so each level costs relatively more than the last and it can never pay for itself forever.
export const SPEED_MULTIPLIER = 1.5;   // output × this per level
export const SPEED_BASE_COST = 10_000;
export const SPEED_COST_GROWTH = 10;   // price × this per level...
export const SPEED_COST_ACCEL = 2.5;   // ...and × this^(level²)

/** Price of the next "Faster" level when `level` levels are owned. */
export function getSpeedCost(level: number): Decimal {
  return D(SPEED_BASE_COST).mul(D(SPEED_COST_GROWTH).pow(level)).mul(D(SPEED_COST_ACCEL).pow(level * level));
}

/** Output multiplier from `level` levels of "Faster". */
export function getSpeedMultiplier(level: number): Decimal {
  return D(SPEED_MULTIPLIER).pow(level);
}

/**
 * Create the initial game state.
 * Starts with 1 Writer, $0 money, 0 pages.
 */
export function createInitialState(): GameState {
  const workers: Record<string, Decimal> = {};
  const playerWorkers: Record<string, number> = {};
  for (const tier of TIERS) {
    workers[tier.id] = tier.id === 'writer' ? Decimal.ONE : Decimal.ZERO;
    playerWorkers[tier.id] = tier.id === 'writer' ? 1 : 0;
  }
  return {
    pagesGenerated: 0n,
    currentPage: 0n,
    money: Decimal.ZERO,
    workers,
    playerWorkers,
    log: [],
    _fractionalPages: 0, // track fractional pages for boundary crossing
    speedLevel: 0,
    time: 0,
    achievements: [],
    searches: 0,
    searchesFound: 0,
  };
}

/**
 * Calculate the current cost to purchase one worker of a given tier.
 * Cost = baseCost × costGrowth^playerBoughtCount
 */
export function getWorkerCost(tier: Tier, playerBoughtCount: number): Decimal {
  return D(tier.baseCost).mul(D(tier.costGrowth).pow(playerBoughtCount));
}

/** Each threshold is this many times the last. */
export const DOUBLING_THRESHOLD_FACTOR = 4;

/**
 * Doubling milestones: owning this many of a tier doubles its output.
 * threshold(n) = 10 × 4^n → [10, 40, 160, 640, ...]. Spacing them out keeps
 * the bonus from compounding down the chain of tiers too fast.
 */
export function getDoublingThresholds(): number[] {
  const thresholds: number[] = [];
  for (let i = 0; i < 24; i++) {
    thresholds.push(10 * DOUBLING_THRESHOLD_FACTOR ** i);
  }
  return thresholds;
}

/**
 * Calculate the output multiplier for a given player-bought worker count.
 * Multiplier = 2^milestonesReached.
 */
export function getDoublingMultiplier(playerBoughtCount: number): number {
  const thresholds = getDoublingThresholds();
  let milestones = 0;
  for (const t of thresholds) {
    if (playerBoughtCount >= t) {
      milestones++;
    } else {
      break;
    }
  }
  return 2 ** milestones;
}

/**
 * Calculate progress (0-1) toward the next doubling milestone.
 */
export function getDoublingProgress(playerBoughtCount: number): number {
  const thresholds = getDoublingThresholds();
  let previousThreshold = 0;

  for (let i = 0; i < thresholds.length; i++) {
    if (playerBoughtCount >= thresholds[i]!) {
      previousThreshold = thresholds[i]!;
    } else {
      const nextThreshold = thresholds[i]!;
      const gap = nextThreshold - previousThreshold;
      return gap > 0 ? (playerBoughtCount - previousThreshold) / gap : 0;
    }
  }
  return 0;
}

/**
 * Bytes per page — each generated page is exactly 280 characters.
 */
const BYTES_PER_PAGE: bigint = 280n;

/**
 * Compute pages per 32 TiB hard drive: (32 × 2^40) / 280.
 * This is a constant — computed at module load for clarity.
 */
const PAGES_PER_32_TB_DRIVE: bigint = (32n * 1024n ** 4n) / BYTES_PER_PAGE;

/**
 * Storage scale tiers — defines the escalation hierarchy from hard drives to universes.
 * Each tier's count = previous tier count ÷ multiplier (floor division).
 * Multipliers are bigint values to support arbitrary precision arithmetic.
 */
export const STORAGE_TIERS: StorageTier[] = [
  { id: 'hardDrive',     name: 'Enterprise Hard Drives',   emoji: '💾',  multiplier: PAGES_PER_32_TB_DRIVE },
  { id: 'server',        name: 'Servers',                  emoji: '🖥️',  multiplier: 20n },
  { id: 'serverRack',    name: 'Server Racks',             emoji: '🗄️',  multiplier: 10n },
  { id: 'serverFloor',   name: 'Server Floors',            emoji: '🏢',  multiplier: 100n },
  { id: 'building',      name: 'Buildings',                emoji: '🏗️',  multiplier: 100n },
  { id: 'city',          name: 'Cities',                   emoji: '🌆',  multiplier: 1_000_000n },
  { id: 'planet',        name: 'Planets',                  emoji: '🌍',  multiplier: 1_000_000n },
  { id: 'solarSystem',   name: 'Solar Systems',            emoji: '🪐',  multiplier: 10n },
  { id: 'galaxy',        name: 'Galaxies',                 emoji: '🌌',  multiplier: 1_000_000_000_000n },
  { id: 'universe',      name: 'Universes',                emoji: '🔭',  multiplier: 1_000_000_000_000n },
];

// ─── Hiring ───────────────────────────────────────────────

/**
 * Total cost to hire `count` workers starting from `playerBoughtCount`:
 * a geometric series, price × (g^count − 1) / (g − 1).
 */
export function getBulkCost(tier: Tier, playerBoughtCount: number, count: number): Decimal {
  if (count <= 0) return Decimal.ZERO;
  const g = tier.costGrowth;
  return getWorkerCost(tier, playerBoughtCount).mul(D(g).pow(count).sub(1)).div(g - 1);
}

/**
 * How many workers (up to `limit`) can be bought with `money`, and what they cost.
 * Solves the geometric series for the count instead of looping, so it stays
 * cheap however much money there is.
 */
export function getAffordable(
  tier: Tier,
  playerBoughtCount: number,
  money: DecimalSource,
  limit = Infinity
): { count: number; cost: Decimal } {
  const budget = D(money);
  const first = getWorkerCost(tier, playerBoughtCount);
  if (budget.lt(first) || limit < 1) return { count: 0, cost: Decimal.ZERO };
  const g = tier.costGrowth;
  // count = floor(log_g(budget × (g − 1) / first + 1)), corrected for float error
  const ratio = budget.mul(g - 1).div(first).add(1);
  let count = Math.min(limit, Math.max(1, Math.floor(ratio.log10() / Math.log10(g))));
  while (count > 0 && getBulkCost(tier, playerBoughtCount, count).gt(budget)) count--;
  while (count < limit && getBulkCost(tier, playerBoughtCount, count + 1).lte(budget)) count++;
  return { count, cost: getBulkCost(tier, playerBoughtCount, count) };
}

export type HireMode = 'one' | 'next' | 'max';

/**
 * Work out how many workers a hire in `mode` would buy and what it costs.
 * - one:  a single worker
 * - next: enough to reach the next doubling threshold
 * - max:  as many as `money` allows (count 0 when none are affordable)
 */
export function planHire(
  mode: HireMode,
  tier: Tier,
  playerBoughtCount: number,
  money: DecimalSource
): { count: number; cost: Decimal } {
  if (mode === 'next') {
    const threshold = getDoublingThresholds().find(t => t > playerBoughtCount);
    const count = threshold ? threshold - playerBoughtCount : 1;
    return { count, cost: getBulkCost(tier, playerBoughtCount, count) };
  }
  if (mode === 'max') {
    const affordable = getAffordable(tier, playerBoughtCount, money);
    return affordable.count > 0 ? affordable : { count: 0, cost: getWorkerCost(tier, playerBoughtCount) };
  }
  return { count: 1, cost: getWorkerCost(tier, playerBoughtCount) };
}
