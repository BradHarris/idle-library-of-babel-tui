# Reading Room (puzzles)

Scrambled words turn up on library pages as pages are written. Page N reads as N's base-43 digits, so each word's letters in descending alphabet order land on one fixed page (`src/puzzles.ts`). Puzzles queue up in the order they turn up. The Puzzles tab shows how many are available and plays only the oldest. The big letter tiles are the input: type the word, or tap two tiles to swap them. Each guess shows which letters are in the right spot. Guesses 1-3 are free, and guesses 4 and 5 cost 1 ✦ each. A wrong fifth guess, or giving up, loses the puzzle for good with no reward, and the next one comes up. Insight (✦) buys leveled upgrades and automation in the shop below the puzzle. Nothing resets.

## Sub-features

- `unlock`: a puzzle queues once `pagesGenerated` reaches its page. The tab badge and `[data-puzzles-available]` count the queue, and a teaser names the next one.
- `type`: letter keys move that letter from the untyped tiles to the cursor. Backspace steps back and Enter guesses. Typing is ignored while focus is in a text field or the search dialog is open.
- `caret`: typed tiles are at full colour, untyped ones faded. A blinking underline (`[data-caret]`) sits under the tile the next letter goes to.
- `soft keyboard`: on touch screens (`pointer: coarse`), the Type button (`[data-open-keyboard]`) focuses a hidden `[data-puzzle-input]`. Letters are read from its value, so keyboards that send `Unidentified` keydowns still work. Backspace works through a leading space sentinel.
- `tap`: tap one tile, then another, to swap them. With a tile selected, the arrow keys carry it.
- `guess`: each guess becomes a row with correct-spot tiles in green. `[data-guess-info]` shows the guess number and its cost.
- `solve` / `lose`: a banner (`[data-puzzle-outcome="solved"|"lost"]`) announces the result, and the next puzzle's board replaces the old one.
- `shop` / `automation`: buy Insight upgrades. Automation switches appear once owned.

## How to get to it (user POV)

- The Puzzles tab (`#/puzzles`), the third tab.
- "found on page …" in the puzzle header jumps to that page on the storage map.

## Driving it with babel.mjs

Preconditions: `t.seed('rich')` (100M pages) queues most 5-letter puzzles. The current one is `[data-puzzle-board="<answer>"]`.

- Tap: click `[data-tile="0"]`, then `[data-tile="1"]`. Result: those two letters swap.
- Type: `t.page.keyboard.type(word)`, then `press('Enter')`. Result: the tiles read the word, a `[data-puzzle-outcome="solved"]` banner shows "+2 ✦", and the HUD `[data-stat="insight"]` goes up.
- Give up: click `[data-give-up]`. Result: a `[data-puzzle-outcome="lost"]` banner reveals the word, and `puzzlesFailed` is saved.
- Paid guesses: at guess 4 and 5, `[data-guess-info]` reads "costs 1 ✦". `[data-submit-guess]` is disabled when you can't pay.
- Shop: click `[data-insight-id="lucidity"]`. Result: `[data-insight-level]` shows "lv.1".
- Journey: `node babel.mjs run puzzles`.

## Gotchas

- The Type button is hidden in headless Firefox (no coarse pointer). Focus `[data-puzzle-input]` directly to drive the phone path.
- The caret blinks forever, so to wait for tiles to settle, wait for `CSSTransition`s only, not every animation.

- Rewards double per letter: a 5-letter word pays 2 ✦.
- The board's id is the answer word. That's fine as a test handle, but don't screenshot it as a hint.
- The rich seed's achievement toasts cover the lower shop cards on mobile for a few seconds.
