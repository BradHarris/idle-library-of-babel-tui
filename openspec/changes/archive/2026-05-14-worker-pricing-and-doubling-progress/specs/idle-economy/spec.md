## MODIFIED Requirements

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
