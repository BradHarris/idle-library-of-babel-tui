import { For, Show, createMemo, useContext } from 'solid-js';
import { computeStorageScale } from '@game/storageScale';
import { formatNumber } from '@game/format';
import { GameContext } from '../game';

export function StorageScalePanel() {
  const game = useContext(GameContext);
  const scale = createMemo(() => computeStorageScale(game.state.pagesGenerated));
  /** Tiers already filled, largest first. */
  const filled = createMemo(() => scale().filter(t => t.count > 0n).reverse());
  /** The smallest tier not yet reached: the next goal. */
  const next = createMemo(() => scale().find(t => t.count === 0n));

  return (
    <div>
      <h2 class="section-title mb-2">Storage</h2>
      <ul class="divide-y divide-rule border-y border-rule text-sm">
        <For each={filled()} keyed={false}>
          {tier => (
            <li class="flex items-baseline justify-between gap-3 py-2">
              <span>{tier().name}</span>
              <span class="font-mono tabular-nums">{formatNumber(Number(tier().count))}</span>
            </li>
          )}
        </For>
        <Show when={next()}>
          {tier => (
            <li class="flex items-baseline justify-between gap-3 py-2 text-ink-muted italic">
              <span>Next: {tier().name}</span>
              <span class="font-mono not-italic">—</span>
            </li>
          )}
        </Show>
      </ul>
    </div>
  );
}
