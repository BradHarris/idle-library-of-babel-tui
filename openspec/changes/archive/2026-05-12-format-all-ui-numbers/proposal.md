## Why

The UI has a dedicated `formatNumber()` utility (K/M/B/T suffixes, scientific notation) and uses it in the StorageScalePanel, but several other number displays in the UI render raw values. As worker counts cascade and grow — particularly for mid-to-high tiers like managers, overseers, and above — numbers quickly exceed 4-5 digits and become hard to read. Even page numbers in the LatestPagePanel header use raw `String()` output. Every displayed number should use the appropriate formatter for consistency and readability.

## What Changes

- **Worker counts**: Replace `String(count).padStart(5)` with `formatNumber(count)` for all 7 worker tiers in the WorkersPanel. Remove `padStart` alignment since formatted numbers have variable width.
- **LatestPagePanel header**: Replace `String(currentPage).padEnd(35)` with `formatPageNumber(currentPage)` (already handles bigint). Adjust header border width to be dynamic or use a reasonable fixed width.
- **Tick rate level display**: Optionally use `formatNumber()` for tickRateLevel (minor, low priority).

## Capabilities

### New Capabilities
- `ui-number-formatting`: All numeric values in the UI must use the appropriate formatter (`formatNumber` for regular numbers, `formatPageNumber` for page/bigint values, `formatMoney` for currency)

### Modified Capabilities
- `tui-display`: Existing requirement that numbers display in the TUI now includes the requirement that all numbers use formatters for readability

## Impact

- **src/ui.jsx**: WorkersPanel — format worker counts. LatestPagePanel — format page number in header. StatsPanel — optionally format tick rate level.
- No changes to `gameStore.ts`, `config.js`, `page.js`, or `format.js`.
- No new dependencies.
- Visual alignment changes in WorkersPanel (count column will no longer be left-padded with spaces).
