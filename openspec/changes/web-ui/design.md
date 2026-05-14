## Context

The Library of Babel idle game currently runs as a terminal application using Ink (React for terminals) with Zustand for state management. The core game logic — store, config, formatting, page generation, and storage scale math — lives in `src/` and is framework-agnostic (plain JS/TS modules). The only terminal-specific code is `src/index.jsx` (Ink entry point with `render()`) and `src/ui.jsx` (Ink components using `Text`, `Box`, `useInput`).

We want to add a web frontend that reuses the existing Zustand store and game logic modules, with a production static build served from GitHub Pages.

## Goals / Non-Goals

**Goals:**
- Reuse the existing Zustand store (`stores/gameStore.ts`) and all game logic modules in the web app
- Build a responsive web UI with the same panels: Stats, Workers, Storage Scale, Event Log, Latest Page, and Search
- Use Radix UI primitives for interactive components (buttons, tabs, dialogs, scroll areas)
- Vite build producing a static `web/dist/` committed to the repo
- GitHub Pages configured to serve from `web/dist/`
- Keep the TUI fully functional and unchanged

**Non-Goals:**
- Server-side rendering or hydration
- Authentication, accounts, or save/load (localStorage persistence may be added later)
- Mobile-first optimization (desktop-first responsive layout)
- Game logic changes or feature parity beyond the TUI

## Decisions

### 1. Vite for the web build tool
**Why:** Vite is the standard React build tool — fast dev server, excellent TypeScript/JSX support, zero-config for React, and produces clean static output. It handles aliasing and module resolution cleanly, letting us import from `../../src/` for shared game logic.

### 2. Radix UI for component primitives
**Why:** Radix UI provides unstyled, accessible headless components (Button, Tabs, ScrollArea, Dialog) that compose well with Tailwind CSS. This matches the request and avoids the heavy opinionation of component libraries like shadcn or Material UI. We get full styling control via Tailwind while retaining accessibility.

### 3. Shared game logic via relative imports from `web/`
**Why:** The game store and logic modules in `src/` are plain ESM modules with no platform-specific dependencies (no Ink, no chalk, no Node.js APIs). They can be imported directly from the web app via relative paths (`../../src/stores/gameStore.ts`). No barrel re-export or monorepo structure needed.

### 4. Tailwind CSS for styling
**Why:** Tailwind pairs naturally with Radix UI's unstyled components. It provides utility classes for all layout, color, and responsive needs without writing custom CSS files. PostCSS + Autoprefixer handle vendor prefixes.

### 5. Committed `dist/` for GitHub Pages
**Why:** GitHub Pages serves static files from a branch or directory. By committing `web/dist/` we get a simple, transparent deployment — no CI/CD pipeline complexity, no separate deploy branch needed. The user can push the built dist directly.

### 6. Game tick via `setInterval` in a React effect
**Why:** The TUI uses `setInterval` with the dynamic tick interval from the store. The web app mirrors this pattern — a `useEffect` in the root component drives `useGameStore.getState().tick(interval)` at the configured rate. This keeps the tick mechanism identical between TUI and web.

## Risks / Trade-offs

- [Zustand store is module-scoped singleton] → Both TUI and web import the same store module. In the browser, this means one shared state instance — which is correct for a single-page web app. No risk of state duplication.
- [BigInt in page numbers] → BigInt is supported in all modern browsers, which is the target audience. No polyfill needed.
- [Committed dist increases repo size] → The dist directory will be tracked in git. This simplifies GitHub Pages deployment at the cost of repo size. Mitigation: `.gitignore` excludes intermediate build artifacts, and the final dist is a small static bundle.
- [Radix UI learning curve] → Radix components use a composition pattern (e.g., `<Button.Root>`, `<Button.Arrow>`) that may be unfamiliar. Trade-off: we get accessibility and full styling control without heavy abstractions.

## Migration Plan

No migration needed — this is additive. Steps:
1. Install new dependencies (Vite, Radix UI, Tailwind, etc.)
2. Create `web/` directory structure
3. Build web components mirroring the TUI panels
4. Run `npm run build:web` → verify `web/dist/` output
5. Configure GitHub Pages in repo settings to serve from `web/dist/`
6. Commit and push

Rollback: Simply revert the commit. The TUI code is untouched.

## Open Questions

- Should the web app include localStorage persistence for game state? (Out of scope for now — can be added later)
- Should we add a "reset" button visible in the web UI? (TUI has no visible reset button, so likely not needed for parity)
