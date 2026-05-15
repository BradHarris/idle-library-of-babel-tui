## Context

The game already has:
- `generatePage(pageNum)` in `page.js` — deterministic page generation using LCG
- `lcgState(pageNum)` in `page.js` — computes LCG state at iteration N via geoPair
- `stateToPage(state, alphabet)` in `page.js` — converts LCG state (bigint) to 280-char text via base-43
- `locationFromPageOffset(pageNum)` in `storageScale.js` — decomposes page number into location tuple
- Ink's `Input` component — available for text entry in TUI
- Node.js built-in `crypto` module — available but NOT needed for this feature

The search feature maps a text query to a page address using the LCG's structure, not hashing. The query bytes are interpreted as a big-endian bigint, which serves as a page address in the combinatorial space.

## Goals / Non-Goals

**Goals:**
- Add `[S]` hotkey to open a search overlay
- Convert query bytes to page address via big-endian bigint conversion
- Use `generatePage(address)` for content lookup and `locationFromPageOffset(address)` for location lookup
- Display found pages with content, address, and location
- Display not-found pages with target address and current progress

**Non-Goals:**
- No SHA-256 or any other hashing
- Searching within already-generated pages (substring match)
- Search history or bookmarks
- Fuzzy search or partial matching
- Navigating to found pages (read-only display)

## Decisions

### Decision 1: Query → Page address via big-endian bigint
**Choice**: The query string is encoded as UTF-8 bytes, then converted to a big-endian bigint. This bigint serves as a page address.

```javascript
export function queryToPageAddress(query) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(query);
  let address = 0n;
  for (const byte of bytes) {
    address = (address << 8n) | BigInt(byte);
  }
  return address;
}
```

**Rationale**: This uses the LCG's existing bigint arithmetic — no hashing, no modulo, just raw bytes interpreted as a number. The page address space is 0 to 43^280, which is far larger than any realistic query (even a 1000-byte query produces a 8000-bit number, still tiny compared to 43^280 ≈ 10^458). The address maps cleanly to the combinatorial space.

**Alternatives considered**:
- SHA-256 → bigint → mod 43^280: adds hashing complexity, not needed since LCG already provides the structure
- Base-43 string conversion: more complex, and the LCG state representation is different from the page address

### Decision 2: Found/not-found check via address comparison
**Choice**: Compare the page address with `pagesGenerated`. If address ≤ pagesGenerated, the page is "found." If address > pagesGenerated, it's "not found."

**Rationale**: The page address IS a page number in the combinatorial space. Since pages are generated sequentially from 0 to pagesGenerated, any page number ≤ pagesGenerated has been generated. This is a direct comparison.

### Decision 3: Use existing lookup functions
**Choice**: For found results, use `generatePage(address)` for content and `locationFromPageOffset(address)` for location. No new computation logic.

**Rationale**: These functions already exist and handle all the heavy lifting:
- `generatePage(address)` → calls lcgState(address) → stateToPage → reverse → 280-char content
- `locationFromPageOffset(address)` → successive division through STORAGE_TIERS → location tuple

The search feature is purely about mapping query → address and displaying results. All page generation and location computation is delegated to existing functions.

### Decision 4: Search overlay as conditional render in App component
**Choice**: The search overlay is a React component rendered conditionally inside the `App` component. When `searchOpen` is true, the overlay replaces the main panels.

**Rationale**: Keeps search state local to App (no store changes). Uses Ink's `Input` component for the text field. Standard modal behavior with Escape to dismiss.

### Decision 5: Location display format
**Choice**: Format the location tuple as a comma-separated string from the highest non-zero level down to drive. Example: "Building 12, Floor 3, Rack 7, Server 2, Drive 0".

**Rationale**: Provides spatial context. The location shows where in the storage hierarchy this page lives. Non-zero levels are displayed; all-zero levels are omitted except drive (always shown for reference).

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Large queries produce very large page addresses that may slow generatePage | generatePage uses O(log N) geoPair — for 1000-byte queries (~8000 bits), this is ~8000 iterations of modular arithmetic, which may take a few seconds. Acceptable for a search operation. |
| Short common queries (e.g., "the") produce small addresses that are always found early | This is intentional — common phrases should be easy to find. It's a feature, not a bug. |
| No way to navigate to a found page | Intentional — search is read-only exploration. Navigation could be a future feature. |
| Overlay blocks main UI interaction | Intentional — standard modal behavior. Escape returns to normal gameplay. |

## Migration Plan

This change adds new functionality without modifying existing behavior:
1. Add `queryToPageAddress()` function (in `page.js` or a new utility)
2. Add `SearchOverlay` component in `ui.jsx`
3. Add search state and handlers in `App` in `index.jsx`
4. Add `[S]` key handler
5. No store changes, no config changes, no breaking changes

## Open Questions

1. Should the overlay show the search query alongside the result? Yes — for context.
2. Should pressing Enter with an empty query do anything? Yes — compute address 0 and show the result (it's valid).
3. Should the page address be displayed as decimal, hex, or both? Decimal with comma formatting matches the existing formatPageNumber convention.
