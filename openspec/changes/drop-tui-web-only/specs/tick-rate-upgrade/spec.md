## MODIFIED Requirements

### Requirement: Tick rate upgrade purchase via keybind

The tick rate upgrade SHALL be purchasable from the web Stats panel via an explicit control (button or equivalent) that calls `upgradeTickRate()` on the game store when activated. If the player cannot afford the upgrade, the control SHALL either be disabled or invoke the action without effect per existing store behavior.

#### Scenario: Clicking the upgrade control purchases when affordable

- **WHEN** the player activates the tick rate upgrade control and has enough money
- **THEN** `upgradeTickRate()` succeeds and tick interval decreases according to existing rules

#### Scenario: No terminal keybind

- **WHEN** the implementation is inspected
- **THEN** there is no requirement to handle a global `u` key in an Ink `useInput` handler

#### Scenario: Affordability reflected in UI

- **WHEN** the player cannot afford the next tick rate upgrade
- **THEN** the web UI indicates unaffordable state (disabled control and/or visual styling) consistent with the stats panel design
