## ADDED Requirements

### Requirement: Doubling milestone sequence

Each worker tier SHALL have an output multiplier that doubles at escalating purchase thresholds. The threshold sequence SHALL be: 10, 20, 40, 80, 160, 320, ... where threshold(n) = 10 × 2^n for n ≥ 0.

#### Scenario: First doubling at 10 purchased workers
- **WHEN** the player has purchased exactly 10 writers
- **THEN** the writer output multiplier is 2

#### Scenario: Second doubling at 20 purchased workers
- **WHEN** the player has purchased exactly 20 writers
- **THEN** the writer output multiplier is 4

#### Scenario: Third doubling at 40 purchased workers
- **WHEN** the player has purchased exactly 40 writers
- **THEN** the writer output multiplier is 8

#### Scenario: Multiplier is 1 below first threshold
- **WHEN** the player has purchased 9 writers
- **THEN** the writer output multiplier is 1

#### Scenario: Multiplier persists between milestones
- **WHEN** the player has purchased 15 writers (past first doubling at 10, before second at 20)
- **THEN** the writer output multiplier is 2

### Requirement: Multiplier uses player-bought count only

The doubling multiplier SHALL be computed from the player's directly-purchased worker count, excluding workers added by the cascade from higher tiers.

#### Scenario: Cascade workers do not count toward doubling
- **WHEN** the player has purchased 5 writers but has 1 manager (which cascades 1 writer, giving 6 total writers)
- **THEN** the writer doubling multiplier is 1 (based on 5 purchased, not 6 total)

### Requirement: Tier output equals worker count times multiplier

The effective output of a tier SHALL equal the total worker count (including cascade) for that tier multiplied by the doubling multiplier for that tier.

#### Scenario: Output with doubling active
- **WHEN** the player has purchased 10 writers (multiplier = 2) and 0 cascade workers
- **THEN** the effective writer output is 20 pages per second (10 workers × 2 multiplier)

#### Scenario: Output with cascade and doubling
- **WHEN** the player has purchased 10 writers (multiplier = 2) and has 2 overseers (each cascading to add workers) producing 10 total cascade workers
- **THEN** the effective writer output is 20 × 2 = 20 pages per second (total 20 workers × 1 multiplier before doubling, wait — 10 purchased + cascade workers = total count; total × multiplier)

#### Scenario: No cascade but doubling
- **WHEN** the player has purchased 10 writers and no higher-tier workers
- **THEN** total writers is 10 and effective output is 20 per second (10 × 2)

### Requirement: Each tier has independent doubling

Each worker tier SHALL compute its doubling multiplier independently based only on the player-bought count for that tier.

#### Scenario: Different tiers at different milestones
- **WHEN** the player has purchased 10 writers (multiplier 2) and 5 managers (multiplier 1)
- **THEN** the writer multiplier is 2 and the manager multiplier is 1

### Requirement: Doubling progress toward next milestone

For display purposes, the system SHALL compute the progress fraction toward the next doubling milestone. The progress SHALL equal (playerBoughtCount − previousThreshold) / (nextThreshold − previousThreshold), where previousThreshold defaults to 0 if no milestone has been reached yet.

#### Scenario: Progress at 5 of 10
- **WHEN** the player has purchased 5 writers and no milestones have been reached
- **THEN** the progress is 0.5 (5 / 10)

#### Scenario: Progress at milestone boundary
- **WHEN** the player has purchased exactly 10 writers
- **THEN** the progress is 0 (milestone reached, resetting toward next milestone at 20)

#### Scenario: Progress after first doubling
- **WHEN** the player has purchased 30 writers (doubled at 10 and 20, next at 40)
- **THEN** the progress is 0.5 ((30 − 20) / (40 − 20))

#### Scenario: Progress zero at start
- **WHEN** the player has purchased 0 workers of a tier
- **THEN** the progress is 0
