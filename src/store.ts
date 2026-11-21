import { createEffect, createMemo, createStore, type Accessor, type Store } from 'solid-js';
import {
  TIERS,
  createInitialState,
  getAffordable,
  getWorkerCost,
  getTickInterval,
  getTickSpeedMultiplier,
  calcPagesPerSecond,
  getDoublingMultiplier,
  getDoublingProgress,
  TICK_RATE_BASE_COST,
  LOG_MAX_ENTRIES,
  LOG_CLEANUP_INTERVAL_TICKS,
  EARNINGS_PER_PAGE,
} from './config.js';
import { generatePage } from './page.js';
import { formatMoney } from './format.js';
import type { GameState, HireResult } from './types.js';

/**
 * The game engine: one Solid store holding the source state, memos for
 * everything derived from it, and actions that write through the draft.
 *
 * Solid 2 batches writes: a read of `state` returns the committed value until
 * the microtask flush (or `flush()`). The draft passed to a setter already
 * sees earlier pending writes, so every action reads and decides inside its
 * setter. That keeps back-to-back actions in one frame correct.
 *
 * Create it inside a reactive owner (a component or `createRoot`) because the
 * memos need one.
 */
export interface GameStore {
  readonly state: Store<GameState>;
  /** Raw draft access, for tests and debugging. App code should use the actions. */
  readonly setState: (fn: (draft: GameState) => GameState | void) => void;

  // Derived
  readonly pps: Accessor<number>;
  readonly canAfford: Accessor<Record<string, boolean>>;
  readonly tickInterval: Accessor<number>;
  readonly tickSpeedMultiplier: Accessor<number>;
  readonly latestPage: Accessor<string>;
  readonly doublingMultipliers: Accessor<Record<string, number>>;
  readonly doublingProgress: Accessor<Record<string, number>>;

  // Actions
  tick(deltaMs: number): void;
  hire(tierId: string): HireResult;
  hireBulk(tierId: string, count: number): HireResult;
  upgradeTickRate(): HireResult;
  reset(): void;
}

function addLogEntry(state: GameState, message: string): void {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  state.log = [{ timestamp, message }, ...state.log].slice(0, LOG_MAX_ENTRIES);
}

/**
 * Worker cascade: each tier gains the sum of every tier above it
 * (applies to `workers` only, never `playerWorkers`).
 */
function computeCascade(workers: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {};
  let cumulativeAbove = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const tierId = TIERS[i]!.id;
    next[tierId] = (workers[tierId] || 0) + cumulativeAbove;
    cumulativeAbove += workers[tierId] || 0;
  }
  return next;
}

function perTier<T>(fn: (tierId: string) => T): Record<string, T> {
  const result: Record<string, T> = {};
  for (const tier of TIERS) result[tier.id] = fn(tier.id);
  return result;
}

export function createGameStore(): GameStore {
  const [state, setState] = createStore<GameState>(createInitialState());

  const tickInterval = createMemo(() => getTickInterval(state.tickRateLevel));
  const tickSpeedMultiplier = createMemo(() => getTickSpeedMultiplier(state.tickRateLevel));
  const pps = createMemo(
    () =>
      calcPagesPerSecond(state.workers, getDoublingMultiplier(state.playerWorkers.writer || 0)) *
      tickSpeedMultiplier()
  );
  const canAfford = createMemo(() =>
    perTier(id => state.money >= getWorkerCost(TIERS.find(t => t.id === id)!, state.playerWorkers[id] || 0))
  );
  const latestPage = createMemo(() => generatePage(state.currentPage));
  const doublingMultipliers = createMemo(() =>
    perTier(id => getDoublingMultiplier(state.playerWorkers[id] || 0))
  );
  const doublingProgress = createMemo(() =>
    perTier(id => getDoublingProgress(state.playerWorkers[id] || 0))
  );

  function tick(deltaMs: number): void {
    setState(s => {
      const delta = deltaMs / 1000; // seconds
      s._tickCount++;

      // Pages come from the pre-cascade writer count
      const writers = s.workers.writer ?? 0;
      // Assign leaves, not a new object, so only readers of changed tiers re-run
      const cascaded = computeCascade(s.workers);
      for (const tier of TIERS) {
        if (s.workers[tier.id] !== cascaded[tier.id]) s.workers[tier.id] = cascaded[tier.id]!;
      }

      const pagesPerSec = writers * getDoublingMultiplier(s.playerWorkers.writer || 0);
      const pagesThisTick = pagesPerSec * delta * getTickSpeedMultiplier(s.tickRateLevel);

      s.money += pagesThisTick * EARNINGS_PER_PAGE;

      // Track fractional pages and cross whole-page boundaries
      s._fractionalPages += pagesThisTick;
      const newPages = BigInt(Math.floor(s._fractionalPages));
      s._fractionalPages -= Number(newPages);
      if (newPages > 0n) {
        s.pagesGenerated += newPages;
        s.currentPage += newPages;
      }

      if (s._tickCount % LOG_CLEANUP_INTERVAL_TICKS === 0 && s.log.length > 10) {
        s.log = s.log.slice(0, 10);
      }
    });
  }

  function hireBulk(tierId: string, count: number): HireResult {
    const tier = TIERS.find(t => t.id === tierId);
    if (!tier) return { success: false, message: 'Unknown tier' };
    if (count < 1) return { success: false, message: 'Count must be at least 1' };

    let result: HireResult = { success: false, message: '' };
    setState(s => {
      const startCount = s.playerWorkers[tier.id] || 0;
      const { count: hired, cost } = getAffordable(tier, startCount, s.money, count);

      if (hired === 0) {
        result = {
          success: false,
          message: `Not enough money (need ${formatMoney(getWorkerCost(tier, startCount))})`,
        };
        return;
      }

      const message =
        hired === 1
          ? `Hired ${tier.name} for ${formatMoney(cost)}`
          : `Hired ${hired} ${tier.name}s for ${formatMoney(cost)}`;

      s.money -= cost;
      s.workers[tier.id] = (s.workers[tier.id] || 0) + hired;
      s.playerWorkers[tier.id] = startCount + hired;
      addLogEntry(s, message);
      result = { success: true, message };
    });
    return result;
  }

  function upgradeTickRate(): HireResult {
    let result: HireResult = { success: false, message: '' };
    setState(s => {
      const cost = s.tickRateCost;
      if (s.money < cost) {
        result = { success: false, message: `Not enough money (need ${formatMoney(cost)})` };
        return;
      }

      const newLevel = s.tickRateLevel + 1;
      const newInterval = getTickInterval(newLevel);
      const newSpeedMultiplier = getTickSpeedMultiplier(newLevel);
      const speedDesc =
        newSpeedMultiplier > 1
          ? ` (×${newSpeedMultiplier} → effective ${((1000 / newInterval) * newSpeedMultiplier).toFixed(0)}/s)`
          : '';
      const message = `Tick rate upgraded to level ${newLevel} (${newInterval}ms interval${speedDesc})`;

      s.money -= cost;
      s.tickRateLevel = newLevel;
      s.tickRateCost = TICK_RATE_BASE_COST * Math.pow(2, newLevel);
      addLogEntry(s, message);
      result = { success: true, message };
    });
    return result;
  }

  function reset(): void {
    // Returning a value from the setter replaces the store's top-level fields
    setState(() => createInitialState());
  }

  return {
    state,
    setState,
    pps,
    canAfford,
    tickInterval,
    tickSpeedMultiplier,
    latestPage,
    doublingMultipliers,
    doublingProgress,
    tick,
    hire: tierId => hireBulk(tierId, 1),
    hireBulk,
    upgradeTickRate,
    reset,
  };
}

/**
 * Drive the game: tick every `tickInterval()` ms, restarting the timer when
 * the interval changes. Call inside a reactive owner; disposing it stops the loop.
 */
export function startTickLoop(game: GameStore): void {
  createEffect(
    () => game.tickInterval(),
    interval => {
      const id = setInterval(() => game.tick(interval), interval);
      return () => clearInterval(id);
    }
  );
}
