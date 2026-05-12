## Why

The Library of Babel contains every possible 280-character text. Players naturally want to find specific phrases, quotes, or words within this vast space. Currently there is no way to look up content — you can only watch pages auto-generate sequentially. A search feature gives players agency to explore the library actively, turning it from a passive observer into an explorer.

## What Changes

- **Search hotkey**: Pressing `[S]` opens an overlay popup with a text input field for the search query.
- **Query → Page mapping**: The search query string is deterministically hashed to a page number using SHA-256, converted to a bigint, then taken modulo 43^280 to produce a valid page address.
- **Found/Not-found display**: If the computed page number ≤ `pagesGenerated`, the page content and its location are displayed. If the page number > `pagesGenerated`, a "not found" message is shown indicating how far into the library the phrase lies.
- **Result display**: Found results show the 280-character page content (wrapped), the full location address (e.g., "Building 12, Floor 3, Rack 7, Server 2, Drive 0"), and the page number.

## Capabilities

### New Capabilities
- `phrase-search`: Deterministic mapping from text query to page address using SHA-256 hashing, with found/not-found logic based on current progress

### Modified Capabilities
- `tui-display`: Added search overlay UI as a new panel interaction in the dashboard

## Impact

- **`src/index.jsx`**: Add search overlay state, `[S]` key handler, overlay rendering
- **`src/page.js`**: Add `queryToPageNumber(query: string)` function that hashes the query to a page number
- **`src/storageScale.js`**: No changes — `locationFromPageOffset()` already exists and is reused
- **`src/ui.jsx`**: Add `SearchOverlay` component
- **`src/config.js`**: No changes
- **`src/stores/gameStore.ts`**: No changes — search is stateless (no persistent search history)
- No new dependencies — uses Node.js built-in `crypto` module
