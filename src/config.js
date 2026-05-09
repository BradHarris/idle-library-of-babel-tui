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
  for (const tier of TIERS) {
    workers[tier.id] = tier.id === 'writer' ? 1 : 0;
  }
  return {
    pagesGenerated: 0n,
    currentPage: 0n,
    money: 0,
    workers,
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
 * Cost = baseCost × 1.5^count
 * @param {object} tier — tier definition from config
 * @param {number} count — current worker count for this tier
 * @returns {number} — cost to purchase one more worker
 */
export function getWorkerCost(tier, count) {
  return tier.baseCost * Math.pow(1.5, count);
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
 * Calculate pages per second: only writer workers produce pages.
 * @param {object} workers — worker counts by tier id
 * @returns {number} — pages per second
 */
export function calcPagesPerSecond(workers) {
  return workers.writer ?? 0;
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
