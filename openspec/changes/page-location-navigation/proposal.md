## Why

The storage scale display already defines a rich spatial hierarchy (hard drives → servers → racks → floors → buildings → cities → planets → solar systems → galaxies → universes), but the pages section currently ignores this hierarchy entirely. Players see only a single flat sequence of pages with no sense of place, and have no way to explore or navigate this escalating world structure. This change gives the world depth, meaning, and exploration.

## What Changes

- **Location context display**: The pages section (StatsPanel and/or LatestPagePanel) will show the player's current location at every level of the storage hierarchy — e.g., "Building 42, Floor 7, Rack 3, Server 12, Drive 5"
- **Location navigation UI**: Players can press keys to navigate up or down the hierarchy (e.g., scroll through servers on the current floor, move between floors, move between buildings, etc.)
- **Deterministic page content per location**: Page generation seeds incorporate the current location in the hierarchy, so the same page number on the same server always shows identical content. A page viewed on a different server or floor will show different (but still deterministic) content.
- **Location state in game store**: New state fields track the current location (drive index, server index, rack index, floor index, building index, etc.) alongside the existing page state.

## Capabilities

### New Capabilities

- `page-location`: Deterministic page content based on current location in the storage hierarchy, using location-aware seeding in the PRNG pipeline
- `location-navigation`: UI and controls for navigating up/down the storage hierarchy (hard drives → servers → racks → floors → buildings → cities → planets → solar systems → galaxies)

### Modified Capabilities

- `page-generation`: Page content generation now incorporates location context in addition to page number. The seed derivation function gains a location parameter.

## Impact

- **src/page.js**: `generatePage()` function signature changes to accept location context (or a location-derived seed component). Mulberry32 seeding updated to combine page number + location hash.
- **src/stores/gameStore.ts**: New state fields for current location indices across the storage hierarchy. Location navigation actions.
- **src/ui.jsx**: `StatsPanel` and/or `LatestPagePanel` updated to display current location. Navigation key bindings added.
- **src/config.js**: `STORAGE_TIERS` already defined; may add navigation-related constants (e.g., max index per tier for display purposes).
- **src/format.js**: May add a `formatLocation()` helper for displaying the full location path.
- **Breaking**: `generatePage(pageNum)` → `generatePage(pageNum, location)` — signature change for page generation.
