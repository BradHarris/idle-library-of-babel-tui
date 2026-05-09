## Why

The current page alphabet ordering (a-z first, digits last) and un-reversed page display produce pages that look visually flat — most of each page is dominated by repeated letters, and the readable characters cluster at the end. Reordering the alphabet to start with space and reversing page content before display makes pages visually more varied and interesting, improving the aesthetic experience of browsing the Library of Babel.

## What Changes

- Reorder the 43-character alphabet so space comes first: ` .,!?()abcdefghijklmnopqrstuvwxyz0123456789`
- Reverse the 280-character page string before display so pages read right-to-left (the LCG generation stays the same — only the display is reversed)
- Update tests to match the new alphabet and reversed output

## Capabilities

### Modified Capabilities
- `page-generation`: Alphabet character ordering changes (space first instead of last); page content is reversed before the 280-character output is returned

## Impact

- `src/page.js` — alphabet constant and `generatePage()` output
- `src/lcg.test.js` — test assertions on character set and specific page outputs
- `src/game.test.js` — assertions referencing page content
- No new dependencies; no API changes
