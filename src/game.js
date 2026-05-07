import { TIERS, TICK_INTERVAL, AUTO_HIRE_INTERVAL, EARNINGS_PER_PAGE, LOG_CLEANUP_INTERVAL_TICKS, LOG_MAX_ENTRIES } from './config.js';
import { generatePage } from './page.js';

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
    _autoHireTimers: {},
    _tickCount: 0,
    _fractionalPages: 0, // track fractional pages for boundary crossing
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
 * Calculate total pages per second: sum of all worker counts.
 * Each worker produces 1 page/sec regardless of tier.
 * @param {object} workers — worker counts by tier id
 * @returns {number} — pages per second
 */
export function calcPagesPerSecond(workers) {
  return Object.values(workers).reduce((sum, count) => sum + count, 0);
}

/**
 * Push an event to the log, newest first.
 * @param {object} state — current game state
 * @param {string} message — event description
 */
function logEvent(state, message) {
  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-US', { hour12: false });
  state.log.unshift({ timestamp, message });
  // Trim log to max entries
  if (state.log.length > LOG_CLEANUP_INTERVAL_TICKS) {
    // Don't aggressively trim every tick; only on explicit cleanup
  }
}

/**
 * Execute one game tick.
 * @param {object} state — current game state
 * @returns {object} — updated game state
 */
export function tick(state) {
  const now = Date.now();
  const delta = (now - state.lastTick) / 1000; // seconds since last tick
  state.lastTick = now;
  state._tickCount++;

  const pps = calcPagesPerSecond(state.workers);
  const pagesThisTick = pps * delta;

  // Update money (always, even fractional)
  const moneyThisTick = pagesThisTick * EARNINGS_PER_PAGE;
  state.money += moneyThisTick;

  // Track fractional pages and cross boundaries
  state._fractionalPages += pagesThisTick;
  const newPages = BigInt(Math.floor(state._fractionalPages));
  state._fractionalPages -= Number(newPages);

  if (newPages > 0n) {
    state.pagesGenerated += newPages;
    state.currentPage += newPages;

    // Generate the latest page (the most recent one)
    state._latestPage = generatePage(state.currentPage);
  }

  // Auto-hire checks for non-Writer tiers
  for (const tier of TIERS) {
    if (tier.id === 'writer') continue;
    if (!tier.autoHireBelow) continue;
    const count = state.workers[tier.id];
    if (count === 0) continue;

    if (!state._autoHireTimers[tier.id]) {
      state._autoHireTimers[tier.id] = now;
    }

    if (now - state._autoHireTimers[tier.id] >= AUTO_HIRE_INTERVAL * 1000) {
      state._autoHireTimers[tier.id] = now;
      const targetTier = TIERS.find((t) => t.id === tier.autoHireBelow);
      if (targetTier) {
        const cost = getWorkerCost(targetTier, state.workers[targetTier.id]);
        if (state.money >= cost) {
          state.money -= cost;
          state.workers[targetTier.id]++;
          logEvent(state, `Auto-hired ${targetTier.name} (funded by ${tier.name})`);
        }
      }
    }
  }

  // Clean up old log entries periodically
  if (state._tickCount % LOG_CLEANUP_INTERVAL_TICKS === 0 && state.log.length > 10) {
    state.log = state.log.slice(0, 10);
  }

  return state;
}

/**
 * Attempt to purchase a worker of the given tier.
 * Mutates state in place (for use within tick loop).
 * @param {object} state — current game state (mutated)
 * @param {string} tierId — the tier id to purchase
 * @returns {object} — { success: boolean, message: string }
 */
export function purchaseWorker(state, tierId) {
  const tier = TIERS.find((t) => t.id === tierId);
  if (!tier) return { success: false, message: 'Unknown tier' };

  const cost = getWorkerCost(tier, state.workers[tier.id]);
  if (state.money < cost) {
    return { success: false, message: `Not enough money (need ${formatMoney(cost)})` };
  }

  state.money -= cost;
  state.workers[tier.id]++;
  logEvent(state, `Hired ${tier.name} for ${formatMoney(cost)}`);
  return { success: true, message: `Hired ${tier.name} for ${formatMoney(cost)}` };
}

/**
 * Attempt to purchase a worker — creates a new state object (pure function).
 * @param {object} state — current game state (not mutated)
 * @param {string} tierId — the tier id to purchase
 * @returns {object} — { state: object, success: boolean, message: string }
 */
export function purchaseWorkerPure(state, tierId) {
  const tier = TIERS.find((t) => t.id === tierId);
  if (!tier) return { state, success: false, message: 'Unknown tier' };

  const count = state.workers[tier.id];
  const cost = getWorkerCost(tier, count);
  if (state.money < cost) {
    return { state, success: false, message: `Not enough money (need ${formatMoney(cost)})` };
  }

  const newLog = [{
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    message: `Hired ${tier.name} for ${formatMoney(cost)}`,
  }, ...state.log].slice(0, LOG_MAX_ENTRIES);

  return {
    state: {
      ...state,
      money: state.money - cost,
      workers: { ...state.workers, [tier.id]: count + 1 },
      log: newLog,
    },
    success: true,
    message: `Hired ${tier.name} for ${formatMoney(cost)}`,
  };
}

/**
 * Format a number as money for log messages.
 * @param {number} n
 * @returns {string}
 */
function formatMoney(n) {
  if (n < 10000) {
    return '$' + n.toFixed(2);
  }
  if (n < 1_000_000) {
    return '$' + (n / 1_000).toFixed(2) + 'K';
  }
  if (n < 1_000_000_000) {
    return '$' + (n / 1_000_000).toFixed(2) + 'M';
  }
  if (n < 1_000_000_000_000) {
    return '$' + (n / 1_000_000_000).toFixed(2) + 'B';
  }
  if (n < 1_000_000_000_000_000) {
    return '$' + (n / 1_000_000_000_000).toFixed(2) + 'T';
  }
  return '$' + n.toExponential(2);
}
