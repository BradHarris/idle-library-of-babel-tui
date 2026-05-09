# page-generation Specification

## Purpose
TBD - created by archiving change library-of-babel-idle-game. Update Purpose after archive.
## Requirements
### Requirement: Deterministic page generation
The system SHALL generate a 280-character page string deterministically from a page number. The page content is generated via the LCG and then reversed before being returned, so that the same page number always produces the same (reversed) page string.

#### Scenario: Same page number produces same output
- **WHEN** page number `42` is passed to the page generator
- **THEN** the output is always the identical 280-character string on every call

#### Scenario: Different page numbers produce different outputs
- **WHEN** page number `42` and page number `43` are passed to the page generator
- **THEN** the two outputs are different strings

#### Scenario: Output length is exactly 280 characters
- **WHEN** any page number is passed to the page generator
- **THEN** the output string is exactly 280 characters long

#### Scenario: Page content is reversed
- **WHEN** `generatePage(0n)` is called
- **THEN** the returned string equals `stateToPage(lcgState(0n), ALPHABET).split('').reverse().join('')` (i.e., the LCG-generated page reversed)

### Requirement: Character set composition
Every character in a generated page MUST be drawn from the defined 43-character alphabet, ordered as: space, punctuation, lowercase letters, digits.

The alphabet is: ` .,!?()abcdefghijklmnopqrstuvwxyz0123456789`

Index mapping:
- `0` → space
- `1` → `.`
- `2` → `,`
- `3` → `!`
- `4` → `?`
- `5` → `(`
- `6` → `)`
- `7`–`32` → `a`–`z`
- `33`–`42` → `0`–`9`

#### Scenario: No invalid characters
- **WHEN** any page number is passed to the page generator
- **THEN** every character in the output is one of: space, period, comma, exclamation, question mark, left parenthesis, right parenthesis, a-z, 0-9

#### Scenario: Character set contains exactly 43 characters
- **WHEN** the character set is inspected
- **THEN** it contains exactly: ` ` (space), `.`, `,`, `!`, `?`, `(`, `)`, `a`–`z`, `0`–`9`

### Requirement: Seeded PRNG for page generation
The system SHALL use a deterministic pseudo-random number generator seeded from the page number to produce each character.

#### Scenario: PRNG seed derived from page number
- **WHEN** a page number is provided
- **THEN** the PRNG seed is deterministically derived from that page number (e.g., via SHA-256 hash truncated to 32 bits)

#### Scenario: Page generation uses PRNG to select characters
- **WHEN** generating a page
- **THEN** each of the 280 characters is selected by drawing a random index from the PRNG and mapping it to a character in the 43-character alphabet (index = PRNG output mod 43)

### Requirement: Page number zero produces valid output
- **WHEN** page number `0` is passed to the page generator
- **THEN** a valid 280-character string is returned using only characters from the defined alphabet

### Requirement: Large page numbers produce valid output
- **WHEN** a very large page number (e.g., `9999999999999999999999999999999999999999999999999999999999`) is passed to the page generator
- **THEN** a valid 280-character string is returned using only characters from the defined alphabet

### Requirement: Each tick cascades workers from higher tiers to lower tiers

Every game tick, each non-writer tier MUST add the count of the tier immediately above it to its own worker count. The cascade proceeds top-to-bottom so that spawned workers can cascade further in the same tick.

The cascade order is: rectors → overseers → managers → writers.

#### Scenario: Manager count increases by overseer count

- **WHEN** a game tick executes with 3 overseers and 2 managers
- **THEN** the manager count becomes 5 (2 + 3)

#### Scenario: Writer count increases by manager count

- **WHEN** a game tick executes with 4 managers and 10 writers
- **THEN** the writer count becomes 14 (10 + 4)

#### Scenario: Cascade chains in a single tick

- **WHEN** a game tick executes with 2 rectors, 0 overseers, 0 managers, 5 writers
- **THEN** after the tick: 2 overseers (0 + 2), 2 managers (0 + 2), and 7 writers (5 + 2)

#### Scenario: All 7 tiers cascade

- **WHEN** a game tick executes with 1 archbishop, 1 pope, 1 cardinal, 1 rector, 1 overseer, 1 manager, 1 writer
- **THEN** after the tick: 2 pope, 3 cardinal, 4 rector, 5 overseer, 6 manager, 7 writer (cascade chains: each tier adds the already-updated count of the tier above it)

### Requirement: Pages-per-second equals the writer count

The `calcPagesPerSecond` function MUST return only the number of writer workers. Workers of all other tiers MUST NOT contribute to the pages-per-second calculation.

#### Scenario: Buying a manager does not change pages/sec

- **WHEN** a manager is purchased (writer count unchanged)
- **THEN** `calcPagesPerSecond` returns the same value as before

#### Scenario: Cascaded writers increase pages/sec

- **WHEN** 2 managers exist and a tick executes
- **THEN** the writer count increases by 2 and `calcPagesPerSecond` returns the new writer count

### Requirement: Pages generated per tick uses the pre-cascade writer count

Pages generated during a tick MUST be based on the writer count at the start of the tick (before cascade), not the post-cascade count.

#### Scenario: Pages use old writer count

- **WHEN** a game tick executes with 5 writers and 3 managers
- **THEN** pages generated this tick equals 5 × delta (not 8 × delta)

