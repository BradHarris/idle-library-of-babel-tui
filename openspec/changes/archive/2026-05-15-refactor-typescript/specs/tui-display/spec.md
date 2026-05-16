## ADDED Requirements

### Requirement: UI components have explicit typed props interfaces
All TUI components exported from `src/ui.tsx` SHALL accept props typed with interfaces imported from `../types.js`. Components SHALL use TypeScript props destructuring with explicit types rather than implicit any props.

#### Scenario: StatsPanel uses StatsPanelProps
- **WHEN** `StatsPanel` is defined
- **THEN** its parameter is typed as `StatsPanelProps` imported from `../types.js`

#### Scenario: WorkersPanel uses WorkersPanelProps
- **WHEN** `WorkersPanel` is defined
- **THEN** its parameter is typed as `WorkersPanelProps` imported from `../types.js`

#### Scenario: LatestPagePanel uses LatestPagePanelProps
- **WHEN** `LatestPagePanel` is defined
- **THEN** its parameter is typed as `LatestPagePanelProps` imported from `../types.js`

#### Scenario: SearchOverlay uses SearchOverlayProps
- **WHEN** `SearchOverlay` is defined
- **THEN** its parameter is typed as `SearchOverlayProps` imported from `../types.js`

### Requirement: No JSDoc prop descriptions in UI components
UI components SHALL NOT use JSDoc to describe prop types. All prop type information SHALL be in the TypeScript interfaces defined in `src/types.ts`.

#### Scenario: No JSDoc @param in component files
- **WHEN** the `ui.tsx` file is inspected
- **THEN** no `@param` annotations are present

### Requirement: TUI App component uses typed state selectors
The `src/index.tsx` App component SHALL use Zustand selectors with explicit return types inferred from the store's type definitions. No explicit type annotations SHALL be needed on individual selector calls due to the store's typed `create` call.

#### Scenario: Selector variables have inferred types
- **WHEN** `const money = useGameStore(s => s.money)` is used
- **THEN** TypeScript infers `money` as `number` without explicit annotation

#### Scenario: Search handlers have typed parameters
- **WHEN** `handleSearch` is defined with a `query` parameter
- **THEN** TypeScript enforces `query: string` through explicit annotation
