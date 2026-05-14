## 1. Project Setup

- [ ] 1.1 Create `web/` directory structure with `web/src/`, `web/public/`
- [ ] 1.2 Initialize `web/index.html` with Vite entry point and `<div id="root">`
- [ ] 1.3 Create `web/vite.config.js` with resolve alias for `../../src/` game modules and build output to `web/dist/`
- [ ] 1.4 Install dependencies: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`
- [ ] 1.5 Add `build:web` and `dev:web` scripts to root `package.json`

## 2. Tailwind CSS + PostCSS Setup

- [ ] 2.1 Install Tailwind CSS, PostCSS, Autoprefixer: `tailwindcss`, `postcss`, `autoprefixer`
- [ ] 2.2 Create `web/tailwind.config.js` scanning `web/src/**/*.{js,jsx,ts,tsx}`
- [ ] 2.3 Create `web/postcss.config.js` with Tailwind and Autoprefixer plugins
- [ ] 2.4 Create `web/src/index.css` with Tailwind `@tailwind base/components/utilities` directives
- [ ] 2.5 Import `index.css` in the web app entry point

## 3. Radix UI Installation

- [ ] 3.1 Install Radix UI packages: `@radix-ui/react-button`, `@radix-ui/react-tabs`, `@radix-ui/react-scroll-area`, `@radix-ui/react-dialog`, `@radix-ui/react-popover`
- [ ] 3.2 Verify Radix components are importable from the web app

## 4. Web App Entry Point

- [ ] 4.1 Create `web/src/main.jsx` that renders the React app into `#root`
- [ ] 4.2 Create `web/src/App.jsx` as the root component importing the Zustand store
- [ ] 4.3 Verify the app mounts and the store tick interval runs via `useEffect` + `setInterval`

## 5. Stats Panel Component

- [ ] 5.1 Create `web/src/components/StatsPanel.jsx` with Radix UI Button for tick rate upgrade
- [ ] 5.2 Subscribe to store selectors: `pagesGenerated`, `money`, `pps`, `tickRateLevel`, `tickRateCost`
- [ ] 5.3 Format values using `formatPageNumber`, `formatMoney`, `formatNumber` from `../../src/format.js`
- [ ] 5.4 Wire the tick rate upgrade button to `useGameStore.getState().upgradeTickRate()`

## 6. Workers Panel Component

- [ ] 6.1 Create `web/src/components/WorkersPanel.jsx` with Radix UI Buttons for hire actions
- [ ] 6.2 Subscribe to store selectors: `workers`, `canAfford`
- [ ] 6.3 Import `TIERS` and `getWorkerCost` from `../../src/config.js`
- [ ] 6.4 Render all 7 tiers with count, cost, and hire button (enabled/disabled by affordability)
- [ ] 6.5 Wire hire buttons to `useGameStore.getState().hire(tierId)`

## 7. Storage Scale Panel Component

- [ ] 7.1 Create `web/src/components/StorageScalePanel.jsx`
- [ ] 7.2 Subscribe to `pagesGenerated` and compute scale via `computeStorageScale` from `../../src/storageScale.js`
- [ ] 7.3 Render each tier with emoji, name, and formatted count

## 8. Event Log Panel Component

- [ ] 8.1 Create `web/src/components/LogPanel.jsx` using Radix UI ScrollArea
- [ ] 8.2 Subscribe to `log` selector and render entries newest-first with timestamp and message
- [ ] 8.3 Style scroll area with Tailwind for fixed height with scroll overflow

## 9. Latest Page Panel Component

- [ ] 9.1 Create `web/src/components/LatestPagePanel.jsx`
- [ ] 9.2 Subscribe to `currentPage` and `latestPage` selectors
- [ ] 9.3 Display page number (formatted) and wrap the 280-character content to fit the panel width
- [ ] 9.4 Apply visual styling (bordered card, monospace font for page content)

## 10. Search Dialog Component

- [ ] 10.1 Create `web/src/components/SearchDialog.jsx` using Radix UI Dialog
- [ ] 10.2 Implement text input for query, submit on Enter, and close on Escape
- [ ] 10.3 On submit, call `queryToPageAddress` from `../../src/page.js` and resolve page content via `stateToPage`
- [ ] 10.4 Display "found" result with page address, location (via `locationFromPageOffset`), and content
- [ ] 10.5 Display "not found" result when page address exceeds `pagesGenerated`
- [ ] 10.6 Add a search trigger button/icon to the main App layout

## 11. Dashboard Layout Assembly

- [ ] 11.1 Assemble all panels in `App.jsx` with responsive grid/flex layout matching the TUI structure
- [ ] 11.2 Top row: StatsPanel (left) + StorageScalePanel (right)
- [ ] 11.3 Bottom row: WorkersPanel (left) + LogPanel + LatestPagePanel (right)
- [ ] 11.4 Apply Tailwind responsive classes for viewport adaptation
- [ ] 11.5 Add search dialog trigger to the header or a corner of the layout

## 12. Build and GitHub Pages Configuration

- [ ] 12.1 Run `npm run build:web` and verify `web/dist/` output
- [ ] 12.2 Create `web/dist/.nojekyll` via a post-build step or manual creation
- [ ] 12.3 Add `web/dist/` to `.gitignore` exception (it should be committed)
- [ ] 12.4 Test the static build by serving `web/dist/` with a local static server
- [ ] 12.5 Verify the app works correctly when served statically (no build server)
