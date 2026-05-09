## ADDED Requirements

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
The system SHALL allow purchasing workers of any tier, with each purchase increasing the cost of the next worker of that tier by a factor of 1.5.

#### Scenario: Initial worker cost matches base cost
- **WHEN** the game starts with 0 Workers
- **THEN** the cost to purchase the first Writer is $10.00

#### Scenario: Purchase increases cost by 1.5x
- **WHEN** the first Writer is purchased at $10.00
- **THEN** the cost of the next Writer becomes $15.00 ($10.00 × 1.5)

#### Scenario: Purchase increases cost by 1.5x again
- **WHEN** the second Writer is purchased at $15.00
- **THEN** the cost of the next Writer becomes $22.50 ($15.00 × 1.5)

#### Scenario: Cannot purchase if insufficient funds
- **WHEN** the player has $5.00 and attempts to purchase a Writer costing $10.00
- **THEN** the purchase fails and the player's money is unchanged

#### Scenario: Purchase deducts money
- **WHEN** the player has $15.00 and purchases a Writer costing $10.00
- **THEN** the player's money decreases by $10.00 (to $5.00) and the Writer count increases by 1

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
