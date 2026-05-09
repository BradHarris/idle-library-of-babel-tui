## Context

The game currently generates deterministic page content from a single page number using SHA-256 → Mulberry32 seeding. The `STORAGE_TIERS` hierarchy (hard drives → servers → racks → floors → buildings → cities → planets → solar systems → galaxies → universes) is displayed in a storage scale panel but has no functional relationship to pages or navigation. Each generated page is a unique 280-character string with no spatial context.

The game state is managed by a Zustand store (`gameStore.ts`) with immer middleware. The UI uses Ink for the TUI with React components (`ui.jsx`). Pages are generated on-demand via `generatePage(pageNum)` in `page.js`.

## Goals / Non-Goals

**Goals:**
- Display the player's current location in the storage hierarchy alongside page info
- Allow navigation up and down the hierarchy via keyboard controls
- Make page content deterministic per location + page number combination
- Preserve backward compatibility for the page generation algorithm (still uses SHA-256 + Mulberry32)

**Non-Goals:**
- Changing the storage scale display logic or tier multipliers
- Adding save/load functionality for location state
- Visual map or geographic representation of locations
- Inter-location interactions or travel mechanics

## Decisions

### Decision 1: Location seed encoding
**Choice**: Encode the full location path (drive, server, rack, floor, building, city, planet, solarSystem, galaxy) into a single 64-bit seed component by hashing the path string with SHA-256 and combining the resulting hash with the page number hash before feeding to Mulberry32.

**Rationale**: This keeps the PRNG pipeline simple (still single Mulberry32 call) while ensuring every unique (location, pageNum) pair produces unique content. Using SHA-256 guarantees no collisions in practice.

**Alternatives considered**:
- XOR each level's index directly → simpler but vulnerable to collision if levels have small ranges
- Use a tree-based hash → more complex, marginal benefit
- Store pre-computed seeds per location → requires persistent storage, unnecessary complexity

### Decision 2: Default location
**Choice**: Start with all location indices at 0 (first hard drive, first server, first rack, etc.). The first page generated is `generatePage(pageNum, {drive:0, server:0, ...})`.

**Rationale**: Matches the intuition of starting at the "first" location. Player naturally discovers they can navigate elsewhere.

### Decision 3: Navigation key bindings
**Choice**: Add navigation keys that work per-level:
- Arrow keys or `[J/K]` for down/up within current level (navigate drives, then servers, etc.)
- `[Left/Right]` or `[H/L]` for moving to the previous/next level in the hierarchy
- `[Enter]` to "enter" a location (drill down)
- `[Esc]` or `[Backspace]` to move up one level

**Rationale**: Arrow keys are intuitive for TUI. Alternative key names (J/K, H/L) provided for vim-style users. Keep it simple — don't try to support all 10 hierarchy levels simultaneously; only the active level shows navigation hints.

### Decision 4: Active location level tracking
**Choice**: Track an `activeLevel` index (0 = hardDrive, 1 = server, …, 8 = galaxy) alongside individual location indices. The `activeLevel` determines which tier's indices are shown and navigable. Navigation at a level reveals the count of sub-locations available at the next level down.

**Rationale**: This mirrors the storage scale display — the player is always "at" some level, and can explore what's below or above. The page content changes as they navigate, providing feedback.

### Decision 5: Page content seeding formula
**Choice**: `combinedSeed = deriveSeed(pageNum.toString() + ":" + locationPath.toString())` where `locationPath` is a colon-joined string of all non-zero level indices. This produces a new SHA-256 hash for every unique combination.

**Rationale**: Simple, deterministic, easy to reproduce. The colon separator ensures `pageNum=1, drive=2` differs from `pageNum=12, drive=2`.

### Decision 6: Location state persistence
**Choice**: Include location state in the existing Zustand store alongside `pagesGenerated` and `currentPage`. No separate persistence mechanism — location is part of the game session.

**Rationale**: Location is naturally part of the game session state, separate from saveable progress. Keeps the store unified.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Navigation at very large tier levels could be slow with many digits | Format with `formatNumber()` for display; navigation uses +/-1 per press, not direct input |
| Players might lose pages by navigating to a different location | Pages are determined by (location, pageNum) — same pageNum at same location always shows same page. Cross-location, the same pageNum may differ. This is intentional and part of the exploration. |
| Too many navigation keys could clutter the UI | Only show active navigation hints; hide irrelevant tier hints; use color coding |
| Breaking existing `generatePage(pageNum)` API | Internal change only — `generatePage` is not exported to external consumers. Update internal call sites in gameStore.ts and any tests. |

## Migration Plan

1. Add location state to `gameStore.ts` with defaults (all zeros)
2. Modify `generatePage()` in `page.js` to accept an optional `location` parameter (backward-compatible default: location = all zeros)
3. Update `generatePage()` call sites in `gameStore.ts` to pass current location
4. Add location display to `StatsPanel`
5. Add navigation key bindings in `App` component
6. Update `LatestPagePanel` header to show current location
7. Update `reset()` to reset location to defaults

No data migration needed — this is a forward-only change to existing state.

## Open Questions

1. Should there be a "home" or "reset view" key that resets all location indices to 0? (Suggested: `[Space]` or `[R]`)
2. How to handle the display when location indices get very large (e.g., drive number in the billions)? Format with K/M/B suffixes like other numbers.
3. Should the player be able to "travel" between locations, or is navigation purely visual? (Decision: purely visual for now — no travel cost or delay.)
