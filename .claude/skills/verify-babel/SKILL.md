---
name: verify-babel
description: Drive the Library of Babel idle game in a real headless Firefox, the way a player does, and capture proof (screenshots, transcripts, localStorage, console). Use after changing anything under web/src or src/ that a player can see or that is saved, to prove the change works in the running app and not only in vitest.
---

# Verify the Library of Babel in a real browser

The game is a Vite + Solid 2 single-page app. Players touch only the browser UI, and all game state lives in that browser's `localStorage`. This skill starts a **separate** Vite dev server on its own port, drives it with headless Firefox through `puppeteer-core` over WebDriver BiDi, and writes evidence to disk. It never touches the user's own `npm run dev` on :5173 or their browser profile. Each run gets a fresh, throwaway Firefox profile, so it starts from an empty save.

Everything lives in `.claude/skills/verify-babel/`. Run the commands from there. `runs/`, `artifacts/` and `node_modules/` are git-ignored.

```
cd .claude/skills/verify-babel
npm install                 # once: installs puppeteer-core (uses the system Firefox; downloads no browser)
```

Requires `/usr/bin/firefox`. Override with `BABEL_FIREFOX=/path/to/firefox`. Requires the repo's own `npm install` (it runs `node_modules/vite`).

## Launch

```
node babel.mjs launch [--port 5200]
```

This starts `vite --config web/vite.config.ts --host 127.0.0.1 --port <free port from 5200> --strictPort` from the repo root in its own process group, logging to `runs/<id>/vite.log`. It waits until `/` and `/src/main.tsx` both serve, then renders the app once in Firefox and waits for the `The Library of Babel` heading and a `[data-stat="pages"]` HUD value. The run is ready only when it prints:

```
ready  run=<id>  url=http://127.0.0.1:<port>/  pid=<pid>
```

There is no database and no seed step. A fresh browser profile is a fresh game: $0, one Writer. Vite serves the working tree live, so edits after launch show up on the next page load without relaunching.

## Doctor

Run this first whenever anything looks off. It is read-only.

```
node babel.mjs doctor [--run <id>]
```

It checks that the vite pid is alive, that the port's listener is **our** pid (not the user's dev server), that the page serves the game's `<title>`, that the app entry compiles, and that Firefox is present. It also prints HEAD and the number of uncommitted files, because the proof covers the working tree, not a commit. Exit 0 means the instance is worth driving. `node babel.mjs list` shows every instance this harness has running.

## Drive

```
node babel.mjs run <journey> [--viewport desktop|mobile] [--run <id>]
```

A journey is `journeys/<name>.mjs`, or a path to any `.mjs` file. It exports `default async function (t)`. Each run opens a new Firefox with an empty profile. The viewport defaults to `desktop` (1280×900). Both viewports show one tab at a time. On desktop (≥1024px, Tailwind `lg`) the tab bar is a row under the HUD. Use `--viewport mobile` (390×844) for the bottom tab bar.

The `t` object:

| Call | What it does |
| --- | --- |
| `t.open(hash?)` | Load the app (e.g. `t.open('#/library')`) and wait until it is usable. |
| `t.seed('rich')` / `t.seed(obj)` | **Precondition only.** Writes a save from `fixtures/<name>.json` (or a `SaveFile` object) into localStorage, then loads the app. Sets `savedAt` to now unless `{ keepSavedAt: true }`. |
| `t.seedRaw(string)` | Precondition only. Puts any raw string in the save slot (e.g. a corrupt save), then loads the app. |
| `t.tab(id)` | Click a tab (`workers`, `upgrades`, `puzzles`, `library`, `log`, `achievements`, `settings`) and wait until it is current. Only the current tab's section is visible, so open the right one before clicking inside it (Save is on `settings`). |
| `t.step(label, fn)` | Records an action in the transcript. Whatever `fn` returns is logged as its observed result. |
| `t.expect(cond, msg)` | Logs PASS/FAIL. A FAIL stops the journey and takes a `failure` screenshot. |
| `t.shot(label)` | Numbered PNG in the evidence folder. |
| `t.text(sel)`, `t.visible(sel)`, `t.hash()` | Text, visibility (`checkVisibility`), and URL hash, as the player sees them. |
| `t.hud()` | `{pages, money, pps, output}`: the HUD as displayed. |
| `t.stored(key?)` | Parsed localStorage value. Defaults to `library-of-babel:save`. Also `library-of-babel:save:backup` and `library-of-babel:settings`. |
| `t.waitFor(fn, label, ms?, ...args)` | Polls a page-side predicate. Wait on state, never on a fixed sleep. |
| `t.page` | The raw puppeteer `Page`, for anything else (`click`, `type`, `keyboard.press`, `$eval`). |

Stable handles in this app are `data-*` attributes and ARIA labels. The full list is in `features/README.md`. Prefer them over CSS classes, which are Tailwind and change freely.

For a change, run the journeys for every feature the change touches (see `features/README.md`). Add or edit steps when you add behavior. To see one thing quickly, write a throwaway journey file, run it by path, and delete it afterwards along with its `artifacts/<run>/<name>/` folder.

## Evidence

Each `run` writes to `artifacts/<run-id>/<journey>/`:

- `transcript.md`: run id, URL, viewport, commit with an uncommitted-file count, then each step, its observed values, and PASS/FAIL lines, ending in `RESULT: PASS|FAIL`.
- `NN-<label>.png`: screenshots, including `failure` on a failed run.
- `console.log`: every browser console line. Solid 2 dev warnings appear here with their `[CODE]`. The transcript lists errors. Any Solid `[CODE]` warning that a change introduces is a defect even when the journey passes. Look it up in `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md`.

The process prints `PASS|FAIL <journey> evidence: <path>` and exits non-zero on FAIL.

Proof standards:
- Drive the real player path: clicks, typing and keys on the elements a player uses. `t.seed` exists only to reach a state that would take hours of idling, such as money, pages or hired counts. It is never the thing being proven. To prove that loading a save works, use the Import button (see `features/save-and-settings.md`).
- Capture the action and the resulting state: a value before and after, not only a final screenshot.
- Prove side effects with a second view. After a mutation, check `t.stored()`, or reload with `t.open()` and read the UI again.
- Nothing is mocked. The game has no network or backend.

## Cleanup

```
node babel.mjs stop [--run <id>]     # or --all for every instance this harness started
```

This kills only what the harness started: the vite process group by its recorded pid, plus any Firefox whose pid a crashed run left in `runs/<id>/browser-*.pid`. It never kills by process name, and so never touches the user's dev server or browser. It removes `runs/<id>/` and **keeps** `artifacts/<id>/`, the evidence. Delete old `artifacts/` folders by hand when they are no longer needed. Run `stop` after every session, including failed ones.

## Gotchas

- **The game saves itself on `pagehide` and `visibilitychange`**, and autosaves every 10 s. Any `localStorage` write made from inside a running app page is overwritten when that page unloads. `t.seed` therefore writes from `/src/main.tsx`, a non-app document on the same origin. Do the same in any custom setup.
- **Offline boost:** a save whose `savedAt` is in the past banks time away as a 10× boost (`· 10× boost m:ss` in the HUD output line), which changes rates. `t.seed` sets `savedAt` to now, though about a second of boost still appears.
- **Numbers move every tick** (20 per second by default). Assert on discrete things such as hired counts, prices, levels, notices and stored values, not on exact money or pages.
- **Achievement toasts** (`[data-achievement-toast]`) stack in the top-right corner for a few seconds after unlocks. Seeding `rich` unlocks several. They can cover the map's Follow and Zoom buttons, so wait them out or use other handles before clicking there.
- puppeteer's `page.goBack()` hangs on same-document history entries in Firefox BiDi. Use `t.page.evaluate(() => history.back())`, which is what the Back button does.
- **Background tabs are throttled.** A page opened with `newPage()` takes the foreground. Open extra tabs only when the journey needs them, and `bringToFront()` before measuring anything that ticks.
- The page-level map view in the URL (`view=page.N`) is a container index, **not** the page number. Assert the displayed `— page 73,259,716 —` text instead.

## Helpers

- `babel.mjs`: the CLI above (`launch | doctor | run | stop | list`).
- `fixtures/rich.json`: a v1 save with $1B, 100M pages and 25 writers hired. It unlocks the first upgrades and makes "hello" findable. If the save format changes (`src/save.ts`, `SAVE_VERSION`), update this fixture. An old-version fixture still loads through the app's migrations, but it then tests migration, not the feature.
- `journeys/*.mjs`: one per mapped feature. See `features/README.md`.

For component-level reactivity budgets (re-run counts, `[CODE]` diagnostics in vitest), see `node_modules/@solidjs/diagnostics/skills/agent-loops/SKILL.md`. That checks reactive code. This skill checks player-visible behavior.
