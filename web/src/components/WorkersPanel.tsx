import { For, Show, createMemo, createSignal, useContext } from 'solid-js';
import { TIERS, planHire, type HireMode } from '@game/config';
import { ACHIEVEMENTS, FEATURE_UNLOCKS } from '@game/achievements';
import { Decimal } from '@game/bignum';
import { formatCount, formatMultiplier, formatPrice, formatRate } from '@game/format';
import type { Tier } from '@game/types';
import { GameContext } from '../game';

const MODES: { mode: HireMode; label: string; unlock?: 'hireNext' | 'hireMax' }[] = [
  { mode: 'one', label: '1×' },
  { mode: 'next', label: 'Next', unlock: 'hireNext' },
  { mode: 'max', label: 'Max', unlock: 'hireMax' },
];

const achievementName = (id: string) => ACHIEVEMENTS.find(a => a.id === id)?.name ?? id;

export function WorkersPanel() {
  const game = useContext(GameContext);
  const [hireMode, setHireMode] = createSignal<HireMode>('one');
  const locked = (m: (typeof MODES)[number]) => !!m.unlock && !game.features()[m.unlock];

  return (
    <div>
      <div class="mb-2 flex items-center justify-between">
        <h2 class="section-title">Workers</h2>
        <div role="group" aria-label="Hire amount" class="flex rounded-full border border-rule p-0.5 text-xs">
          <For each={MODES}>
            {m => (
              <button
                data-hire-mode={m.mode}
                aria-pressed={hireMode() === m.mode ? 'true' : 'false'}
                disabled={locked(m)}
                title={locked(m) ? `Unlocked by the "${achievementName(FEATURE_UNLOCKS[m.unlock!])}" achievement` : undefined}
                onClick={() => setHireMode(m.mode)}
                class={[
                  'min-w-12 rounded-full px-3 py-1 transition-colors',
                  locked(m)
                    ? 'cursor-not-allowed text-rule'
                    : hireMode() === m.mode
                      ? 'cursor-pointer bg-ink text-paper'
                      : 'cursor-pointer text-ink-muted hover:text-ink',
                ]}
              >
                {m.label}
              </button>
            )}
          </For>
        </div>
      </div>
      <ul class="divide-y divide-rule border-y border-rule">
        <For each={TIERS}>{(tier, i) => <WorkerRow tier={tier} below={TIERS[i() - 1]} mode={hireMode()} />}</For>
      </ul>
    </div>
  );
}

function WorkerRow(props: { tier: Tier; below: Tier | undefined; mode: HireMode }) {
  const game = useContext(GameContext);

  const playerCount = createMemo(() => game.state.playerWorkers[props.tier.id] || 0);
  const totalCount = createMemo(() => game.state.workers[props.tier.id] ?? Decimal.ZERO, {
    equals: (a, b) => a.eq(b),
  });
  const plan = createMemo(() => planHire(props.mode, props.tier, playerCount(), game.state.money), {
    equals: (a, b) => a.count === b.count && a.cost.eq(b.cost),
  });
  const disabled = createMemo(() => plan().count === 0 || game.state.money.lt(plan().cost));
  /** Doubling bonus × upgrades. */
  const multiplier = () => game.tierMultipliers()[props.tier.id] || 1;
  const progressPct = () => Math.round((game.doublingProgress()[props.tier.id] ?? 0) * 100);
  /** What this tier makes: pages for writers, otherwise workers of the tier below. */
  const output = () =>
    props.below
      ? `${formatRate(game.production()[props.tier.id] ?? Decimal.ZERO)} ${props.below.name.toLowerCase()}s/s`
      : `${formatRate(game.pps())} pages/s`;

  return (
    <li class="flex items-center gap-3 py-3">
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline gap-2">
          <span class={['text-base', playerCount() > 0 ? 'text-ink' : 'text-ink-muted']}>
            {props.tier.name}
          </span>
          <Show when={multiplier() > 1}>
            <span class="font-mono text-xs font-semibold text-accent">{formatMultiplier(multiplier())}</span>
          </Show>
          <span data-count class="ml-auto font-mono text-sm tabular-nums">
            {formatCount(totalCount())}
          </span>
        </div>
        <div class="mt-1.5 h-0.5 overflow-hidden rounded-full bg-rule">
          <div class="h-full rounded-full bg-accent/70 transition-all" style={{ width: `${progressPct()}%` }} />
        </div>
        <Show when={totalCount().gt(0)}>
          <p class="mt-1 flex justify-between gap-2 text-xs text-ink-muted">
            <span>
              <span class="font-mono tabular-nums">{formatCount(playerCount())}</span> hired
            </span>
            <span data-output class="font-mono tabular-nums">
              {output()}
            </span>
          </p>
        </Show>
      </div>
      <button
        data-tier={props.tier.id}
        onClick={() => game.hireBulk(props.tier.id, Math.max(1, plan().count))}
        disabled={disabled()}
        class={[
          'flex min-h-11 w-24 shrink-0 flex-col items-center justify-center rounded-md border px-2 py-1 leading-tight transition-colors',
          disabled()
            ? 'cursor-not-allowed border-rule text-ink-muted'
            : 'cursor-pointer border-accent bg-accent text-paper hover:bg-accent-hover',
        ]}
      >
        <span class="text-xs">{plan().count > 1 ? `×${plan().count}` : 'Hire'}</span>
        <span class="font-mono text-xs tabular-nums">{formatPrice(plan().cost)}</span>
      </button>
    </li>
  );
}
