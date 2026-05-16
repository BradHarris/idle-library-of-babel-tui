## ADDED Requirements

### Requirement: Page generation functions have explicit TypeScript signatures
All exported functions in `src/page.ts` SHALL have explicit TypeScript parameter and return types. Bigint parameters SHALL be typed as `bigint`, not `number`.

#### Scenario: queryToPageAddress has typed signature
- **WHEN** `queryToPageAddress` is called
- **THEN** TypeScript enforces `query: string` parameter and `bigint` return type

#### Scenario: generatePage has typed signature
- **WHEN** `generatePage` is called
- **THEN** TypeScript enforces `pageNum: bigint` parameter and `string` return type

### Requirement: No JSDoc type annotations in page module
The `page.ts` module SHALL NOT contain any JSDoc `@param` or `@returns` annotations — all type information SHALL be conveyed through TypeScript syntax.

#### Scenario: No JSDoc annotations
- **WHEN** the `page.ts` file is inspected
- **THEN** no `@param {type}` or `@returns {type}` annotations are found
