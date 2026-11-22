import { For, createMemo, useContext } from 'solid-js';
import { ACHIEVEMENTS, ACHIEVEMENT_BONUS } from '@game/achievements';
import { formatMultiplier } from '@game/format';
import { GameContext } from '../game';

export function AchievementsPanel() {
  const game = useContext(GameContext);
  const unlocked = createMemo(() => new Set(game.state.achievements.map(a => a.id)), {
    equals: (a, b) => a.size === b.size,
  });

  return (
    <div>
      <div class="mb-2 flex items-baseline justify-between gap-2">
        <h2 class="section-title">Achievements</h2>
        <span class="text-xs text-ink-muted">
          <span data-achievement-count class="font-mono tabular-nums">
            {unlocked().size}/{ACHIEVEMENTS.length}
          </span>{' '}
          · output <span class="font-mono tabular-nums">{formatMultiplier(game.achievementMultiplier())}</span>
        </span>
      </div>
      <p class="mb-2 text-xs text-ink-muted italic">Each one adds {Math.round((ACHIEVEMENT_BONUS - 1) * 100)}% to all page output.</p>
      <ul class="grid grid-cols-1 gap-x-6 divide-y divide-rule border-y border-rule sm:grid-cols-2 sm:divide-y-0">
        <For each={ACHIEVEMENTS}>
          {achievement => (
            <li
              data-achievement={achievement.id}
              data-unlocked={unlocked().has(achievement.id) ? 'true' : 'false'}
              class={['flex gap-2 py-2 text-sm sm:border-b sm:border-rule', { 'opacity-45': !unlocked().has(achievement.id) }]}
            >
              <span aria-hidden="true" class={['mt-0.5 font-mono text-xs', unlocked().has(achievement.id) ? 'text-led' : 'text-rule']}>
                {unlocked().has(achievement.id) ? '✓' : '○'}
              </span>
              <span class="min-w-0">
                <span class="block">{achievement.name}</span>
                <span class="block text-xs text-ink-muted">{achievement.description}</span>
              </span>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
