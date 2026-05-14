## ADDED Requirements

### Requirement: Vite build pipeline produces a static output directory
The project SHALL include a Vite configuration (`web/vite.config.js`) that builds the React web application into a static output directory at `web/dist/`. The build SHALL be invocable via `npm run build:web`. The output SHALL contain all HTML, CSS, and JavaScript assets needed to serve the app statically.

#### Scenario: Build command produces dist directory
- **WHEN** `npm run build:web` is executed
- **THEN** `web/dist/` is created with `index.html` and all bundled assets

#### Scenario: Dist directory is fully static
- **WHEN** the contents of `web/dist/` are served by any static file server
- **THEN** the web app loads and functions correctly without a build server

### Requirement: Vite resolves shared game logic from the parent src directory
The Vite configuration SHALL resolve imports from `../../src/` (the project root `src/` directory) so that the web app can import game logic modules (`config.js`, `page.js`, `format.js`, `storageScale.js`, `lcg.js`, `stores/gameStore.ts`) without duplication. The resolution SHALL exclude terminal-specific files (`src/index.jsx`, `src/ui.jsx`) and their Ink/chalk dependencies.

#### Scenario: Game store is importable from web app
- **WHEN** a web component imports `useGameStore` from `../../src/stores/gameStore.ts`
- **THEN** the import resolves correctly and the store functions in the browser

#### Scenario: Ink-specific modules are excluded from the build
- **WHEN** the web app is built
- **THEN** `ink` and `chalk` packages are not included in the final bundle

### Requirement: Tailwind CSS processes styles in the web app
The project SHALL include Tailwind CSS configured via `web/tailwind.config.js` (or `tailwind.config.ts`) with PostCSS and Autoprefixer. Tailwind SHALL process CSS in the web app entry point, scanning `web/src/` for class names. The build output SHALL include the processed CSS bundled or linked from `index.html`.

#### Scenario: Tailwind utility classes are available
- **WHEN** a component uses a Tailwind utility class (e.g., `className="flex gap-4"`)
- **THEN** the class styles are applied correctly in the built output

#### Scenario: Unused Tailwind classes are purged
- **WHEN** the production build runs
- **THEN** only the Tailwind classes used in the source files are included in the output CSS

### Requirement: GitHub Pages is configured to serve from web/dist
The project SHALL include a `.github/pages` configuration or equivalent settings that direct GitHub Pages to serve the site from the `web/dist/` directory in the default branch. A `web/dist/.nojekyll` file SHALL be included to prevent Jekyll processing.

#### Scenario: Nojekyll file exists
- **WHEN** the build completes
- **THEN** `web/dist/.nojekyll` exists in the output directory

#### Scenario: Repository can be set to serve from directory
- **WHEN** GitHub Pages is configured in the repository settings
- **THEN** it can be pointed to the `web/dist/` directory (or equivalent branch path) for serving

### Requirement: Development server supports hot reloading
The project SHALL include a `npm run dev:web` script that starts a Vite development server with hot module replacement (HMR). The dev server SHALL serve the web app from a local URL (e.g., `http://localhost:5173`).

#### Scenario: Dev server starts and serves the app
- **WHEN** `npm run dev:web` is executed
- **THEN** the web app is accessible in a browser at a local URL

#### Scenario: Source changes trigger hot reload
- **WHEN** a source file in `web/src/` is modified while the dev server is running
- **THEN** the browser reflects the change without a full page refresh
