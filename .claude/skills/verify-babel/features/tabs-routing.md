# Tabs and routing

The game shows one section at a time on every screen size. The tab bar (Workers, Upgrades, Library, Log, Achievements, Settings) is at the bottom on a phone and in a row under the HUD at desktop width (≥1024px). On mobile each tab is an icon; its text label is still in the DOM but visually hidden (`sr-only`). Select tabs by `data-tab`. The current tab and the map position live in the URL hash, so reloads, shared links and back/forward all restore the view. The Upgrades tab carries a badge with the number of buyable upgrades.

## Sub-features

- `tabs-switch` switches sections from the tab bar and marks the current tab with `aria-current="page"`.
- `route-hash` writes the tab to the URL as `#/<tab>`. The Workers default is an empty hash.
- `route-history` restores earlier tabs with the browser's Back and Forward.
- `route-deep-link` opens the tab and map state a link names, e.g. `#/library?follow=volume` or `?view=serverRack.12`. Malformed links fall back to defaults.
- `tabs-badge` shows `[data-tab-badge]` on Upgrades with the count of buyable upgrades.

## How to get to it (user POV)

- The tab bar (`nav[aria-label="Sections"]`): at the bottom on a phone, under the HUD on desktop.
- Typing or pasting a URL with a hash, or using the browser's Back and Forward.

## Driving it with babel.mjs

Preconditions:

- `node babel.mjs doctor` exits 0.
- Either viewport works. Run both when changing the tab bar's layout.

- **Default.** Run `t.open()`. `[data-tab][aria-current="page"]` is `workers`, and the only visible `section[data-panel]` is `workers`.
- **Switch.** Click `button[data-tab="upgrades"]`. The hash becomes `#/upgrades`, and only `upgrades` is visible. Then click `log`, `achievements` and `settings` in turn. Each sets `#/<tab>` and shows only its own section.
- **Back.** Run `t.page.evaluate(() => history.back())` three times to reach `#/upgrades` (upgrades visible), then once more for an empty hash (workers visible).
- **Deep link.** Run `t.open('#/library?follow=volume')`. The Library tab is current, `button[data-follow]` has `aria-pressed="true"`, and `[data-map-title]` is a `Volume …`.
- **Badge.** After `t.seed('rich')`, `button[data-tab="upgrades"] [data-tab-badge]` is 2 or more.
- **Run it.** `node babel.mjs run tabs-routing --viewport mobile` (and `desktop`).
- **Proof.** `artifacts/<run>/tabs-routing/transcript.md`, `01-upgrades-tab.png`, `02-settings-tab.png`, `03-deep-link.png`.

## Gotchas

- puppeteer `page.goBack()` hangs on these same-document entries. Use `history.back()`.
- "Hidden" means Tailwind's `hidden` class. Use `checkVisibility()` (`t.visible`), not `offsetParent` or the class name.
- The Settings tab (`#/settings`) also holds the Save panel.
- Following at page level is the default and is not written to the URL. `follow=page` is equivalent to no `follow` parameter.
