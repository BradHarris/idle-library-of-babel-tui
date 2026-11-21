import { For, createMemo, useContext } from 'solid-js';
import { computeStorageScale } from '@game/storageScale';
import { formatNumber } from '@game/format';
import { GameContext } from '../game';

export function StorageScalePanel() {
  const game = useContext(GameContext);
  const scale = createMemo(() => computeStorageScale(game.state.pagesGenerated));

  return (
    <div class="border border-cyan-500/50 rounded-lg p-3 bg-gray-900/50">
      <h2 class="text-sm font-semibold text-cyan-400 mb-2">📦 Storage Scale</h2>
      <div class="space-y-1 text-sm">
        <For each={scale()} keyed={false}>
          {tier => (
            <div class="flex items-center gap-2">
              <span class="text-base">{tier().emoji}</span>
              <span class="text-gray-400 flex-1 truncate">{tier().name}</span>
              <span class="text-white font-mono">{formatNumber(Number(tier().count))}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
