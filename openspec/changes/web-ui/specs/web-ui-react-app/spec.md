## ADDED Requirements

### Requirement: Web app renders a dashboard layout matching the TUI structure
The web UI SHALL render a responsive dashboard with the same panels as the TUI: Stats, Workers, Storage Scale, Event Log, and Latest Page. The layout SHALL use a CSS grid or flexbox arrangement that mirrors the TUI's two-row structure (Stats + Storage Scale on top, Workers + Log + Latest Page on bottom).

#### Scenario: Dashboard displays all panels
- **WHEN** the web app loads in a browser
- **THEN** the Stats, Workers, Storage Scale, Event Log, Latest Page panels are all visible

#### Scenario: Layout adapts to viewport width
- **WHEN** the browser viewport is resized
- **THEN** the panels reflow to maintain readability without horizontal scrolling

### Requirement: Web app reuses the existing Zustand game store
The web UI SHALL import and use `stores/gameStore.ts` directly, subscribing to the same state selectors (pagesGenerated, money, workers, log, pps, latestPage, etc.) that the TUI uses. The game tick SHALL be driven by a `setInterval` in a React `useEffect` that calls `useGameStore.getState().tick(interval)` at the store's configured tick interval.

#### Scenario: State updates propagate to the web UI
- **WHEN** the game tick advances and pages are generated
- **THEN** the Stats panel shows updated pages generated, money, and pages per second

#### Scenario: Tick interval is dynamic
- **WHEN** the player purchases a tick rate upgrade
- **THEN** the interval driving game ticks decreases according to the store's tick interval calculation

### Requirement: Stats panel displays game metrics
The Stats panel SHALL display: total pages generated (formatted with `formatPageNumber`), current money (formatted with `formatMoney`), pages per second, and tick rate information with upgrade cost. The panel SHALL use Radix UI components for any interactive elements (e.g., upgrade button).

#### Scenario: Stats panel shows formatted values
- **WHEN** the player has generated 1500 pages and earned $2500
- **THEN** pages displays as "1,500" and money displays as "$2.50K"

#### Scenario: Tick rate upgrade is actionable
- **WHEN** the player has enough money for a tick rate upgrade
- **THEN** the upgrade control is enabled and clickable

### Requirement: Workers panel displays all tiers with hire controls
The Workers panel SHALL list all seven worker tiers (Writer through Archbishop), showing count, purchase cost, and an actionable hire control per tier. The hire control SHALL be enabled/disabled based on affordability from `useGameStore(s => s.canAfford)`. Each hire SHALL call `useGameStore.getState().hire(tierId)`.

#### Scenario: Worker tiers display counts and costs
- **WHEN** the player has 5 writers and 2 managers
- **THEN** the Workers panel shows "Writer: 5" and "Manager: 2" with correct costs

#### Scenario: Hire button is disabled when unaffordable
- **WHEN** the player has $100 and tries to hire a Manager (cost $500)
- **THEN** the hire control for Manager is visually disabled

#### Scenario: Hire button triggers store action
- **WHEN** the player clicks hire on an affordable tier
- **THEN** the store's hire action is called, money is deducted, and worker count increases

### Requirement: Storage Scale panel shows escalating storage tiers
The Storage Scale panel SHALL compute and display the storage scale breakdown using `computeStorageScale` from `storageScale.js`. Each tier SHALL show the tier emoji, name, and count formatted with `formatNumber`.

#### Scenario: Storage scale shows correct tier breakdown
- **WHEN** pages generated equals a value that fills multiple storage tiers
- **THEN** each tier shows the correct count computed from the cascading division

### Requirement: Event Log panel shows recent game events
The Event Log panel SHALL display the most recent log entries from `useGameStore(s => s.log)`, showing timestamp and message. The log SHALL be scrollable and SHALL show newest entries first.

#### Scenario: Log entries display with timestamps
- **WHEN** a worker is hired
- **THEN** a new log entry appears with timestamp (HH:MM:SS) and hire message

#### Scenario: Log scrolls when entries exceed visible area
- **WHEN** more than the visible number of log entries exist
- **THEN** the log panel scrolls to show entries without overflow

### Requirement: Latest Page panel displays the most recent page
The Latest Page panel SHALL display the current page number (formatted with `formatPageNumber`) and the 280-character page content from `useGameStore(s => s.latestPage)`. The content SHALL be wrapped to fit the display width.

#### Scenario: Page content is displayed
- **WHEN** a new page is generated
- **THEN** the Latest Page panel shows the page number and its 280-character content

#### Scenario: Page content wraps within display width
- **WHEN** the 280-character page is rendered
- **THEN** the content wraps into multiple lines fitting the panel width

### Requirement: Search functionality mirrors the TUI search
The web UI SHALL provide a search interface (via Radix Dialog or Popover) where the player enters a phrase query. On submission, the search SHALL call `queryToPageAddress` from `page.js` and `stateToPage` from `lcg.js` to resolve the page content. Results SHALL display the page address, location (via `locationFromPageOffset`), and content if found; or a "not yet discovered" message if the page exceeds `pagesGenerated`.

#### Scenario: Search finds an existing page
- **WHEN** the player searches for a phrase whose page address is ≤ pagesGenerated
- **THEN** the result shows the page address, location, and page content

#### Scenario: Search reports undiscovered pages
- **WHEN** the player searches for a phrase whose page address exceeds pagesGenerated
- **THEN** the result shows "not yet discovered" with the target page number and current pages generated

### Requirement: UI uses Radix UI components and Tailwind CSS
All interactive web UI components SHALL be built using Radix UI primitives (Button, Tabs, ScrollArea, Dialog, etc.) styled with Tailwind CSS utility classes. No Ink-specific components (Text, Box, useInput) SHALL be used in the web app.

#### Scenario: Buttons use Radix Button
- **WHEN** a hire or upgrade control is rendered
- **THEN** it is built on Radix UI's Button primitive

#### Scenario: Scrollable areas use Radix ScrollArea
- **WHEN** the event log or worker list exceeds visible height
- **THEN** it uses Radix UI's ScrollArea component
