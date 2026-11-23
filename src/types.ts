import type { Decimal } from './bignum.js';

// ─── Worker Tiers ──────────────────────────────────────────

export interface Tier {
  id: string;
  name: string;
  baseCost: number;
  /** Each purchase multiplies the next price by this. */
  costGrowth: number;
  /** Workers of the tier below that one worker makes per second (0 for writers, who make pages). */
  rate: number;
}

export type TierId = 'writer' | 'manager' | 'overseer' | 'rector' | 'cardinal' | 'pope' | 'archbishop';

// ─── Storage Scale ────────────────────────────────────────

export interface StorageTier {
  id: string;
  name: string;
  emoji: string;
  multiplier: bigint;
}

export type StorageTierId =
  | 'hardDrive'
  | 'server'
  | 'serverRack'
  | 'serverFloor'
  | 'building'
  | 'city'
  | 'planet'
  | 'solarSystem'
  | 'galaxy'
  | 'universe';

export type LocationTuple = Record<string, bigint>;

// ─── Game State ───────────────────────────────────────────

export interface LogEntry {
  timestamp: string;
  message: string;
}

export interface UnlockedAchievement {
  id: string;
  /** Game time (seconds) when it was unlocked. */
  at: number;
}

export interface HireResult {
  success: boolean;
  message: string;
}

export interface GameState {
  pagesGenerated: bigint;
  currentPage: bigint;
  money: Decimal;
  /** Workers per tier, including those produced by the tier above (fractional). */
  workers: Record<string, Decimal>;
  /** Workers the player bought per tier (sets prices and doubling bonuses). */
  playerWorkers: Record<string, number>;
  /** Recent events, oldest first. */
  log: LogEntry[];
  _fractionalPages: number;
  /** Levels of the "Faster" upgrade bought. */
  speedLevel: number;
  /** Seconds of play (game time, advanced by ticks). */
  time: number;
  /** Unlocked achievements, oldest first. */
  achievements: UnlockedAchievement[];
  /** Searches made, and how many found an already-written page (for achievements). */
  searches: number;
  searchesFound: number;
  /** Seconds of offline boost left (banked from time away, spent by ticks). */
  boostSeconds: number;
  /** Bought upgrade ids, in purchase order. */
  upgrades: string[];
  /** Insight: the Reading Room's currency, earned by solving puzzles. */
  insight: number;
  /** Solved puzzle ids, in solve order. */
  puzzlesSolved: string[];
  /** Lost puzzle ids (out of guesses, or given up), in order. They never come back. */
  puzzlesFailed: string[];
  /** Guesses made so far per puzzle, oldest first. */
  puzzleGuesses: Record<string, string[]>;
  /** Level of each Insight upgrade bought (missing: 0). */
  insightUpgrades: Record<string, number>;
  /** Automation switches the player turned off (missing or true: on). */
  automation: Record<string, boolean>;
}

// ─── Search ───────────────────────────────────────────────

export type SearchResult =
  | { type: 'found'; address: bigint; content: string; location: LocationTuple }
  | { type: 'notFound'; address: bigint; pagesGenerated: bigint };
