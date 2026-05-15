## ADDED Requirements

### Requirement: Store tracks player-bought worker counts separately

The Zustand store SHALL maintain a `playerWorkers: Record<string, number>` state field tracking only directly-purchased worker counts. This field SHALL be updated only when the player purchases a worker via the `hire` action. The `workers` field SHALL continue to hold cascade-augmented counts for output calculations.

#### Scenario: playerWorkers initialized to worker counts
- **WHEN** the game initializes via `createInitialState()`
- **THEN** `playerWorkers` equals `{writer: 1, manager: 0, overseer: 0, rector: 0, cardinal: 0, pope: 0, archbishop: 0}`

#### Scenario: playerWorkers updated on hire
- **WHEN** the player hires a Manager via `hire('manager')`
- **THEN** `playerWorkers.manager` increases by 1 while `playerWorkers.writer` remains unchanged

#### Scenario: playerWorkers not affected by cascade
- **WHEN** a tick occurs and cascade adds workers from higher tiers to lower tiers
- **THEN** `playerWorkers` remains unchanged (only `workers` is updated by cascade)

### Requirement: Hire action uses player-bought count for pricing

The `hire` action SHALL calculate the worker cost using the `playerWorkers` count for the target tier, not the cascade-augmented `workers` count.

#### Scenario: Cost based on player-bought count
- **WHEN** the player has `playerWorkers.writer = 5` and `workers.writer = 7` (2 cascade workers)
- **THEN** the cost of hiring a Writer is $10 × 1.5^5 = $151.88, not $10 × 1.5^7

### Requirement: Affordability computed from player-bought count

The `computeCanAfford` function SHALL calculate affordability for each tier using the `playerWorkers` count, not the cascade-augmented `workers` count.

#### Scenario: Affordability uses player count
- **WHEN** `playerWorkers.writer` is 5 and `workers.writer` is 7
- **THEN** `canAfford.writer` is based on cost $10 × 1.5^5, not cost using count 7

### Requirement: Pages per second uses total workers and multiplier

The `pps` derived value SHALL be computed as the total `workers.writer` (cascade-augmented) multiplied by the doubling multiplier based on `playerWorkers.writer`.

#### Scenario: PPS with doubling
- **WHEN** `workers.writer` is 12 and `playerWorkers.writer` is 10 (multiplier = 2)
- **THEN** `pps` is 24 (12 × 2)

#### Scenario: PPS without doubling
- **WHEN** `workers.writer` is 3 and `playerPlayers.writer` is 3 (multiplier = 1)
- **THEN** `pps` is 3 (3 × 1)

### Requirement: Store provides doubling progress per tier

The store SHALL provide a derived `doublingProgress: Record<string, number>` field where each value represents the progress fraction (0-1) toward the next doubling milestone for that tier, based on player-bought counts.

#### Scenario: Progress at 5 of 10
- **WHEN** `playerWorkers.writer` is 5
- **THEN** `doublingProgress.writer` is 0.5

#### Scenario: Progress resets at milestone
- **WHEN** `playerWorkers.writer` is 10
- **THEN** `doublingProgress.writer` is 0

#### Scenario: Progress after milestones
- **WHEN** `playerWorkers.writer` is 30 (milestones at 10 and 20 reached, next at 40)
- **THEN** `doublingProgress.writer` is 0.5 ((30 − 20) / (40 − 20))

### Requirement: Store provides doubling multiplier per tier

The store SHALL provide a derived `doublingMultipliers: Record<string, number>` field where each value represents the current output multiplier (1, 2, 4, 8...) for that tier, based on player-bought counts.

#### Scenario: Multiplier at 0 purchased
- **WHEN** `playerWorkers.manager` is 0
- **THEN** `doublingMultipliers.manager` is 1

#### Scenario: Multiplier at first milestone
- **WHEN** `playerWorkers.writer` is 10
- **THEN** `doublingMultipliers.writer` is 2

#### Scenario: Multiplier at multiple milestones
- **WHEN** `playerWorkers.writer` is 30
- **THEN** `doublingMultipliers.writer` is 4 (doubled at 10 and at 20)
