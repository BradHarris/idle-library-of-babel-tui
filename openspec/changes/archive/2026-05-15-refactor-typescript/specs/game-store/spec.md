## ADDED Requirements

### Requirement: Game state types are imported from shared types module
The `src/stores/gameStore.ts` module SHALL import `GameState`, `GameActions`, `LogEntry`, and `HireResult` from `./types.js` instead of defining them as local interfaces.

#### Scenario: No local interface definitions
- **WHEN** the `gameStore.ts` file is inspected
- **THEN** no `interface LogEntry`, `interface HireResult`, `interface GameState`, or `interface GameActions` are defined locally

#### Scenario: Types are imported from types module
- **WHEN** the store module needs `GameState` or `GameActions`
- **THEN** it imports them from `'../types.js'`

### Requirement: Helper functions have explicit TypeScript signatures
All helper functions in `gameStore.ts` (`addLogEntry`, `computeCascade`, `computeCanAfford`, `computeDoublingMultipliers`, `computeDoublingProgress`) SHALL have explicit TypeScript parameter and return type annotations instead of relying on inference from usage.

#### Scenario: computeCascade signature is typed
- **WHEN** `computeCascade` is called with a `Record<string, number>`
- **THEN** TypeScript verifies the parameter type and the return type is `Record<string, number>`

#### Scenario: computeCanAfford signature is typed
- **WHEN** `computeCanAfford` is called with `money: number` and `playerWorkers: Record<string, number>`
- **THEN** TypeScript verifies the parameter types and the return type is `Record<string, boolean>`
