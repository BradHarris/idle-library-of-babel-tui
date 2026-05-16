## ADDED Requirements

### Requirement: Search result uses typed discriminated union
The search result state in `src/index.tsx` SHALL use the `SearchResult` discriminated union type from `../types.js` instead of `null` or untyped objects. The `setSearchResult` state setter SHALL accept `SearchResult | null`.

#### Scenario: SearchResult type is imported
- **WHEN** the `index.tsx` file is inspected
- **THEN** `SearchResult` is imported from `../types.js`

#### Scenario: Search state uses typed union
- **WHEN** the search result state is typed
- **THEN** it uses `SearchResult | null` with explicit type annotation on `useState`

#### Scenario: Search overlay prop is typed
- **WHEN** `SearchOverlay` receives `searchResult`
- **THEN** TypeScript verifies the prop type as `SearchResult | null` from `SearchOverlayProps`
