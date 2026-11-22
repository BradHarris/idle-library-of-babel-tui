import { For, Show, useContext } from 'solid-js';
import { UPGRADES, requirementProgress, requirementText, type Upgrade } from '@game/upgrades';
import { SPEED_MULTIPLIER } from '@game/config';
import type { Decimal } from '@game/bignum';
import { formatMultiplier, formatPrice } from '@game/format';
import { GameContext } from '../game';

export function UpgradesPanel() {
  const game = useContext(GameContext);

  return (
    <div>
      <div class="mb-2 flex items-baseline justify-between gap-2">
        <h2 class="section-title">Upgrades</h2>
        <span class="text-xs text-ink-muted">
          <span data-upgrade-count class="font-mono tabular-nums">
            {game.state.upgrades.length}/{UPGRADES.length}
          </span>
          <Show when={game.upgradeMultiplier().gt(1)}>
            {' '}
            · pages <span class="font-mono tabular-nums">{formatMultiplier(game.upgradeMultiplier())}</span>
          </Show>
        </span>
      </div>

      <ul class="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* "Faster" can be bought again and again, so it's always here */}
        <BuyCard
          id="speed"
          name={game.state.speedLevel > 0 ? `Faster (level ${game.state.speedLevel})` : 'Faster'}
          description={`All page output ${formatMultiplier(SPEED_MULTIPLIER)} per level`}
          cost={game.speedCost()}
          onBuy={() => game.upgradeSpeed()}
        />
        <For each={game.availableUpgrades()}>
          {upgrade => (
            <BuyCard
              id={upgrade.id}
              name={upgrade.name}
              description={upgrade.description}
              cost={upgrade.cost}
              onBuy={() => game.buyUpgrade(upgrade.id)}
            />
          )}
        </For>
      </ul>

      <Show
        when={game.lockedUpgrades().length > 0}
        fallback={<p class="text-xs text-ink-muted italic">Every upgrade is unlocked.</p>}
      >
        <ul class="divide-y divide-rule border-y border-rule">
          <For each={game.lockedUpgrades()}>{upgrade => <LockedRow upgrade={upgrade} />}</For>
        </ul>
      </Show>
    </div>
  );
}

function BuyCard(props: { id: string; name: string; description: string; cost: Decimal; onBuy: () => void }) {
  const game = useContext(GameContext);
  const affordable = () => game.state.money.gte(props.cost);

  return (
    <li>
      <button
        data-upgrade-id={props.id}
        data-upgrade-state="available"
        onClick={() => props.onBuy()}
        disabled={!affordable()}
        class={[
          'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors',
          affordable()
            ? 'cursor-pointer border-accent hover:bg-accent/10'
            : 'cursor-not-allowed border-rule text-ink-muted',
        ]}
      >
        <span class="min-w-0">
          <span class="block text-sm">{props.name}</span>
          <span class="block text-xs text-ink-muted">{props.description}</span>
        </span>
        <span class={['shrink-0 font-mono text-xs tabular-nums', { 'text-accent': affordable() }]}>
          {formatPrice(props.cost)}
        </span>
      </button>
    </li>
  );
}

function LockedRow(props: { upgrade: Upgrade }) {
  const game = useContext(GameContext);
  const progressPct = () => Math.round(requirementProgress(game.state, props.upgrade) * 100);

  return (
    <li data-upgrade-id={props.upgrade.id} data-upgrade-state="locked" class="py-2 text-sm text-ink-muted">
      <div class="flex items-baseline justify-between gap-2">
        <span class="min-w-0 truncate">
          <span class="text-ink/60">{props.upgrade.name}</span>
          <span class="ml-2 text-xs">{props.upgrade.description}</span>
        </span>
        <span data-requirement class="shrink-0 text-xs">
          {requirementText(props.upgrade)}
        </span>
      </div>
      <div class="mt-1.5 h-0.5 overflow-hidden rounded-full bg-rule">
        <div class="h-full rounded-full bg-ink-muted/50 transition-all" style={{ width: `${progressPct()}%` }} />
      </div>
    </li>
  );
}
