## Why

As players create more pages, the game's total data size grows silently without feedback. Players don't understand the scale of what they're building — it's fun to see your progress framed as filling up server farms, galaxies, and universes. This adds flavor and a sense of cosmic scale to page accumulation.

## What Changes

- Add a new display component that shows total pages as a chain of escalating storage tiers
- Display the following hierarchy:
  1. Enterprise-sized hard drives (32 TiB each = ~125.7 billion pages each)
  2. Servers with 20 drives each
  3. Server racks with 10 servers per rack
  4. Server floors with 100 racks per floor
  5. Buildings with 100 floors per building
  6. Cities with 1,000,000 buildings per city
  7. Planets with 1,000,000 cities per planet
  8. Solar systems with 10 planets per system
  9. Galaxies with 1,000,000,000,000 star systems per galaxy
  10. Universes with 1,000,000,000,000 galaxies per universe
- Each tier is calculated by dividing the previous tier's count by the multiplier, with floor division for whole units and remainder carried over
- The display updates reactively as pages are created

## Capabilities

### New Capabilities
- `storage-scale-display`: Progressive display of total page count as escalating storage hierarchy from hard drives to universes, using fixed multipliers at each tier

### Modified Capabilities
- `page-generation`: The page creation flow now feeds into the storage scale calculation, and the game store may reference the total page count for scale-dependent content

## Impact

- New UI component for the storage scale display
- New store/slice or derived state for computing the storage hierarchy from total page count
- Existing `page-generation` capability's output (total pages) is consumed by the new capability
- Minimal performance impact — computation is simple integer arithmetic triggered on page count changes
