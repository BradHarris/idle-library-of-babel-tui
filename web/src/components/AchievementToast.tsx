import { For, createMemo, useContext } from 'solid-js';
import { ACHIEVEMENTS } from '@game/achievements';
import { GameContext } from '../game';

/** Seconds of game time a new achievement stays on screen. */
const SHOW_SECONDS = 4;

/** Pops up newly unlocked achievements, then lets them fade as game time passes. */
export function AchievementToast() {
  const game = useContext(GameContext);
  const recent = createMemo(
    () =>
      game.state.achievements
        .filter(a => game.state.time - a.at < SHOW_SECONDS)
        .slice(-3)
        .map(a => a.id),
    { equals: (a, b) => a.length === b.length && a.every((id, i) => id === b[i]) }
  );

  return (
    <div
      aria-live="polite"
      class="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-center gap-2 px-4 lg:top-28 lg:right-6 lg:bottom-auto lg:left-auto lg:items-end"
    >
      <For each={recent()}>
        {id => (
          <div
            data-achievement-toast={id}
            class="w-full max-w-xs rounded-md border border-accent/40 bg-paper px-4 py-2 shadow-lg shadow-ink/10"
          >
            <p class="section-title text-[0.6rem] text-accent">Achievement</p>
            <p class="font-serif">{ACHIEVEMENTS.find(a => a.id === id)?.name}</p>
            <p class="text-xs text-ink-muted">{ACHIEVEMENTS.find(a => a.id === id)?.description}</p>
          </div>
        )}
      </For>
    </div>
  );
}
