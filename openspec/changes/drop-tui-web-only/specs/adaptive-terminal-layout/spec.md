## REMOVED Requirements

### Requirement: Adaptive terminal layout

**Reason**: No terminal client; responsive layout is browser-based.

**Migration**: See `web-display` Web dashboard layout requirement.

### Requirement: Two-row grid layout structure

**Reason**: Terminal two-row grid and keybind hint row are removed.

**Migration**: See `web-display` layout scenarios for `web/src/App.tsx`.

### Requirement: Proportional panel widths

**Reason**: Character-column proportional layout applied only to the Ink TUI.

**Migration**: Use CSS grid/flex in `web/src/App.tsx` as described in `web-display`.

### Requirement: Resize event handling

**Reason**: `process.stdout` resize handling was TUI-specific.

**Migration**: Browser resize is handled implicitly by CSS layout and React; no terminal listener.
