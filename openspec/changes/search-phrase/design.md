## Context

The game already has:
- `generatePage(pageNum)` in `page.js` — deterministic page generation using LCG
- `locationFromPageOffset(pageNum)` in `storageScale.js` — converts any page number to a location tuple
- `formatPageNumber()` in `format.js` — formats bigint page numbers with commas
- Ink's `Input` component — available for text entry in TUI
- Node.js built-in `crypto` module — SHA-256 available without dependencies

The game has no search capability. Players watch pages auto-generate sequentially with no way to look up specific content.

## Goals / Non-Goals

**Goals:**
- Add `[S]` hotkey to open a search overlay
- Convert query text → deterministic page number via SHA-256 → bigint → mod 43^280
- Display found pages with content, page number, and location address
- Display not-found pages with the target page number and distance from current progress
- Close overlay with Escape, return to normal gameplay

**Non-Goals:**
- Searching within already-generated pages (substring match) — the Library of Babel's combinatorial space means any phrase exists, just hashed to a deterministic page
- Search history or bookmarks
- Fuzzy search or partial matching
- Persistent search settings or preferences
- Search from the main UI without an overlay

## Decisions

### Decision 1: Query → Page Number via SHA-256 hash
**Choice**: Hash the UTF-8 encoded query string using SHA-256, interpret the 32-byte hash as a big-endian bigint, then compute `hash % 43^280` to get a valid page number.

```javascript
import { createHash } from 'crypto';

export function queryToPageNumber(query) {
  const hashBytes = createHash('sha256').update(query, 'utf8').digest();
  // Convert 32 bytes → bigint
  let hashBigint = 0n;
  for (const byte of hashBytes) {
    hashBigint = (hashBigint << 8n) | BigInt(byte);
  }
  // Modulo to get valid page number
  return hashBigint % LCG_M; // LCG_M = 43^280
}
```

**Rationale**: SHA-256 is built into Node.js (no new dependencies). It produces a uniform 256-bit distribution, which maps evenly across the 43^280 search space. The modulo operation introduces a negligible bias (2^256 >> 43^280 ≈ 10^78, so the ratio is astronomically small).

**Alternatives considered**:
- Use the existing LCG to derive pages from the hash: more complex, no benefit since every page exists in the LCG cycle
- Use a simpler hash (e.g., djb2): weaker distribution, risk of clustering for common phrases

### Decision 2: Search overlay as a conditional render in App component
**Choice**: The search overlay is a React component rendered conditionally inside the `App` component. When `searchOpen` is true, the overlay renders instead of the normal panels. The overlay uses Ink's `Box` and `Input` components for the search field.

**Rationale**: This keeps the search state local to `App` (no need for store changes). The overlay can capture input and keyboard events independently of the main UI's `useInput` hook.

```jsx
{searchOpen ? (
  <SearchOverlay query={searchQuery} setQuery={setSearchQuery}
                 result={searchResult} setResult={setSearchResult}
                 onClose={() => setSearchOpen(false)} />
) : (
  <NormalUI />
)}
```

### Decision 3: Result display within the overlay
**Choice**: The search overlay has a fixed-size display area below the input field that shows either:
- **Found**: page content (wrapped), page number, and location address
- **Not found**: the target page number and distance from current pagesGenerated

The overlay does not navigate to the found page — it's a read-only view. The player stays at their current position in the main UI.

**Rationale**: Searching is exploratory, not navigational. The player doesn't need to "go to" the found page — they just want to see what it says. Navigating would change `currentPage` and interfere with normal gameplay.

### Decision 4: Store `queryToPageNumber` in `page.js`
**Choice**: Add `queryToPageNumber()` as a new export in `page.js`, alongside `generatePage()`. This keeps all page-related logic in one module.

**Rationale**: `queryToPageNumber` is fundamentally about mapping to a page — it's a page-generation utility, not a search utility per se. Placing it in `page.js` alongside `generatePage()` maintains logical cohesion.

### Decision 5: Location display for found results
**Choice**: Use `locationFromPageOffset(pageNumber)` to decompose the page number into its location tuple, then format it as a readable string (e.g., "Building 12, Floor 3, Rack 7, Server 2, Drive 0"). Non-zero levels are included; zero-level prefixes are shown for completeness since the location represents a position, not a count.

**Rationale**: The location gives spatial context to the search result — it tells the player "where" in the library this content lives. This ties into the existing storage hierarchy visualization and reinforces the game's theme.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| SHA-256 modulo 43^280 introduces negligible bias | The bias is astronomically small (hash space 2^256 vs target 43^280 ≈ 10^458). For all practical purposes, distribution is uniform. |
| Search overlay blocks main UI interaction | Intentional — the overlay replaces the main UI. Escape returns to it. This is standard modal behavior. |
| Player might expect to navigate to found page | Document/communicate that search is read-only. If navigation is desired in the future, it's a separate feature. |
| Large pagesGenerated values compared to search result | BigInt comparison handles this correctly. Not-found message shows both numbers with K/M/B/T formatting. |
| Ink's `Input` component behavior in overlay | Ink handles focused input in overlays well. Escape key is standard for dismissing. No custom input handling needed. |

## Migration Plan

This change adds new functionality without modifying existing behavior:
1. Add `queryToPageNumber()` to `page.js`
2. Add `SearchOverlay` component to `ui.jsx`
3. Add search state and handlers to `App` in `index.jsx`
4. No store changes, no config changes, no breaking changes

## Open Questions

1. Should the search result show the page number as "not yet discovered" or just say "not found"? Decision: show both the target page number and the current pagesGenerated so the player understands how far away it is.
2. Should pressing Enter with an empty query do anything? Decision: compute a page number from the empty string hash and show the result (it's valid input, just produces a random-looking page).
3. Should the overlay show the search query alongside the result? Decision: yes — display the query text above the result for context.
