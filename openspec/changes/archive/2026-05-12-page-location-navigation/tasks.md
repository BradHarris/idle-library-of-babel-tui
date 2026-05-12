## 1. Location State in Game Store

- [ ] 1.1 Add `location` state object to `GameState` interface in `gameStore.ts` with fields: `drive`, `server`, `rack`, `floor`, `building`, `city`, `planet`, `solarSystem`, `galaxy` (all `bigint`, default 0n)
- [ ] 1.2 Add `activeLevel` state field (number, default 0) to track which hierarchy level is being navigated
- [ ] 1.3 Initialize location state in `createInitialState()` — all indices = 0n, activeLevel = 0
- [ ] 1.4 Add navigation action `navigateLocation(direction: 'up'|'down'|'levelUp'|'levelDown')` to the store that modifies location indices and activeLevel according to the hierarchy

## 2. Location-Aware Page Generation

- [ ] 2.1 Add `deriveLocationSeed(location)` helper in `page.js` that takes the location object and returns a 32-bit seed derived from hashing the location path string
- [ ] 2.2 Modify `generatePage(pageNum, location?)` to accept an optional second parameter `location`
- [ ] 2.3 When `location` is provided, combine the page number hash with the location seed (e.g., `combined = (pageHash ^ locHash) | 0`) before feeding to Mulberry32
- [ ] 2.4 When `location` is omitted or all zeros, produce identical output to the original `generatePage(pageNum)` implementation
- [ ] 2.5 Update the call site in `gameStore.ts` (`tick` action and `reset` action) to pass the current location to `generatePage()`

## 3. Location Display in UI

- [ ] 3.1 Add `formatLocation(location, activeLevel)` helper in `format.js` that returns a string showing the current location (e.g., "Building 42, Floor 7, Rack 3, Server 12, Drive 5")
- [ ] 3.2 Update `StatsPanel` component in `ui.jsx` to display the current location string beneath the current page line
- [ ] 3.3 Update `LatestPagePanel` header to include the location (e.g., "┏━━━ Page 12345 ━ Building 42, Floor 7 ━┓")
- [ ] 3.4 Add `activeLevel` and `location` props to `StatsPanel` and `LatestPagePanel` via `useGameStore` selectors in `App`

## 4. Navigation Key Bindings

- [ ] 4.1 In `App` component, add key input handlers for navigation: Left/Right (or J/K) to change the index at `activeLevel`, Down (or Enter) to advance to next level, Up (or Esc) to retreat to previous level
- [ ] 4.2 Implement bounds checking: indices cannot go below 0; indices at deeper levels can go as high as the page count allows (use `STORAGE_TIERS` multipliers to compute max index)
- [ ] 4.3 When navigating within a level (changing index), the active level stays the same
- [ ] 4.4 When advancing level (entering), move to the next storage tier
- [ ] 4.5 When retreating level (exiting), move to the previous storage tier; at first level, do nothing
- [ ] 4.6 After any navigation, the page content at `currentPage` should update to reflect the new location

## 5. Navigation Hint Display

- [ ] 5.1 Create a `NavigationHint` component in `ui.jsx` that shows available navigation keys for the current active level
- [ ] 5.2 Display the hint below the key prompt area, showing: which keys change the current level's index, which keys advance/retreat levels
- [ ] 5.3 Format hint text to include the current index value (e.g., "Drive 5 ←[J] [K]→ 6 | [↓] Next Level [↑] Prev Level")
- [ ] 5.4 Color-code the hints: active navigation keys in cyan/green, inactive ones dimmed

## 6. Reset and Edge Cases

- [ ] 6.1 Update `reset()` in `gameStore.ts` to reset all location indices to 0n and activeLevel to 0
- [ ] 6.2 Add a "reset location" key (e.g., `[R]`) that resets all location indices to 0 while preserving the page number
- [ ] 6.3 Handle the case where navigating to a very large index (e.g., hard drive in the billions) — use formatted notation in display
- [ ] 6.4 Ensure that navigating to deeper levels (galaxy, universe) doesn't cause performance issues with the seed derivation

## 7. Testing

- [ ] 7.1 Add unit test(s) in a new or updated test file for `deriveLocationSeed()` and `generatePage()` with location parameter
- [ ] 7.2 Verify that `generatePage(n, zeroLocation)` produces identical output to original `generatePage(n)`
- [ ] 7.3 Verify that `generatePage(n, locationA)` ≠ `generatePage(n, locationB)` when locationA ≠ locationB
- [ ] 7.4 Verify determinism: calling `generatePage(n, sameLocation)` twice returns identical output
