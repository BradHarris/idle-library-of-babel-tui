## ADDED Requirements

### Requirement: Initial tick rate is 1 per second
The game SHALL start with a tick interval of 1000ms (1 tick per second) by default.

#### Scenario: Game starts at 1 tick/sec
- **WHEN** the game is first launched
- **THEN** the logic tick interval is 1000ms (1 tick per second)

#### Scenario: Tick interval is derived from tick rate level
- **WHEN** the tick rate level is N purchases
- **THEN** the tick interval is `Math.max(33, Math.round(1000 - N * 50))` milliseconds

### Requirement: Tick rate upgrade reduces interval by 50ms per purchase
The game SHALL include a purchasable upgrade that reduces the tick interval by 50ms for each level purchased.

#### Scenario: Each upgrade purchase reduces tick interval by 50ms
- **WHEN** a player purchases the tick rate upgrade
- **THEN** the tick interval decreases by 50ms (e.g., from 1000ms to 950ms)

#### Scenario: Tick interval cannot go below 33ms (30 ticks/sec max)
- **WHEN** the tick rate level is high enough that the formula yields less than 33ms
- **THEN** the tick interval is clamped to a minimum of 33ms

#### Scenario: Maximum tick rate is 30 per second
- **WHEN** the player has purchased enough upgrades to reach the minimum interval
- **THEN** the tick rate is capped at approximately 30 ticks per second (~33ms interval)

### Requirement: Tick rate upgrade cost scales with each purchase
The cost to purchase the tick rate upgrade SHALL increase exponentially with each level.

#### Scenario: Initial upgrade cost is $100,000
- **WHEN** the game starts (0 upgrades purchased)
- **THEN** the cost to purchase the first tick rate upgrade is $100,000

#### Scenario: Cost doubles with each purchase
- **WHEN** the player has purchased N upgrades
- **THEN** the cost of the next upgrade is `$100,000 × 2^N`

### Requirement: Tick rate display in UI
The current tick rate SHALL be visible to the player in the stats panel.

#### Scenario: Stats panel shows tick rate
- **WHEN** the game is running
- **THEN** the stats panel displays the current tick rate (e.g., "Tick rate: 1.0/s" or "Tick interval: 1000ms")

#### Scenario: Tick rate updates dynamically
- **WHEN** the player purchases a tick rate upgrade
- **THEN** the displayed tick rate updates immediately

### Requirement: Tick rate upgrade purchase via keybind
The tick rate upgrade SHALL be purchasable via a keyboard keybind.

#### Scenario: Pressing 'u' purchases tick rate upgrade
- **WHEN** the player presses the 'u' key
- **THEN** the tick rate upgrade is purchased if the player has enough money, or no action occurs if they cannot afford it

#### Scenario: Upgrade is shown in UI with affordance
- **WHEN** the game is running
- **THEN** the tick rate upgrade is displayed in the UI with its current cost and whether the player can afford it

### Requirement: Tick rate upgrade persists in game state
The tick rate level and next upgrade cost SHALL be tracked in the game state and preserved across state updates.

#### Scenario: Tick rate state is part of initial state
- **WHEN** `createInitialState()` is called
- **THEN** the returned state includes `tickRateLevel: 0` and `tickRateCost: 100000`

#### Scenario: Tick rate state survives state updates
- **WHEN** a tick or purchase operation updates game state
- **THEN** the `tickRateLevel` and `tickRateCost` fields are preserved in the new state
