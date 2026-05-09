# storage-scale-display Specification

## Purpose
TBD - created by archiving change storage-scale-display. Update Purpose after archive.
## Requirements
### Requirement: Storage hierarchy display

The application SHALL display the total page count as a chain of escalating storage tiers, each calculated from the previous tier's count.

#### Scenario: Display shows all 10 tiers at 0 pages

- **WHEN** the player has generated 0 pages
- **THEN** the display shows all 10 tiers, each with a count of 0

#### Scenario: Display cascades through tiers at 1 page

- **WHEN** the player has generated 1 page
- **THEN** "Enterprise Hard Drives" shows 0 (each drive holds 125,658,471,745 pages), all other tiers show 0

### Requirement: Tier definitions with 32 TiB hard drives

The storage hierarchy MUST use the following tiers and multipliers:

| Tier | Unit | Multiplier from Previous |
|------|------|------------------------|
| 1 | Enterprise Hard Drive | 32 TiB (280 bytes/page → 125,658,471,745 pages/drive) |
| 2 | Server | 20 drives per server |
| 3 | Server Rack | 10 servers per rack |
| 4 | Server Floor | 100 racks per floor |
| 5 | Building | 100 floors per building |
| 6 | City | 1,000,000 buildings per city |
| 7 | Planet | 1,000,000 cities per planet |
| 8 | Solar System | 10 planets per system |
| 9 | Galaxy | 1,000,000,000,000 star systems per galaxy |
| 10 | Universe | 1,000,000,000,000 galaxies per universe |

#### Scenario: One hard drive equals 125658471745 pages

- **WHEN** the player has generated exactly 125,658,471,745 pages
- **THEN** "Enterprise Hard Drives" shows 1, all other tiers show 0

#### Scenario: Twenty hard drives equal one server

- **WHEN** the player has generated 125,658,471,745 × 20 = 2,513,169,434,900 pages
- **THEN** "Enterprise Hard Drives" shows 20, "Servers" shows 1, all higher tiers show 0

### Requirement: Floor division calculation

Each tier SHALL be calculated using floor division. The quotient becomes the count for that tier; the remainder carries forward implicitly as the next tier's input. The display SHALL show the integer count for each tier.

Formula: `tierCount[n] = floor(totalInputs ÷ multiplier[n])`, where `totalInputs` is the count from the previous tier (or total pages for tier 1).

#### Scenario: Remainder carries to next tier

- **WHEN** the player has generated 125,658,471,745 × 21 = 2,638,827,906,645 pages
- **THEN** "Enterprise Hard Drives" shows 21, "Servers" shows 1 (floor(21/20)), "Server Racks" shows 0 (floor(1/10))

### Requirement: Display format with labeled lines

Each tier SHALL be displayed as a labeled line in ascending order (smallest unit first), with the tier emoji, name, and count.

#### Scenario: Display shows 1 server with correct format

- **WHEN** the display renders for 2,513,169,434,900 pages
- **THEN** it shows "🖥️ Servers: 1" among other tier lines

#### Scenario: All tiers displayed regardless of magnitude

- **WHEN** the player has generated 0 pages
- **THEN** all 10 tier lines are present, each showing a count of 0

### Requirement: Reactive updates

The display SHALL update whenever the total page count changes. No manual refresh is needed.

#### Scenario: Display updates after page generation

- **WHEN** the player generates pages and the total changes from 0 to 100 pages
- **THEN** the display automatically reflects the new counts without any user action

### Requirement: Zero handling

If the total page count is 0, all tiers SHALL display "0". No tiers SHALL be hidden or omitted based on magnitude.

#### Scenario: Zero page count shows all zeros

- **WHEN** the player has generated 0 pages
- **THEN** every tier displays 0, none are hidden

#### Scenario: Very large counts still show all tiers

- **WHEN** the player has generated enough pages to fill galaxies
- **THEN** all 10 tiers remain visible, not just the non-zero ones

