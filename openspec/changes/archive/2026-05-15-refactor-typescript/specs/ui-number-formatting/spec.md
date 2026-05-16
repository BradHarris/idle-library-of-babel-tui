## ADDED Requirements

### Requirement: Formatting functions have explicit TypeScript signatures
All exported functions in `src/format.ts` SHALL have explicit TypeScript parameter and return type annotations.

#### Scenario: formatNumber has typed signature
- **WHEN** `formatNumber` is called
- **THEN** TypeScript enforces `n: number` parameter and `string` return type

#### Scenario: formatMoney has typed signature
- **WHEN** `formatMoney` is called
- **THEN** TypeScript enforces `n: number` parameter and `string` return type

#### Scenario: formatPageNumber has typed signature
- **WHEN** `formatPageNumber` is called
- **THEN** TypeScript enforces `bigNum: bigint` parameter and `string` return type

#### Scenario: formatPagesPerSecond has typed signature
- **WHEN** `formatPagesPerSecond` is called
- **THEN** TypeScript enforces `pps: number` parameter and `string` return type

#### Scenario: formatLocationDisplay has typed signature
- **WHEN** `formatLocationDisplay` is called
- **THEN** TypeScript enforces `location: Record<string, bigint>` parameter and `string` return type

#### Scenario: wrapText has typed signature
- **WHEN** `wrapText` is called
- **THEN** TypeScript enforces `text: string, width: number` parameters and `string[]` return type

### Requirement: No JSDoc type annotations in format module
The `format.ts` module SHALL NOT contain any JSDoc `@param` or `@returns` annotations — all type information SHALL be conveyed through TypeScript syntax.

#### Scenario: No JSDoc annotations
- **WHEN** the `format.ts` file is inspected
- **THEN** no `@param {type}` or `@returns {type}` annotations are found
