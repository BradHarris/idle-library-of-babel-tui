## ADDED Requirements

### Requirement: Config module uses typed Tier and StorageTier exports
The `src/config.ts` module SHALL define `TIERS` as `Tier[]` (imported from `../types.js`) and `STORAGE_TIERS` as `StorageTier[]` (imported from `../types.js`). All exported functions SHALL have explicit TypeScript parameter and return types.

#### Scenario: TIERS array has explicit type
- **WHEN** the `config.ts` file is inspected
- **THEN** the `TIERS` export is typed as `Tier[]` with the import from `./types.js`

#### Scenario: STORAGE_TIERS array has explicit type
- **WHEN** the `config.ts` file is inspected
- **THEN** the `STORAGE_TIERS` export is typed as `StorageTier[]` with the import from `./types.js`

#### Scenario: getWorkerCost has typed parameters
- **WHEN** `getWorkerCost` is called
- **THEN** TypeScript enforces `tier: Tier` and `playerBoughtCount: number` as the parameter types

#### Scenario: calcPagesPerSecond has typed parameters
- **WHEN** `calcPagesPerSecond` is called
- **THEN** TypeScript enforces `workers: Record<string, number>` and an optional `multiplier: number` parameter, with return type `number`

### Requirement: No JSDoc type annotations remain in config
The `config.ts` module SHALL NOT contain any JSDoc `@param`, `@returns`, or `@type` annotations — all type information SHALL be conveyed through TypeScript syntax.

#### Scenario: No JSDoc @param annotations
- **WHEN** the `config.ts` file is inspected
- **THEN** no `@param {type} name` annotations are found

#### Scenario: No JSDoc @returns annotations
- **WHEN** the `config.ts` file is inspected
- **THEN** no `@returns {type}` annotations are found
