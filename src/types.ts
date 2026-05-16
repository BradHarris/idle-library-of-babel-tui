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
  // Core state
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

  // Derived state
  pps: number;
  canAfford: Record<string, boolean>;
  tickInterval: number;
  tickSpeedMultiplier: number;
  latestPage: string;
  doublingMultipliers: Record<string, number>;
  doublingProgress: Record<string, number>;
}

export interface GameActions {
  tick: (deltaMs: number) => void;
  hire: (tierId: string) => HireResult;
  hireBulk: (tierId: string, count: number) => HireResult;
  upgradeTickRate: () => HireResult;
  reset: () => void;
}

// ─── Search ───────────────────────────────────────────────

export type SearchResult =
  | { type: 'found'; address: bigint; content: string; location: LocationTuple }
  | { type: 'notFound'; address: bigint; pagesGenerated: bigint };

// ─── UI Component Props ───────────────────────────────────

export interface StatsPanelProps {
  pagesGenerated: bigint;
  currentPage: bigint;
  money: number;
  pagesPerSecond: number;
  tickRateLevel: number;
  tickRateCost: number;
}

export interface LatestPagePanelProps {
  currentPage: bigint;
  latestPage: string;
  wrapWidth?: number;
}

export interface WorkersPanelProps {
  playerWorkers: Record<string, number>;
  doublingMultipliers: Record<string, number>;
  doublingProgress: Record<string, number>;
  canAfford: Record<string, boolean>;
}

export interface LogPanelProps {
  log: LogEntry[];
}

export interface StorageScalePanelProps {
  pagesGenerated: bigint;
}

export interface SearchOverlayProps {
  searchQuery: string;
  searchResult: SearchResult | null;
  inputValue: string;
}
