import { Match, Switch, createSignal, useContext } from 'solid-js';
import { searchLibrary } from '@game/search';
import { formatPageNumber, formatLocationDisplay } from '@game/format';
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
        aria-label="Search the library"
        class="-mr-2 flex size-10 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink"
      >
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      <dialog
        ref={dialog}
        onClose={onClose}
        onClick={e => {
          // A click on the backdrop lands on the dialog element itself
          if (e.target === e.currentTarget) dialog.close();
        }}
        class="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-full overflow-y-auto rounded-t-2xl border border-rule bg-paper p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-ink shadow-2xl outline-none backdrop:bg-ink/40 backdrop:backdrop-blur-sm sm:my-auto sm:max-w-lg sm:rounded-2xl sm:pb-5"
      >
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-serif text-lg italic">Search the Library</h2>
          <button
            onClick={() => dialog.close()}
            aria-label="Close"
            class="-mr-2 flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-paper-deep hover:text-ink"
          >
            <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div class="flex gap-2">
          <input
            ref={input}
            type="search"
            enterkeyhint="search"
            aria-label="Phrase to search for"
            onKeyDown={e => {
              if (e.key === 'Enter') search();
            }}
            placeholder="A phrase…"
            class="min-w-0 flex-1 rounded-md border border-rule bg-paper-deep px-3 py-2 text-base placeholder-ink-muted focus:border-accent focus:outline-none"
          />
          <button
            onClick={search}
            class="cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent-hover"
          >
            Search
          </button>
        </div>

        <Switch>
          <Match when={found()}>
            {r => (
              <div class="mt-5 space-y-3 text-sm">
                <dl class="divide-y divide-rule border-y border-rule">
                  <Row label="Page" value={formatPageNumber(r().address)} />
                  <Row label="Location" value={formatLocationDisplay(r().location)} />
                </dl>
                <p class="rounded-sm border border-rule bg-paper-deep p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
                  {r().content}
                </p>
              </div>
            )}
          </Match>
          <Match when={notFound()}>
            {r => (
              <div class="mt-5 text-sm">
                <p class="mb-2 italic text-accent">Not yet discovered</p>
                <dl class="divide-y divide-rule border-y border-rule">
                  <Row label="Target page" value={formatPageNumber(r().address)} />
                  <Row label="Pages generated" value={formatPageNumber(r().pagesGenerated)} />
                </dl>
              </div>
            )}
          </Match>
        </Switch>
      </dialog>
    </>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div class="flex items-baseline justify-between gap-4 py-2">
      <dt class="text-ink-muted">{props.label}</dt>
      <dd class="min-w-0 text-right font-mono break-all">{props.value}</dd>
    </div>
  );
}
