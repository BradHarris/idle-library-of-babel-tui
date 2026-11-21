import { For, Match, Switch, createSignal, useContext } from 'solid-js';
import { searchLibrary } from '@game/search';
import { formatPageNumber, formatLocationDisplay, wrapText } from '@game/format';
import type { SearchResult } from '@game/types';
import { GameContext } from '../game';

export function SearchDialog() {
  const game = useContext(GameContext);
  const [result, setResult] = createSignal<SearchResult | null>(null);
  let dialog!: HTMLDialogElement;
  let input!: HTMLInputElement;

  const open = () => {
    dialog.showModal();
    input.focus();
  };

  const search = () => {
    const found = searchLibrary(input.value, game.state.pagesGenerated);
    if (found) setResult(found);
  };

  // Fires for the Close button and for Escape, so state resets either way
  const onClose = () => {
    setResult(null);
    input.value = '';
  };

  const found = () => {
    const r = result();
    return r?.type === 'found' ? r : undefined;
  };
  const notFound = () => {
    const r = result();
    return r?.type === 'notFound' ? r : undefined;
  };

  return (
    <>
      <button
        onClick={open}
        class="px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors cursor-pointer"
      >
        🔍 Search
      </button>

      <dialog
        ref={dialog}
        onClose={onClose}
        onClick={e => {
          // A click on the backdrop lands on the dialog element itself
          if (e.target === e.currentTarget) dialog.close();
        }}
        class="m-auto w-full max-w-lg bg-gray-900 text-gray-100 border border-cyan-500/50 rounded-xl shadow-2xl p-6 outline-none backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <h2 class="text-lg font-bold text-cyan-400 mb-4">🔍 Search the Library</h2>

        <div class="flex gap-2 mb-4">
          <input
            ref={input}
            type="text"
            onKeyDown={e => {
              if (e.key === 'Enter') search();
            }}
            placeholder="Enter a phrase to search..."
            class="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={search}
            class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded font-medium transition-colors cursor-pointer"
          >
            Search
          </button>
        </div>

        <Switch>
          <Match when={found()}>
            {r => (
              <div class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-400">Page:</span>
                  <span class="text-green-400 font-mono">{formatPageNumber(r().address)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Location:</span>
                  <span class="text-green-400">{formatLocationDisplay(r().location)}</span>
                </div>
                <div>
                  <span class="text-gray-400 block mb-1">Content:</span>
                  <div class="font-mono text-xs text-gray-300 bg-gray-800 rounded p-2 whitespace-pre-wrap break-all leading-relaxed">
                    <For each={wrapText(r().content, 55)} keyed={false}>
                      {line => <div>{line()}</div>}
                    </For>
                  </div>
                </div>
              </div>
            )}
          </Match>
          <Match when={notFound()}>
            {r => (
              <div class="space-y-2 text-sm">
                <p class="text-yellow-400 font-medium">Not yet discovered</p>
                <div class="flex justify-between">
                  <span class="text-gray-400">Target page:</span>
                  <span class="text-yellow-400 font-mono">{formatPageNumber(r().address)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Pages generated:</span>
                  <span class="text-gray-400 font-mono">{formatPageNumber(r().pagesGenerated)}</span>
                </div>
              </div>
            )}
          </Match>
        </Switch>

        <div class="mt-4 flex justify-end">
          <button
            onClick={() => dialog.close()}
            class="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
