## 1. Query-to-page-address conversion

- [x] 1.1 Add `queryToPageAddress(query: string)` function that encodes the query as UTF-8 bytes and converts to a big-endian bigint page address
- [x] 1.2 Export `queryToPageAddress` from `page.js`

## 2. Location display helper

- [x] 2.1 Add `formatLocationDisplay(location)` helper in `format.js` that takes a location tuple and returns a comma-separated string showing non-zero levels (e.g., "Building 12, Floor 3, Rack 7, Server 2, Drive 0")

## 3. Search overlay component

- [x] 3.1 Create `SearchOverlay` component in `ui.jsx` that renders a search overlay with an input field, query display, and result area
- [x] 3.2 The overlay captures keyboard input: Enter submits the search, Escape closes
- [x] 3.3 Found result displays: the query, page content (wrapped via wrapText), page address (formatted), and location (from formatLocationDisplay)
- [x] 3.4 Not-found result displays: the query, "not yet discovered" message, target page address, and current pagesGenerated

## 4. Search integration in App

- [x] 4.1 Add `searchOpen`, `searchQuery`, `searchResult` state to `App` in `index.jsx`
- [x] 4.2 Add `[S]` key handler that opens the search overlay
- [x] 4.3 Wire up `SearchOverlay` with search query input, submit handler (calls `queryToPageAddress` then `generatePage`/`locationFromPageOffset`), and close handler
- [x] 4.4 Conditionally render `SearchOverlay` instead of normal UI when `searchOpen` is true
- [x] 4.5 Add `[S]` search hint to the bottom key prompt line
