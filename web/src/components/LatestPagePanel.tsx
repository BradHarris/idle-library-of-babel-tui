import { For, useContext } from 'solid-js';
import { formatPageNumber, wrapText } from '@game/format';
import { GameContext } from '../game';

const WRAP_WIDTH = 30;

export function LatestPagePanel() {
  const game = useContext(GameContext);

  return (
    <div class="border border-blue-500/50 rounded-lg p-3 bg-gray-900/50 flex flex-col h-full">
      <h2 class="text-sm font-semibold text-blue-400 mb-2">
        📄 Page {formatPageNumber(game.state.currentPage)}
      </h2>
      <div class="font-mono text-xs text-gray-300 whitespace-pre-wrap break-all leading-relaxed flex-1">
        <For each={wrapText(game.latestPage(), WRAP_WIDTH)} keyed={false}>
          {line => <div>{line()}</div>}
        </For>
      </div>
    </div>
  );
}
