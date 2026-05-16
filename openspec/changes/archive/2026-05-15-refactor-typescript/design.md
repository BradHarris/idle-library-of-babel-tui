## Context

The project is a terminal-based idle/incremental game with a web frontend sharing the same game logic. Currently, only `src/stores/gameStore.ts` uses TypeScript, with inline interfaces for `LogEntry`, `HireResult`, `GameState`, and `GameActions`. All other source files are plain JavaScript (.js/.jsx) with JSDoc annotations for type hints. The project already uses `tsx` as its runtime (which supports TypeScript natively) and has `@types/react` installed. There is no `tsconfig.json`.

The existing Vite config already defines a `@game` path alias pointing to `../src`, which the web frontend uses to import game logic. This alias must be mirrored in `tsconfig.json`.

## Goals / Non-Goals

**Goals:**
- Convert all source files to TypeScript (.ts/.tsx) with strict type checking
- Centralize shared type definitions in a dedicated types module usable by both TUI and web frontends
- Add a `tsconfig.json` with strict mode and path aliases
- Replace all JSDoc type annotations with TypeScript type annotations
- Add a `typecheck` script to `package.json` for CI/local validation
- Preserve all existing runtime behavior — this is a mechanical type addition, not a behavior change

**Non-Goals:**
- Changing any runtime logic, algorithms, or game mechanics
- Adding new features or capabilities
- Restructuring the module dependency graph
- Converting the Vite web build to use `tsc` (Vite handles TS transpilation natively)
- Adding runtime type validation libraries (e.g., zod) — static types only

## Decisions

### Decision 1: Centralized types module at `src/types.ts`

Create a single `src/types.ts` file exporting all shared type definitions. This avoids type duplication between the TUI and web frontends and ensures a single source of truth.

**Type categories:**
- **Game config types**: `Tier` (worker tier definition), `StorageTier` (storage scale tier), `TierId` (union of tier IDs), `StorageTierId` (union of storage tier IDs)
- **Game state types**: `GameState`, `InitialGameState` (subset returned by `createInitialState`), `LogEntry`, `HireResult`
- **UI prop types**: `StatsPanelProps`, `LatestPagePanelProps`, `WorkersPanelProps`, `LogPanelProps`, `StorageScalePanelProps`, `SearchOverlayProps`
- **Search types**: `SearchResult` (discriminated union of `found` | `notFound`)
- **Utility types**: `GameActions` (Zustand store actions)

**Alternatives considered:**
- *Inline types in each file*: Rejected — duplicates types across TUI and web, violates DRY
- *Multiple type files (e.g., `types/game.ts`, `types/ui.ts`)*: Rejected — over-engineering for ~20 types; a single file is simpler and sufficient

### Decision 2: `tsconfig.json` with strict mode and path aliases

Use `strict: true` for comprehensive type checking. Enable `noUncheckedIndexedAccess` for safe Record access. Use `paths` to define the `@game/*` alias matching the Vite config.

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["ES2022"],
    "paths": { "@game/*": ["./src/*"] },
    "baseUrl": ".",
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "web/src/**/*.tsx"],
  "exclude": ["node_modules", "web/dist"]
}
```

**Key choices:**
- `noEmit: true` — TSC is used only for type checking; `tsx` handles runtime execution
- `moduleResolution: "bundler"` — matches the Vite/Vitest bundler resolution for the `@game` alias
- `jsx: "react-jsx"` — matches React 19+'s automatic JSX runtime

**Alternatives considered:**
- *`moduleResolution: "node"`*: Rejected — doesn't resolve path aliases without additional tooling
- *Separate tsconfig for web*: Rejected — a single config with `"include"` covering both `src/` and `web/src/` is simpler and ensures type consistency

### Decision 3: File-by-file conversion preserving module boundaries

Convert files one at a time in dependency order (leaf modules first):
1. `src/types.ts` (new)
2. `src/lcg.ts` (no game deps)
3. `src/config.ts` (imports nothing from src besides lcg)
4. `src/format.ts` (imports nothing)
5. `src/page.ts` (imports lcg)
6. `src/storageScale.ts` (imports config)
7. `src/stores/gameStore.ts` (already .ts; update imports and use shared types)
8. `src/ui.tsx` (imports config, format, storageScale — pure components)
9. `src/index.tsx` (imports all above)
10. Test files: `src/*.test.ts`
11. `web/vite.config.ts`, `web/src/main.tsx`, `web/src/App.tsx`, web components

This order ensures we never break imports during conversion.

**Key patterns during conversion:**
- Replace `@param {Type} name` JSDoc with TypeScript parameter types
- Replace `@returns {Type}` JSDoc with TypeScript return types
- Replace `@type` inline JSDoc annotations with proper TypeScript type annotations
- Import types from `./types.js` (note: `.js` extension because `tsx` with `moduleResolution: "bundler"` resolves TS imports with `.js` extensions)
- Use `import type` for type-only imports

### Decision 4: BigInt-aware type definitions

The project uses `bigint` extensively for page numbers and LCG math. TypeScript handles `bigint` natively, so no special handling is needed. However, `GameState` contains both `number` and `bigint` fields — these must be carefully typed to avoid accidental mixing.

**Risk**: Some functions (e.g., `formatPageNumber`) accept `bigint | string | number`. Use explicit union types rather than `any` or overloaded signatures.

### Decision 5: Zustand store typing pattern

The existing store uses `immer` middleware with Zustand's `create<GameState & GameActions>()`. This pattern works and will be preserved. The `GameState` and `GameActions` interfaces will move to `src/types.ts` and be imported. The immer `set` callback receives a `WritableDraft<GameState>` — Zustand+immer types handle this automatically.

## Risks / Trade-offs

- **Risk: Strict mode reveals type errors in existing code** → Mitigation: Fix all type errors during conversion; if any are ambiguous, use explicit type assertions with comments
- **Risk: Import extensions (.js vs .ts) cause resolution issues** → Mitigation: Use `.js` extensions in imports (standard for ESM TypeScript with bundler resolution); test with `tsx` and Vite after conversion
- **Risk: NoUncheckedIndexedAccess causes verbose code with Record lookups** → Mitigation: Accept the verbosity; it prevents runtime undefined access bugs that currently exist in the JSDoc-only code
- **Risk: Test files break with .ts extension** → Mitigation: `tsx` can run `.test.ts` files directly; verify the test command still works
- **Trade-off: Single types.ts vs. co-located types** → A single file is chosen for discoverability, though co-located types per module would be more modular. For ~20 types, the single-file approach is pragmatic and can be split later if the project grows
