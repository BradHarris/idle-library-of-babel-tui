## Context

The current TUI layout in `src/index.jsx` stacks panels vertically: Stats → Storage Scale → Latest Page, then Workers + Log side by side at the bottom. This wastes horizontal space on typical 80+ column terminals. Panels use fixed-width text wrapping (e.g., `wrapText(content, 70)`) and don't respond to terminal resize.

Ink 4.4.1 provides all the tools needed for an adaptive layout:
- `Box` component with Yoga-based flex layout (`flexDirection`, `flexGrow`, `width`, `height`, `flexWrap`)
- Percentage-based `width` and `height` values for proportional sizing
- `process.stdout.columns` / `process.stdout.rows` for terminal dimensions
- `process.stdout.on('resize')` event for responsive re-rendering

## Goals / Non-Goals

**Goals:**
- Restructure the dashboard into a two-row grid: [Stats | Storage] on top, [Workers | Log + LatestPage] on bottom
- Make all panel widths proportional to terminal width using flex/percentage-based sizing
- Dynamically adjust text wrapping widths based on available panel width
- Re-render layout on terminal resize events

**Non-Goals:**
- Adding new panels or game features
- Changing panel content or data sources
- Supporting fixed-width modes or windowed mode
- Persisting layout preferences

## Decisions

### Decision 1: Two-row flex grid layout
The top row contains Stats (left, ~40% width) and Storage Scale (right, ~60% width). The bottom row contains Workers (left, ~40% width) and a combined Log + Latest Page column (right, ~60% width) stacked vertically. This places related panels together and uses horizontal space efficiently.

**Alternatives considered:**
- Three-column layout: too many narrow columns on standard terminals
- Keeping vertical stack: wastes horizontal space
- Equal 2x2 grid: Stats is small and doesn't need equal space with Storage

### Decision 2: Percentage-based widths via flex
Panels use `flexGrow` ratios rather than fixed character widths. The parent containers use `flexDirection="row"` and children use `flexGrow` values (e.g., 2 and 3 for a ~40/60 split). This naturally adapts to any terminal width.

**Alternatives considered:**
- Fixed character widths: breaks on small/large terminals
- `width` as percentage strings (e.g., `"40%"`): Yoga supports this but `flexGrow` is simpler for proportional splits

### Decision 3: Terminal resize via `process.stdout.on('resize')`
A `useEffect` hook listens to the `resize` event on `process.stdout` and triggers a re-render. This is the standard Ink approach — no additional hooks or dependencies needed.

**Alternatives considered:**
- Polling `process.stdout.columns`: wasteful and imprecise
- Third-party resize hook: unnecessary dependency for a simple event listener

### Decision 4: Dynamic text wrapping width
The `LatestPagePanel` wrapping width (currently fixed at 70) becomes a computed value based on the available panel width. Since Ink's Yoga layout determines actual rendered widths, we derive a safe wrapping width from `process.stdout.columns` minus panel overhead (borders, padding, splits).

**Alternatives considered:**
- Fixed wrapping at 70: doesn't adapt to terminal size
- Per-character measurement: too complex for monospaced terminal fonts

## Risks / Trade-offs

[Risk] Very narrow terminals (< 60 columns) may cause panels to become unreadable.
→ Mitigation: Set reasonable minimum widths and accept that the game is designed for standard terminal sizes. No special handling for tiny terminals.

[Risk] The `resize` event may fire rapidly during drag-resize, causing flicker.
→ Mitigation: Ink's render batching handles rapid re-renders efficiently at 10fps. No additional debouncing needed.

[Risk] Dynamic wrapping width changes may cause visible content shift during resize.
→ Mitigation: Acceptable — this is standard terminal behavior. Content reflow on resize is expected.

## Migration Plan

This is a pure layout refactor — no data migration, no API changes, no backward compatibility concerns.

1. Update `src/index.jsx` layout structure to two-row flex grid
2. Update `src/ui.jsx` panels to use flex-friendly sizing
3. Make `LatestPagePanel` wrapping width dynamic based on terminal columns
4. Add resize event listener in `App` component
5. Test at various terminal widths (40, 80, 120, 200 columns)

Rollback: revert the commit — no state or config changes to clean up.

## Open Questions

- Should the keybind prompt row also span full width? (Decision: yes, keep it full-width at the bottom)
- Should Storage Scale panel height be constrained to match Stats height? (Decision: no, let panels be their natural height within the flex row)
