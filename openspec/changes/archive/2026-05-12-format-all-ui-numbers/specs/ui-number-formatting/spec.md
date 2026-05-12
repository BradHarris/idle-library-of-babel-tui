## ADDED Requirements

### Requirement: Pages per second uses number formatting
The StatsPanel SHALL format the pages-per-second value using `formatNumber()` instead of a fixed-decimal `toFixed(2)`. Pages per second can grow enormous with many writers and must display with K/M/B/T suffixes for readability.

#### Scenario: Small pages/sec displays as formatted number
- **WHEN** the pages-per-second value is below 10,000
- **THEN** it is displayed as a raw integer (e.g., "42")

#### Scenario: Large pages/sec uses suffix notation
- **WHEN** the pages-per-second value exceeds 10,000
- **THEN** it is displayed with a K/M/B/T suffix (e.g., "1.50K", "2.50M")

#### Scenario: Very large pages/sec uses scientific notation
- **WHEN** the pages-per-second value exceeds 999.9 trillion
- **THEN** it is displayed in scientific notation

### Requirement: All worker counts use number formatting
The WorkersPanel SHALL format all worker tier counts using `formatNumber()` instead of raw string conversion. Worker counts that grow large through cascading auto-hires must display with K/M/B/T suffixes or scientific notation for readability.

#### Scenario: Small worker count displays as raw integer
- **WHEN** a worker count is below 10,000
- **THEN** the count is displayed as a raw integer (e.g., "42")

#### Scenario: Large worker count uses suffix notation
- **WHEN** a worker count exceeds 10,000
- **THEN** the count is displayed with a K/M/B/T suffix (e.g., "1.50K", "2.50M")

#### Scenario: Very large worker count uses scientific notation
- **WHEN** a worker count exceeds 999.9 trillion
- **THEN** the count is displayed in scientific notation (e.g., "1.00e+15")

#### Scenario: All seven worker tiers use consistent formatting
- **WHEN** all seven worker tiers are displayed in the WorkersPanel
- **THEN** each tier's count is formatted consistently using `formatNumber()`

### Requirement: Page numbers in all display locations use appropriate formatting
All locations where page numbers are displayed in the UI SHALL use `formatPageNumber()` (for bigint values) instead of raw `String()` conversion. This includes the StatsPanel (already done), LatestPagePanel header, and any other display location.

#### Scenario: LatestPagePanel header uses formatted page number
- **WHEN** the LatestPagePanel header is rendered
- **THEN** the page number is formatted with `formatPageNumber()` (comma-separated or scientific notation) instead of raw `String()`

#### Scenario: Page number formatting handles bigint values
- **WHEN** a page number exceeds `Number.MAX_SAFE_INTEGER`
- **THEN** the display uses `formatPageNumber()` which handles bigint-to-string conversion with commas or scientific notation

### Requirement: No raw number strings in UI panels
No UI component SHALL display a numeric game value using direct string interpolation (e.g., `{value}`, `String(value)`, `${value}`) without passing it through an appropriate formatter first.

#### Scenario: Tick rate level is formatted
- **WHEN** the tick rate level is displayed in the StatsPanel
- **THEN** the level number is passed through `formatNumber()` (or displays as a formatted integer)

#### Scenario: Progress bar indices are not formatted (exempt)
- **WHEN** internal UI indices (progress bar segment count, tier index [1-7]) are displayed
- **THEN** these may remain as raw integers since they are control values, not game values
