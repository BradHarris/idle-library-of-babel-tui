## ADDED Requirements

### Requirement: Page content is deterministic per location and page number
The system SHALL generate page content deterministically based on both the page number AND the current location in the storage hierarchy. Given the same page number and the same location (same values for all hierarchy levels: drive, server, rack, floor, building, city, planet, solar system, galaxy), the generated page content SHALL always be identical.

#### Scenario: Same location and page number produce same content
- **WHEN** the player navigates to Building 1, Floor 2, Rack 3, Server 4, Drive 5
- **AND** views page 100
- **THEN** the generated page content is a deterministic string derived from the combination of location (1,2,3,4,5,...) and page number 100

#### Scenario: Different location produces different content for same page number
- **WHEN** the player is on Building 1, Floor 2, Rack 3, Server 4, Drive 5
- **AND** views page 100
- **THEN** the page content for page 100 at a different location (e.g., Building 1, Floor 2, Rack 3, Server 4, Drive 6) SHALL be different from the content at Drive 5

#### Scenario: Navigating away and back restores original content
- **WHEN** the player views page 100 on Drive 5
- **AND** navigates to Drive 6
- **AND** navigates back to Drive 5
- **THEN** page 100 displays the exact same content as before

#### Scenario: Location with all-zero indices defaults to original page content
- **WHEN** all location indices are 0 (default state)
- **AND** page 42 is generated
- **THEN** the content matches what would be generated from page number 42 alone using the original algorithm

### Requirement: Page generation uses a seeded PRNG based on location and page number
The system SHALL derive a seed for the pseudo-random number generator by combining the page number and the current location path into a single deterministic input, then using a Linear Congruential Generator (or equivalent seeded PRNG) to produce page content. The implementation MUST use the existing Mulberry32 PRNG from `page.js`.

#### Scenario: Seed incorporates location path
- **WHEN** the current location has indices [drive=2, server=1, rack=0, floor=0, ...]
- **AND** page number is 50
- **THEN** the seed used for page generation is derived from a hash of the combined location path and page number

#### Scenario: PRNG produces consistent output for same seed
- **WHEN** the same (location, page number) pair is used to generate a page
- **THEN** the output is always the same 280-character string

### Requirement: Page content is always exactly 280 characters
The system SHALL generate page content that is exactly 280 characters long, using the existing 43-character alphabet (a-z, punctuation, digits, space).

#### Scenario: Page length is exactly 280
- **WHEN** any page is generated at any location
- **THEN** the returned string is exactly 280 characters in length

## REMOVED Requirements

### Requirement: Pages are generated solely from page number
**Reason**: Replaced by location-aware page generation. The original single-parameter `generatePage(pageNum)` behavior is now the default when all location indices are zero.
**Migration**: The `generatePage` function signature changes to `generatePage(pageNum, location?)` with an optional location parameter that defaults to all-zero indices for backward compatibility.
