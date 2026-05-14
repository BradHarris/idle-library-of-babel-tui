## MODIFIED Requirements

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
- **THEN** the Workers panel shows all seven tiers, each with the current count, current purchase cost, and a hire button in the left column of the bottom row

#### Scenario: Log panel shows recent events
- **WHEN** events occur (hires, auto-hires)
- **THEN** the Log panel displays them with timestamps, newest first, oldest removed in the right column of the bottom row

#### Scenario: Storage Scale panel displays storage hierarchy
- **WHEN** the game is running
- **THEN** the Storage Scale panel shows the escalating storage tier breakdown in the right column of the top row

#### Scenario: Layout uses proportional sizing
- **WHEN** the terminal is wider than 60 columns
- **THEN** the left and right columns divide the available width proportionally using flex layout
