## ADDED Requirements

### Requirement: Each tick cascades workers from higher tiers to lower tiers

Every game tick, each non-writer tier MUST add the count of the tier immediately above it to its own worker count. The cascade proceeds top-to-bottom so that spawned workers can cascade further in the same tick.

The cascade order is: rectors → overseers → managers → writers.

#### Scenario: Manager count increases by overseer count

- **WHEN** a game tick executes with 3 overseers and 2 managers
- **THEN** the manager count becomes 5 (2 + 3)

#### Scenario: Writer count increases by manager count

- **WHEN** a game tick executes with 4 managers and 10 writers
- **THEN** the writer count becomes 14 (10 + 4)

#### Scenario: Cascade chains in a single tick

- **WHEN** a game tick executes with 2 rectors, 0 overseers, 0 managers, 5 writers
- **THEN** after the tick: 2 overseers (0 + 2), 2 managers (0 + 2), and 7 writers (5 + 2)

#### Scenario: All 7 tiers cascade

- **WHEN** a game tick executes with 1 archbishop, 1 pope, 1 cardinal, 1 rector, 1 overseer, 1 manager, 1 writer
- **THEN** after the tick: 2 pope, 3 cardinal, 4 rector, 5 overseer, 6 manager, 7 writer (cascade chains: each tier adds the already-updated count of the tier above it)

### Requirement: Pages-per-second equals the writer count

The `calcPagesPerSecond` function MUST return only the number of writer workers. Workers of all other tiers MUST NOT contribute to the pages-per-second calculation.

#### Scenario: Buying a manager does not change pages/sec

- **WHEN** a manager is purchased (writer count unchanged)
- **THEN** `calcPagesPerSecond` returns the same value as before

#### Scenario: Cascaded writers increase pages/sec

- **WHEN** 2 managers exist and a tick executes
- **THEN** the writer count increases by 2 and `calcPagesPerSecond` returns the new writer count

### Requirement: Pages generated per tick uses the pre-cascade writer count

Pages generated during a tick MUST be based on the writer count at the start of the tick (before cascade), not the post-cascade count.

#### Scenario: Pages use old writer count

- **WHEN** a game tick executes with 5 writers and 3 managers
- **THEN** pages generated this tick equals 5 × delta (not 8 × delta)
