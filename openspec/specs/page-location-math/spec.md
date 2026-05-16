# Capability: Page Location Math

**Purpose:** Bidirectional conversion between page numbers and storage hierarchy location tuples, enabling location-aware page display and navigation in future UI work.

## Requirements

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

### Requirement: Location math functions have explicit TypeScript signatures with bigint
The `pageOffsetFromLocation` and `locationFromPageOffset` functions in `src/storageScale.ts` SHALL have explicit TypeScript parameter and return types. All arithmetic SHALL use `bigint` as reflected in the type signatures.

#### Scenario: pageOffsetFromLocation uses bigint
- **WHEN** `pageOffsetFromLocation` is inspected
- **THEN** its parameter type is `Record<string, bigint>` and return type is `bigint`

#### Scenario: locationFromPageOffset uses bigint
- **WHEN** `locationFromPageOffset` is inspected
- **THEN** its parameter type is `bigint` and return type is `Record<string, bigint>`

### Requirement: Location tuple type is defined in shared types
The `Record<string, bigint>` type used for location tuples SHALL be documented in `src/types.ts` as a named type alias `LocationTuple` for clarity and reuse.

#### Scenario: LocationTuple type alias exists
- **WHEN** the `src/types.ts` file is inspected
- **THEN** a `type LocationTuple = Record<string, bigint>` export is present
