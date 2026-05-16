## Why

The project currently uses plain JavaScript (.js/.jsx) for most source files with JSDoc annotations, while only `src/stores/gameStore.ts` uses TypeScript. This mixed approach creates an inconsistent codebase where types are documented informally, no static type checking exists for ~85% of the source, and refactoring across files carries high risk of introducing bugs. Converting the full project to TypeScript provides compile-time safety, better IDE tooling, self-documenting interfaces shared between the TUI and web frontends, and a foundation for future feature development.

## What Changes

- **BREAKING**: Rename all `.js` / `.jsx` source files to `.ts` / `.tsx`
- Extract and centralize all shared type definitions (worker tiers, game state, log entries, hire results, storage scale, search results) into dedicated type modules
- Add a `tsconfig.json` with strict mode, path aliases matching the existing Vite aliases
- Convert `src/config.js` → `src/config.ts` with explicit type exports for `Tier`, `GameState`, `StorageTier`, etc.
- Convert `src/lcg.js` → `src/lcg.ts` with typed bigint operations
- Convert `src/page.js` → `src/page.ts` with typed page generation functions
- Convert `src/format.js` → `src/format.ts` with typed formatting utilities
- Convert `src/storageScale.js` → `src/storageScale.ts` with typed location math
- Convert `src/ui.jsx` → `src/ui.tsx` with typed component props interfaces
- Convert `src/index.jsx` → `src/index.tsx` with typed App component
- Convert `src/stores/gameStore.ts` → enhanced with types from the new type modules instead of inline interfaces
- Convert all test files from `.test.js` → `.test.ts`
- Convert web source files (`web/src/`) from `.jsx` → `.tsx`
- Update `vite.config.js` → `vite.config.ts` with typed config
- Update `package.json` scripts to reference new `.ts`/`.tsx` entry points and add type-check script
- Remove JSDoc type annotations (replaced by TypeScript types)

## Capabilities

### New Capabilities

- `typescript-types`: Centralized, well-structured TypeScript type definitions shared across the entire project, covering game state, worker tiers, storage scale, page generation, formatting, UI component props, and search operations.

### Modified Capabilities

- `game-store`: Type definitions move from inline interfaces in gameStore.ts to the shared types module; store retains same behavior but imports types from the new module.
- `idle-economy`: Worker tier types and configuration move to shared types; existing logic preserved with TypeScript enforcement.
- `tui-display`: UI component props become explicit TypeScript interfaces rather than implicit props.
- `ui-number-formatting`: Formatting function signatures become explicitly typed.
- `page-generation`: LCG and page generation functions become explicitly typed with bigint parameter and return types.
- `storage-scale-display`: Storage scale computation and location math become explicitly typed.
- `page-location-math`: Location tuple types become explicitly defined.
- `phrase-search`: Search result types become explicitly defined in shared types.
- `lcg-page-generation`: LCG math operations become explicitly typed.

## Impact

- **Affected code**: All source files in `src/`, `web/src/`, and `web/vite.config.js` (renamed + type-annotated)
- **Affected config**: New `tsconfig.json`, updated `package.json` scripts, `web/vite.config.ts`
- **Build pipeline**: `tsx` already supports TypeScript, so no new runtime dependency needed; add `typescript` as devDependency for `tsc --noEmit` type-checking
- **Testing**: Test files converted to `.test.ts`; test runner should be verified compatible
- **Dependencies**: Add `typescript` devDependency; existing `@types/react` already present
