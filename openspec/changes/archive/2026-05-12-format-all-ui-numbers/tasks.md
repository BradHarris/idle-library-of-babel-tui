## 1. StatsPanel — pages per second

- [x] 1.1 Replace `formatPagesPerSecond(pagesPerSecond)` with `formatNumber(pagesPerSecond)` in StatsPanel (remove import of `formatPagesPerSecond` from format.js)

## 2. StatsPanel — tick rate level

- [x] 2.1 Replace `{tickRateLevel}` with `{formatNumber(tickRateLevel)}` in StatsPanel tick rate info line

## 3. WorkersPanel — worker counts

- [x] 3.1 Replace `String(count).padStart(5)` with `formatNumber(count)` in WorkersPanel count display
- [x] 3.2 Verify all 7 worker tier counts display consistently with `formatNumber()`

## 4. LatestPagePanel — header page number

- [x] 4.1 Replace `String(currentPage).padEnd(35)` with `formatPageNumber(currentPage).padEnd(35)` in LatestPagePanel header

## 5. Verify no remaining raw numbers

- [x] 5.1 Review all UI components in ui.jsx for any remaining raw numeric displays of game values
- [x] 5.2 Confirm only exempt values (progress bar segment indices, tier indices [1-7]) use raw integers
