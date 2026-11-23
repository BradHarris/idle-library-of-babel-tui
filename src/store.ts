import { createEffect, createMemo, createSignal, createStore, onSettled, snapshot, type Accessor, type Store } from 'solid-js';
import {
  TIERS,
  TICK_MS,
  AUTOSAVE_MS,
  LOG_MAX_ENTRIES,
  createInitialState,
  getWorkerCost,
  getDoublingMultiplier,
  getDoublingProgress,
  getSpeedCost,
  getSpeedMultiplier,
} from './config.js';
import { FEATURE_UNLOCKS, achievementMultiplier, checkAchievements, hasAchievement } from './achievements.js';
import {
  advance,
  bankOffline,
  buySpeed,
  buyWorkers,
  globalMultiplier,
  pagesPerSecond,
  productionPerSecond,
  tierMultiplier,
} from './economy.js';
import {
  availableUpgrades,
  buyUpgrade,
  getUpgrade,
  isUnlocked,
  nextLocked,
  requirementText,
  upgradeGlobalMultiplier,
  type Upgrade,
} from './upgrades.js';
import {
  getPuzzle,
  giveUp,
  nextPuzzle,
  openPuzzles,
  puzzlesUnlockedBetween,
  submitGuess,
  unlockedPuzzles,
  type GuessResult,
  type Puzzle,
} from './puzzles.js';
import {
  achievementBonus,
  automationUpgradeFor,
  buyInsightUpgrade,
  getInsightUpgrade,
  insightBoostMultiplier,
  insightCost,
  insightLevel,
  isMaxed,
  speedFactor,
} from './insight.js';
import { runAutomation } from './automation.js';
import { Decimal } from './bignum.js';
import { generatePage } from './page.js';
import { formatDuration, formatMoney, formatMultiplier, formatPrice } from './format.js';
import { SAVE_KEY, clearSave, readRawSave, writeSave } from './save.js';
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
  /** Each tier's whole output multiplier: doubling bonus × upgrades. */
  readonly tierMultipliers: Accessor<Record<string, number>>;
  /** Workers of the tier below that each tier makes per second (0 for writers). */
  readonly production: Accessor<Record<string, Decimal>>;
  readonly speedCost: Accessor<Decimal>;
  readonly speedMultiplier: Accessor<Decimal>;
  readonly achievementMultiplier: Accessor<Decimal>;
  /** Page output multiplier from bought global upgrades. */
  readonly upgradeMultiplier: Accessor<Decimal>;
  /** Unlocked upgrades not yet bought. */
  readonly availableUpgrades: Accessor<Upgrade[]>;
  /** The next locked upgrade in each group, as teasers. */
  readonly lockedUpgrades: Accessor<Upgrade[]>;
  /** How many upgrades can be bought right now ("Faster" counts as one). */
  readonly purchasableUpgrades: Accessor<number>;
  /** "Faster" × achievements × upgrades: multiplies page output. */
  readonly globalMultiplier: Accessor<Decimal>;
  /** Features unlocked by achievements. */
  readonly features: Accessor<{ hireNext: boolean; hireMax: boolean }>;
  /** Offline boost: whether it's running, whole seconds left and its output multiplier. */
  readonly boost: Accessor<{ active: boolean; secondsLeft: number; multiplier: number }>;
  /** What each "Faster" level multiplies output by (more with Haste). */
  readonly speedFactor: Accessor<number>;
  /** Puzzles whose page has been written, in unlock order. */
  readonly unlockedPuzzles: Accessor<Puzzle[]>;
  /** Puzzles waiting to be played (neither solved nor lost). The first is the current one. */
  readonly openPuzzles: Accessor<Puzzle[]>;
  /** The next puzzle still to turn up. */
  readonly nextPuzzle: Accessor<Puzzle | undefined>;

  // Actions
  tick(deltaMs: number): void;
  hire(tierId: string): HireResult;
  hireBulk(tierId: string, count: number): HireResult;
  upgradeSpeed(): HireResult;
  buyUpgrade(id: string): HireResult;
  /** Guess the answer to puzzle `id`. */
  guessPuzzle(id: string, guess: string): GuessResult;
  /** Give up on puzzle `id`: it is lost, with no reward. */
  giveUpPuzzle(id: string): HireResult;
  /** Buy the next level of an Insight upgrade. */
  buyInsightUpgrade(id: string): HireResult;
  /** Switch one piece of bought automation on or off. */
  setAutomation(key: string, on: boolean): void;
  /** Note a search (for achievements); `found` if the page was already written. */
  recordSearch(found: boolean): void;
  /** Bank `awaySeconds` of time away as offline boost; returns the boost seconds added. */
  bankOffline(awaySeconds: number): number;
  /** Replace the whole game, e.g. with an imported save. */
  load(state: GameState): void;
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

/**
 * Bank time away as offline boost and log it. Mutates `state`: a store draft,
 * or a plain loaded save before it goes into the store. Returns the boost
 * seconds added.
 */
export function welcomeBack(state: GameState, awaySeconds: number): number {
  const added = bankOffline(state, awaySeconds);
  if (added >= 1) {
    addLogEntry(
      state,
      `Welcome back: away ${formatDuration(awaySeconds)}, ${insightBoostMultiplier(state)}× output for ${formatDuration(state.boostSeconds)}`
    );
  }
  return added;
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

/** Memo options for upgrade and puzzle lists: the same items in the same order don't notify. */
const upgradeListEquals = {
  equals: <T,>(a: T[], b: T[]) => a.length === b.length && a.every((u, i) => u === b[i]),
};

/** Automation runs once per this many seconds of game time. */
const AUTOMATION_INTERVAL = 1;

function perTier<T>(fn: (tierId: string, index: number) => T): Record<string, T> {
  const result: Record<string, T> = {};
  TIERS.forEach((tier, i) => (result[tier.id] = fn(tier.id, i)));
  return result;
}

export function createGameStore(initial?: GameState): GameStore {
  const [state, setState] = createStore<GameState>(initial ?? createInitialState());

  const speed = createMemo(() => speedFactor(state));
  const speedMultiplier = createMemo(() => getSpeedMultiplier(state.speedLevel, speed()), decimalEquals);
  const speedCost = createMemo(() => getSpeedCost(state.speedLevel), decimalEquals);
  const achievementMult = createMemo(() => achievementMultiplier(state.achievements.length, achievementBonus(state)), decimalEquals);
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
  const tierMultipliers = createMemo(() => perTier(id => tierMultiplier(state, id)), { equals: sameRecord });
  const upgradeMult = createMemo(() => upgradeGlobalMultiplier(state), decimalEquals);
  const available = createMemo(() => availableUpgrades(state), upgradeListEquals);
  const locked = createMemo(() => nextLocked(state), upgradeListEquals);
  const purchasable = createMemo(
    () => available().filter(u => state.money.gte(u.cost)).length + (state.money.gte(speedCost()) ? 1 : 0)
  );
  const features = createMemo(
    () => ({
      hireNext: hasAchievement(state, FEATURE_UNLOCKS.hireNext),
      hireMax: hasAchievement(state, FEATURE_UNLOCKS.hireMax),
    }),
    { equals: (a, b) => a.hireNext === b.hireNext && a.hireMax === b.hireMax }
  );
  const boost = createMemo(
    () => ({
      active: state.boostSeconds > 0,
      secondsLeft: Math.ceil(state.boostSeconds),
      multiplier: insightBoostMultiplier(state),
    }),
    {
      equals: (a, b) => a.active === b.active && a.secondsLeft === b.secondsLeft && a.multiplier === b.multiplier,
    }
  );
  const unlocked = createMemo(() => unlockedPuzzles(state), upgradeListEquals);
  const open = createMemo(() => openPuzzles(state), upgradeListEquals);
  const next = createMemo(() => nextPuzzle(state));

  // Game seconds since automation last ran. Not saved: losing up to a second of it on reload doesn't matter
  let sinceAutomation = 0;

  function tick(deltaMs: number): void {
    setState(s => {
      const before = s.pagesGenerated;
      advance(s, deltaMs / 1000);
      for (const puzzle of puzzlesUnlockedBetween(before, s.pagesGenerated)) {
        addLogEntry(s, `A scrambled page turned up: "${puzzle.scramble}" (${puzzle.length} letters)`);
      }
      sinceAutomation += deltaMs / 1000;
      if (sinceAutomation >= AUTOMATION_INTERVAL) {
        sinceAutomation = 0;
        runAutomation(s);
      }
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
      const message = `Faster: level ${s.speedLevel}, output ${formatMultiplier(getSpeedMultiplier(s.speedLevel, speedFactor(s)))}`;
      addLogEntry(s, message);
      unlockAchievements(s);
      result = { success: true, message };
    });
    return result;
  }

  function purchaseUpgrade(id: string): HireResult {
    const upgrade = getUpgrade(id);
    if (!upgrade) return { success: false, message: 'Unknown upgrade' };

    let result: HireResult = { success: false, message: '' };
    setState(s => {
      if (s.upgrades.includes(id)) {
        result = { success: false, message: 'Already bought' };
        return;
      }
      if (buyUpgrade(s, id) === null) {
        result = isUnlocked(s, upgrade)
          ? { success: false, message: `Not enough money (need ${formatPrice(upgrade.cost)})` }
          : { success: false, message: `Locked: ${requirementText(upgrade)}` };
        return;
      }
      const message = `Upgrade: ${upgrade.name} (${upgrade.description})`;
      addLogEntry(s, message);
      unlockAchievements(s);
      result = { success: true, message };
    });
    return result;
  }

  function guessPuzzle(id: string, guess: string): GuessResult {
    let result: GuessResult = { ok: false, message: '' };
    setState(s => {
      result = submitGuess(s, id, guess);
      if (result.ok && result.solved) {
        addLogEntry(s, `Unscrambled "${getPuzzle(id)!.word}": +${result.reward} insight`);
        unlockAchievements(s);
      }
      if (result.ok && result.lost) addLogEntry(s, `Out of guesses: the word was "${getPuzzle(id)!.word}"`);
    });
    return result;
  }

  function giveUpPuzzle(id: string): HireResult {
    let result: HireResult = { success: false, message: 'Not an open puzzle' };
    setState(s => {
      if (!giveUp(s, id)) return;
      const message = `Gave up: the word was "${getPuzzle(id)!.word}"`;
      addLogEntry(s, message);
      result = { success: true, message };
    });
    return result;
  }

  function purchaseInsightUpgrade(id: string): HireResult {
    const upgrade = getInsightUpgrade(id);
    if (!upgrade) return { success: false, message: 'Unknown upgrade' };

    let result: HireResult = { success: false, message: '' };
    setState(s => {
      if (isMaxed(s, upgrade)) {
        result = { success: false, message: 'Already at the top level' };
        return;
      }
      const cost = insightCost(upgrade, insightLevel(s, id));
      if (buyInsightUpgrade(s, id) === null) {
        result = { success: false, message: `Not enough insight (need ${cost})` };
        return;
      }
      const level = insightLevel(s, id);
      const message =
        upgrade.maxLevel === 1 ? `Insight: ${upgrade.name}` : `Insight: ${upgrade.name} level ${level} (${upgrade.description})`;
      addLogEntry(s, message);
      unlockAchievements(s);
      result = { success: true, message };
    });
    return result;
  }

  function setAutomation(key: string, on: boolean): void {
    if (automationUpgradeFor(key) === null) return;
    setState(s => {
      s.automation[key] = on;
    });
  }

  function recordSearch(found: boolean): void {
    setState(s => {
      s.searches += 1;
      if (found) s.searchesFound += 1;
      unlockAchievements(s);
    });
  }

  function bankAway(awaySeconds: number): number {
    let added = 0;
    setState(s => {
      added = welcomeBack(s, awaySeconds);
    });
    return added;
  }

  function load(next: GameState): void {
    // Returning a value from the setter replaces the store's top-level fields
    setState(() => next);
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
    tierMultipliers,
    production,
    speedCost,
    speedMultiplier,
    achievementMultiplier: achievementMult,
    globalMultiplier: globalMult,
    upgradeMultiplier: upgradeMult,
    availableUpgrades: available,
    lockedUpgrades: locked,
    purchasableUpgrades: purchasable,
    features,
    boost,
    speedFactor: speed,
    unlockedPuzzles: unlocked,
    openPuzzles: open,
    nextPuzzle: next,
    tick,
    hire: tierId => hireBulk(tierId, 1),
    hireBulk,
    upgradeSpeed,
    buyUpgrade: purchaseUpgrade,
    guessPuzzle,
    giveUpPuzzle,
    buyInsightUpgrade: purchaseInsightUpgrade,
    setAutomation,
    recordSearch,
    bankOffline: bankAway,
    load,
    reset,
  };
}

/** Real-time gaps longer than this between ticks (a throttled or suspended tab) are banked as offline boost. */
export const MAX_TICK_GAP_MS = 1000;

/**
 * Drive the game: tick every `intervalMs()` (default TICK_MS) by the real time
 * elapsed. Production is per second of game time, so the interval only sets
 * how smoothly numbers move (an FPS cap). Changing it restarts the timer
 * without losing time. Browsers throttle timers in hidden tabs, so a long gap
 * is treated as time away and banked as offline boost. While `running()` is
 * false nothing ticks. Call inside a reactive owner; disposing it stops the loop.
 */
export function startTickLoop(
  game: GameStore,
  intervalMs: Accessor<number> = () => TICK_MS,
  running: Accessor<boolean> = () => true
): void {
  let last = Date.now();
  createEffect(
    () => (running() ? intervalMs() : null),
    ms => {
      if (ms === null) return;
      const id = setInterval(() => {
        const now = Date.now();
        const elapsed = now - last;
        last = now;
        if (elapsed <= 0) return;
        if (elapsed > MAX_TICK_GAP_MS) game.bankOffline(elapsed / 1000);
        else game.tick(elapsed);
      }, ms);
      return () => clearInterval(id);
    }
  );
}

export interface AutosaveOptions {
  /** False leaves the existing save untouched (e.g. it's from a newer version) until `save(true)`. */
  enabled?: boolean;
  /** Defaults to localStorage. */
  storage?: Storage | null;
}

export interface Autosave {
  /**
   * Save the committed state now. `force` also turns autosave back on, for
   * explicit player actions (import, reset) that may overwrite a save we
   * couldn't load. Returns false if nothing was written.
   */
  save(force?: boolean): boolean;
  /** Remove the save (for a reset). Returns false if halted instead. */
  clear(): boolean;
  /**
   * True once another tab (or another build of the game) has written the save
   * since this tab last read or wrote it. A halted tab never writes again and
   * should stop the game and ask for a reload.
   */
  readonly halted: Accessor<boolean>;
}

/**
 * Save every AUTOSAVE_MS, when the tab is hidden and when the page unloads.
 *
 * Several tabs can run the game at once, all sharing one save slot. So this
 * tab remembers the exact save it last read or wrote, and before every write
 * (and whenever the browser reports another tab's write) it checks the slot
 * still holds that. If not, someone else saved after us: overwriting would
 * destroy their progress, so it halts instead.
 *
 * Call inside a reactive owner, in the same task as the readSave() that
 * loaded the game; disposing it stops.
 */
export function startAutosave(game: GameStore, options: AutosaveOptions = {}): Autosave {
  let enabled = options.enabled !== false;
  // The slot as this tab last saw it: what it loaded, then what it wrote
  let known = readRawSave(options.storage);
  // Plain flag for the checks (signal reads lag writes until the flush); the signal is for the UI
  let stopped = false;
  const [halted, setHalted] = createSignal(false);

  /** Halt if the slot no longer holds what this tab last saw. */
  const changedElsewhere = (): boolean => {
    if (stopped) return true;
    if (readRawSave(options.storage) === known) return false;
    stopped = true;
    setHalted(true);
    return true;
  };

  const save = (force = false): boolean => {
    if (stopped) return false;
    if (force) enabled = true;
    if (!enabled || changedElsewhere()) return false;
    // Committed state (as of the last flush): a tick's lag doesn't matter for a save
    const state = snapshot(game.state) as GameState;
    const written = options.storage === undefined ? writeSave(state) : writeSave(state, options.storage);
    if (written) known = readRawSave(options.storage);
    return written;
  };

  const clear = (): boolean => {
    if (changedElsewhere()) return false;
    clearSave(options.storage);
    known = readRawSave(options.storage);
    return true;
  };

  onSettled(() => {
    const id = setInterval(() => save(), AUTOSAVE_MS);
    if (typeof document === 'undefined') return () => clearInterval(id);
    const onHide = () => {
      if (document.visibilityState === 'hidden') save();
    };
    const onPageHide = () => save();
    // Fires in every other tab when one writes localStorage (key null: cleared)
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVE_KEY || e.key === null) changedElsewhere();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('storage', onStorage);
    };
  });
  return { save, clear, halted };
}
