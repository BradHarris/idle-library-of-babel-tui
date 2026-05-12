## Context

The UI has a `formatNumber()` utility in `format.js` that handles tiered notation (raw integers, K/M/B/T suffixes, scientific notation). It's used in the StorageScalePanel, but several other display locations use raw `String()` or `toFixed()` for numbers that can grow very large:

- **WorkersPanel**: Worker counts use `String(count).padStart(5)` — looks bad at 5-digit+ counts
- **LatestPagePanel header**: Uses `String(currentPage).padEnd(35)` — no commas, no suffixes
- **StatsPanel pages/sec**: Uses `toFixed(2)` — fixed decimal, no suffixes
- **StatsPanel tick rate level**: Raw integer (minor, but inconsistent)

## Goals / Non-Goals

**Goals:**
- Replace all raw numeric displays with appropriate formatters in the UI
- WorkersPanel counts → `formatNumber(count)`
- LatestPagePanel header → `formatPageNumber(currentPage)`
- StatsPanel pages/sec → `formatNumber(pagesPerSecond)` (replace `toFixed(2)`)
- Keep changes minimal — only modify `ui.jsx`, no store/config/page changes

**Non-Goals:**
- Changes to `gameStore.ts`, `config.js`, `page.js`, or `format.js`
- New formatting functions — only use existing `formatNumber()`, `formatPageNumber()`, `formatMoney()`
- Layout restructuring — accept that formatted numbers have variable width

## Decisions

### Decision 1: WorkersPanel count column width
**Choice**: Remove `padStart(5)` and let `formatNumber()` produce naturally-widthed output.

**Rationale**: The count column was left-aligned with fixed width for visual consistency. With formatted numbers, widths vary (e.g., "42" vs "2.50M"). Two options:
- Left-align all (simple, slightly uneven)
- Use a flex/grid layout with right-aligned numbers (more work)
Choice: Left-align. It's simpler and the change is small enough that the unevenness is acceptable. The visual impact is minimal since worker counts are secondary info.

### Decision 2: LatestPagePanel header border width
**Choice**: Use a fixed-width header border that accommodates the widest formatted page number, or compute header width dynamically based on page number string length.

**Rationale**: `formatPageNumber(bigint)` can produce variable-width strings. The current header uses `padEnd(35)` to fill the fixed border. Options:
- Keep fixed 35-char width but center the page number with padding
- Make border width dynamic based on content (requires Ink layout changes)
Choice: Keep fixed 35-char width. Use `formatPageNumber(currentPage).padEnd(35)` to fill. If the formatted number exceeds 35 chars (extremely unlikely — would need ~10^35 pages), it overflows, but that's acceptable as an edge case.

### Decision 3: Pages per second formatting
**Choice**: Replace `formatPagesPerSecond(pagesPerSecond)` (`toFixed(2)`) with `formatNumber(pagesPerSecond)`.

**Rationale**: `formatNumber()` handles all ranges correctly:
- 0-9,999: raw integer (cleaner than "42.00")
- 10K+: K/M/B/T suffixes with 2 decimal places (e.g., "1.50K")
- >999.9T: scientific notation
The user experience improvement is significant for late-game where PPS reaches millions/billions.

### Decision 4: Tick rate level formatting
**Choice**: Use `formatNumber(tickRateLevel)` for consistency.

**Rationale**: Tick rate levels are unlikely to exceed thousands, so raw integers are fine. Using `formatNumber()` keeps it consistent with the "all numbers are formatted" principle. The output for small integers is identical to raw display.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Worker count column alignment looks uneven after removing padStart | Acceptable trade-off — the visual impact is minimal; consistency of formatting is more important |
| LatestPagePanel header overflow if page number string > 35 chars | Extremely unlikely — would require page number with 35+ digits (far beyond any reachable count) |
| Pages/sec showing "42" instead of "42.00" may feel less precise | The integer display is actually cleaner for small values; suffix notation handles large values perfectly |
| No regression tests for UI rendering | Manual testing in the TUI is sufficient for visual changes; no automated UI tests exist |

## Migration Plan

Single-file change to `src/ui.jsx`. No data migration, no store changes, no config changes. Simply replace format calls at existing call sites:

1. WorkersPanel: `String(count).padStart(5)` → `formatNumber(count)`
2. LatestPagePanel header: `String(currentPage).padEnd(35)` → `formatPageNumber(currentPage).padEnd(35)`
3. StatsPanel pages/sec: `formatPagesPerSecond(pagesPerSecond)` → `formatNumber(pagesPerSecond)`
4. StatsPanel tick rate level: `{tickRateLevel}` → `{formatNumber(tickRateLevel)}`

## Open Questions

1. Should we add a `formatInteger()` helper that always shows raw integers (no suffixes) for values that could legitimately be large but small enough? Decision: unnecessary — `formatNumber()` already does this for values < 10,000.
2. Should the count column be right-aligned for better number readability? Decision: out of scope — left-align is simpler and acceptable.
