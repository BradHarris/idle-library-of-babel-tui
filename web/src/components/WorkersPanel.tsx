import { For, Show, createMemo, createSignal, useContext } from 'solid-js';
import { TIERS, planHire, type HireMode } from '@game/config';
import { formatNumber, formatMoney } from '@game/format';
import type { Tier } from '@game/types';
import { GameContext } from '../game';

const MODES: { mode: HireMode; label: string }[] = [
  { mode: 'one', label: '1×' },
  { mode: 'next', label: 'Next' },
  { mode: 'max', label: 'Max' },
];

export function WorkersPanel() {
  const [hireMode, setHireMode] = createSignal<HireMode>('one');

  return (
    <div>
      <div class="mb-2 flex items-center justify-between">
        <h2 class="section-title">Workers</h2>
        <div role="group" aria-label="Hire amount" class="flex rounded-full border border-rule p-0.5 text-xs">
          <For each={MODES}>
            {m => (
              <button
                aria-pressed={hireMode() === m.mode ? 'true' : 'false'}
                onClick={() => setHireMode(m.mode)}
                class={[
                  'min-w-12 cursor-pointer rounded-full px-3 py-1 transition-colors',
                  hireMode() === m.mode ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink',
                ]}
              >
                {m.label}
              </button>
            )}
          </For>
        </div>
      </div>
      <ul class="divide-y divide-rule border-y border-rule">
        <For each={TIERS}>{tier => <WorkerRow tier={tier} mode={hireMode()} />}</For>
      </ul>
    </div>
  );
}

function WorkerRow(props: { tier: Tier; mode: HireMode }) {
  const game = useContext(GameContext);

  const playerCount = createMemo(() => game.state.playerWorkers[props.tier.id] || 0);
  const totalCount = createMemo(() => game.state.workers[props.tier.id] || 0);
  const plan = createMemo(() => planHire(props.mode, props.tier, playerCount(), game.state.money), {
    equals: (a, b) => a.count === b.count && a.cost === b.cost,
  });
  const disabled = createMemo(() => plan().count === 0 || game.state.money < plan().cost);
  const multiplier = () => game.doublingMultipliers()[props.tier.id] || 1;
  const progressPct = () => Math.round((game.doublingProgress()[props.tier.id] ?? 0) * 100);

  return (
    <li class="flex items-center gap-3 py-3">
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline gap-2">
          <span class={['text-base', playerCount() > 0 ? 'text-ink' : 'text-ink-muted']}>
            {props.tier.name}
          </span>
          <Show when={multiplier() > 1}>
            <span class="font-mono text-xs font-semibold text-accent">×{multiplier()}</span>
          </Show>
          <span class="ml-auto font-mono text-sm tabular-nums">{formatNumber(playerCount())}</span>
        </div>
        <div class="mt-1.5 h-0.5 overflow-hidden rounded-full bg-rule">
          <div class="h-full rounded-full bg-accent/70 transition-all" style={{ width: `${progressPct()}%` }} />
        </div>
        <Show when={totalCount() > playerCount()}>
          <p class="mt-1 text-xs text-ink-muted">
            +<span class="font-mono tabular-nums">{formatNumber(totalCount() - playerCount())}</span> from above
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
        <span class="font-mono text-xs tabular-nums">{formatMoney(plan().cost)}</span>
      </button>
    </li>
  );
}
