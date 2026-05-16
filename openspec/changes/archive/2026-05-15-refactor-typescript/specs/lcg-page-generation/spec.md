## ADDED Requirements

### Requirement: LCG functions have explicit TypeScript signatures with bigint
All exported functions in `src/lcg.ts` SHALL have explicit TypeScript parameter and return types. All arithmetic values SHALL be typed as `bigint`.

#### Scenario: geoPair has typed signature
- **WHEN** `geoPair` is called
- **THEN** TypeScript enforces `base: bigint, n: bigint, mod: bigint` parameters and `{ sum: bigint, pow: bigint }` return type

#### Scenario: lcgState has typed signature
- **WHEN** `lcgState` is called
- **THEN** TypeScript enforces `pageNum: bigint` parameter and `bigint` return type

#### Scenario: stateToPage has typed signature
- **WHEN** `stateToPage` is called
- **THEN** TypeScript enforces `state: bigint, alphabet: string` parameters and `string` return type

### Requirement: LCG constants are typed as bigint
The `LCG_M`, `LCG_A`, and `LCG_C` constants in `src/lcg.ts` SHALL be explicitly typed as `bigint` using TypeScript type annotations or `as const` assertion.

#### Scenario: LCG constants are bigint
- **WHEN** `LCG_M` is inspected by TypeScript
- **THEN** its type is `bigint`, not `number`

### Requirement: No JSDoc type annotations in LCG module
The `lcg.ts` module SHALL NOT contain any JSDoc `@param {bigint}` or `@returns` annotations — all type information SHALL be conveyed through TypeScript syntax.

#### Scenario: No JSDoc annotations
- **WHEN** the `lcg.ts` file is inspected
- **THEN** no `@param {type}` or `@returns {type}` annotations are found
