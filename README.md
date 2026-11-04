# Library of Babel (idle)

Web idle / incremental game inspired by Borges’ *Library of Babel*. Game logic and the Zustand store live under `src/`; the UI is a Vite + React app under `web/`.

## Development

```bash
npm install
npm run dev      # Vite dev server (default port from web/vite.config.ts)
npm run build    # Production bundle → web/dist
npm run preview  # Preview production build
npm run typecheck
npm test         # Game logic & helpers (tsx + Node test runner)
```

There is no terminal/Ink client; run the web app for the full experience.
