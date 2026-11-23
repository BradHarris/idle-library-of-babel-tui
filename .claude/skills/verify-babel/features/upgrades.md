# Upgrades

The player buys upgrades that multiply output. "Faster" can be bought again and again. One-off upgrades unlock when a requirement is met (hire N of a tier, or fill a storage container) and leave the shop once bought.

## Sub-features

- `upgrade-locked` lists locked upgrades with their requirement and a progress bar.
- `upgrade-speed` buys Faster, which increments its level and adds `faster lv.N` to the HUD output line.
- `upgrade-buy` buys a one-off upgrade, which disappears from the shop, raises `[data-upgrade-count]` and is saved.
- `upgrade-unaffordable` disables cards the player can't afford.

## How to get to it (user POV)

- Desktop: the Upgrades section at the top of the left column.
- Mobile: tap the `Upgrades` tab (`#/upgrades`). The tab shows a badge with the number of buyable upgrades.

## Driving it with babel.mjs

Preconditions:

- `node babel.mjs doctor` exits 0.
- `t.seed('rich')`: 25 writers unlock `writer-25` (Sharper Quills), and $1B affords it and Faster.

- **Locked.** On a fresh profile, `li[data-upgrade-id="writer-25"][data-upgrade-state="locked"] [data-requirement]` reads `Hire 25 writers`, and `button[data-upgrade-id="speed"]` is disabled.
- **Buy Faster.** After seeding, click `button[data-upgrade-id="speed"][data-upgrade-state="available"]`. Its text changes to `Faster (level 2)`, and `t.hud().output` contains `faster lv.1`.
- **Buy Sharper Quills.** Click `button[data-upgrade-id="writer-25"][data-upgrade-state="available"]`. It leaves the DOM, and `[data-upgrade-count]` reads `1/34`.
- **Persist.** Click `button[data-save="now"]`. `t.stored().state.upgrades` includes `writer-25`, and `speedLevel === 1`.
- **Run it.** `node babel.mjs run upgrades`.
- **Proof.** `artifacts/<run>/upgrades/transcript.md`, `01-before.png`, `02-after.png`.

## Gotchas

- Faster is not counted in `[data-upgrade-count]`, which counts one-off upgrades only.
- The locked list shows only the next locked upgrade per group, not all of them.
- The total (`/34`) changes when upgrades are added. Assert the `1/` prefix.
