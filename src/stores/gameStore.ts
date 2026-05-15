import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  TIERS,
  createInitialState,
  getWorkerCost,
  getTickInterval,
  getTickSpeedMultiplier,
  calcPagesPerSecond,
  getDoublingMultiplier,
  getDoublingProgress,
  TICK_RATE_BASE_COST,
  LOG_MAX_ENTRIES,
  EARNINGS_PER_PAGE,
} from '../config.js';
import { generatePage } from '../page.js';
import { formatMoney } from '../format.js';

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: string;
  message: string;
}

/**
 * Hire result
 */
interface HireResult {
  success: boolean;
  message: string;
}

/**
 * Main game state interface
 */
interface GameState {
  // Core state
  pagesGenerated: bigint;
  currentPage: bigint;
  money: number;
  workers: Record<string, number>;
  playerWorkers: Record<string, number>;
  log: LogEntry[];
  _fractionalPages: number;
  tickRateLevel: number;
  tickRateCost: number;

  // Derived state (computed in each action)
  pps: number;
  canAfford: Record<string, boolean>;
  tickInterval: number;
  tickSpeedMultiplier: number;
  latestPage: string;
  doublingMultipliers: Record<string, number>;
  doublingProgress: Record<string, number>;
}

/**
 * Action functions
 */
interface GameActions {
  tick: (deltaMs: number) => void;
  hire: (tierId: string) => HireResult;
  hireBulk: (tierId: string, count: number) => HireResult;
  upgradeTickRate: () => HireResult;
  reset: () => void;
}

/**
 * Add a log entry to state
 */
function addLogEntry(state: GameState, message: string): void {
  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-US', { hour12: false });
  state.log = [{ timestamp, message }, ...state.log].slice(0, LOG_MAX_ENTRIES);
}

/**
 * Compute worker cascade — cumulative sum from top (only for `workers`, not `playerWorkers`)
 */
function computeCascade(workers: Record<string, number>): Record<string, number> {
  const newWorkers: Record<string, number> = {};
  let cumulativeAbove = 0;

  for (let i = TIERS.length - 1; i >= 0; i--) {
    const tierId = TIERS[i].id;
    newWorkers[tierId] = (workers[tierId] || 0) + cumulativeAbove;
    cumulativeAbove += workers[tierId] || 0;
  }

  return newWorkers;
}

/**
 * Compute affordability for all tiers using player-bought counts
 */
function computeCanAfford(
  money: number,
  playerWorkers: Record<string, number>
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const tier of TIERS) {
    const cost = getWorkerCost(tier, playerWorkers[tier.id] || 0);
    result[tier.id] = money >= cost;
  }
  return result;
}

/**
 * Compute doubling multipliers for all tiers from player-bought counts
 */
function computeDoublingMultipliers(playerWorkers: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const tier of TIERS) {
    result[tier.id] = getDoublingMultiplier(playerWorkers[tier.id] || 0);
  }
  return result;
}

/**
 * Compute doubling progress (0-1) for all tiers from player-bought counts
 */
function computeDoublingProgress(playerWorkers: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const tier of TIERS) {
    result[tier.id] = getDoublingProgress(playerWorkers[tier.id] || 0);
  }
  return result;
}

/**
 * Create the Zustand store with immer middleware
 */
export const useGameStore = create<GameState & GameActions>()(
  immer((set) => {
    const initial = createInitialState();

    return {
      ...initial,

      // Derived state
      pps: calcPagesPerSecond(initial.workers, getDoublingMultiplier(initial.playerWorkers.writer || 0)),
      canAfford: computeCanAfford(initial.money, initial.playerWorkers),
      tickInterval: getTickInterval(initial.tickRateLevel),
      tickSpeedMultiplier: getTickSpeedMultiplier(initial.tickRateLevel),
      latestPage: generatePage(initial.currentPage),
      doublingMultipliers: computeDoublingMultipliers(initial.playerWorkers),
      doublingProgress: computeDoublingProgress(initial.playerWorkers),

      // --- Actions ---

      /**
       * Execute one game tick with elapsed time in milliseconds
       */
      tick: (deltaMs: number) => {
        set(state => {
          const delta = deltaMs / 1000; // seconds
          state._tickCount++;

          // Snapshot worker counts before cascade (for page generation)
          const oldWorkers = { ...state.workers };

          // Apply transitive cascade to `workers` only — `playerWorkers` is NOT modified
          state.workers = computeCascade(state.workers);

          // Compute PPS using pre-cascade writers with their multiplier
          const writerMultiplier = getDoublingMultiplier(state.playerWorkers.writer || 0);
          const pps = (oldWorkers.writer ?? 0) * writerMultiplier;
          const speedMultiplier = getTickSpeedMultiplier(state.tickRateLevel);
          const pagesThisTick = pps * delta * speedMultiplier;

          // Update money
          const moneyThisTick = pagesThisTick * EARNINGS_PER_PAGE;
          state.money += moneyThisTick;

          // Track fractional pages and cross boundaries
          state._fractionalPages += pagesThisTick;
          const newPages = BigInt(Math.floor(state._fractionalPages));
          state._fractionalPages -= Number(newPages);

          if (newPages > 0n) {
            state.pagesGenerated += newPages;
            state.currentPage += newPages;
            state.latestPage = generatePage(state.currentPage);
          }

          // Clean up old log entries periodically
          if (state._tickCount % 500 === 0 && state.log.length > 10) {
            state.log = state.log.slice(0, 10);
          }

          // Compute and update derived state in same transaction
          const postWorkerMultiplier = getDoublingMultiplier(state.playerWorkers.writer || 0);
          state.pps = calcPagesPerSecond(state.workers, postWorkerMultiplier) * speedMultiplier;
          state.canAfford = computeCanAfford(state.money, state.playerWorkers);
          state.tickInterval = getTickInterval(state.tickRateLevel);
          state.tickSpeedMultiplier = speedMultiplier;
          state.doublingMultipliers = computeDoublingMultipliers(state.playerWorkers);
          state.doublingProgress = computeDoublingProgress(state.playerWorkers);
        });
      },

      /**
       * Attempt to purchase a worker of the given tier
       */
      hire: (tierId: string): HireResult => {
        return useGameStore.getState().hireBulk(tierId, 1);
      },

      /**
       * Attempt to purchase up to `count` workers of the given tier.
       * Stops when money runs out. Returns result with count actually hired.
       */
      hireBulk: (tierId: string, count: number): HireResult => {
        const tier = TIERS.find(t => t.id === tierId);
        if (!tier) return { success: false, message: 'Unknown tier' };
        if (count < 1) return { success: false, message: 'Count must be at least 1' };

        const currentState = useGameStore.getState();
        const startCount = currentState.playerWorkers[tier.id] || 0;

        let hired = 0;
        let totalSpent = 0;
        for (let i = 0; i < count; i++) {
          const cost = getWorkerCost(tier, startCount + i);
          if (currentState.money < totalSpent + cost) break;
          totalSpent += cost;
          hired++;
        }

        if (hired === 0) {
          const cost = getWorkerCost(tier, startCount);
          return { success: false, message: `Not enough money (need ${formatMoney(cost)})` };
        }

        const msg = hired === 1
          ? `Hired ${tier.name} for ${formatMoney(totalSpent)}`
          : `Hired ${hired} ${tier.name}s for ${formatMoney(totalSpent)}`;

        set(state => {
          state.money -= totalSpent;
          state.workers[tier.id] = (state.workers[tier.id] || 0) + hired;
          state.playerWorkers[tier.id] = startCount + hired;
          addLogEntry(state, msg);

          const writerMultiplier = getDoublingMultiplier(state.playerWorkers.writer || 0);
          state.pps = calcPagesPerSecond(state.workers, writerMultiplier) * getTickSpeedMultiplier(state.tickRateLevel);
          state.canAfford = computeCanAfford(state.money, state.playerWorkers);
          state.tickInterval = getTickInterval(state.tickRateLevel);
          state.tickSpeedMultiplier = getTickSpeedMultiplier(state.tickRateLevel);
          state.doublingMultipliers = computeDoublingMultipliers(state.playerWorkers);
          state.doublingProgress = computeDoublingProgress(state.playerWorkers);
        });

        return { success: true, message: msg };
      },

      /**
       * Attempt to upgrade tick rate
       */
      upgradeTickRate: (): HireResult => {
        // Read state before set (outside immer transaction)
        const currentState = useGameStore.getState();
        const cost = currentState.tickRateCost;

        if (currentState.money < cost) {
          return { success: false, message: `Not enough money (need ${formatMoney(cost)})` };
        }

        const newLevel = currentState.tickRateLevel + 1;
        const newCost = TICK_RATE_BASE_COST * Math.pow(2, newLevel);
        const newInterval = getTickInterval(newLevel);
        const newSpeedMultiplier = getTickSpeedMultiplier(newLevel);
        const speedDesc = newSpeedMultiplier > 1
          ? ` (×${newSpeedMultiplier} → effective ${(1000 / newInterval * newSpeedMultiplier).toFixed(0)}/s)`
          : '';
        const msg = `Tick rate upgraded to level ${newLevel} (${newInterval}ms interval${speedDesc})`;

        set(state => {
          state.money -= cost;
          state.tickRateLevel = newLevel;
          state.tickRateCost = newCost;
          addLogEntry(state, msg);

          // Compute derived state
          const writerMultiplier = getDoublingMultiplier(state.playerWorkers.writer || 0);
          state.pps = calcPagesPerSecond(state.workers, writerMultiplier) * newSpeedMultiplier;
          state.canAfford = computeCanAfford(state.money, state.playerWorkers);
          state.tickInterval = getTickInterval(state.tickRateLevel);
          state.tickSpeedMultiplier = newSpeedMultiplier;
          state.doublingMultipliers = computeDoublingMultipliers(state.playerWorkers);
          state.doublingProgress = computeDoublingProgress(state.playerWorkers);
        });

        return { success: true, message: msg };
      },

      /**
       * Reset game to initial state
       */
      reset: () => {
        const init = createInitialState();
        set(() => ({
          ...init,
          pps: calcPagesPerSecond(init.workers, getDoublingMultiplier(init.playerWorkers.writer || 0)),
          canAfford: computeCanAfford(init.money, init.playerWorkers),
          tickInterval: getTickInterval(init.tickRateLevel),
          tickSpeedMultiplier: getTickSpeedMultiplier(init.tickRateLevel),
          latestPage: generatePage(init.currentPage),
          doublingMultipliers: computeDoublingMultipliers(init.playerWorkers),
          doublingProgress: computeDoublingProgress(init.playerWorkers),
        }));
      },
    };
  })
);
