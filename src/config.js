/**
 * Worker tier definitions for the Library of Babel idle game.
 * Each tick, higher-tier workers spawn workers of the tier below them (cascade).
 * Price scaling for manual purchases: baseCost × 1.5^count
 */
export const TIERS = [
  { id: 'writer',       name: 'Writer',      baseCost: 10             },
  { id: 'manager',      name: 'Manager',     baseCost: 500            },
  { id: 'overseer',     name: 'Overseer',    baseCost: 5_000          },
  { id: 'rector',       name: 'Rector',      baseCost: 50_000         },
  { id: 'cardinal',     name: 'Cardinal',    baseCost: 500_000        },
  { id: 'pope',         name: 'Pope',        baseCost: 10_000_000     },
  { id: 'archbishop',   name: 'Archbishop',  baseCost: 100_000_000    },
];

export const TICK_INTERVAL = 1000;     // ms — base tick interval (1/sec)
export const RENDER_INTERVAL = 100;    // ms — TUI re-render
export const EARNINGS_PER_PAGE = 1;    // $1.00 per page
export const PRNG_SEED_BITS = 32;      // 32-bit seed from SHA-256
export const LOG_MAX_ENTRIES = 10;     // maximum log entries to retain
export const LOG_CLEANUP_INTERVAL_TICKS = 500; // every 25s

// Tick rate upgrade constants
export const TICK_RATE_BASE_COST = 100000;   // $100K initial upgrade cost
export const TICK_RATE_MIN_INTERVAL = 33;    // ms minimum (30 ticks/sec max)
export const TICK_RATE_IMPROVEMENT_MS = 50;  // ms reduction per purchase
export const TICK_RATE_MAX_TICKS_PER_SECOND = 30; // maximum achievable tick rate

/**
 * Create the initial game state.
 * Starts with 1 Writer, $0 money, 0 pages.
 * @returns {object} — the initial GameState
 */
export function createInitialState() {
  const workers = {};
  const playerWorkers = {};
  for (const tier of TIERS) {
    workers[tier.id] = tier.id === 'writer' ? 1 : 0;
    playerWorkers[tier.id] = tier.id === 'writer' ? 1 : 0;
  }
  return {
    pagesGenerated: 0n,
    currentPage: 0n,
    money: 0,
    workers,
    playerWorkers,
    log: [],
    lastTick: Date.now(),
    _tickCount: 0,
    _fractionalPages: 0, // track fractional pages for boundary crossing
    tickRateLevel: 0,
    tickRateCost: TICK_RATE_BASE_COST,
  };
}

/**
 * Calculate the current cost to purchase one worker of a given tier.
 * Cost = baseCost × 1.5^playerBoughtCount
 * @param {object} tier — tier definition from config
 * @param {number} playerBoughtCount — player's directly-purchased worker count for this tier
 * @returns {number} — cost to purchase one more worker
 */
export function getWorkerCost(tier, playerBoughtCount) {
  return tier.baseCost * Math.pow(1.5, playerBoughtCount);
}

/**
 * Generate the doubling milestone thresholds: [10, 20, 40, 80, 160, ...].
 * threshold(n) = 10 × 2^n for n >= 0.
 * Returns thresholds up to a practical limit (max 64 milestones).
 * @returns {number[]} — array of doubling thresholds
 */
export function getDoublingThresholds() {
  const thresholds = [];
  for (let i = 0; i < 64; i++) {
    thresholds.push(10 * (1 << i));
  }
  return thresholds;

}

/**
 * Calculate the output multiplier for a given player-bought worker count.
 * Multiplier = 2^milestonesReached.
 * @param {number} playerBoughtCount — player's directly-purchased count
 * @returns {number} — output multiplier (1, 2, 4, 8, ...)
 */
export function getDoublingMultiplier(playerBoughtCount) {
  const thresholds = getDoublingThresholds();
  let milestones = 0;
  for (const t of thresholds) {
    if (playerBoughtCount >= t) {
      milestones++;
    } else {
      break;
    }
  }
  return 1 << milestones; // 2^milestones
}

/**
 * Calculate progress (0-1) toward the next doubling milestone.
 * Returns 0 if at or past a milestone (resetting toward next).
 * @param {number} playerBoughtCount — player's directly-purchased count
 * @returns {number} — progress fraction 0..1
 */
export function getDoublingProgress(playerBoughtCount) {
  const thresholds = getDoublingThresholds();
  let previousThreshold = 0;

  for (let i = 0; i < thresholds.length; i++) {
    if (playerBoughtCount >= thresholds[i]) {
      previousThreshold = thresholds[i];
    } else {
      // thresholds[i] is the next unreached threshold
      const nextThreshold = thresholds[i];
      const gap = nextThreshold - previousThreshold;
      return gap > 0 ? (playerBoughtCount - previousThreshold) / gap : 0;
    }
  }
  // Beyond all thresholds — progress is 0
  return 0;
}

/**
 * Calculate the current tick interval based on tick rate level.
 * @param {number} tickRateLevel — number of upgrades purchased
 * @returns {number} — tick interval in ms
 */
export function getTickInterval(tickRateLevel) {
  return Math.max(TICK_RATE_MIN_INTERVAL, Math.round(TICK_INTERVAL - tickRateLevel * TICK_RATE_IMPROVEMENT_MS));
}

/**
 * Calculate pages per second: writer workers produce pages, multiplied by their doubling multiplier.
 * @param {object} workers — total worker counts by tier id (cascade-augmented)
 * @param {number} [multiplier=1] — doubling multiplier for writers based on player-purchased count
 * @returns {number} — pages per second
 */
export function calcPagesPerSecond(workers, multiplier = 1) {
  return (workers.writer ?? 0) * multiplier;
}

/**
 * Bytes per page — each generated page is exactly 280 characters.
 */
const BYTES_PER_PAGE = 280n;

/**
 * Compute pages per 32 TiB hard drive: (32 × 2^40) / 280.
 * This is a constant — computed at module load for clarity.
 */
const PAGES_PER_32_TB_DRIVE = (32n * 1024n ** 4n) / BYTES_PER_PAGE;

/**
 * Storage scale tiers — defines the escalation hierarchy from hard drives to universes.
 * Each tier's count = previous tier count ÷ multiplier (floor division).
 * Multipliers are bigint values to support arbitrary precision arithmetic.
 */
export const STORAGE_TIERS = [
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
