# tui-display Specification

## Purpose
TBD - created by archiving change library-of-babel-idle-game. Update Purpose after archive.
## Requirements
### Requirement: Dashboard layout
The TUI SHALL render a two-row grid dashboard: the top row contains the Stats panel (left) and Storage Scale panel (right), and the bottom row contains the Workers panel (left) with the Log panel and Latest Page panel stacked vertically on the right. Panels use flex-based proportional sizing and adapt to terminal width.

#### Scenario: Stats panel displays page count, money, and pages/sec
- **WHEN** the game is running
- **THEN** the Stats panel shows total pages generated, current money, and pages per second in the left column of the top row

#### Scenario: Latest Page panel displays the most recently generated page
- **WHEN** a page is generated
- **THEN** the Latest Page panel shows the page number and its 280-character content in the right column of the bottom row, stacked above or below the Log panel

#### Scenario: Workers panel lists all tiers with counts and costs
- **WHEN** the game is running
- **THEN** the Workers panel shows all seven tiers, each with the hire keybind, tier name, player-bought worker count, current purchase cost, doubling multiplier, and a progress bar toward the next output-doubling milestone, in the left column of the bottom row

#### Scenario: Log panel shows recent events
- **WHEN** events occur (hires, auto-hires)
- **THEN** the Log panel displays them with timestamps, newest first, oldest removed in the right column of the bottom row

#### Scenario: Storage Scale panel displays storage hierarchy
- **WHEN** the game is running
- **THEN** the Storage Scale panel shows the escalating storage tier breakdown in the right column of the top row

#### Scenario: Layout uses proportional sizing
- **WHEN** the terminal is wider than 60 columns
- **THEN** the left and right columns divide the available width proportionally using flex layout

### Requirement: Page content wrapping
The 280-character page content SHALL be wrapped to fit within the display width.

#### Scenario: Page content wraps at display width
- **WHEN** a 280-character page is displayed in a 90-character-wide display area
- **THEN** the content wraps into 4 lines: 90 + 90 + 90 + 10 characters

#### Scenario: Wrapping preserves character order
- **WHEN** a page is wrapped and displayed
- **THEN** the character sequence across lines is identical to the original page string

### Requirement: Workers panel doubling display
The Workers panel SHALL display player-bought count (not cascade-augmented count), current purchase cost, doubling multiplier, and a progress bar toward the next output-doubling milestone. The progress bar SHALL use the `doublingProgress` value from the game store, displayed as filled (█) and empty (░) blocks.

#### Scenario: Progress bar reflects doubling progress
- **WHEN** the player has purchased 5 writers (progress 0.5 toward first doubling at 10)
- **THEN** the progress bar shows approximately 50% filled (e.g., "████████░░░░░░░░" for an 18-block bar)

#### Scenario: Tier row shows player count and multiplier
- **WHEN** the player has purchased 12 writers with multiplier 2
- **THEN** the Writer row displays count 12 and multiplier "×2"

#### Scenario: Cost uses player-bought count
- **WHEN** the player has purchased 3 writers but 2 cascade workers (5 total)
- **THEN** the cost displayed is based on 3 purchased workers, not 5 total

#### Scenario: Progress bar resets at milestone
- **WHEN** the player has purchased exactly 10 writers (milestone reached, progress = 0 toward next at 20)
- **THEN** the progress bar shows 0% filled

#### Scenario: Progress bar reflects progress after milestone
- **WHEN** the player has purchased 30 writers (progress 0.5 between milestones 20 and 40)
- **THEN** the progress bar shows approximately 50% filled

### Requirement: Number formatting
The system SHALL format numbers using a tiered scheme: raw integers up to 9,999; K/M/B/T suffixes up to 999.9T; scientific notation above 999.9T.

#### Scenario: Numbers below 10K display as raw integers
- **WHEN** the number 42 is formatted
- **THEN** the output is "42"

#### Scenario: Numbers in thousands use K suffix
- **WHEN** the number 1500 is formatted
- **THEN** the output is "1.50K" (one decimal place with K suffix)

#### Scenario: Numbers in millions use M suffix
- **WHEN** the number 2500000 is formatted
- **THEN** the output is "2.50M" (two decimal places with M suffix)

#### Scenario: Numbers in billions use B suffix
- **WHEN** the number 7500000000 is formatted
- **THEN** the output is "7.50B" (two decimal places with B suffix)

#### Scenario: Numbers in trillions use T suffix
- **WHEN** the number 1500000000000 is formatted
- **THEN** the output is "1.50T" (two decimal places with T suffix)

#### Scenario: Numbers above 1T use scientific notation
- **WHEN** the number 1000000000001 (1T + 1) is formatted
- **THEN** the output is in scientific notation (e.g., "1.00e+12")

#### Scenario: Money formatting includes dollar sign and two decimals
- **WHEN** the value $1500.00 is formatted
- **THEN** the output is "$1.50K"

### Requirement: Real-time updates
The TUI SHALL re-render at 10fps (100ms interval) to reflect game state changes.

#### Scenario: Screen updates at 10fps
- **WHEN** the game is running
- **THEN** the terminal display refreshes approximately every 100 milliseconds

#### Scenario: Page number updates every tick
- **WHEN** new pages are generated
- **THEN** the displayed page number and content update on the next render cycle

### Requirement: Event log management
The event log SHALL retain recent events and discard old ones to prevent unbounded growth.

#### Scenario: Log shows recent events
- **WHEN** multiple events occur
- **THEN** the Log panel shows the most recent events (e.g., last 10 entries)

#### Scenario: Old events are removed
- **WHEN** the log exceeds a maximum size
- **THEN** the oldest entries are removed to maintain the size limit

### Requirement: Page number formatting with commas
Page numbers displayed in the UI SHALL use comma-separated thousands formatting for readability up to the scientific notation threshold.

#### Scenario: Page number with thousands formatted
- **WHEN** page number 847293841029 is displayed
- **THEN** it appears as "847,293,841,029" in the page header

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

