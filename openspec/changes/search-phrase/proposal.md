## Why

The Library of Babel contains every possible 280-character text. Players naturally want to find specific phrases, quotes, or words within this vast space. Currently there is no way to look up content — you can only watch pages auto-generate sequentially. A search feature gives players agency to explore the library actively, turning it from a passive observer into an explorer.

## What Changes

- **Search hotkey**: Pressing `[S]` opens an overlay popup with a text input field for the search query.
- **Query → Page address mapping**: The search query bytes are converted to a bigint (big-endian), which serves as a page address. This address is compared against `pagesGenerated` to determine found/not-found.
- **Found/Not-found display**: If the page address ≤ `pagesGenerated`, the page content is fetched via `generatePage(address)` and its location via `locationFromPageOffset(address)`. If the address > `pagesGenerated`, a "not found" message shows the target address and current progress.
- **Result display**: Found results show the 280-character page content (wrapped), the formatted page address, and the full location address (e.g., "Building 12, Floor 3, Rack 7, Server 2, Drive 0").

## Capabilities

### New Capabilities
- `phrase-search`: Deterministic mapping from text query to page address using bigint byte conversion, with found/not-found logic based on current progress

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
