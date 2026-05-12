## ADDED Requirements

### Requirement: Search query is deterministically mapped to a page number
The system SHALL convert any search query string into a deterministic page number using SHA-256 hashing. The query bytes are hashed to produce a 256-bit value, which is then reduced modulo 43^280 to yield a valid page address within the Library of Babel's combinatorial space.

#### Scenario: Same query always produces the same page number
- **WHEN** the user searches for "the" and then searches for "the" again
- **THEN** both searches return the exact same page number and page content

#### Scenario: Different queries produce different page numbers
- **WHEN** the user searches for "the" and then searches for "cat"
- **THEN** the two searches return different page numbers

#### Scenario: Empty query produces a valid page number
- **WHEN** the user submits an empty search query
- **THEN** the system computes a page number from the empty string hash

#### Scenario: Special characters in query are handled
- **WHEN** the user searches for a query containing spaces, punctuation, or digits (e.g., "hello world! 42")
- **THEN** the system computes a deterministic page number for that query

### Requirement: Found results display page content and location
When the computed page number is within the range of generated pages (≤ pagesGenerated), the search result SHALL display the 280-character page content, the formatted page number, and the full storage location address.

#### Scenario: Found result shows page content
- **WHEN** the search page number is ≤ pagesGenerated
- **THEN** the result displays the 280-character page content wrapped to fit the display width

#### Scenario: Found result shows formatted page number
- **WHEN** the search page number is ≤ pagesGenerated
- **THEN** the result displays the page number using comma-separated formatting (e.g., "1,234,567,890")

#### Scenario: Found result shows location address
- **WHEN** the search page number is ≤ pagesGenerated
- **THEN** the result displays the full location address derived from the page number (e.g., "Building 12, Floor 3, Rack 7, Server 2, Drive 0")

### Requirement: Not-found results indicate the phrase is beyond current progress
When the computed page number exceeds the number of generated pages (pagesGenerated), the search result SHALL indicate that the phrase has not been found yet and display how far into the library the phrase would appear.

#### Scenario: Not-found result indicates phrase not yet discovered
- **WHEN** the search page number is > pagesGenerated
- **THEN** the result displays a message stating the phrase has not been found

#### Scenario: Not-found result shows how many pages away
- **WHEN** the search page number is > pagesGenerated
- **THEN** the result displays the page number where the phrase exists and indicates it has not yet been generated (e.g., "Phrase found at page 987,654,321 — not yet discovered (you are at page 1,234,567)")

### Requirement: Search is triggered by hotkey with overlay interface
The system SHALL provide a search overlay activated by the `[S]` key. The overlay replaces the main UI temporarily and contains a text input field for the search query and a result display area. Pressing Enter submits the search; pressing Escape cancels and returns to the main UI.

#### Scenario: Pressing [S] opens the search overlay
- **WHEN** the user presses `[S]` during normal gameplay
- **THEN** the main UI is replaced by the search overlay with an empty text input field

#### Scenario: Submitting a search with Enter
- **WHEN** the user types a query and presses Enter in the search overlay
- **THEN** the overlay displays the search result (found or not-found) with the page content and location

#### Scenario: Pressing Escape closes the search overlay
- **WHEN** the user presses Escape in the search overlay
- **THEN** the overlay closes and the main UI is restored

#### Scenario: Search overlay can be dismissed after viewing a result
- **WHEN** the user views a search result and presses Escape
- **THEN** the overlay closes and the main UI is restored

#### Scenario: Main UI state is preserved when searching
- **WHEN** the user opens the search overlay and then closes it
- **THEN** the game continues normally — page generation, money, workers, and all game state are unchanged

### Requirement: Search supports the same 43-character alphabet as page content
The search query is interpreted as a string of bytes encoded in UTF-8. The SHA-256 hash is computed over these bytes, independent of the 43-character page alphabet. This means any Unicode input is valid for searching, though the resulting page content uses only the 43-character alphabet.

#### Scenario: Unicode input produces deterministic results
- **WHEN** the user searches for a query containing non-ASCII characters (e.g., "café")
- **THEN** the system computes a deterministic page number from the UTF-8 encoded bytes
