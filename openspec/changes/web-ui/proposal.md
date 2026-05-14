## Why

The game currently runs only as a terminal application (Ink TUI), limiting accessibility to users comfortable with the command line. A web UI makes the game playable in any browser, hostable on GitHub Pages, and opens the door to sharing, embedding, and broader audience reach.

## What Changes

- Add a React-based web frontend in a `web/` directory alongside the existing TUI source
- Reuse the existing Zustand game store (`stores/gameStore.ts`) and core game logic (`config.js`, `page.js`, `format.js`, `storageScale.js`, `lcg.js`) directly from the web build
- Build a Vite-based React app with a production build pipeline (`npm run build:web` → `web/dist/`)
- Use **Radix UI** components (Button, Tabs, ScrollArea, Dialog, Popover) and Tailwind CSS for styling
- Configure GitHub Pages deployment from the committed `web/dist/` directory
- The existing TUI entry point (`src/index.jsx`) and terminal-specific code (`src/ui.jsx`, `ink` dependency) remain unchanged

## Capabilities

### New Capabilities

- **web-ui-react-app**: Vite + React web application with Radix UI components, reusing the existing Zustand store and game logic modules. Includes stats dashboard, workers panel, storage scale panel, event log, latest page display, and search functionality — all as web components.
- **web-build-deploy**: Build pipeline (Vite) producing a static `web/dist/` directory, with GitHub Pages configuration for hosting from the committed build artifact.

### Modified Capabilities

*(None — no existing spec-level behavior is changing. The game store, formatting, page generation, and economy remain identical.)*

## Impact

- **Dependencies**: Add React 19, ReactDOM, Vite, Radix UI primitives, Tailwind CSS, and postcss/autoprefixer as new dev/runtime dependencies
- **Project structure**: New `web/` directory with its own `src/`, `index.html`, `vite.config.js`, and `tailwind.config.js`; shared game logic remains in `src/`
- **CI/CD**: GitHub Pages configured to serve from `web/dist/`; build step added to package.json
- **No breaking changes**: The existing TUI (`npm start`) continues to work unchanged
