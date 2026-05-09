## ADDED Requirements

### Requirement: Page generation accepts optional location parameter
The `generatePage(pageNum, location?)` function SHALL accept an optional second parameter for location context. When provided, the location SHALL be incorporated into the seed derivation. When omitted or when all location indices are zero, the function SHALL produce identical output to the original single-parameter implementation.

#### Scenario: generatePage with default location matches original
- **WHEN** `generatePage(100, {drive:0, server:0, rack:0, floor:0, building:0, city:0, planet:0, solarSystem:0, galaxy:0})` is called
- **THEN** the output matches `generatePage(100)` using the original algorithm

#### Scenario: generatePage with non-zero location differs
- **WHEN** `generatePage(100, {drive:1, server:0, ...})` is called
- **THEN** the output differs from `generatePage(100, {drive:0, ...})`

## REMOVED Requirements

### Requirement: generatePage(pageNum) single-parameter signature
**Reason**: Signature extended to accept location parameter. The single-parameter form is preserved for backward compatibility by defaulting all location indices to zero.
**Migration**: Internal call sites in `gameStore.ts` SHALL pass the current location object as the second parameter.
