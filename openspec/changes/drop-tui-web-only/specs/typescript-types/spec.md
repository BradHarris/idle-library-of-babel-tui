## MODIFIED Requirements

### Requirement: Centralized type definitions module exists

The project SHALL contain a single `src/types.ts` module that exports all shared TypeScript type definitions used by the web client (`web/src/`) and shared game modules under `src/` (for example the Zustand store, LCG, formatting, and config). Type definitions SHALL NOT be duplicated across modules.

#### Scenario: Types module is importable

- **WHEN** any source file imports from `./types.js`, `@game/types`, or `@game/types.js`
- **THEN** all shared type definitions are accessible

#### Scenario: No duplicate type definitions exist

- **WHEN** two different modules need the same type (e.g., `GameState`)
- **THEN** both modules import it from `src/types.ts` rather than defining it locally

### Requirement: UI component prop type definitions

The `src/types.ts` module SHALL export data-shape interfaces `StatsPanelProps`, `LatestPagePanelProps`, `WorkersPanelProps`, `LogPanelProps`, and `StorageScalePanelProps` documenting the fields each panel surfaces. Web panel components under `web/src/components/` MAY satisfy these shapes via `useGameStore` selectors instead of React props. The module SHALL export `SearchResult` for search UI. The `SearchOverlayProps` interface SHALL NOT be required because the Ink overlay is removed.

#### Scenario: StatsPanelProps covers stats fields

- **WHEN** the `StatsPanelProps` interface is inspected
- **THEN** it includes `pagesGenerated`, `currentPage`, `money`, `pagesPerSecond`, `tickRateLevel`, and `tickRateCost` with the correct types

#### Scenario: WorkersPanelProps covers worker display fields

- **WHEN** the `WorkersPanelProps` interface is inspected
- **THEN** it includes `playerWorkers`, `doublingMultipliers`, `doublingProgress`, and `canAfford` with the correct types

#### Scenario: SearchResult is available for search UI

- **WHEN** `web/src/components/SearchDialog.tsx` (or successor) handles search results
- **THEN** it uses the `SearchResult` discriminated union exported from `src/types.ts`

### Requirement: TUI App component uses typed state selectors

The `web/src/App.tsx` root component SHALL use Zustand selectors with types inferred from the store's typed `create` call. No explicit type annotations SHALL be required on individual selector callbacks when the store typing is correct.

#### Scenario: Selector variables have inferred types

- **WHEN** `const tickInterval = useGameStore(s => s.tickInterval)` is used in `web/src/App.tsx`
- **THEN** TypeScript infers `tickInterval` as `number` without explicit annotation on the callback result

#### Scenario: Tick callback is typed

- **WHEN** the effect schedules `tick(tickInterval)`
- **THEN** TypeScript verifies `tick` accepts `deltaMs: number` from the store type
