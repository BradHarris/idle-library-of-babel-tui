## Context

The game tracks `pagesGenerated` as a `bigint` in the Zustand store. Each page is exactly 280 bytes (characters). Currently, page count is displayed as a formatted number in the `StatsPanel`. The game uses Zustand with immer middleware for state management, and React with Ink for the TUI.

## Goals / Non-Goals

**Goals:**
- Show total page count as a hierarchy of 10 escalating storage tiers
- Integrate seamlessly into the existing UI alongside the StatsPanel
- Keep the store logic pure and the display component declarative
- Handle arbitrary magnitudes via bigint arithmetic

**Non-Goals:**
- No persistence changes (storage scale is derived, not stored)
- No changes to the game loop, worker cascade, or tick logic
- No animations or transitions on the display
- No user configuration or customization of tiers

## Decisions

### Decision 1: Derive storage scale as a pure function, not store state

The storage hierarchy should be computed on-demand from `pagesGenerated` rather than stored in Zustand. The computation is trivial (10 divisions) and always derived from a single source of truth. Storing it would duplicate state and create synchronization risk.

**Alternatives considered:**
- *Computed in the store via immer proxy*: Would bloat the store with derived data and require updates on every action. Rejected as unnecessary.
- *Memoized via a custom hook*: Could work, but React re-renders on every tick anyway, so the performance difference is negligible. Rejected for simplicity.

### Decision 2: bigint arithmetic for all tier calculations

Since `pagesGenerated` is already a `bigint`, all tier computations use bigint arithmetic. This avoids precision loss at any scale. JavaScript's bigint supports integers of arbitrary size, so we won't overflow even at the universe level.

### Decision 3: New dedicated StorageScalePanel component

Extract the storage scale as its own panel component, rendered below the StatsPanel in the main layout. This mirrors the existing pattern of separate panel components (WorkersPanel, LogPanel, LatestPagePanel) and keeps the StatsPanel uncluttered.

**Alternatives considered:**
- *Add to StatsPanel*: Would bloat the existing panel which already shows 6+ data points. Rejected for readability.
- *Separate modal/screen*: Would add navigation complexity for a display that's most impactful when visible alongside other stats. Rejected.

### Decision 4: Display all 10 tiers regardless of magnitude

Even if the count is 0, all tiers show "0". This ensures the visual structure is always present and players can see progress across all tiers as they accumulate.

## Risks / Trade-offs

[Risk] The display could become very wide for large numbers, exceeding terminal width.
→ Mitigation: Right-align numbers; use `formatNumber` for large counts. If numbers get extremely large, consider scientific notation or suffix abbreviations (M, B, T) for the higher tiers. The widest number will be at the bottom (universes), which is the funniest and most impactful.

[Risk] React re-render frequency could cause unnecessary recomputation.
→ Mitigation: The computation is 10 bigint divisions — negligible cost. The Ink renderer already throttles to ~10fps via `RENDER_INTERVAL = 100ms`.

[Risk] bigint division with very large multipliers could produce unexpected results.
→ Mitigation: All multipliers are constants defined in a config module. Division behavior is deterministic and well-understood.

## Open Questions

None — the tier multipliers are specified directly by the user request and the implementation approach is clear.
