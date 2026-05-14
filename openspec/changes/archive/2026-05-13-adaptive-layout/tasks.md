## 1. Restructure main layout to two-row grid

- [x] 1.1 Refactor `src/index.jsx` `App` return JSX: replace the vertical column stack with a two-row layout using `flexDirection="column"` parent containing two `flexDirection="row"` child boxes
- [x] 1.2 Top row: place `StatsPanel` (left, `flexGrow={2}`) and `StorageScalePanel` (right, `flexGrow={3}`) in a `flexDirection="row"` box with `gap={1}`
- [x] 1.3 Bottom row: place `WorkersPanel` (left, `flexGrow={2}`) and a `flexDirection="column"` box containing `LogPanel` + `LatestPagePanel` (right, `flexGrow={3}`) in a `flexDirection="row"` box with `gap={1}`
- [x] 1.4 Keep keybind prompt row below the grid, spanning full width

## 2. Add terminal resize handling

- [x] 2.1 Add a `useEffect` hook in `App` that listens to `process.stdout.on('resize')` and triggers a state update to force re-render
- [x] 2.2 Ensure the resize listener is cleaned up on component unmount via the effect return function
- [x] 2.3 Verify no double-listener registration on re-renders (empty dependency array)

## 3. Make Latest Page wrapping width dynamic

- [x] 3.1 Update `LatestPagePanel` to accept a `wrapWidth` prop instead of hardcoding 70
- [x] 3.2 In `App`, compute `wrapWidth` from `process.stdout.columns` minus estimated overhead (borders, padding, column split ratio for the right column at `flexGrow={3}` out of total 5)
- [x] 3.3 Pass the computed `wrapWidth` to `LatestPagePanel` as a prop
- [x] 3.4 Update the page header border length (`header` string in `LatestPagePanel`) to match the dynamic wrap width

## 4. Adjust panel widths and styling for flex containers

- [x] 4.1 Remove hardcoded `width={80}` from `SearchOverlay` (if present) and use flex-based sizing or percentage width
- [x] 4.2 Verify `StorageScalePanel` tier name padding (`padEnd(25)`) remains readable at narrower widths
- [x] 4.3 Verify `WorkersPanel` progress bar and cost display remain readable at narrower widths
- [x] 4.4 Test at terminal widths of 60, 80, 120, and 200 columns to confirm all panels are usable

## 5. Verify and test

- [x] 5.1 Run the app and verify the two-row grid layout renders correctly at default terminal size
- [x] 5.2 Resize terminal wider and confirm panels expand proportionally
- [x] 5.3 Resize terminal narrower and confirm panels compress without clipping (minimum ~60 columns)
- [x] 5.4 Verify text wrapping in Latest Page panel adjusts correctly on resize
- [x] 5.5 Run existing tests (`node --test`) to confirm no regressions in game logic (67/67 pass)
