## MODIFIED Requirements

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
