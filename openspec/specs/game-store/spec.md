# game-store Specification

## Purpose
TBD - created by archiving change zustand-game-store. Update Purpose after archive.
## Requirements
### Requirement: Game state is managed by a Zustand store
The system SHALL maintain all game state (pages generated, current page, money, workers, log, tick rate level, tick rate cost, fractional pages) in a single Zustand store at `stores/gameStore.ts`. The store SHALL provide actions for tick, hiring, tick rate upgrades, and reset.

#### Scenario: Store exposes raw state
- **WHEN** a component calls `useGameStore(s => s.money)`
- **THEN** the component receives the current raw game state value and re-renders when it changes

#### Scenario: Store provides derived getters
- **WHEN** a component calls `useGameStore(s => s.pps)`
- **THEN** the component receives pages-per-second computed from worker counts

#### Scenario: Store provides computed affordability
- **WHEN** a component calls `useGameStore(s => s.canAfford)`
- **THEN** the component receives an object mapping each tier id to a boolean indicating if the player can afford one more worker of that tier

### Requirement: Tick action accepts elapsed time parameter
The store's tick action SHALL accept elapsed time in milliseconds as a parameter: `tick(deltaMs: number)`. It SHALL calculate pages produced based on the delta, update money, track fractional pages, and advance the page counter when boundaries are crossed. It SHALL NOT read `Date.now()` internally.

#### Scenario: Tick produces pages proportional to elapsed time
- **WHEN** the player has 2 writers and calls `tick(1000)` (1 second)
- **THEN** 2 pages are generated (2 writers × 1 page/sec × 1 sec)

#### Scenario: Tick handles sub-second intervals
- **WHEN** the player has 4 writers and calls `tick(500)` (0.5 seconds)
- **THEN** 2 pages are accumulated in fractional tracking (4 × 0.5)

#### Scenario: Tick handles fractional page accumulation
- **WHEN** the player has 1 writer and calls `tick(750)` then `tick(250)`
- **THEN** exactly 1 page is generated across both ticks (0.75 + 0.25 = 1.0)

#### Scenario: Tick updates money correctly
- **WHEN** the player has 3 writers and calls `tick(2000)` (2 seconds)
- **THEN** money increases by $6.00 (3 pages × $1/earnings × 2 seconds)

#### Scenario: Tick triggers page generation at boundary crossing
- **WHEN** fractional pages reach or exceed 1.0 after a tick
- **THEN** `pagesGenerated` and `currentPage` are incremented by the whole pages, and a new page is generated via `generatePage(pageNum)`

### Requirement: Worker cascade is transitive and deterministic
When a tick occurs, each tier SHALL spawn workers of the tier below it. The number of workers spawned is the sum of all workers from tiers above it (transitive cascade). The cascade SHALL be computed from a snapshot of original worker counts before any modifications.

#### Scenario: Single-tier cascade
- **WHEN** the player has {writer:1, overseer:1, all others:0} and calls `tick(0)` (zero-delta tick)
- **THEN** the resulting workers are {writer:2, manager:1, overseer:1, all others:0}

#### Scenario: Multi-tier cascade with multiple tiers
- **WHEN** the player has {writer:1, manager:2, overseer:3, all others:0} and calls `tick(0)`
- **THEN** the resulting workers are {writer:6, manager:5, overseer:4, all others:0} (writer: 1+2+3=6, manager: 2+3=5, overseer: 3)

#### Scenario: Zero-delta tick preserves all state except cascade
- **WHEN** the player calls `tick(0)` with any state
- **THEN** money, pages, log, and tick rate level remain unchanged; only worker counts are updated via cascade

### Requirement: Hire action is a pure purchase operation
The store's hire action SHALL accept a tier id and return `{success: boolean, message: string}`. It SHALL deduct the correct cost from money, increment the worker count, and append a log entry. If the player cannot afford the worker, it SHALL return `{success: false, message: "Not enough money (need $X.XX)"}`.

#### Scenario: Successful hire
- **WHEN** the player has $500 and calls `hire('manager')` (base cost $500)
- **THEN** money becomes $0, manager count becomes 1, and a log entry "Hired Manager for $500.00" is created

#### Scenario: Failed hire — insufficient funds
- **WHEN** the player has $499 and calls `hire('manager')` (cost $500)
- **THEN** money, worker counts, and log remain unchanged; returns `{success: false}`

#### Scenario: Worker cost scales with count
- **WHEN** the player buys a second manager (after already having 1)
- **THEN** the cost is $750 ($500 × 1.5^1)

#### Scenario: Log entry has timestamp and message
- **WHEN** a worker is successfully purchased
- **THEN** a log entry is prepended with a timestamp (HH:MM:SS format) and a message describing the hire

### Requirement: Tick rate upgrade action is a pure purchase operation
The store's upgradeTickRate action SHALL deduct the correct cost, increment tickRateLevel, update tickRateCost (doubling each level), and append a log entry. If the player cannot afford the upgrade, it SHALL return `{success: false}`.

#### Scenario: Successful tick rate upgrade
- **WHEN** the player has $100000 and calls `upgradeTickRate()` (base cost $100000)
- **THEN** tickRateLevel becomes 1, tickRateCost becomes $200000, money becomes $0

#### Scenario: Failed tick rate upgrade — insufficient funds
- **WHEN** the player has $99999 and calls `upgradeTickRate()`
- **THEN** no state changes occur; returns `{success: false}`

#### Scenario: Tick rate cost doubles each level
- **WHEN** the player has already upgraded twice (level 2, cost $400000)
- **THEN** the next upgrade costs $800000 (base × 2^2 = $400000, next = $400000 × 2)

### Requirement: Initial state creation produces a valid starting game
The `createInitialState` function SHALL produce a game state with: 1 writer worker, 0 for all other tiers, 0 pages, 0 money, empty log, 0 tick rate level, base tick rate cost, and 0 fractional pages.

#### Scenario: Default worker counts
- **WHEN** `createInitialState()` is called
- **THEN** workers = {writer: 1, manager: 0, overseer: 0, rector: 0, cardinal: 0, pope: 0, archbishop: 0}

#### Scenario: All other state is zero/empty
- **WHEN** `createInitialState()` is called
- **THEN** pagesGenerated = 0n, currentPage = 0n, money = 0, log = [], tickRateLevel = 0, tickRateCost = 100000, _fractionalPages = 0

### Requirement: Number formatting is unified through format.js
All large numbers SHALL be formatted using `formatNumber` and `formatMoney` from `format.js`. Money values under 1K SHALL use the K suffix at 1000 (e.g., $1500 → "$1.50K"). Worker counts SHALL use `formatNumber` instead of raw string padding.

#### Scenario: formatMoney at 1K boundary
- **WHEN** $999 is formatted
- **THEN** result is "$999"

#### Scenario: formatMoney at 1K boundary
- **WHEN** $1000 is formatted
- **THEN** result is "$1.00K"

#### Scenario: formatNumber for worker counts
- **WHEN** count 42 is formatted
- **THEN** result is "42"

#### Scenario: formatNumber for large worker counts
- **WHEN** count 1500 is formatted
- **THEN** result is "1.50K"

### Requirement: Tick interval is configurable and decreases with upgrades
The tick interval in milliseconds SHALL be calculated as `max(33, round(1000 - level × 50))`. Level 0 → 1000ms, level 1 → 950ms, ..., level 19 → 50ms, level 20 → 33ms (minimum).

#### Scenario: Base tick interval
- **WHEN** tickRateLevel is 0
- **THEN** tick interval is 1000ms

#### Scenario: Mid-level tick interval
- **WHEN** tickRateLevel is 10
- **THEN** tick interval is 500ms

#### Scenario: Maximum tick rate level reaches minimum interval
- **WHEN** tickRateLevel is 20
- **THEN** tick interval is 33ms (minimum)

### Requirement: Reset action restores initial state
The store's reset action SHALL restore the game to the initial state produced by `createInitialState()`.

#### Scenario: Full reset
- **WHEN** the player has 1000 pages, $50000, 5 writers, and calls `reset()`
- **THEN** all state is restored to initial values (0 pages, $0, 1 writer, etc.)

