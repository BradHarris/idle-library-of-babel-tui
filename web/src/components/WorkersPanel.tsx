import { For, Show, createMemo, createSignal, useContext } from 'solid-js';
import { TIERS, getWorkerCost, planHire, type HireMode } from '@game/config';
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
    <div class="border border-green-500/50 rounded-lg p-3 bg-gray-900/50">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-sm font-semibold text-green-400">👥 Workers</h2>
        <div class="flex gap-3 text-xs">
          <For each={MODES}>
            {m => (
              <label class="flex items-center gap-1 text-gray-400 hover:text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="hireMode"
                  checked={hireMode() === m.mode}
                  onChange={() => setHireMode(m.mode)}
                  class="accent-green-500"
                />
                {m.label}
              </label>
            )}
          </For>
        </div>
      </div>
      <div class="space-y-2">
        <For each={TIERS}>
          {(tier, i) => <WorkerRow tier={tier} index={i()} mode={hireMode()} />}
        </For>
      </div>
    </div>
  );
}

function WorkerRow(props: { tier: Tier; index: number; mode: HireMode }) {
  const game = useContext(GameContext);

  const playerCount = createMemo(() => game.state.playerWorkers[props.tier.id] || 0);
  const plan = createMemo(() => planHire(props.mode, props.tier, playerCount(), game.state.money));
  const disabled = createMemo(() => plan().count === 0 || game.state.money < plan().cost);
  const label = createMemo(() => {
    const { count, cost } = plan();
    if (count > 1) return `${props.mode === 'next' ? 'Next' : 'Max'} ×${count}  ${formatMoney(cost)}`;
    if (props.mode === 'max' && count === 1) return `Hire  ${formatMoney(cost)}`;
    return 'Hire';
  });
  const multiplier = () => game.doublingMultipliers()[props.tier.id] || 1;
  const progressPct = () => Math.round((game.doublingProgress()[props.tier.id] ?? 0) * 100);

  return (
    <div class="border-b border-gray-800 last:border-0 pb-2 last:pb-0">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class={['font-medium text-sm', playerCount() > 0 ? 'text-white' : 'text-gray-500']}>
              {props.tier.name}
            </span>
            <span class="text-xs text-gray-500">[{props.index + 1}]</span>
            <Show when={multiplier() > 1}>
              <span class="text-xs font-semibold text-yellow-400">×{multiplier()}</span>
            </Show>
          </div>
          <div class="flex gap-4 text-xs text-gray-400 mt-0.5">
            <span>
              Count: <span class="text-white font-mono">{formatNumber(playerCount())}</span>
            </span>
            <span>
              Total:{' '}
              <span class="text-green-300 font-mono">
                {formatNumber(game.state.workers[props.tier.id] || 0)}
              </span>
            </span>
            <span>
              Cost:{' '}
              <span class="text-white font-mono">
                {formatMoney(getWorkerCost(props.tier, playerCount()))}
              </span>
            </span>
          </div>
          {/* Doubling progress bar */}
          <div class="mt-1 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-green-500/60 rounded-full transition-all"
              style={{ width: `${progressPct()}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => game.hireBulk(props.tier.id, Math.max(1, plan().count))}
          disabled={disabled()}
          class={[
            'ml-3 px-3 py-1 text-xs rounded font-medium whitespace-nowrap transition-colors',
            disabled()
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-500 text-white cursor-pointer',
          ]}
        >
          {label()}
        </button>
      </div>
    </div>
  );
}
