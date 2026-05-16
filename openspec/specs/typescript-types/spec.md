# Capability: TypeScript Types

**Purpose:** Centralized TypeScript type definitions shared across the TUI and web frontends, with strict type checking configuration.

## Requirements

### Requirement: Centralized type definitions module exists
The project SHALL contain a single `src/types.ts` module that exports all shared TypeScript type definitions used across the TUI and web frontends. Type definitions SHALL NOT be duplicated across modules.

#### Scenario: Types module is importable
- **WHEN** any source file imports from `./types.js` or `@game/types.js`
- **THEN** all shared type definitions are accessible

#### Scenario: No duplicate type definitions exist
- **WHEN** two different modules need the same type (e.g., `GameState`)
- **THEN** both modules import it from `src/types.ts` rather than defining it locally

### Requirement: Worker tier type definitions
The `src/types.ts` module SHALL export a `Tier` interface with fields `id: string`, `name: string`, and `baseCost: number`, and a `TierId` union type of all valid tier identifiers. The `TIERS` array in `src/config.ts` SHALL be typed as `readonly Tier[]`.

#### Scenario: Tier type covers all fields
- **WHEN** a `Tier` typed value is inspected
- **THEN** it has string `id`, string `name`, and number `baseCost` fields

#### Scenario: TierId union is exhaustive
- **WHEN** the `TierId` type is inspected
- **THEN** it is a union of all seven tier identifiers: `'writer' | 'manager' | 'overseer' | 'rector' | 'cardinal' | 'pope' | 'archbishop'`

#### Scenario: TIERS array is typed
- **WHEN** the `TIERS` export from `config.ts` is inspected
- **THEN** TypeScript infers its type as `readonly Tier[]`

### Requirement: Storage tier type definitions
The `src/types.ts` module SHALL export a `StorageTier` interface with fields `id: string`, `name: string`, `emoji: string`, and `multiplier: bigint`, and a `StorageTierId` union type of all valid storage tier identifiers.

#### Scenario: Storage tier type covers all fields
- **WHEN** a `StorageTier` typed value is inspected
- **THEN** it has string `id`, string `name`, string `emoji`, and bigint `multiplier` fields

#### Scenario: StorageTierId union is exhaustive
- **WHEN** the `StorageTierId` type is inspected
- **THEN** it is a union of all ten storage tier identifiers: `'hardDrive' | 'server' | 'serverRack' | 'serverFloor' | 'building' | 'city' | 'planet' | 'solarSystem' | 'galaxy' | 'universe'`

### Requirement: Game state type definitions
The `src/types.ts` module SHALL export a `GameState` interface covering all state fields in the Zustand store: `pagesGenerated` (bigint), `currentPage` (bigint), `money` (number), `workers` (Record<string, number>), `playerWorkers` (Record<string, number>), `log` (LogEntry[]), `_tickCount` (number), `_fractionalPages` (number), `tickRateLevel` (number), `tickRateCost` (number), `pps` (number), `canAfford` (Record<string, boolean>), `tickInterval` (number), `tickSpeedMultiplier` (number), `latestPage` (string), `doublingMultipliers` (Record<string, number>), and `doublingProgress` (Record<string, number>).

#### Scenario: GameState contains all store fields
- **WHEN** a value typed as `GameState` is accessed
- **THEN** TypeScript recognizes all state fields with correct types

#### Scenario: Bigint and number fields are distinct
- **WHEN** `pagesGenerated` (bigint) and `money` (number) are accessed from `GameState`
- **THEN** TypeScript prevents assigning a `number` to `pagesGenerated` and a `bigint` to `money`

### Requirement: Log entry type definition
The `src/types.ts` module SHALL export a `LogEntry` interface with fields `timestamp: string` and `message: string`.

#### Scenario: LogEntry has timestamp and message
- **WHEN** a value typed as `LogEntry` is created
- **THEN** it must have a `timestamp` string and a `message` string

### Requirement: Hire result type definition
The `src/types.ts` module SHALL export a `HireResult` interface with fields `success: boolean` and `message: string`.

#### Scenario: HireResult has success and message
- **WHEN** a `hire` or `upgradeTickRate` action returns a value
- **THEN** the value is typed as `HireResult` with boolean `success` and string `message`

### Requirement: Search result type definitions
The `src/types.ts` module SHALL export a `SearchResult` discriminated union type with variants `{ type: 'found', address: bigint, content: string, location: Record<string, bigint> }` and `{ type: 'notFound', address: bigint, pagesGenerated: bigint }`.

#### Scenario: Found search result typed correctly
- **WHEN** a search finds a result within generated pages
- **THEN** the result is typed as `{ type: 'found', address: bigint, content: string, location: Record<string, bigint> }`

#### Scenario: NotFound search result typed correctly
- **WHEN** a search result is beyond generated pages
- **THEN** the result is typed as `{ type: 'notFound', address: bigint, pagesGenerated: bigint }`

#### Scenario: TypeScript narrows on type discriminator
- **WHEN** a `SearchResult` value is checked with `result.type === 'found'`
- **THEN** TypeScript narrows to the found variant and `result.content` is accessible without type assertion

### Requirement: UI component prop type definitions
The `src/types.ts` module SHALL export prop interfaces for all UI components: `StatsPanelProps`, `LatestPagePanelProps`, `WorkersPanelProps`, `LogPanelProps`, `StorageScalePanelProps`, and `SearchOverlayProps`. Each interface SHALL type all props currently passed to the component.

#### Scenario: StatsPanelProps covers all props
- **WHEN** `StatsPanel` is rendered
- **THEN** its props are typed as `StatsPanelProps` with `pagesGenerated: bigint`, `currentPage: bigint`, `money: number`, `pagesPerSecond: number`, `tickRateLevel: number`, and `tickRateCost: number`

#### Scenario: WorkersPanelProps covers all props
- **WHEN** `WorkersPanel` is rendered
- **THEN** its props are typed as `WorkersPanelProps` with `playerWorkers: Record<string, number>`, `doublingMultipliers: Record<string, number>`, `doublingProgress: Record<string, number>`, and `canAfford: Record<string, boolean>`

#### Scenario: SearchOverlayProps covers all props
- **WHEN** `SearchOverlay` is rendered
- **THEN** its props are typed with `searchQuery: string`, `searchResult: SearchResult | null`, and `inputValue: string`

### Requirement: Game actions type definition
The `src/types.ts` module SHALL export a `GameActions` interface defining the Zustand store action signatures: `tick(deltaMs: number): void`, `hire(tierId: string): HireResult`, `hireBulk(tierId: string, count: number): HireResult`, `upgradeTickRate(): HireResult`, and `reset(): void`.

#### Scenario: GameActions matches store implementation
- **WHEN** the Zustand store is created with `create<GameState & GameActions>()`
- **THEN** TypeScript verifies all action implementations match the interface signatures

### Requirement: tsconfig.json enforces strict type checking
The project SHALL include a `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `noEmit: true`, `target: "ES2022"`, `module: "ES2022"`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, and path aliases mapping `@game/*` to `./src/*`.

#### Scenario: Type check succeeds on valid code
- **WHEN** `npx tsc --noEmit` is run
- **THEN** no type errors are reported for correct TypeScript code

#### Scenario: Path aliases resolve correctly
- **WHEN** a file in `web/src/` imports from `@game/stores/gameStore`
- **THEN** TypeScript resolves the import to `./src/stores/gameStore.ts`

#### Scenario: Unchecked indexed access is caught
- **WHEN** code accesses `workers['nonexistent']` without a guard
- **THEN** TypeScript reports a type error due to `noUncheckedIndexedAccess`

### Requirement: Source files use TypeScript extensions
All source files in `src/` SHALL use `.ts` or `.tsx` extensions. No `.js` or `.jsx` source files SHALL remain in the project (excluding build output and node_modules).

#### Scenario: No .js files in src
- **WHEN** the `src/` directory is inspected
- **THEN** all source files have `.ts` or `.tsx` extensions

#### Scenario: No .jsx files in web/src
- **WHEN** the `web/src/` directory is inspected
- **THEN** all source files have `.tsx` or `.ts` extensions

### Requirement: Config module exports typed constants
The `src/config.ts` module SHALL export `TIERS` as `readonly Tier[]`, `STORAGE_TIERS` as `readonly StorageTier[]`, typed constant primitives (`TICK_INTERVAL`, `RENDER_INTERVAL`, `EARNINGS_PER_PAGE`, `PRNG_SEED_BITS`, `LOG_MAX_ENTRIES`, `LOG_CLEANUP_INTERVAL_TICKS`, `TICK_RATE_BASE_COST`, `TICK_RATE_MIN_INTERVAL`, `TICK_RATE_IMPROVEMENT_MS`, `TICK_RATE_CAP_LEVEL`), and typed functions (`createInitialState`, `getWorkerCost`, `getDoublingThresholds`, `getDoublingMultiplier`, `getDoublingProgress`, `getTickInterval`, `getTickSpeedMultiplier`, `calcPagesPerSecond`).

#### Scenario: createInitialState return type
- **WHEN** `createInitialState()` is called
- **THEN** the return value is typed with all state fields matching the initial state shape

#### Scenario: getWorkerCost parameter types
- **WHEN** `getWorkerCost` is called with a `Tier` and a `number`
- **THEN** TypeScript enforces the `tier: Tier` and `playerBoughtCount: number` parameter types
