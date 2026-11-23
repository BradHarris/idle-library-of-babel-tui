# Search

The player searches for a phrase and learns which page holds it. If that page hasn't been generated yet, the result is "Not yet discovered" with the target page number. Once it has been generated, the result shows the page's location and its 280-character content, starting with the phrase. "Show on map" switches to the Library and zooms the storage map down to that page.

## Sub-features

- `search-open` opens the modal dialog from the HUD search icon.
- `search-not-found` shows "Not yet discovered", the target page and pages generated.
- `search-found` shows the page number, location and content starting with the query.
- `search-close` closes with Escape, the Close button or a backdrop click, and clears the query.
- `search-show-on-map` switches to `#/library?…&target=<page>` and zooms level by level (600 ms per step) to the page.

## How to get to it (user POV)

- The magnifier button at the top right of the HUD (`button[aria-label="Search the library"]`), on every tab and viewport.
- After a search, the map's `Zoom to search result` button brings the result back.

## Driving it with babel.mjs

Preconditions:

- `node babel.mjs doctor` exits 0.
- "hello" is page 73,259,716. A fresh profile has 0 pages (not found). `t.seed('rich')` has 100M pages (found).

- **Not found.** Click the search button, type `hello` into `input[aria-label="Phrase to search for"]`, and press Enter. The dialog text includes `Not yet discovered` and `73,259,716`.
- **Close.** Press Escape twice: the first clears the search box, the second closes the dialog. The input is empty afterwards.
- **Found.** After `t.seed('rich')`, search `hello` again. `dialog p.font-mono` is 280 characters and starts with `hello`. The location reads `Drive 0`.
- **Show on map.** Click `dialog [data-show-on-map]`. The dialog closes and the hash becomes `#/library?view=page.<n>&target=73259716` within about 4 s. `#storage-map` text includes `— page 73,259,716 —`.
- **Run it.** `node babel.mjs run search`.
- **Proof.** `artifacts/<run>/search/transcript.md`, `01-not-found.png`, `02-found.png`, `03-on-map.png`.

## Gotchas

- The page number is base-43 of the **reversed** query (`src/page.ts`). Compute it, don't guess: `queryToPageAddress`. Most phrases are astronomically far away, and only very short ones are reachable in play.
- In Firefox, the first Escape in a non-empty `type="search"` box clears it, and only the second closes the dialog.
- `view=page.N` in the URL is a map container index, not the page number. Assert the displayed page text.
- The zoom path writes the URL with `replaceState` at each level. Back undoes the whole zoom in one step.
- Each search is counted (`searches`, `searchesFound`) and can unlock achievements, which show toasts.
