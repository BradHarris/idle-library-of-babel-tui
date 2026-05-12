## ADDED Requirements

### Requirement: Page offset can be computed from a location tuple
The system SHALL compute a deterministic page offset from a complete location tuple (hardDrive, server, serverRack, serverFloor, building, city, planet, solarSystem, galaxy) using mixed-radix decomposition over the STORAGE_TIERS multipliers.

#### Scenario: All-zero location yields page 0
- **WHEN** `pageOffsetFromLocation` is called with all location indices equal to `0n`
- **THEN** the returned page offset is `0n`

#### Scenario: Single-level location yields correct offset
- **WHEN** `pageOffsetFromLocation` is called with `{hardDrive: 1n, server: 0n, serverRack: 0n, ...}` (only hardDrive is 1)
- **THEN** the returned page offset is equal to `STORAGE_TIERS[0].multiplier` (PAGES_PER_32_TB_DRIVE)

#### Scenario: Multi-level location yields correct cumulative offset
- **WHEN** `pageOffsetFromLocation` is called with a non-trivial location tuple
- **THEN** the returned page offset equals the sum of each tier's index multiplied by the product of all subsequent tier multipliers

### Requirement: Page offset can be decomposed into a location tuple
The system SHALL decompose any non-negative page offset into a location tuple (hardDrive, server, serverRack, serverFloor, building, city, planet, solarSystem, galaxy) using mixed-radix decomposition over the STORAGE_TIERS multipliers.

#### Scenario: Page 0 yields all-zero location
- **WHEN** `locationFromPageOffset` is called with `0n`
- **THEN** the returned location tuple has all indices equal to `0n`

#### Scenario: Location indices are within bounds
- **WHEN** `locationFromPageOffset` is called with any non-negative page offset
- **THEN** each index in the returned location tuple is less than its corresponding STORAGE_TIERS multiplier

### Requirement: Forward and backward conversions are inverse operations
The system SHALL guarantee that `pageOffsetFromLocation` and `locationFromPageOffset` are exact inverses of each other for all valid inputs.

#### Scenario: Forward then backward round-trips
- **WHEN** `locationFromPageOffset(pageOffsetFromLocation(loc))` is called with any valid location tuple
- **THEN** the returned location tuple is equal to the input `loc`

#### Scenario: Backward then forward round-trips
- **WHEN** `pageOffsetFromLocation(locationFromPageOffset(n))` is called with any non-negative page offset `n`
- **THEN** the returned page offset is equal to `n`

#### Scenario: Round-trip with zero
- **WHEN** `locationFromPageOffset(pageOffsetFromLocation(allZeros))` is called
- **THEN** the result equals `allZeros`

#### Scenario: Round-trip with boundary page
- **WHEN** `pageOffsetFromLocation(locationFromPageOffset(STORAGE_TIERS[0].multiplier - 1n))` is called
- **THEN** the result equals `STORAGE_TIERS[0].multiplier - 1n`

### Requirement: Functions use bigint arithmetic throughout
The system SHALL perform all arithmetic in `pageOffsetFromLocation` and `locationFromPageOffset` using `bigint` to support page numbers far beyond `Number.MAX_SAFE_INTEGER`.

#### Scenario: Large page numbers are handled correctly
- **WHEN** `locationFromPageOffset` is called with a page offset exceeding `Number.MAX_SAFE_INTEGER`
- **THEN** the function returns a valid location tuple without precision loss
