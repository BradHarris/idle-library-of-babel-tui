import { For, useContext } from 'solid-js';
import { LOG_MAX_ENTRIES } from '@game/config';
import { GameContext } from '../game';

export function LogPanel() {
  const game = useContext(GameContext);

  return (
    <div>
      <h2 class="section-title mb-2">Log</h2>
      <ul class="divide-y divide-rule border-y border-rule text-sm lg:max-h-64 lg:overflow-y-auto">
        <For
          each={game.state.log.slice(0, LOG_MAX_ENTRIES)}
          fallback={<li class="py-2 text-ink-muted italic">Starting up…</li>}
        >
          {entry => (
            <li class="flex gap-3 py-2">
              <span class="shrink-0 font-mono text-xs leading-5 text-ink-muted tabular-nums">{entry.timestamp}</span>
              <span class="min-w-0">{entry.message}</span>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
