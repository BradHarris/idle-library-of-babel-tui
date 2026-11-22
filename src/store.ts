import { createMemo, createStore, onSettled, type Accessor, type Store } from 'solid-js';
import {
  TIERS,
  TICK_MS,
  LOG_MAX_ENTRIES,
  createInitialState,
  getWorkerCost,
  getDoublingMultiplier,
  getDoublingProgress,
  getSpeedCost,
  getSpeedMultiplier,
} from './config.js';
import { FEATURE_UNLOCKS, achievementMultiplier, checkAchievements, hasAchievement } from './achievements.js';
import { advance, buySpeed, buyWorkers, globalMultiplier, pagesPerSecond, productionPerSecond } from './economy.js';
import { Decimal } from './bignum.js';
import { generatePage } from './page.js';
import { formatMoney, formatMultiplier, formatPrice } from './format.js';
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
  readonly pps: Accessor<Decimal>;
  readonly canAfford: Accessor<Record<string, boolean>>;
  readonly latestPage: Accessor<string>;
  readonly doublingMultipliers: Accessor<Record<string, number>>;
  readonly doublingProgress: Accessor<Record<string, number>>;
  /** Workers of the tier below that each tier makes per second (0 for writers). */
  readonly production: Accessor<Record<string, Decimal>>;
  readonly speedCost: Accessor<Decimal>;
  readonly speedMultiplier: Accessor<Decimal>;
  readonly achievementMultiplier: Accessor<Decimal>;
  /** "Faster" × achievements: multiplies page output. */
  readonly globalMultiplier: Accessor<Decimal>;
  /** Features unlocked by achievements. */
  readonly features: Accessor<{ hireNext: boolean; hireMax: boolean }>;

  // Actions
  tick(deltaMs: number): void;
  hire(tierId: string): HireResult;
  hireBulk(tierId: string, count: number): HireResult;
  upgradeSpeed(): HireResult;
  /** Note a search (for achievements); `found` if the page was already written. */
  recordSearch(found: boolean): void;
  reset(): void;
}

/** Append to the log (oldest first), trimming the oldest. Mutates in place so only changed entries notify. */
function addLogEntry(state: GameState, message: string): void {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  state.log.push({ timestamp, message });
  if (state.log.length > LOG_MAX_ENTRIES) state.log.splice(0, state.log.length - LOG_MAX_ENTRIES);
}

/** Unlock any achievements that now apply, logging each. */
function unlockAchievements(state: GameState): void {
  for (const achievement of checkAchievements(state)) {
    addLogEntry(state, `Achievement: ${achievement.name}`);
  }
}

function same(a: unknown, b: unknown): boolean {
  return a instanceof Decimal && b instanceof Decimal ? a.eq(b) : a === b;
}

function sameRecord<T>(a: Record<string, T>, b: Record<string, T>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => same(a[k], b[k]));
}

/** Memo options for Decimal results: equal values don't notify. */
const decimalEquals = { equals: (a: Decimal, b: Decimal) => a.eq(b) };

function perTier<T>(fn: (tierId: string, index: number) => T): Record<string, T> {
  const result: Record<string, T> = {};
  TIERS.forEach((tier, i) => (result[tier.id] = fn(tier.id, i)));
  return result;
}

export function createGameStore(): GameStore {
  const [state, setState] = createStore<GameState>(createInitialState());

  const speedMultiplier = createMemo(() => getSpeedMultiplier(state.speedLevel), decimalEquals);
  const speedCost = createMemo(() => getSpeedCost(state.speedLevel), decimalEquals);
  const achievementMult = createMemo(() => achievementMultiplier(state.achievements.length), decimalEquals);
  const globalMult = createMemo(() => globalMultiplier(state), decimalEquals);
  const pps = createMemo(() => pagesPerSecond(state), decimalEquals);
  const canAfford = createMemo(
    () => perTier(id => state.money.gte(getWorkerCost(TIERS.find(t => t.id === id)!, state.playerWorkers[id] || 0))),
    { equals: sameRecord }
  );
  const latestPage = createMemo(() => generatePage(state.currentPage));
  const doublingMultipliers = createMemo(() => perTier(id => getDoublingMultiplier(state.playerWorkers[id] || 0)), {
    equals: sameRecord,
  });
  const doublingProgress = createMemo(() => perTier(id => getDoublingProgress(state.playerWorkers[id] || 0)), {
    equals: sameRecord,
  });
  const production = createMemo(() => perTier((_, i) => (i === 0 ? Decimal.ZERO : productionPerSecond(state, i))), {
    equals: sameRecord,
  });
  const features = createMemo(
    () => ({
      hireNext: hasAchievement(state, FEATURE_UNLOCKS.hireNext),
      hireMax: hasAchievement(state, FEATURE_UNLOCKS.hireMax),
    }),
    { equals: (a, b) => a.hireNext === b.hireNext && a.hireMax === b.hireMax }
  );

  function tick(deltaMs: number): void {
    setState(s => {
      advance(s, deltaMs / 1000);
      unlockAchievements(s);
    });
  }

  function hireBulk(tierId: string, count: number): HireResult {
    const tier = TIERS.find(t => t.id === tierId);
    if (!tier) return { success: false, message: 'Unknown tier' };
    if (count < 1) return { success: false, message: 'Count must be at least 1' };

    let result: HireResult = { success: false, message: '' };
    setState(s => {
      const bought = buyWorkers(s, tier.id, count);
      if (!bought) {
        const price = getWorkerCost(tier, s.playerWorkers[tier.id] || 0);
        result = { success: false, message: `Not enough money (need ${formatPrice(price)})` };
        return;
      }
      const message =
        bought.hired === 1
          ? `Hired ${tier.name} for ${formatMoney(bought.cost)}`
          : `Hired ${bought.hired} ${tier.name}s for ${formatMoney(bought.cost)}`;
      addLogEntry(s, message);
      unlockAchievements(s);
      result = { success: true, message };
    });
    return result;
  }

  function upgradeSpeed(): HireResult {
    let result: HireResult = { success: false, message: '' };
    setState(s => {
      const cost = buySpeed(s);
      if (cost === null) {
        result = { success: false, message: `Not enough money (need ${formatPrice(getSpeedCost(s.speedLevel))})` };
        return;
      }
      const message = `Faster: level ${s.speedLevel}, output ${formatMultiplier(getSpeedMultiplier(s.speedLevel))}`;
      addLogEntry(s, message);
      unlockAchievements(s);
      result = { success: true, message };
    });
    return result;
  }

  function recordSearch(found: boolean): void {
    setState(s => {
      s.searches += 1;
      if (found) s.searchesFound += 1;
      unlockAchievements(s);
    });
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
    latestPage,
    doublingMultipliers,
    doublingProgress,
    production,
    speedCost,
    speedMultiplier,
    achievementMultiplier: achievementMult,
    globalMultiplier: globalMult,
    features,
    tick,
    hire: tierId => hireBulk(tierId, 1),
    hireBulk,
    upgradeSpeed,
    recordSearch,
    reset,
  };
}

/**
 * Drive the game: tick every TICK_MS. Production is per second of game time,
 * so the interval only sets how smoothly numbers move. Call inside a reactive
 * owner; disposing it stops the loop.
 */
export function startTickLoop(game: GameStore): void {
  onSettled(() => {
    const id = setInterval(() => game.tick(TICK_MS), TICK_MS);
    return () => clearInterval(id);
  });
}
