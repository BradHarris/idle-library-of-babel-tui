## ADDED Requirements

### Requirement: Current location is displayed in the UI
The system SHALL display the player's current location in the storage hierarchy within the stats panel or page display area. The display SHALL show all non-zero location levels with their tier names and indices.

#### Scenario: Default location displays as zeros
- **WHEN** the game starts (no navigation performed)
- **THEN** the location display shows all levels with index 0, formatted as "Hard Drive 0, Server 0, Rack 0, Floor 0, Building 0, City 0, Planet 0, Solar System 0, Galaxy 0"

#### Scenario: Navigated location shows correct indices
- **WHEN** the player navigates to Hard Drive 5, Server 3, Rack 1, Floor 0, Building 0, City 0, Planet 0, Solar System 0, Galaxy 0
- **THEN** the location display shows the non-zero indices: "Hard Drive 5, Server 3, Rack 1" (or all indices depending on display format)

#### Scenario: Large indices use formatted notation
- **WHEN** the player has navigated to Hard Drive 1,500,200
- **THEN** the location display uses formatted notation (e.g., "Hard Drive 1.50M") consistent with `formatNumber()` rules

### Requirement: Player can navigate within the storage hierarchy
The system SHALL allow the player to navigate up and down within each level of the storage hierarchy using keyboard input, changing the corresponding location index.

#### Scenario: Navigate to next hard drive
- **WHEN** the player presses the "next" navigation key (e.g., Right arrow or K) while at the hard drive level
- **THEN** the hard drive index increments by 1

#### Scenario: Navigate to previous hard drive
- **WHEN** the player presses the "previous" navigation key (e.g., Left arrow or J) while at the hard drive level
- **THEN** the hard drive index decrements by 1, with a minimum of 0

#### Scenario: Hard drive index cannot go below zero
- **WHEN** the player is at Hard Drive 0
- **AND** presses the "previous" navigation key
- **THEN** the hard drive index remains at 0

### Requirement: Player can navigate across hierarchy levels
The system SHALL allow the player to move between different levels of the storage hierarchy (e.g., from hard drive view to server view to rack view, etc.).

#### Scenario: Move to next hierarchy level
- **WHEN** the player presses the "advance level" key (e.g., Enter or Down arrow) while viewing a level
- **THEN** the active level advances to the next tier in the hierarchy (e.g., hard drive → server → rack → floor → building → ...)

#### Scenario: Move to previous hierarchy level
- **WHEN** the player presses the "retreat level" key (e.g., Escape or Up arrow) while viewing a level above the first
- **THEN** the active level moves to the previous tier in the hierarchy

#### Scenario: Cannot retreat below first level
- **WHEN** the player is at the first hierarchy level (hard drive)
- **AND** presses the "retreat level" key
- **THEN** the active level remains at the first level

### Requirement: Page display updates when location changes
The system SHALL update the displayed page content whenever the player navigates to a different location. The current page number is preserved, but the page content changes to reflect the new location's deterministic seed.

#### Scenario: Page content updates on location change
- **WHEN** the player is viewing page 42 at Hard Drive 0
- **AND** navigates to Hard Drive 1
- **THEN** page 42 at Hard Drive 1 displays different content than page 42 at Hard Drive 0

#### Scenario: Page number preserved across navigation
- **WHEN** the player is viewing page 42 at Hard Drive 0
- **AND** navigates to Hard Drive 1, then Server 2, then back to Hard Drive 0
- **THEN** page 42 displays the same content as it did before navigation (same location = same content)

### Requirement: Navigation key hints are displayed in the UI
The system SHALL display the available navigation keys for the current active level, indicating which keys move within the current level and which keys change levels.

#### Scenario: Navigation hints show available actions
- **WHEN** the player is viewing the hard drive level
- **THEN** the UI displays hint text showing which keys advance the hard drive index and which keys move to the next hierarchy level

#### Scenario: Navigation hints update when level changes
- **WHEN** the player moves from hard drive level to server level
- **THEN** the navigation hint text updates to show server-level navigation keys
