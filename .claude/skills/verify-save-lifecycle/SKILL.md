---
name: verify-save-lifecycle
description: Formally check that the Library of Babel never overwrites a save another tab wrote, and never replaces a save it can't read unless the player chooses to. A TLA+ model of the save lifecycle (open, autosave, hide, close, crash, Save now, Import, Reset, other tabs writing, the storage event) is checked by TLC over every ordering, and every model step is replayed on the real <App/>. Use whenever a change touches saving, loading, autosave, the Save panel, or adds any new code that writes localStorage.
---

# Verify the save lifecycle

**The promises:**
- A tab never writes over a save that another tab (of this build or a newer one) wrote after this tab last read or wrote the slot. Instead it pauses and asks for a reload ("Paused in this tab", `[data-halted]`).
- The game never replaces a saved game it can't read (corrupt, or written by a newer version) unless the player chooses to, by pressing Save now, Import or Reset in a tab that showed the "couldn't be loaded" warning.

**The harm if broken:** a player's progress, possibly from another tab or a newer deploy, is destroyed silently.

**How the code keeps them:** `startAutosave` (`src/store.ts`) remembers the exact save string it last loaded or wrote (`known`). Every write path checks that the slot still holds it (`changedElsewhere()`), and so does the `storage` event that the browser fires in other tabs. On any mismatch the tab sets `stopped` for good, and `App.tsx` stops the tick loop and shows `HaltedNotice`.

The check has two parts, and you run both with one command:

1. **TLC** checks the model `verification/save-lifecycle/SaveLifecycle.tla` over **every** ordering of its steps. The state space is finite (31 states), so the check is exhaustive, with no depth bound.
2. **Conformance replay**: `web/src/saveLifecycle.conformance.test.tsx` takes every step in TLC's state graph (`graph.json`), replays the shortest path to it on the real `<App/>` in jsdom, and checks localStorage (save and backup slots), whether the tab is open, and the load warning after **every** action. This makes a model verdict a verdict about the code. It also runs inside `npm test`.

## When to run it

Run it when a change touches any of the covered code below, or adds anything that writes `library-of-babel:save` (a new save trigger, a new event handler, a sync feature, a migration that writes back). Check with:

```
git diff --stat 143cb93 -- src/save.ts src/store.ts web/src/App.tsx web/src/components/SavePanel.tsx web/src/components/HaltedNotice.tsx
```

## Run

```
node verification/save-lifecycle/check.mjs           # rules, graph, replay  (~10 s)
node verification/save-lifecycle/check.mjs --rules   # TLC only
```

Requirements: Java 11+ (`JAVA=` to override) and TLC `tla2tools.jar` **1.7.4** at `~/.cache/tla/tla2tools-1.7.4.jar` (`TLA2TOOLS=` to override). The script checks the jar's sha256 and never downloads anything. If the jar is missing, it prints the one-line install command. Ask the user before running that command.

Output:

```
holds   WarnedSaveKept  (31 distinct states)
BREAKS  NoSilentOverwrite                      ← shortest counterexample follows, one line per step
KNOWN   NoSilentOverwrite  (reason)            ← listed in known-findings.json: reported, not failing
graph   31 states, 259 steps, 3 start states   (graph.json changed: commit it)
      Tests  260 passed (260)                  ← replay; failures name the path, e.g. "s2: Open → PageClose → Open"
RESULT: OK | FAIL
```

Read every result with the pstack `/statechart` skill. It turns each break into its shortest path in plain words and draws how the save moves between states. Give it `SaveLifecycle.tla`, a config listing the rules, and a view that labels tab states ("Playing", "Warning shown, autosave off", "Tab closed") and save states ("No save", "Save this game can read", "Save it can't read").

## The rules (in `SaveLifecycle.tla`)

| Rule | In plain words |
| --- | --- |
| `NoSilentOverwrite` | No step replaces an unreadable save unless it is Save now, Import or Reset in a tab showing the load warning. |
| `NoForeignOverwrite` | A tab never writes over a save another tab wrote after it last read or wrote the slot. |
| `NoFalseAlarm` | A tab pauses only when another tab really wrote: its own saves, imports and resets never pause it. |
| `WarnedSaveKept` | While a tab shows the warning and the player hasn't acted, this tab leaves the unreadable save in place. Another tab may still replace it. |
| `BackupKept` | A tab that loaded an unreadable save always leaves a copy in `library-of-babel:save:backup`. |
| `TypeOK` | Variables stay in range (a sanity check on the model). |

## Telling a real bug from a modeling error

- **A replay test fails:** the code and the model disagree at that step. Read the failing path and the diff of expected and observed values.
  - If your change meant to alter behavior, the model is now stale. Update it (see below).
  - If it didn't, you've introduced a bug. Fix the code, not the test.
- **A rule BREAKS and the replay passes:** the code really behaves as the counterexample says, because the replay just walked that path on the real app. That is a real finding. Report it as the shortest path in the code's words. Never weaken the rule or the model to make it pass, and never add it to `known-findings.json` yourself: that list records the user's decision.
- **A rule BREAKS and the replay fails:** fix the disagreement first. The verdict means nothing until the model matches the code.
- **`graph.json changed`** with no edit to the `.tla`: TLC's output format changed. Check that parsing in `check.mjs` still finds start states and actions.

## Updating the model for an intended change

1. In `SaveLifecycle.tla`, add or change the action. Each action is one event handler that runs to completion in the code. JS doesn't interleave inside one, and the Import/Reset save runs on the microtask right after the click, before any timer or `pagehide`. Keep the code-map comment at the top in sync.
2. In `web/src/saveLifecycle.conformance.test.tsx`, add the matching entry to `actions`, done the way the browser or player does it: dispatch the event, click the button, or advance fake timers.
3. Run `check.mjs`. It regenerates `graph.json`. Commit the `.tla`, `graph.json` and the test together.
4. Show the new check failing on a scratch break of the new code path (for example, delete the guard you added), then restore it.
5. Move the sync commit below forward, and only after the check passes against the new commit.

## Coverage record

| Model action / rule | Code |
| --- | --- |
| `Open` | `web/src/App.tsx` `App()`: `readSave()`, `startAutosave(game, { enabled: loaded.ok \|\| loaded.reason === 'empty' })`, `loadError` warning |
| `Open` backup | `src/save.ts` `readSave()`: copies an undecodable save to `BACKUP_KEY` |
| slot abstraction | `src/save.ts` `decodeSave()` (ok vs `corrupt`/`newer`), `writeSave()`, `clearSave()` |
| `Autosave`, `TabHidden`, `PageClose`, `Save(force)` | `src/store.ts` `startAutosave()`: `save(force)`, `changedElsewhere()`, `known`, `stopped`, `setInterval(AUTOSAVE_MS)`, `visibilitychange`, `pagehide` |
| `StorageEvent` | `src/store.ts` `startAutosave()` `onStorage` (`storage` on `window`, key `SAVE_KEY` or `null`) |
| `halted` | `startAutosave().halted`. `web/src/App.tsx` passes it to `startTickLoop(…, running)` and to `HaltedNotice` (`web/src/components/HaltedNotice.tsx`). |
| `SaveNow`, `Import`, `Reset` | `web/src/components/SavePanel.tsx` `saveNow`, `doImport` → `saveAfterFlush`, `doReset` (second click) → `autosave.clear()` + `saveAfterFlush` |
| `OtherTabSaves`, `OtherTabWritesNewer` | Code in other tabs. A same-build tab's `writeSave`, or a newer deploy writing `{ v: SAVE_VERSION + 1 }`. |
| `foreign` | `readRawSave(storage) !== known` in `changedElsewhere()` |

**Sync commit: `143cb93` plus the uncommitted multi-tab fix** (2026-11-22). The model was confirmed against the working tree: `143cb93` with the multi-tab halt (`src/store.ts`, `src/save.ts` `readRawSave`, `web/src/App.tsx`, `SavePanel.tsx`, `HaltedNotice.tsx`) not yet committed. When that work is committed, re-run the check and record that commit here. If the command under "When to run it" shows changes since the sync commit, re-run the check and re-read the changed lines against the coverage table before trusting a pass.

## Scope

- **Verified:** every interleaving, across any number of reloads, of one tab's lifecycle with the player's three save actions, a crash, other tabs' writes (readable or newer-format) at any moment, and the `storage` event arriving at any later point.
- **Assumptions:** each action is atomic (JS run-to-completion). All unreadable saves are treated alike: corrupt and newer-version saves take the same code path. `writeSave` succeeds, because storage-full and private-mode failures are not modeled.
- **Not covered:**
  - The *other* tab's behavior. The model is one tab, with the rest of the world as writes to the slot. That covers every tab, since each one runs this code.
  - The up-to-10 s of progress the paused tab made since its last save. It is dropped by design: the reload continues from the other tab's save.
  - Whether a "game" save holds the right data. That's `src/save.test.ts` and its fixtures.
  - Migrations.
  - A second, different unreadable save replacing the first copy in the backup slot.
  - Offline boost.

## Findings at the sync commit

None open. `NoSilentOverwrite` used to break: (1) open the game, (2) another tab writes a save this build can't read, (3) the 10 s autosave silently overwrote it. The multi-tab halt fixed that (2026-11-22). Both that path and the same-build version (`NoForeignOverwrite`) now pause the tab instead, and the replay confirms it on the real app.
