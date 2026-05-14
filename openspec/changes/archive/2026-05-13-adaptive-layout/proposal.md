## Why

The current TUI layout stacks all panels vertically except Workers/Log, wasting horizontal terminal space. On wider terminals the display feels cramped and under-utilized. Additionally, the layout is fixed-width and doesn't adapt when the terminal is resized.

## What Changes

- Restructure the dashboard into a two-row, two-column grid layout that fills the terminal more effectively
- Move Storage Scale panel to sit to the right of the Stats panel (top row)
- Move Latest Page panel to sit to the right of the Log panel (bottom row, alongside Workers)
- Make the layout adaptive: panels use flex-based sizing relative to terminal dimensions, and the UI re-renders responsively when the terminal is resized
- Use Ink's `Box` flex layout with percentage-based widths and `process.stdout` resize events to achieve full-screen adaptive behavior

## Capabilities

### New Capabilities
- `adaptive-terminal-layout`: The TUI SHALL adapt to terminal window dimensions using flex-based layout and respond to resize events, filling available space without clipping or excessive whitespace.

### Modified Capabilities
- `tui-display`: The four-panel dashboard layout requirement SHALL change from a vertical stack to a two-row grid layout with adaptive sizing.

## Impact

- `src/index.jsx`: Main layout JSX restructured from vertical stack to two-row grid using flex Box containers
- `src/ui.jsx`: Panel components may need width/height adjustments for flex containers; `LatestPagePanel` text wrapping width must become dynamic
- No new dependencies needed — Ink's `Box` flex properties and `process.stdout.on('resize')` provide all capabilities required
- No breaking changes to game logic, stores, or keybindings
