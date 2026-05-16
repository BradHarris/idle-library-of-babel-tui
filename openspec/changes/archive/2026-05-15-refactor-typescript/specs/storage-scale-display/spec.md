## ADDED Requirements

### Requirement: Storage scale functions have explicit TypeScript signatures
All exported functions in `src/storageScale.ts` SHALL have explicit TypeScript parameter and return types using `bigint` for page counts.

#### Scenario: computeStorageScale has typed signature
- **WHEN** `computeStorageScale` is called
- **THEN** TypeScript enforces `pagesGenerated: bigint` parameter and `Array<{ name: string, emoji: string, count: bigint }>` return type

#### Scenario: pageOffsetFromLocation has typed signature
- **WHEN** `pageOffsetFromLocation` is called
- **THEN** TypeScript enforces `location: Record<string, bigint>` parameter and `bigint` return type

#### Scenario: locationFromPageOffset has typed signature
- **WHEN** `locationFromPageOffset` is called
- **THEN** TypeScript enforces `pageOffset: bigint` parameter and `Record<string, bigint>` return type

### Requirement: No JSDoc type annotations in storage scale module
The `storageScale.ts` module SHALL NOT contain any JSDoc `@param` or `@returns` annotations — all type information SHALL be conveyed through TypeScript syntax.

#### Scenario: No JSDoc annotations
- **WHEN** the `storageScale.ts` file is inspected
- **THEN** no `@param {type}` or `@returns {type}` annotations are found
