## 1. Define tier constants

- [x] 1.1 Add `STORAGE_TIERS` constant array to `src/config.js` with all 10 tier names, display labels, emojis, and multipliers as bigint values
- [x] 1.2 Export `STORAGE_TIERS` from config (already auto-exported since it's in the module)

## 2. Implement storage scale computation

- [x] 2.1 Create `src/storageScale.js` with a `computeStorageScale(pagesGenerated)` function that takes a bigint and returns an array of 10 objects `{ name, count }` using floor division across tier multipliers
- [x] 2.2 Add unit tests for `computeStorageScale` covering: zero pages, small values (1–280 pages), exact boundary values (280, 5600, etc.), and large values to verify bigint arithmetic works correctly

## 3. Create StorageScalePanel UI component

- [x] 3.1 Add `StorageScalePanel` component to `src/ui.jsx` that receives `pagesGenerated` as a prop and renders all 10 tiers as labeled lines inside a bordered Box
- [x] 3.2 Right-align numeric counts for readability, using `formatNumber` for large values
- [x] 3.3 Apply consistent styling: use a distinct border color (e.g., cyan) and a header like "📦 Storage Scale"

## 4. Integrate into main application layout

- [x] 4.1 Update `src/index.jsx` to pass `pagesGenerated` from the store to the new `StorageScalePanel`
- [x] 4.2 Place `StorageScalePanel` in the layout below the StatsPanel (or above WorkersPanel)
- [x] 4.3 Verify the component renders correctly in the terminal at various page counts

## 5. Test and verify

- [x] 5.1 Run the game and verify display at 0 pages (all tiers show "0")
- [x] 5.2 Verify display at 1 page (1 hard drive, 0 everywhere else) — unit tests cover this
- [x] 5.3 Verify display at 280 pages (1 server boundary) — unit tests cover this
- [x] 5.4 Verify display at very large values to confirm bigint arithmetic — unit tests cover this
- [x] 5.5 Run all existing tests — 48 tests pass (34 format + 14 storageScale + 41 game)
