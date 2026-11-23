import { TIERS, LOG_MAX_ENTRIES, createInitialState } from './config.js';
import { ACHIEVEMENTS } from './achievements.js';
import { UPGRADES } from './upgrades.js';
import { MAX_GUESSES, getPuzzle, isArrangement } from './puzzles.js';
import { INSIGHT_UPGRADES, automationUpgradeFor, insightBoostCap } from './insight.js';
import { Decimal } from './bignum.js';
import type { GameState, LogEntry, UnlockedAchievement } from './types.js';

/**
 * Saving and loading GameState, versioned.
 *
 * A save is a contract with every player's browser, so the format is spelled
 * out here (SavedStateV1) instead of being whatever JSON.stringify makes of
 * GameState. bigints are saved as decimal strings and Decimals as exact
 * [mantissa, exponent] pairs.
 *
 * Changing the format:
 * - Adding a field, tier, achievement or upgrade: no version bump. `hydrate` starts
 *   from createInitialState() and only copies fields that pass their checks,
 *   so anything missing from an old save gets its default.
 * - Renaming, retyping or changing the meaning of a saved field: bump
 *   SAVE_VERSION, add MIGRATIONS[old] turning an old-version `state` into the
 *   next version, update the Saved* type, and add a fixture
 *   (src/__fixtures__/save-vN.json) for the new version. Never edit an old
 *   fixture to make a test pass: that test is what proves old saves still load.
 */

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'library-of-babel:save';
/** Where an unreadable (or newer-version) save is copied before anything can overwrite it. */
export const BACKUP_KEY = `${SAVE_KEY}:backup`;

/** [mantissa, exponent] of a Decimal. */
export type SavedDecimal = [m: number, e: number];

export interface SavedStateV1 {
  pagesGenerated: string;
  currentPage: string;
  money: SavedDecimal;
  workers: Record<string, SavedDecimal>;
  playerWorkers: Record<string, number>;
  log: LogEntry[];
  fractionalPages: number;
  speedLevel: number;
  time: number;
  achievements: UnlockedAchievement[];
  searches: number;
  searchesFound: number;
  boostSeconds: number;
  /** Bought upgrade ids (added within v1; missing in older v1 saves). */
  upgrades: string[];
  // Reading Room (added within v1; missing in older v1 saves)
  insight: number;
  puzzlesSolved: string[];
  puzzlesFailed: string[];
  puzzleGuesses: Record<string, string[]>;
  insightUpgrades: Record<string, number>;
  automation: Record<string, boolean>;
}

export interface SaveFile {
  /** Format version of `state`. */
  v: number;
  /** Wall-clock time of the save (epoch ms), for offline boost. */
  savedAt: number;
  state: SavedStateV1;
}

/** Upgrades: MIGRATIONS[n] turns a version-n `state` into version n+1. */
export type Migrations = Record<number, (state: unknown) => unknown>;
export const MIGRATIONS: Migrations = {};

export type LoadResult =
  | { ok: true; state: GameState; savedAt: number }
  | { ok: false; reason: 'empty' | 'corrupt' | 'newer'; error: string };

// ─── Encoding ─────────────────────────────────────────────

const saveDecimal = (d: Decimal): SavedDecimal => [d.m, d.e];

export function toSaveFile(state: GameState, now: number): SaveFile {
  const workers: Record<string, SavedDecimal> = {};
  for (const [id, n] of Object.entries(state.workers)) workers[id] = saveDecimal(n);
  return {
    v: SAVE_VERSION,
    savedAt: now,
    state: {
      pagesGenerated: state.pagesGenerated.toString(),
      currentPage: state.currentPage.toString(),
      money: saveDecimal(state.money),
      workers,
      playerWorkers: { ...state.playerWorkers },
      log: state.log.map(({ timestamp, message }) => ({ timestamp, message })),
      fractionalPages: state._fractionalPages,
      speedLevel: state.speedLevel,
      time: state.time,
      achievements: state.achievements.map(({ id, at }) => ({ id, at })),
      searches: state.searches,
      searchesFound: state.searchesFound,
      boostSeconds: state.boostSeconds,
      upgrades: [...state.upgrades],
      insight: state.insight,
      puzzlesSolved: [...state.puzzlesSolved],
      puzzlesFailed: [...state.puzzlesFailed],
      puzzleGuesses: Object.fromEntries(Object.entries(state.puzzleGuesses).map(([id, g]) => [id, [...g]])),
      insightUpgrades: { ...state.insightUpgrades },
      automation: { ...state.automation },
    },
  };
}

export function encodeSave(state: GameState, now: number): string {
  return JSON.stringify(toSaveFile(state, now));
}

// ─── Decoding ─────────────────────────────────────────────

export function decodeSave(raw: string, migrations: Migrations = MIGRATIONS, version = SAVE_VERSION): LoadResult {
  let file: unknown;
  try {
    file = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'corrupt', error: 'Save is not valid JSON' };
  }
  if (!isObject(file) || !isInt(file.v) || file.v < 1 || !isObject(file.state)) {
    return { ok: false, reason: 'corrupt', error: 'Save is missing its version or state' };
  }
  if (file.v > version) {
    return { ok: false, reason: 'newer', error: `Save is from a newer version of the game (v${file.v})` };
  }

  let data: unknown = file.state;
  try {
    for (let v = file.v; v < version; v++) {
      const migrate = migrations[v];
      if (!migrate) return { ok: false, reason: 'corrupt', error: `No migration from save v${v}` };
      data = migrate(data);
    }
  } catch (err) {
    return { ok: false, reason: 'corrupt', error: `Migrating save failed: ${String(err)}` };
  }

  const savedAt = isFiniteNum(file.savedAt) ? file.savedAt : Date.now();
  return { ok: true, state: hydrate(data), savedAt };
}

/**
 * Build a GameState from current-version saved data. Every field is checked;
 * anything missing or malformed keeps its default, so this never throws.
 */
export function hydrate(data: unknown): GameState {
  const s = createInitialState();
  if (!isObject(data)) return s;

  const pagesGenerated = loadBigInt(data.pagesGenerated);
  if (pagesGenerated !== null) s.pagesGenerated = pagesGenerated;
  const currentPage = loadBigInt(data.currentPage);
  if (currentPage !== null) s.currentPage = currentPage;
  s.money = loadDecimal(data.money) ?? s.money;

  // Per-tier records: only current tiers, so new tiers keep defaults and removed ones drop out
  const workers = isObject(data.workers) ? data.workers : {};
  const playerWorkers = isObject(data.playerWorkers) ? data.playerWorkers : {};
  for (const tier of TIERS) {
    s.workers[tier.id] = loadDecimal(workers[tier.id]) ?? s.workers[tier.id]!;
    const bought = playerWorkers[tier.id];
    if (isInt(bought) && bought >= 0) s.playerWorkers[tier.id] = bought;
  }

  if (Array.isArray(data.log)) {
    s.log = data.log
      .filter((e): e is LogEntry => isObject(e) && typeof e.timestamp === 'string' && typeof e.message === 'string')
      .slice(-LOG_MAX_ENTRIES)
      .map(({ timestamp, message }) => ({ timestamp, message }));
  }

  if (isFiniteNum(data.fractionalPages) && data.fractionalPages >= 0 && data.fractionalPages < 1) {
    s._fractionalPages = data.fractionalPages;
  }
  if (isInt(data.speedLevel) && data.speedLevel >= 0) s.speedLevel = data.speedLevel;
  if (isFiniteNum(data.time) && data.time >= 0) s.time = data.time;
  if (isInt(data.searches) && data.searches >= 0) s.searches = data.searches;
  if (isInt(data.searchesFound) && data.searchesFound >= 0) s.searchesFound = data.searchesFound;

  if (Array.isArray(data.achievements)) {
    const known = new Set(ACHIEVEMENTS.map(a => a.id));
    const seen = new Set<string>();
    for (const a of data.achievements) {
      if (!isObject(a) || typeof a.id !== 'string' || !known.has(a.id) || seen.has(a.id)) continue;
      seen.add(a.id);
      s.achievements.push({ id: a.id, at: isFiniteNum(a.at) ? a.at : 0 });
    }
  }

  if (Array.isArray(data.upgrades)) {
    const known = new Set(UPGRADES.map(u => u.id));
    s.upgrades = [...new Set(data.upgrades.filter((id): id is string => typeof id === 'string' && known.has(id)))];
  }

  if (isFiniteNum(data.insight) && data.insight >= 0) s.insight = data.insight;
  const puzzleIds = (x: unknown): string[] =>
    Array.isArray(x) ? [...new Set(x.filter((id): id is string => typeof id === 'string' && getPuzzle(id) !== undefined))] : [];
  s.puzzlesSolved = puzzleIds(data.puzzlesSolved);
  // A puzzle is solved or lost, never both
  s.puzzlesFailed = puzzleIds(data.puzzlesFailed).filter(id => !s.puzzlesSolved.includes(id));
  if (isObject(data.puzzleGuesses)) {
    for (const [id, guesses] of Object.entries(data.puzzleGuesses)) {
      const puzzle = getPuzzle(id);
      if (!puzzle || !Array.isArray(guesses)) continue;
      const valid = guesses.filter((g): g is string => typeof g === 'string' && isArrangement(puzzle, g));
      if (valid.length) s.puzzleGuesses[id] = valid.slice(0, MAX_GUESSES);
    }
  }
  if (isObject(data.insightUpgrades)) {
    for (const u of INSIGHT_UPGRADES) {
      const level = data.insightUpgrades[u.id];
      if (isInt(level) && level > 0) s.insightUpgrades[u.id] = Math.min(u.maxLevel, level);
    }
  }
  if (isObject(data.automation)) {
    for (const [key, on] of Object.entries(data.automation)) {
      if (typeof on === 'boolean' && automationUpgradeFor(key) !== null) s.automation[key] = on;
    }
  }

  // After the Insight upgrades: Long Memory raises the cap
  if (isFiniteNum(data.boostSeconds) && data.boostSeconds >= 0) {
    s.boostSeconds = Math.min(insightBoostCap(s), data.boostSeconds);
  }
  return s;
}

function loadBigInt(x: unknown): bigint | null {
  return typeof x === 'string' && /^\d+$/.test(x) ? BigInt(x) : null;
}

function loadDecimal(x: unknown): Decimal | null {
  if (!Array.isArray(x) || x.length !== 2 || !isFiniteNum(x[0]) || !isInt(x[1])) return null;
  // fromParts leaves an already-normalised mantissa untouched, so this is exact
  return Decimal.fromParts(x[0], x[1]);
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isFiniteNum(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

function isInt(x: unknown): x is number {
  return Number.isSafeInteger(x);
}

// ─── Export / import strings ──────────────────────────────

/** The save as a base64 string the player can copy. */
export function exportSave(state: GameState, now: number = Date.now()): string {
  const bytes = new TextEncoder().encode(encodeSave(state, now));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Read a string from exportSave (raw save JSON is accepted too). */
export function importSave(text: string): LoadResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: 'empty', error: 'Paste a save first' };
  if (trimmed.startsWith('{')) return decodeSave(trimmed);
  const notASave: LoadResult = { ok: false, reason: 'corrupt', error: 'That is not a save string' };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) return notASave;
  let json: string;
  try {
    const binary = atob(trimmed);
    json = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
  } catch {
    return notASave;
  }
  return json.trimStart().startsWith('{') ? decodeSave(json) : notASave;
}

// ─── localStorage ─────────────────────────────────────────

/** localStorage, or null where it is unavailable (some private modes and sandboxed iframes throw on access). */
function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The save slot's exact contents (null if empty or storage is unavailable). */
export function readRawSave(storage: Storage | null = defaultStorage()): string | null {
  try {
    return storage?.getItem(SAVE_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Load the saved game. An unreadable or newer-version save is copied to
 * BACKUP_KEY so a later write can't destroy it.
 */
export function readSave(storage: Storage | null = defaultStorage()): LoadResult {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(SAVE_KEY) ?? null;
  } catch {
    // Unavailable storage reads as no save
  }
  if (raw === null) return { ok: false, reason: 'empty', error: 'No save' };

  const result = decodeSave(raw);
  if (!result.ok) {
    try {
      storage?.setItem(BACKUP_KEY, raw);
    } catch {
      // Nothing more we can do
    }
  }
  return result;
}

/** Save the game. Returns false if storage is unavailable or full. */
export function writeSave(state: GameState, storage: Storage | null = defaultStorage(), now: number = Date.now()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, encodeSave(state, now));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage: Storage | null = defaultStorage()): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    // Unavailable storage has nothing to clear
  }
}
