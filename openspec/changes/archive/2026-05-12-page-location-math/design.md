## Context

The game already defines `STORAGE_TIERS` in `config.js` — a 10-level hierarchy with bigint multipliers (from `PAGES_PER_32_TB_DRIVE` down through `1000000000000n`). The existing `computeStorageScale()` function performs a cumulative forward division (coarse counts), but does not produce the mixed-radix decomposition needed for precise location mapping.

The page generation system uses a custom LCG with modulus `43^280` — an enormous space. Page numbers are `bigint` values that can easily exceed `Number.MAX_SAFE_INTEGER`. All existing arithmetic for pages and multipliers already uses bigint.

## Goals / Non-Goals

**Goals:**
- Implement bidirectional conversion between page offsets and location tuples
- Ensure exact round-trip correctness: `f(g(n)) === n` and `g(f(loc)) === loc`
- Use bigint arithmetic throughout
- Add comprehensive tests covering identity, boundaries, and round-trips

**Non-Goals:**
- Displaying location in the UI
- Navigation or user-facing controls
- Changes to `page.js`, `gameStore.ts`, `config.js`, or any UI component
- Performance optimization (these are called at most once per page render, not every tick)

## Decisions

### Decision 1: Mixed-radix decomposition using STORAGE_TIERS multipliers
**Choice**: Forward (`pageOffsetFromLocation`) iterates left-to-right: `pages = pages × multiplier + index`. Backward (`locationFromPageOffset`) iterates right-to-left: `index = pages % multiplier`, `pages = pages / multiplier`.

**Rationale**: This is the standard mixed-radix algorithm. The STORAGE_TIERS array already defines the radixes in the correct order (largest multiplier first). Forward iteration matches the array order; backward iteration requires reversing it. This is exact and O(n) where n = 10 (constant).

### Decision 2: Location as a plain object, not a class
**Choice**: Both functions accept/return `{ hardDrive: bigint, server: bigint, serverRack: bigint, ... }` objects matching the STORAGE_TIERS id field names.

**Rationale**: Simplest possible interface. No new types, no classes. The object keys match the tier `id` values, so iteration over STORAGE_TIERS can directly read/write the corresponding property.

### Decision 3: Add functions to storageScale.js
**Choice**: Add both functions as new exports in `storageScale.js`, alongside `computeStorageScale`.

**Rationale**: `storageScale.js` already deals with storage hierarchy math and imports `STORAGE_TIERS`. Adding here keeps related math together. No new files needed.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| BigInt overflow in forward computation (product of all multipliers exceeds reasonable bounds) | The product of all multipliers is `PAGES_PER_DRIVE × 20 × 10 × 100 × 100 × 10^6 × 10^6 × 10 × 10^12 × 10^12` ≈ 10^75, well within bigint capabilities |
| Negative page offsets passed to backward function | Add input validation or document as undefined behavior; tests cover 0n and positive values |
| Location indices exceeding their tier multiplier in forward function | The spec requires valid input; callers (when UI is added later) should validate. Not enforced at the math level — keep it pure and simple |

## Migration Plan

This change adds new functions without modifying any existing behavior. No migration needed. Future changes (UI display, navigation) can consume these functions directly.

## Open Questions

1. Should the functions accept partial location tuples (only non-zero levels) or always require all 10 levels? Decision: require all 10 levels for clarity and consistency.
2. When UI is added later, should it show all 10 levels or only non-zero ones? Decision: deferred — not in scope.
