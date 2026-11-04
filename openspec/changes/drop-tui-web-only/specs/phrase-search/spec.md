## MODIFIED Requirements

### Requirement: Search is triggered by hotkey with overlay interface

The system SHALL provide phrase search from the web UI via a dialog or modal triggered from a visible control in the main header (for example the control implemented in `web/src/components/SearchDialog.tsx`). The control SHALL open a text field for the query and an area for results. Activating primary search (e.g. a Search button or Enter in the query field) runs the search; Escape or an explicit Close action dismisses the dialog and clears transient search UI state without mutating unrelated game state.

#### Scenario: Opening search from the header control

- **WHEN** the user activates the search trigger in the header during normal gameplay
- **THEN** the search dialog opens with an empty query field ready for input

#### Scenario: Submitting a search

- **WHEN** the user enters a query and activates search (Enter or explicit submit)
- **THEN** the dialog displays the search result (found or not-found) according to existing lookup rules

#### Scenario: Closing the dialog

- **WHEN** the user dismisses the dialog with Escape or a close affordance
- **THEN** the dialog closes and the main dashboard remains visible

#### Scenario: Game state unchanged aside from search side effects

- **WHEN** the user opens and closes search without hiring or ticking differently
- **THEN** pages generated, money, workers, and other simulation fields behave as if search UI had not been opened except for any intentional future extensions

### Requirement: Search result uses typed discriminated union

Search result state in the web search component SHALL use the `SearchResult` discriminated union type from `@game/types` (or equivalent path to `src/types.ts`). Component state for the active result SHALL be typed as `SearchResult | null`.

#### Scenario: SearchResult type is imported in web search UI

- **WHEN** `web/src/components/SearchDialog.tsx` is inspected
- **THEN** `SearchResult` is imported from the shared types module

#### Scenario: Search state uses typed union

- **WHEN** result state is declared for the dialog
- **THEN** it uses `SearchResult | null` with explicit typing on `useState`

#### Scenario: No SearchOverlay component

- **WHEN** the codebase is inspected for `SearchOverlay`
- **THEN** no Ink `SearchOverlay` component remains in `src/`
