import { For, useContext } from 'solid-js';
import { LOG_MAX_ENTRIES } from '@game/config';
import { GameContext } from '../game';

export function LogPanel() {
  const game = useContext(GameContext);

  return (
    <div class="border border-yellow-500/50 rounded-lg p-3 bg-gray-900/50 flex flex-col h-full">
      <h2 class="text-sm font-semibold text-yellow-400 mb-2">📋 Event Log</h2>
      <div class="flex-1 max-h-48 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-gray-600)_transparent]">
        <div class="space-y-1 pr-2">
          <For
            each={game.state.log.slice(0, LOG_MAX_ENTRIES)}
            fallback={<p class="text-xs text-gray-500">Starting up...</p>}
          >
            {entry => (
              <div class="text-xs">
                <span class="text-gray-500 font-mono">{entry.timestamp}</span>{' '}
                <span class="text-gray-300">{entry.message}</span>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
