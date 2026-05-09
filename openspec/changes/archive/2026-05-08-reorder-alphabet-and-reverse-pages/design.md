## Context

The page generation pipeline currently uses the LCG from the `lcg-page-generation` change. The flow is:

1. `lcgState(pageNum)` → big integer state
2. `stateToPage(state, ALPHABET)` → 280-char string (base-43 conversion using the current alphabet)
3. `generatePage(pageNum)` → returns the result of step 2

The current alphabet is `abcdefghijklmnopqrstuvwxyz.,!()?0123456789`, so index 0 maps to `a`, index 42 maps to space. Pages tend to start with repeated letters, making them visually monotonous.

## Goals / Non-Goals

**Goals:**
- Make pages visually more varied by reordering the alphabet so space is index 0
- Reverse page content before display so readable text appears at the front of each page
- Keep the LCG algorithm and closed-form jump-ahead unchanged

**Non-Goals:**
- Changing the LCG parameters (a, c, m)
- Changing the page length (still 280 characters)
- Modifying the TUI display logic or game logic

## Decisions

### 1. Reverse in `generatePage()` rather than in the TUI display

**Decision:** Apply the reversal inside `generatePage()` in `src/page.js`, not in the TUI layer.

**Rationale:**
- Single point of change — the store (`gameStore.ts`) just reads `latestPage` and displays it
- The reversed string is the canonical "page" value, so any code referencing page content sees the reversal consistently
- The store's `latestPage` is not used for any computation — it's display-only, so there's no risk of breaking game logic

**Alternatives considered:**
- Reverse in `LatestPagePanel` in `ui.jsx`: Would keep `generatePage()` pure, but the reversal would be a display-only concern that doesn't propagate to any other consumer (none exist).
- Reverse in the store during tick: Would duplicate the reversal logic across multiple store methods (`tick`, `reset`, initial state).

### 2. New alphabet: space-first with punctuation next

**Decision:** Alphabet is ` .,!?()abcdefghijklmnopqrstuvwxyz0123456789`

**Rationale:**
- Space at index 0 means pages start with frequent blank characters, breaking up letter repetition
- Punctuation next (`.,!?()`) keeps common text characters early
- Letters in the middle (indices 7–32)
- Digits at the end (indices 33–42), least likely to appear in natural text

**Alternatives considered:**
- Alphabet: `abcdefghijklmnopqrstuvwxyz.,!?()0123456789 ` — current order (rejected)
- Alphabet: ` .,!()?abcdefghijklmnopqrstuvwxyz0123456789` — same but with `?!` order flipped (rejected, `!?` is more conventional)
- Alphabet: reverse of current — ` 9876543210)?(!.,zyxwvutsrqponmlkjihgfedcba` — too extreme, loses readability

## Risks / Trade-offs

- **Page number sharing:** Players sharing page numbers will see different (reversed) content. This is a net positive since it makes each page more interesting.
- **Tests:** All existing tests in `lcg.test.js` and `game.test.js` that assert on specific page content will need updates. No logic changes, just expected values.
- **LCG bijection unchanged:** Reversing a string doesn't affect the bijection property — each LCG state still maps to exactly one unique reversed page, and each reversed page maps back to exactly one LCG state.

## Migration Plan

No migration needed. The change is purely in page generation output:
1. Modify `ALPHABET` constant in `src/page.js`
2. Add `.split('').reverse().join('')` to `generatePage()` return value
3. Update test assertions
