import { Show, createMemo, useContext } from 'solid-js';
import { formatPageNumber, formatMoney, formatNumber } from '@game/format';
import { GameContext } from '../game';

export function StatsPanel() {
  const game = useContext(GameContext);
  const canAfford = createMemo(() => game.state.money >= game.state.tickRateCost);
  const effectiveTickRate = createMemo(() =>
    ((1000 / game.tickInterval()) * game.tickSpeedMultiplier()).toFixed(1)
  );

  return (
    <div class="border border-blue-500/50 rounded-lg p-3 bg-gray-900/50">
      <h2 class="text-sm font-semibold text-blue-400 mb-2">📖 Stats</h2>
      <div class="space-y-1 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-400">Pages Generated:</span>
          <span class="text-white font-mono">{formatPageNumber(game.state.pagesGenerated)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Money:</span>
          <span class="text-green-400 font-mono">{formatMoney(game.state.money)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Pages/sec:</span>
          <span class="text-white font-mono">{formatNumber(game.pps())}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-400">Tick rate:</span>
          <span class="font-mono">
            {effectiveTickRate()}/s
            <Show when={game.tickSpeedMultiplier() > 1}>
              <span class="text-yellow-400 text-xs ml-1">(×{game.tickSpeedMultiplier()})</span>
            </Show>
            <Show when={game.state.tickRateLevel > 0}>
              <span class="text-gray-500 text-xs ml-1">lv.{formatNumber(game.state.tickRateLevel)}</span>
            </Show>
          </span>
        </div>
        <button
          onClick={() => game.upgradeTickRate()}
          disabled={!canAfford()}
          class={[
            'w-full mt-2 text-xs px-2 py-1 rounded font-medium transition-colors',
            canAfford()
              ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed',
          ]}
        >
          Tick Rate Upgrade: {formatMoney(game.state.tickRateCost)}
        </button>
      </div>
    </div>
  );
}
