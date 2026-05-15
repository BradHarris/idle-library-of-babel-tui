# phrase-search Specification

## Purpose

Allow players to search for phrases in the Library of Babel by mapping search queries to page addresses, leveraging the deterministic LCG page generation system. A search overlay is triggered via hotkey, revealing either the page content if the address falls within generated pages, or a progress estimate if the phrase lies beyond current progress.

## Requirements

### Requirement: Search query is deterministically mapped to a page address
The system SHALL convert any search query string into a page address by interpreting the UTF-8 encoded bytes as a big-endian bigint. This bigint serves as a page address in the Library of Babel's combinatorial space and is used to look up page content and location.

#### Scenario: Same query always produces the same page address
- **WHEN** the user searches for "the" and then searches for "the" again
- **THEN** both searches produce the same page address and the same result

#### Scenario: Different queries produce different page addresses
- **WHEN** the user searches for "the" and then searches for "cat"
- **THEN** the two searches produce different page addresses

#### Scenario: Query bytes are interpreted as big-endian bigint
- **WHEN** the user searches for "the" (UTF-8 bytes [0x74, 0x68, 0x65])
- **THEN** the page address is 0x746865 = 7,674,213

#### Scenario: Empty query produces a valid page address
- **WHEN** the user submits an empty search query
- **THEN** the system produces a page address of 0

### Requirement: Found results display page content via existing LCG lookups
When the computed page address is within the range of generated pages (≤ pagesGenerated), the search result SHALL use `generatePage(address)` to fetch the page content and `locationFromPageOffset(address)` to compute the location.

#### Scenario: Found result shows page content
- **WHEN** the page address is ≤ pagesGenerated
- **THEN** the result displays the 280-character page content fetched via `generatePage(address)`

#### Scenario: Found result shows formatted page address
- **WHEN** the page address is ≤ pagesGenerated
- **THEN** the result displays the page address using comma-separated formatting

#### Scenario: Found result shows location address
- **WHEN** the page address is ≤ pagesGenerated
- **THEN** the result displays the full location address computed via `locationFromPageOffset(address)` (e.g., "Building 12, Floor 3, Rack 7, Server 2, Drive 0")

### Requirement: Not-found results indicate the phrase is beyond current progress
When the computed page address exceeds the number of generated pages (pagesGenerated), the search result SHALL indicate that the phrase has not been found yet and display both the target page address and the current pagesGenerated.

#### Scenario: Not-found result indicates phrase not yet discovered
- **WHEN** the page address is > pagesGenerated
- **THEN** the result displays a message stating the phrase has not been found

#### Scenario: Not-found result shows both addresses
- **WHEN** the page address is > pagesGenerated
- **THEN** the result displays the target page address and the current pagesGenerated, showing how far the phrase lies beyond current progress

### Requirement: Search is triggered by hotkey with overlay interface
The system SHALL provide a search overlay activated by the `[S]` key. The overlay replaces the main UI temporarily and contains a text input field for the search query and a result display area. Pressing Enter submits the search; pressing Escape cancels and returns to the main UI.

#### Scenario: Pressing [S] opens the search overlay
- **WHEN** the user presses `[S]` during normal gameplay
- **THEN** the main UI is replaced by the search overlay with an empty text input field

#### Scenario: Submitting a search with Enter
- **WHEN** the user types a query and presses Enter in the search overlay
- **THEN** the overlay displays the search result (found or not-found)

#### Scenario: Pressing Escape closes the search overlay
- **WHEN** the user presses Escape in the search overlay
- **THEN** the overlay closes and the main UI is restored

#### Scenario: Main UI state is preserved when searching
- **WHEN** the user opens the search overlay and then closes it
- **THEN** the game continues normally — page generation, money, workers, and all game state are unchanged

### Requirement: Search uses existing lookup functions
The system SHALL use `generatePage(address)` to retrieve page content and `locationFromPageOffset(address)` to compute the location for search results. No custom page generation or location computation logic is needed.

#### Scenario: Page content uses generatePage
- **WHEN** a search result is found
- **THEN** the page content is produced by calling `generatePage(address)` with the page address

#### Scenario: Location uses locationFromPageOffset
- **WHEN** a search result is found
- **THEN** the location is produced by calling `locationFromPageOffset(address)` with the page address
