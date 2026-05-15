## MODIFIED Requirements

### Requirement: Workers panel displays all tiers with counts and costs

The TUI SHALL render a Workers panel listing all seven tiers. Each tier row SHALL display: the hire keybind, tier name, player-bought worker count, current purchase cost, doubling multiplier, and a progress bar showing progress toward the next output-doubling milestone. The progress bar SHALL use the `doublingProgress` value from the game store, displayed as filled (█) and empty (░) blocks.

#### Scenario: Tier row shows player count and multiplier
- **WHEN** the player has purchased 12 writers with multiplier 2
- **THEN** the Writer row displays count 12 and multiplier "×2"

#### Scenario: Progress bar reflects doubling progress
- **WHEN** the player has purchased 5 writers (progress 0.5 toward first doubling at 10)
- **THEN** the progress bar shows approximately 50% filled (e.g., "████████░░░░░░░░" for an 18-block bar)

#### Scenario: Progress bar resets at milestone
- **WHEN** the player has purchased exactly 10 writers (milestone reached, progress = 0 toward next at 20)
- **THEN** the progress bar shows 0% filled

#### Scenario: Progress bar reflects progress after milestone
- **WHEN** the player has purchased 30 writers (progress 0.5 between milestones 20 and 40)
- **THEN** the progress bar shows approximately 50% filled

#### Scenario: Layout uses proportional sizing
- **WHEN** the terminal is wider than 60 columns
- **THEN** the left and right columns divide the available width proportionally using flex layout
