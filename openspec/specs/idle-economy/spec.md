# idle-economy Specification

## Purpose
TBD - created by archiving change library-of-babel-idle-game. Update Purpose after archive.
## Requirements
### Requirement: Seven worker tiers
The system SHALL define exactly seven worker tiers with escalating costs and capabilities.

#### Scenario: All seven tiers are defined
- **WHEN** the worker tier configuration is inspected
- **THEN** it contains exactly: Writer (base cost $10), Manager (base cost $500), Overseer (base cost $5,000), Rector (base cost $50,000), Cardinal (base cost $500,000), Pope (base cost $10,000,000), Archbishop (base cost $100,000,000)

#### Scenario: Writer produces pages
- **WHEN** a Writer worker exists
- **THEN** it produces 1 page per second

#### Scenario: Each tier produces pages
- **WHEN** any worker of any tier exists
- **THEN** it produces 1 page per second (identical to Writer output rate)

### Requirement: Worker purchase and price scaling
The system SHALL allow purchasing workers of any tier. The cost to purchase the next worker SHALL be calculated using only the player's directly-purchased worker count for that tier, excluding workers added by the cascade from higher tiers. Each purchase increases the cost of the next worker of that tier by a factor of 1.5: cost = baseCost × 1.5^playerBoughtCount.

#### Scenario: Initial worker cost matches base cost
- **WHEN** the game starts with 1 Writer (free starting worker)
- **THEN** the cost to purchase the next Writer is $15.00 ($10.00 × 1.5^1)

#### Scenario: Purchase increases cost by 1.5x
- **WHEN** the player has purchased 1 Writer (total 2 including the free starter)
- **THEN** the cost of the next Writer becomes $22.50 ($10.00 × 1.5^2)

#### Scenario: Purchase increases cost by 1.5x again
- **WHEN** the player has purchased 2 Writers (total 3 including the free starter)
- **THEN** the cost of the next Writer becomes $33.75 ($10.00 × 1.5^3)

#### Scenario: Cannot purchase if insufficient funds
- **WHEN** the player has $5.00 and attempts to purchase a Writer costing $10.00
- **THEN** the purchase fails and the player's money is unchanged

#### Scenario: Purchase deducts money
- **WHEN** the player has $15.00 and purchases a Writer costing $15.00
- **THEN** the player's money decreases by $15.00 (to $0.00) and the Writer count increases by 1

#### Scenario: Cascade workers do not inflate price
- **WHEN** the player has purchased 1 writer and 1 overseer (which cascades to add workers)
- **THEN** the cost of the next Writer is calculated based on 1 purchased writer only ($10.00 × 1.5^1 = $15.00), not the cascade-augmented count

### Requirement: Initial state — one free writer
The system SHALL start the player with exactly 1 Writer and $0 money.

#### Scenario: Game starts with one writer
- **WHEN** the game initializes
- **THEN** the Writer count is 1

#### Scenario: Game starts with no money
- **WHEN** the game initializes
- **THEN** the player's money is $0.00

#### Scenario: Game starts with no other workers
- **WHEN** the game initializes
- **THEN** Manager, Overseer, Rector, Cardinal, Pope, and Archbishop counts are all 0

### Requirement: Auto-hire chain
Each non-Writer tier auto-hires one worker of the tier immediately below it at a fixed interval.

#### Scenario: Manager auto-hires Writer
- **WHEN** the player owns at least 1 Manager
- **THEN** every 30 seconds, 1 Writer is hired (if the player has sufficient funds)

#### Scenario: Overseer auto-hires Manager
- **WHEN** the player owns at least 1 Overseer
- **THEN** every 30 seconds, 1 Manager is hired (if the player has sufficient funds)

#### Scenario: All non-Writer tiers auto-hire
- **WHEN** the player owns workers at tiers above Writer
- **THEN** each tier independently triggers its auto-hire on a 30-second interval

#### Scenario: Auto-hire fails without funds
- **WHEN** the auto-hire timer fires and the player lacks sufficient money
- **THEN** no worker is hired and the player's money is unchanged

#### Scenario: Auto-hired worker increases production
- **WHEN** an auto-hired Writer is added
- **THEN** the pages-per-second rate increases by 1 (the new Writer's contribution)

### Requirement: Pages per second calculation
The system SHALL calculate the total pages per second as the sum of all active workers across all tiers.

#### Scenario: One writer produces one page per second
- **WHEN** there is exactly 1 Writer and no other workers
- **THEN** the total pages per second is 1

#### Scenario: Multiple workers sum their output
- **WHEN** there are 3 Writers and 1 Manager
- **THEN** the total pages per second is 4 (each worker produces 1 page/sec)

#### Scenario: Pages are generated continuously
- **WHEN** the game tick fires
- **THEN** pages generated this tick = pagesPerSecond × (tickInterval / 1000), rounded appropriately

### Requirement: Earnings per page
The system SHALL earn $1.00 per page generated.

#### Scenario: Flat $1 per page
- **WHEN** a page is generated
- **THEN** the player's money increases by $1.00

#### Scenario: Earnings accumulate
- **WHEN** 42 pages are generated
- **THEN** the player's money increases by $42.00 total

### Requirement: Page count accumulation
The system SHALL increment the total pages generated counter for each page produced.

#### Scenario: Counter increments per page
- **WHEN** the first page is generated
- **THEN** total pages generated increases from 0 to 1

#### Scenario: Counter increments with each tick
- **WHEN** 10 pages are generated in a tick
- **THEN** total pages generated increases by 10

#### Scenario: Page number tracks generation order
- **WHEN** the system generates page N
- **THEN** the next page generated is page N+1 (sequential numbering)

### Requirement: Worker output incorporates doubling multiplier

Each worker tier SHALL have an output multiplier. The effective output of a tier SHALL equal the total worker count (including cascade) multiplied by the tier's doubling multiplier. Pages per second for the Writer tier SHALL be: totalWriterCount × writerMultiplier.

#### Scenario: Base output without doubling
- **WHEN** the player has 5 total writers and the writer multiplier is 1
- **THEN** the effective writer output is 5 pages per second

#### Scenario: Output doubled at first milestone
- **WHEN** the player has purchased 10 writers (multiplier = 2) and 0 cascade writers
- **THEN** the effective writer output is 20 pages per second (10 × 2)

#### Scenario: Output with cascade and multiplier
- **WHEN** the player has purchased 10 writers and has higher-tier workers that cascade to add 5 more writers (15 total, multiplier = 2)
- **THEN** the effective writer output is 30 pages per second (15 total × 2 multiplier)

### Requirement: Config module uses typed Tier and StorageTier exports
The `src/config.ts` module SHALL define `TIERS` as `Tier[]` (imported from `../types.js`) and `STORAGE_TIERS` as `StorageTier[]` (imported from `../types.js`). All exported functions SHALL have explicit TypeScript parameter and return types.

#### Scenario: TIERS array has explicit type
- **WHEN** the `config.ts` file is inspected
- **THEN** the `TIERS` export is typed as `Tier[]` with the import from `./types.js`

#### Scenario: STORAGE_TIERS array has explicit type
- **WHEN** the `config.ts` file is inspected
- **THEN** the `STORAGE_TIERS` export is typed as `StorageTier[]` with the import from `./types.js`

#### Scenario: getWorkerCost has typed parameters
- **WHEN** `getWorkerCost` is called
- **THEN** TypeScript enforces `tier: Tier` and `playerBoughtCount: number` as the parameter types

#### Scenario: calcPagesPerSecond has typed parameters
- **WHEN** `calcPagesPerSecond` is called
- **THEN** TypeScript enforces `workers: Record<string, number>` and an optional `multiplier: number` parameter, with return type `number`

### Requirement: No JSDoc type annotations remain in config
The `config.ts` module SHALL NOT contain any JSDoc `@param`, `@returns`, or `@type` annotations — all type information SHALL be conveyed through TypeScript syntax.

#### Scenario: No JSDoc @param annotations
- **WHEN** the `config.ts` file is inspected
- **THEN** no `@param {type} name` annotations are found

#### Scenario: No JSDoc @returns annotations
- **WHEN** the `config.ts` file is inspected
- **THEN** no `@returns {type}` annotations are found
