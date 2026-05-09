## Why

The game currently ticks at 20 ticks/second (50ms interval), making progress feel instant and removing the core idle-game loop of anticipating growth. Idle games thrive on meaningful upgrade paths that let players feel their investments compound over time. By starting slow and giving players a powerful upgrade to speed up the game, we create a satisfying progression arc: earn money slowly, invest in the tick rate upgrade, and watch progress accelerate.

## What Changes

- Change the game's initial tick interval from 50ms (20 ticks/sec) to 1000ms (1 tick/sec)
- Add a new "Tick Rate Upgrade" system that reduces tick interval by 50ms per purchase
- Cap the tick rate at 30 ticks/second (~33.33ms interval) as the maximum achievable speed
- The tick rate upgrade cost scales exponentially with each purchase
- Add UI to display current tick rate and the cost/preview of the upgrade
- Update config constants and game state to track tick rate level and upgrade cost

## Capabilities

### New Capabilities
- `tick-rate-upgrade`: Configurable tick rate system with upgradeable speed, starting at 1 tick/sec and maxing at 30 ticks/sec with escalating purchase cost

### Modified Capabilities
- (none)

## Impact

- `src/config.js` — Update `TICK_INTERVAL` default, add tick rate config constants
- `src/game.js` — Add tick rate state fields (`tickRateLevel`, `tickRateCost`) to game state; expose tick rate info
- `src/index.jsx` — Replace hardcoded 50ms tick interval with dynamic interval; add tick rate upgrade purchase handler; add keybind for purchasing tick rate upgrade
- `src/ui.jsx` — Add tick rate display to StatsPanel; add tick rate upgrade info to WorkersPanel or StatsPanel
