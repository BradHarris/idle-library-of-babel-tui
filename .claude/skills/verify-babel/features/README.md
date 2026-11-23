# Library of Babel verification map

This directory is the maintained source for verifying what a player can do in the Library of Babel. Read this index before driving the app, then use the matching feature file as the recipe. Every recipe has a runnable journey in `../journeys/` with the same name.

## Baseline preconditions

- One instance launched by this harness (`node babel.mjs launch`), with `node babel.mjs doctor` exiting 0.
- Each `run` uses a fresh Firefox profile: an empty save, $0, one Writer, frame rate at the desktop default (20).
- States that would take hours of idling come from `t.seed('rich')` (`fixtures/rich.json`: $1B, 100M pages, 25 writers, no upgrades or achievements).
- Never drive an instance this run did not launch. The user's own `npm run dev` on :5173 holds their real save.

## Driving conventions

- Run journeys from `.claude/skills/verify-babel/`: `node babel.mjs run <feature> [--viewport desktop|mobile]`.
- Desktop (default, 1280×900) shows every section. Mobile (390×844) shows one section at a time behind the bottom tab bar.
- Use the stable handles below. Do not use Tailwind classes or DOM position.
- Wait on state with `t.waitFor`, never on a fixed sleep.
- A seeded save is a precondition, never the proof.

### Stable handles

| Area | Handles |
| --- | --- |
| HUD | `[data-stat="pages"\|"money"\|"pps"\|"output"\|"boost"\|"insight"]`, `button[aria-label="Search the library"]` |
| Tabs | `nav[aria-label="Sections"]`, `button[data-tab="workers"\|"upgrades"\|"puzzles"\|"library"\|"log"\|"achievements"\|"settings"]` (icons on mobile, text labels on desktop), `[aria-current="page"]`, `[data-tab-badge]` |
| Sections | `section[data-panel="workers"\|"upgrades"\|"library"\|"log"\|"achievements"\|"settings"]` |
| Workers | `button[data-tier="<tier id>"]` (hire), `li:has(> button[data-tier=…]) [data-count]`, `[data-output]`, `button[data-hire-mode="one"\|"next"\|"max"]` |
| Upgrades | `button[data-upgrade-id="<id>"][data-upgrade-state="available"]`, `li[data-upgrade-id][data-upgrade-state="locked"] [data-requirement]`, `[data-upgrade-count]`; the repeatable one is `speed` ("Faster") |
| Search | `dialog`, `input[aria-label="Phrase to search for"]`, `button[aria-label="Close"]`, `[data-show-on-map]` |
| Map | `#storage-map`, `button[data-follow]`, `[data-map-title]`, `[data-map-top]`, `[data-map-fill]`, `[data-map-page]`, `[data-map-pulse="target"\|"writing"]`, `button[aria-label="Zoom in"\|"Zoom out"\|"Zoom to search result"]` |
| Puzzles | `[data-puzzles-available]`, `[data-puzzle-board="<answer>"]`, `[data-tile="<i>"][data-cursor]`, `[data-caret]`, `[data-puzzle-input]`, `[data-open-keyboard]`, `[data-submit-guess]`, `[data-guess-info]`, `[data-give-up]`, `[data-guess-row] [data-correct]`, `[data-puzzle-message]`, `[data-puzzle-outcome="solved"\|"lost"]`, `[data-next-puzzle]`, `[data-insight-id]`, `[data-insight-level]`, `[data-insight-balance]`, `input[data-automation-key]` |
| Achievements | `[data-achievement="<id>"][data-unlocked]`, `[data-achievement-count]`, `[data-achievement-toast]` |
| Save | `button[data-save="now"\|"export"\|"reset"\|"import"]`, `[data-save-notice]`, `[data-save-export]`, `[data-save-import]`, `[data-save-load-error]` |
| Settings | `button[data-fps="5"\|…\|"60"]` with `aria-pressed` |
| Paused tab | `[data-halted]` (role `alertdialog`), `button[data-halted-reload]` |

Tier ids are `writer`, `manager`, `overseer`, `rector`, `cardinal`, `pope` and `archbishop`. Upgrade ids are `<tier>-25|50|75|100` plus milestones (see `src/upgrades.ts`).

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- Mutation proof includes a second view: `t.stored()` after a save, or a reload with `t.open()` and a re-read.
- Every run's evidence is `artifacts/<run-id>/<journey>/transcript.md` plus PNGs and `console.log`. Cite that path.
- A new Solid `[CODE]` warning in `console.log` is a failure even when the journey passes.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the player-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every player entry point.
3. `Driving it with babel.mjs` starts with `Preconditions:` and uses labeled bullets that pair each player action with an exact handle or command and an observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Hire workers](./hire-workers.md): hiring per tier, hire modes, prices, and persistence.
- [Upgrades](./upgrades.md): the repeatable Faster upgrade, unlocking and buying one-off upgrades.
- [Reading Room](./puzzles.md): scrambled-page puzzles (typing or tapping, 5 guesses), the Insight shop and automation.
- [Search](./search.md): search dialog, not-found and found results, and Show on map.
- [Save and settings](./save-and-settings.md): Save now, export, import, two-click reset, unreadable saves, and the frame rate.
- [Tabs and routing](./tabs-routing.md): the mobile tab bar, URL hash routes, back/forward, deep links, and the upgrades badge.
- [Multiple tabs](./multi-tab.md): a running tab pauses when another tab saves, never overwrites it, and resumes on Reload.

Not yet mapped: storage map navigation by hand (zoom in/out, breadcrumbs, cell clicks, Follow), the Storage scale panel, achievements unlocking in normal play, and the offline boost. Add a file here when you first verify one of them.
