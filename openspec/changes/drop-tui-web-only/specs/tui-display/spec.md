## REMOVED Requirements

### Requirement: Dashboard layout

**Reason**: The Ink terminal dashboard is removed; layout is specified under `web-display`.

**Migration**: Use the Vite web app (`web/src/App.tsx` and `web/src/components/`) as the only UI.

### Requirement: Page content wrapping

**Reason**: Terminal panel wrapping is obsolete; web Latest Page uses browser layout.

**Migration**: See `web-display` Latest page text wrapping requirement.

### Requirement: Workers panel doubling display

**Reason**: TUI Workers panel removed; doubling display is covered for the web Workers panel.

**Migration**: See `web-display` Workers panel doubling display requirement.

### Requirement: Number formatting

**Reason**: Normative number-formatting rules live in `ui-number-formatting`; TUI-specific duplication is removed with the terminal UI.

**Migration**: Apply `openspec/specs/ui-number-formatting/spec.md` to web components.

### Requirement: Real-time updates

**Reason**: 10fps Ink refresh is replaced by React rendering tied to the store.

**Migration**: See `web-display` React-driven updates requirement.

### Requirement: Event log management

**Reason**: TUI log panel removed; bounded log behavior remains store-driven and is reflected in web UI.

**Migration**: See `web-display` Log bounded size requirement.

### Requirement: Page number formatting with commas

**Reason**: Requirement was framed for terminal display; formatting is unchanged but enforced via web panels and `ui-number-formatting`.

**Migration**: Use `formatPageNumber` in web panels per `ui-number-formatting`.

### Requirement: UI components have explicit typed props interfaces

**Reason**: `src/ui.tsx` Ink components are deleted; web panels use `web/src/components/*.tsx` with store selectors.

**Migration**: Follow `typescript-types` delta for shared typing; colocate small component-only types in `web/src` if needed.

### Requirement: No JSDoc prop descriptions in UI components

**Reason**: The Ink `ui.tsx` module is removed.

**Migration**: Keep the same documentation rule for any new or remaining shared TSX under `web/src` if codified in `typescript-types`.

### Requirement: TUI App component uses typed state selectors

**Reason**: `src/index.tsx` Ink app is removed.

**Migration**: `web/src/App.tsx` SHALL use typed Zustand selectors per the `typescript-types` delta.
