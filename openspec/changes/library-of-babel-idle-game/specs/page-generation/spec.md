## ADDED Requirements

### Requirement: Deterministic page generation
The system SHALL generate a 280-character page string deterministically from a page number, such that the same page number always produces the same page string.

#### Scenario: Same page number produces same output
- **WHEN** page number `42` is passed to the page generator
- **THEN** the output is always the identical 280-character string on every call

#### Scenario: Different page numbers produce different outputs
- **WHEN** page number `42` and page number `43` are passed to the page generator
- **THEN** the two outputs are different strings

#### Scenario: Output length is exactly 280 characters
- **WHEN** any page number is passed to the page generator
- **THEN** the output string is exactly 280 characters long

### Requirement: Character set composition
Every character in a generated page MUST be drawn from the defined 43-character alphabet.

#### Scenario: No invalid characters
- **WHEN** any page number is passed to the page generator
- **THEN** every character in the output is one of: a-z, comma, period, exclamation, question mark, left parenthesis, right parenthesis, 0-9, space

#### Scenario: Character set contains exactly 43 characters
- **WHEN** the character set is inspected
- **THEN** it contains exactly: `a`, `b`, `c`, `d`, `e`, `f`, `g`, `h`, `i`, `j`, `k`, `l`, `m`, `n`, `o`, `p`, `q`, `r`, `s`, `t`, `u`, `v`, `w`, `x`, `y`, `z`, `.`, `,`, `!`, `?`, `(`, `)`, `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, ` ` (space)

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
