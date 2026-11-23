# Multiple tabs

All tabs of the game in one browser share a single save. When another tab saves, a tab that is already running pauses rather than overwriting that save. It stops the game, shows "Paused in this tab" with a Reload button, and never writes again. Reloading carries on from the newest save.

## Sub-features

- `tabs-pause-on-event` pauses the tab as soon as the browser reports another tab's save (`storage` event).
- `tabs-pause-before-write` makes every write path (autosave, hide, close, Save now, Reset) recheck the slot and pause instead of writing if it changed.
- `tabs-frozen` stops the paused tab's tick loop, so its page count no longer moves.
- `tabs-reload` lets the Reload button resume from the latest save. The other tab then pauses when this one saves.

## How to get to it (user POV)

- Open the game in two tabs of the same browser and play or save in one of them.
- Open the game in a tab while an older tab (or another deploy of the game) is still open.

## Driving it with babel.mjs

Preconditions:

- `node babel.mjs doctor` exits 0.
- Both tabs are pages of the same harness browser (`t.page.browser().newPage()`), so they share localStorage and real `storage` events.

- **Control.** Run `t.open()` in tab A. `[data-stat="pages"]` grows over 2.5 s in the foreground. Click `button[data-save="now"]`.
- **Second tab saves.** Open tab B at the same URL and click its `button[data-save="now"]`.
- **A pauses.** Within 5 s, tab A shows `[data-halted]`, whose text includes `another tab`. After `a.bringToFront()`, tab A's pages don't change over 2.5 s.
- **A never writes.** Dispatch `visibilitychange` (hidden) and `pagehide` in tab A. `localStorage['library-of-babel:save']` is byte-identical before and after.
- **Reload.** Click `[data-halted-reload]` in tab A. A runs again with no `[data-halted]`. Click Save now in A, and tab B shows `[data-halted]`.
- **Run it.** `node babel.mjs run multi-tab`.
- **Proof.** `artifacts/<run>/multi-tab/transcript.md`, `01-tab-a-paused.png`, `02-tab-a-after-reload.png`, `tab-b-paused.png`.

## Gotchas

- Firefox throttles timers in background tabs. Opening tab B moves it to the foreground, so measure ticking only in the foreground tab (`bringToFront()`), with a control showing that the count can move.
- Bringing A to the front hides B, and B legitimately saves on `visibilitychange`. Compare the slot around A's own events only, not against B's first save.
- The paused tab loses the progress it made since its last save (up to 10 s). That loss is intended.
- The formal model of this behavior is `verify-save-lifecycle`. This journey shows the browser really delivers the event between tabs, which jsdom can't.
