import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  TIERS,
  createInitialState,
  getWorkerCost,
  getTickInterval,
  calcPagesPerSecond,
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
  log: LogEntry[];
  _fractionalPages: number;
  tickRateLevel: number;
  tickRateCost: number;

  // Derived state (computed in each action)
  pps: number;
  canAfford: Record<string, boolean>;
  tickInterval: number;
  latestPage: string;
}

/**
 * Action functions
 */
interface GameActions {
  tick: (deltaMs: number) => void;
  hire: (tierId: string) => HireResult;
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
 * Compute worker cascade — cumulative sum from top
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
 * Compute affordability for all tiers
 */
function computeCanAfford(
  money: number,
  workers: Record<string, number>
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const tier of TIERS) {
    const cost = getWorkerCost(tier, workers[tier.id] || 0);
    result[tier.id] = money >= cost;
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
      pps: calcPagesPerSecond(initial.workers),
      canAfford: computeCanAfford(initial.money, initial.workers),
      tickInterval: getTickInterval(initial.tickRateLevel),
      latestPage: generatePage(initial.currentPage),

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

          // Apply transitive cascade
          state.workers = computeCascade(state.workers);

          const pps = oldWorkers.writer ?? 0;
          const pagesThisTick = pps * delta;

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
          state.pps = calcPagesPerSecond(state.workers);
          state.canAfford = computeCanAfford(state.money, state.workers);
          state.tickInterval = getTickInterval(state.tickRateLevel);
        });
      },

      /**
       * Attempt to purchase a worker of the given tier
       */
      hire: (tierId: string): HireResult => {
        const tier = TIERS.find(t => t.id === tierId);
        if (!tier) return { success: false, message: 'Unknown tier' };

        // Read state before set (outside immer transaction)
        const currentState = useGameStore.getState();
        const count = currentState.workers[tier.id] || 0;
        const cost = getWorkerCost(tier, count);
        const msg = `Hired ${tier.name} for ${formatMoney(cost)}`;

        if (currentState.money < cost) {
          return { success: false, message: `Not enough money (need ${formatMoney(cost)})` };
        }

        set(state => {
          state.money -= cost;
          state.workers[tier.id] = count + 1;
          addLogEntry(state, msg);

          // Compute derived state
          state.pps = calcPagesPerSecond(state.workers);
          state.canAfford = computeCanAfford(state.money, state.workers);
          state.tickInterval = getTickInterval(state.tickRateLevel);
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
        const msg = `Tick rate upgraded to level ${newLevel} (${newInterval}ms interval)`;

        set(state => {
          state.money -= cost;
          state.tickRateLevel = newLevel;
          state.tickRateCost = newCost;
          addLogEntry(state, msg);

          // Compute derived state
          state.pps = calcPagesPerSecond(state.workers);
          state.canAfford = computeCanAfford(state.money, state.workers);
          state.tickInterval = getTickInterval(state.tickRateLevel);
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
          pps: calcPagesPerSecond(init.workers),
          canAfford: computeCanAfford(init.money, init.workers),
          tickInterval: getTickInterval(init.tickRateLevel),
          latestPage: generatePage(init.currentPage),
        }));
      },
    };
  })
);
