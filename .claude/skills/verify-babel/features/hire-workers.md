# Hire workers

The player spends money to hire workers in seven tiers. Writers make pages, and each higher tier makes workers of the tier below. Each hire raises that tier's next price, and the hire survives a save and reload.

## Sub-features

- `hire-one` hires one worker of a tier in 1× mode.
- `hire-price` raises the next price after a hire (base × growth^hired).
- `hire-disabled` disables the hire button when the player can't afford it.
- `hire-modes` toggles 1×/Next/Max. Next and Max stay locked until their achievements ("Writers' Room", "Middle Management") unlock.
- `hire-persist` keeps hired counts through Save and reload.

## How to get to it (user POV)

- Desktop: the Workers section in the left column.
- Mobile: tap the `Workers` tab (the default route, empty hash).

## Driving it with babel.mjs

Preconditions:

- `node babel.mjs doctor` exits 0.
- Fresh profile for the locked/disabled checks. `t.seed('rich')` for affordable hires.

- **Fresh state.** Run `t.open()`. `li:has(> button[data-tier="writer"]) [data-count]` reads `1`. `button[data-tier="manager"]` is disabled. `button[data-hire-mode="max"]` is disabled.
- **Hire one.** After `t.seed('rich')`, click `button[data-tier="manager"]`. Its row's `p > span:first-child` reads `1 hired`, and the button text goes from `Hire$80` to `Hire$96`.
- **Persist.** Click `button[data-save="now"]`. `t.stored().state.playerWorkers.manager === 1`. After `t.open()`, the Manager row still reads `1 hired`.
- **Run it.** `node babel.mjs run hire-workers`.
- **Proof.** `artifacts/<run>/hire-workers/transcript.md` and `01-before-hire.png`, `02-after-hire.png`, `03-after-reload.png`.

## Gotchas

- Money rises every tick, so assert on hired counts and prices, not on exact money.
- The first Manager hire unlocks "Middle Management", which unlocks Max, and a toast appears. Seeding `rich` unlocks "Writers' Room" (Next) and "A Million Pages".
- A tier's row only shows `N hired` and `[data-output]` once its total count is above 0.
- The Hire button label changes to `×N` in Next/Max mode when N > 1.
