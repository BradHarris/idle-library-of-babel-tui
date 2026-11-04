## ADDED Requirements

### Requirement: Web dashboard layout

The web application SHALL present the same functional panels as the current game: Stats, Storage Scale, Workers, Log, Latest Page, and phrase search access from the main header. On large viewports the layout SHALL use a two-column grid; on small viewports panels SHALL stack vertically without horizontal overflow of the page.

#### Scenario: Stats and storage visible on wide screens

- **WHEN** the viewport is at least `lg` breakpoint width
- **THEN** Stats and Storage Scale appear in the top row areas of the grid as defined by `web/src/App.tsx`

#### Scenario: Workers and log/latest on wide screens

- **WHEN** the viewport is at least `lg` breakpoint width
- **THEN** Workers occupies one bottom grid area and Log with Latest Page occupy the adjacent area

#### Scenario: Narrow screens stack content

- **WHEN** the viewport is narrower than `lg`
- **THEN** primary panels stack in a single column with readable padding

### Requirement: Latest page text wrapping

The Latest Page panel SHALL wrap the 280-character page string to the available panel width using CSS or the shared `wrapText` helper so the full string remains readable without horizontal scrolling inside the panel.

#### Scenario: Wrapping preserves character order

- **WHEN** a 280-character page is displayed in a constrained width panel
- **THEN** the visible line breaks do not reorder or drop characters relative to the source string

### Requirement: Workers panel doubling display

The web Workers panel SHALL show player-bought count (not cascade-augmented total alone as the cost basis label), purchase affordability, doubling multiplier, and progress toward the next doubling milestone, consistent with values from the game store.

#### Scenario: Progress reflects doublingProgress

- **WHEN** `doublingProgress` for a tier is halfway between milestones
- **THEN** the UI shows approximately half progress toward the next milestone for that tier

### Requirement: React-driven updates

The web UI SHALL reflect store changes on each React render driven by Zustand subscriptions; game logic ticks SHALL continue to be driven by `setInterval` in `web/src/App.tsx` (or equivalent) using the store tick interval.

#### Scenario: Tick drives simulation

- **WHEN** the app is mounted
- **THEN** the store `tick` action is invoked on the configured interval until unmount

#### Scenario: Display follows store

- **WHEN** money or pages change from a tick or hire action
- **THEN** affected panels re-render without requiring a full page reload

### Requirement: Log bounded size

The event log in the web Log panel SHALL show recent entries only; when the store enforces a maximum log size, the UI SHALL display the tail of the log consistent with that cap.

#### Scenario: Log does not grow without bound in the UI

- **WHEN** many hire events occur
- **THEN** the Log panel lists at most the number of entries the game store retains

### Requirement: Web UI file locations

Dashboard presentation SHALL live under `web/src/components/` and the root layout SHALL live in `web/src/App.tsx`. There SHALL be no remaining Ink `render()` entrypoint in `src/`.

#### Scenario: No Ink entrypoint in src

- **WHEN** the repository after this change is searched for `ink` imports under `src/`
- **THEN** none are present
