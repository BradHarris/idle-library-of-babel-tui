// ─── Worker Tiers ──────────────────────────────────────────

export interface Tier {
  id: string;
  name: string;
  baseCost: number;
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

export interface HireResult {
  success: boolean;
  message: string;
}

export interface GameState {
  pagesGenerated: bigint;
  currentPage: bigint;
  money: number;
  workers: Record<string, number>;
  playerWorkers: Record<string, number>;
  log: LogEntry[];
  _tickCount: number;
  _fractionalPages: number;
  tickRateLevel: number;
  tickRateCost: number;
}

// ─── Search ───────────────────────────────────────────────

export type SearchResult =
  | { type: 'found'; address: bigint; content: string; location: LocationTuple }
  | { type: 'notFound'; address: bigint; pagesGenerated: bigint };
