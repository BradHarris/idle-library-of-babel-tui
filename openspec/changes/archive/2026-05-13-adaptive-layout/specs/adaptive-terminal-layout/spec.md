## ADDED Requirements

### Requirement: Adaptive terminal layout
The TUI SHALL fill the available terminal width using flex-based proportional sizing, and SHALL re-render when the terminal window is resized.

#### Scenario: Layout fills terminal width
- **WHEN** the terminal is 80 columns wide
- **THEN** the dashboard panels collectively span the full width with no excessive unused horizontal space

#### Scenario: Layout adapts to resize
- **WHEN** the user resizes the terminal from 80 to 120 columns
- **THEN** the panels reflow to use the additional horizontal space on the next render cycle

#### Scenario: Layout adapts to narrower terminal
- **WHEN** the user resizes the terminal from 120 to 80 columns
- **THEN** the panels reflow to fit the narrower width on the next render cycle

#### Scenario: Text wrapping adjusts to panel width
- **WHEN** the terminal width changes
- **THEN** the Latest Page panel's text wrapping width adjusts proportionally to fit the new panel width

### Requirement: Two-row grid layout structure
The dashboard SHALL arrange panels in two horizontal rows: a top row with Stats and Storage Scale side by side, and a bottom row with Workers and the Log/Latest Page column side by side.

#### Scenario: Top row contains Stats and Storage
- **WHEN** the app renders
- **THEN** the Stats panel and Storage Scale panel appear on the same horizontal row, with Stats on the left and Storage on the right

#### Scenario: Bottom row contains Workers and Log/Latest Page
- **WHEN** the app renders
- **THEN** the Workers panel appears on the left of the bottom row, and the Log panel with Latest Page panel stacked vertically appears on the right

#### Scenario: Keybind hints remain at the bottom
- **WHEN** the app renders
- **THEN** the keybind prompt row appears below both grid rows, spanning the full terminal width

### Requirement: Proportional panel widths
Panel columns SHALL use proportional widths rather than fixed character counts, adapting to any terminal width of 60 columns or wider.

#### Scenario: Panels scale proportionally at 80 columns
- **WHEN** the terminal is 80 columns wide
- **THEN** the left and right columns divide the available width proportionally (approximately 40/60 split)

#### Scenario: Panels scale proportionally at 120 columns
- **WHEN** the terminal is 120 columns wide
- **THEN** both left and right columns grow proportionally, maintaining the same ratio

#### Scenario: Panels remain usable at minimum width
- **WHEN** the terminal is 60 columns wide
- **THEN** all panels remain visible and readable, though with tighter wrapping

### Requirement: Resize event handling
The application SHALL listen for terminal resize events and trigger a layout recalculation.

#### Scenario: Resize event triggers re-render
- **WHEN** the terminal resize event fires
- **THEN** the UI re-renders with updated dimensions within one render cycle (100ms)

#### Scenario: Cleanup on unmount
- **WHEN** the application is shutting down
- **THEN** the resize event listener is removed to prevent memory leaks
