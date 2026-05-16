## ADDED Requirements

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
