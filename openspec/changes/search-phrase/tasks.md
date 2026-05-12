## 1. Query-to-page-number conversion

- [ ] 1.1 Add `queryToPageNumber(query: string)` function to `page.js` that hashes the UTF-8 query via SHA-256, converts to bigint, then takes mod 43^280 to produce a page number
- [ ] 1.2 Export `queryToPageNumber` from `page.js`

## 2. Location display helper

- [ ] 2.1 Add `formatLocationDisplay(location)` helper in `format.js` that takes a location tuple and returns a comma-separated string showing all levels from the highest non-zero level down to drive (e.g., "Building 12, Floor 3, Rack 7, Server 2, Drive 0")

## 3. Search overlay component

- [ ] 3.1 Create `SearchOverlay` component in `ui.jsx` that renders a dark overlay with an input field, the search query text, and the search result (found or not-found)
- [ ] 3.2 The overlay captures keyboard input: Enter submits, Escape closes
- [ ] 3.3 Found result displays: query text, page content (wrapped), formatted page number, and formatted location address
- [ ] 3.4 Not-found result displays: query text, target page number, current pagesGenerated, and a "not yet discovered" message

## 4. Search integration in App

- [ ] 4.1 Add `searchOpen`, `searchQuery`, `searchResult` state to `App` component in `index.jsx`
- [ ] 4.2 Add `[S]` key handler that opens the search overlay
- [ ] 4.3 Wire up `SearchOverlay` with search query input, submit handler (calls `queryToPageNumber`), and close handler
- [ ] 4.4 Conditionally render `SearchOverlay` instead of normal UI when `searchOpen` is true
- [ ] 4.5 Add `[S]` search hint to the bottom key prompt line
