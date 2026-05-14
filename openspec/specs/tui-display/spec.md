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

### Requirement: Page content wrapping
The 280-character page content SHALL be wrapped to fit within the display width.

#### Scenario: Page content wraps at display width
- **WHEN** a 280-character page is displayed in a 90-character-wide display area
- **THEN** the content wraps into 4 lines: 90 + 90 + 90 + 10 characters

#### Scenario: Wrapping preserves character order
- **WHEN** a page is wrapped and displayed
- **THEN** the character sequence across lines is identical to the original page string

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

