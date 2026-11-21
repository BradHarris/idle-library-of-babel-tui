# Library of Babel (idle game)

A browser idle game built with Solid 2.0, Vite 8 and Tailwind v4.
- Engine (framework-light, in `src/`): `config.ts`, `page.ts`, `lcg.ts`, `format.ts`, `storageScale.ts`, `search.ts`
- State: `store.ts`
- UI: `web/src/`, which imports the engine through the `@game/*` alias

## Commands

- `npm run dev`: Vite dev server on :5173. It serves Solid diagnostics at `/__solid/diagnostics`.
- `npm test`: vitest (jsdom). The config is in `web/vite.config.ts`.
- `npm run typecheck`, `npm run lint` (eslint-plugin-solid `v2`), `npm run build` (outputs to `web/dist`)

## Solid 2: read before editing UI or `src/store.ts`

This is Solid **2.0**. It is not React and not Solid 1.x. Before writing or reviewing Solid code, read:
- `node_modules/solid-js/skills/solid-2.0/SKILL.md`: the primer
- `node_modules/solid-js/CHEATSHEET.md`: exact APIs, plus a list of 1.x names that no longer exist
- `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md`: what each `[CODE]` dev warning means and how to fix it
- `node_modules/@solidjs/diagnostics/skills/agent-loops/SKILL.md`: proving code is quiet with `captureArtifact`
- Docs for agents: https://docs.solidjs.com/llms.txt

Rules that matter here:
- Components run once. Read props as `props.x` and never destructure them. Pass values, not accessors (`v={x()}`).
- Never read reactive values at the top of a component body. Read them in JSX, a `createMemo`, or an effect's compute.
- `createEffect(compute, apply)` takes two arguments. Use `onSettled` (not `onMount`) for setup/teardown.
- Store writes go through the draft: `setState(s => { s.x = 1 })`. Assign leaves rather than replacing objects. Replacing an object triggers `IMMUTABLE_UPDATE_IN_STORE` and re-runs every reader.
- Reads lag writes until the microtask flush. Actions in `src/store.ts` therefore read **from the draft**, never from `state`. In tests, call `flush()` before asserting.
- Never write signals or stores from a memo, an effect compute or a component body.
- Control flow:
  - `<For>` (default) gives a raw item and an index accessor.
  - `<For keyed={false}>` gives an item accessor and a numeric index.
  - `<Show>`/`<Match>` function children receive accessors.
- JSX: `class` (string, or object/array for conditional classes), camelCase `onClick`, `<Ctx value={…}>` (no `.Provider`).
- Fix diagnostics at the cause. Never silence them with `untrack`.
