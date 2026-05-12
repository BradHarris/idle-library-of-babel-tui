## Why

The game's `STORAGE_TIERS` hierarchy (hard drives → servers → racks → floors → buildings → cities → planets → solar systems → galaxies → universes) defines a rich spatial structure, but there's no way to compute which location a given page number belongs to, or what page offset a given location maps to. The page number and the storage hierarchy are mathematically related — each page number encodes a unique position in the hierarchy — but that relationship is not exposed.

## What Changes

- **`pageOffsetFromLocation(location)`**: Given a location tuple (drive, server, rack, floor, building, city, planet, solarSystem, galaxy), compute the starting page number for that location.
- **`locationFromPageOffset(pageOffset)`**: Given a page number, compute its location tuple by decomposing the page count through the storage hierarchy multipliers.
- **Round-trip correctness**: `pageOffsetFromLocation(locationFromPageOffset(n)) === n` and `locationFromPageOffset(pageOffsetFromLocation(loc)) === loc` for all valid inputs.

## Capabilities

### New Capabilities
- `page-location-math`: Bidirectional conversion between page numbers and storage hierarchy location tuples using mixed-radix decomposition over STORAGE_TIERS multipliers

### Modified Capabilities
- *(none — this is pure math addition, no existing behavior changes)*

## Impact

- **`src/storageScale.js`**: Add two new exported functions alongside existing `computeStorageScale`. Both use bigint arithmetic.
- **`src/storageScale.test.js`**: Add tests for round-trip correctness, boundary conditions, and identity cases.
- No changes to `page.js`, `gameStore.ts`, `config.js`, or UI components.
- No new dependencies.
