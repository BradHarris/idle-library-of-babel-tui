import { For, Show, useContext } from 'solid-js';
import { TIERS } from '@game/config';
import {
  INSIGHT_UPGRADES,
  insightCost,
  insightGlobalMultiplier,
  isAutomationOn,
  type InsightGroup,
  type InsightUpgrade,
} from '@game/insight';
import { formatCount, formatMultiplier } from '@game/format';
import { GameContext } from '../game';

const GROUPS: { id: InsightGroup; label: string }[] = [
  { id: 'power', label: 'Power' },
  { id: 'systems', label: 'Systems' },
  { id: 'automation', label: 'Automation' },
];

export function InsightShop() {
  const game = useContext(GameContext);
  const owned = (id: string) => (game.state.insightUpgrades[id] ?? 0) > 0;

  return (
    <div data-insight-shop>
      <div class="mb-2 flex items-baseline justify-between gap-2">
        <h2 class="section-title">Insight</h2>
        <span class="text-xs text-ink-muted">
          <span data-insight-balance class="font-mono tabular-nums">
            ✦ {formatCount(game.state.insight)}
          </span>
          <Show when={insightGlobalMultiplier(game.state).gt(1)}>
            {' '}
            · pages <span class="font-mono tabular-nums">{formatMultiplier(insightGlobalMultiplier(game.state))}</span>
          </Show>
        </span>
      </div>

      <For each={GROUPS}>
        {group => (
          <div class="mb-4">
            <h3 class="mb-1.5 text-xs text-ink-muted italic">{group.label}</h3>
            <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <For each={INSIGHT_UPGRADES.filter(u => u.group === group.id)}>{u => <InsightCard upgrade={u} />}</For>
            </ul>
          </div>
        )}
      </For>

      <Show when={owned('clerks') || owned('purchasing') || owned('momentum')}>
        <fieldset data-automation class="rounded-md border border-rule px-3 py-2 text-sm">
          <legend class="px-1 text-xs text-ink-muted">Automation switches</legend>
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            <Show when={owned('clerks')}>
              <For each={TIERS}>{tier => <Switch setting={`hire-${tier.id}`} label={`Hire ${tier.name.toLowerCase()}s`} />}</For>
            </Show>
            <Show when={owned('purchasing')}>
              <Switch setting="upgrades" label="Buy upgrades" />
            </Show>
            <Show when={owned('momentum')}>
              <Switch setting="speed" label='Buy "Faster"' />
            </Show>
          </div>
        </fieldset>
      </Show>
    </div>
  );
}

function InsightCard(props: { upgrade: InsightUpgrade }) {
  const game = useContext(GameContext);
  const level = () => game.state.insightUpgrades[props.upgrade.id] ?? 0;
  const maxed = () => level() >= props.upgrade.maxLevel;
  const cost = () => insightCost(props.upgrade, level());
  const affordable = () => !maxed() && game.state.insight >= cost();

  return (
    <li>
      <button
        data-insight-id={props.upgrade.id}
        onClick={() => game.buyInsightUpgrade(props.upgrade.id)}
        disabled={!affordable()}
        class={[
          'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors',
          affordable() ? 'cursor-pointer border-accent hover:bg-accent/10' : 'cursor-not-allowed border-rule text-ink-muted',
        ]}
      >
        <span class="min-w-0">
          <span class="block text-sm">
            {props.upgrade.name}
            <Show when={props.upgrade.maxLevel > 1 && level() > 0}>
              <span data-insight-level class="ml-1.5 font-mono text-xs text-ink-muted">lv.{level()}</span>
            </Show>
          </span>
          <span class="block text-xs text-ink-muted">{props.upgrade.description}</span>
        </span>
        <span class={['shrink-0 font-mono text-xs tabular-nums', { 'text-accent': affordable() }]}>
          {maxed() ? (props.upgrade.maxLevel === 1 ? 'Owned' : 'Max') : `✦ ${formatCount(cost())}`}
        </span>
      </button>
    </li>
  );
}

function Switch(props: { setting: string; label: string }) {
  const game = useContext(GameContext);
  return (
    <label class="flex cursor-pointer items-center gap-1.5">
      <input
        type="checkbox"
        data-automation-key={props.setting}
        checked={isAutomationOn(game.state, props.setting)}
        onChange={e => game.setAutomation(props.setting, e.currentTarget.checked)}
        class="accent-accent"
      />
      {props.label}
    </label>
  );
}
