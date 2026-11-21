import { useContext } from 'solid-js';
import { formatPageNumber } from '@game/format';
import { GameContext } from '../game';

export function LatestPagePanel() {
  const game = useContext(GameContext);

  return (
    <figure>
      <h2 class="section-title mb-2">Latest page</h2>
      <div class="rounded-sm border border-rule bg-paper-deep px-5 py-4 shadow-[inset_0_0_24px_rgb(122_106_85/0.18)]">
        <p class="font-mono text-[0.8rem] leading-relaxed break-all whitespace-pre-wrap text-ink/85">
          {game.latestPage()}
        </p>
        <figcaption class="mt-3 border-t border-rule pt-2 text-center font-serif text-xs italic text-ink-muted">
          — page <span class="font-mono not-italic tabular-nums">{formatPageNumber(game.state.currentPage)}</span> —
        </figcaption>
      </div>
    </figure>
  );
}
