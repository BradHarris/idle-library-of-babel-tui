import { Show, createSignal, useContext } from 'solid-js';
import { MAX_GUESSES, PUZZLES } from '@game/puzzles';
import { formatCount, formatPageNumber } from '@game/format';
import { GameContext } from '../game';
import { UiContext } from '../ui';
import { PuzzleBoard, type PuzzleOutcome } from './PuzzleBoard';
import { InsightShop } from './InsightShop';

/**
 * The Reading Room. Scrambled words turn up on library pages as they are written
 * (see src/puzzles.ts). They queue up and are played one at a time, oldest first.
 * Unscrambling one earns Insight, spent in the shop below.
 */
export function PuzzlesPanel() {
  const game = useContext(GameContext);
  const ui = useContext(UiContext);
  /** How the last puzzle ended, shown above the next one. */
  const [outcome, setOutcome] = createSignal<PuzzleOutcome | null>(null);
  const current = () => game.openPuzzles()[0];

  const showOnMap = (page: bigint) => {
    const generated = game.state.pagesGenerated;
    // Tab first, so the zoom is the newest history entry (as in the search dialog)
    ui.setTab('library');
    ui.zoomTo(page, generated > 0n ? generated - 1n : 0n);
  };

  return (
    <>
      <div data-panel-puzzles>
        <div class="mb-2 flex items-baseline justify-between gap-2">
          <h2 class="section-title">Reading Room</h2>
          <span class="text-xs text-ink-muted">
            <span data-puzzles-available class="font-mono tabular-nums">
              {game.openPuzzles().length}
            </span>{' '}
            available · solved{' '}
            <span data-puzzle-count class="font-mono tabular-nums">
              {game.state.puzzlesSolved.length}/{PUZZLES.length}
            </span>
          </span>
        </div>

        <Show when={outcome()}>
          {o => (
            <p
              data-puzzle-outcome={o().solved ? 'solved' : 'lost'}
              class="mb-3 rounded-md border border-rule bg-paper-deep px-3 py-2 text-sm"
            >
              <Show
                when={o().solved}
                fallback={
                  <>
                    Lost. The word was <span class="font-mono">{o().word}</span>.
                  </>
                }
              >
                Solved <span class="font-mono">{o().word}</span> <span class="text-accent">+{o().reward} ✦</span>
              </Show>
            </p>
          )}
        </Show>

        <Show
          when={current()}
          fallback={
            <p class="mb-4 text-sm text-ink-muted italic">
              {game.unlockedPuzzles().length === 0
                ? 'Somewhere in the library a page holds nothing but a scrambled word. Keep writing and it will turn up.'
                : 'No scrambled pages waiting. Keep writing.'}
            </p>
          }
        >
          {/* Not keyed: one board stays mounted from puzzle to puzzle, so a phone keyboard stays open */}
          {p => (
            <div class="rounded-md border border-rule p-4">
              <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-xs text-ink-muted">
                <span>
                  {p().length} letters · worth <span class="text-accent">✦ {p().reward}</span> · {MAX_GUESSES} guesses
                </span>
                <button
                  data-puzzle-map
                  onClick={() => showOnMap(p().unlockPage)}
                  class="cursor-pointer underline decoration-rule underline-offset-2 hover:text-ink"
                >
                  found on page {formatPageNumber(p().unlockPage)}
                </button>
              </div>
              <PuzzleBoard puzzle={p()} active={ui.tab() === 'puzzles'} onFinish={setOutcome} />
            </div>
          )}
        </Show>

        <Show when={game.nextPuzzle()}>
          {next => (
            <p data-next-puzzle class="mt-3 text-xs text-ink-muted">
              Next scramble: {next().length} letters, {formatCount(next().unlockPage - game.state.pagesGenerated)} pages from
              now
            </p>
          )}
        </Show>
      </div>

      <Show when={game.unlockedPuzzles().length > 0 || game.state.insight > 0}>
        <InsightShop />
      </Show>
    </>
  );
}
