import { Show, createMemo, useContext } from 'solid-js';
import { formatPageNumber, formatMoney, formatNumber } from '@game/format';
import { GameContext } from '../game';
import { SearchDialog } from './SearchDialog';

export function Hud() {
  const game = useContext(GameContext);
  const canAfford = createMemo(() => game.state.money >= game.state.tickRateCost);
  const effectiveTickRate = createMemo(() =>
    ((1000 / game.tickInterval()) * game.tickSpeedMultiplier()).toFixed(1)
  );

  return (
    <header class="sticky top-0 z-20 border-b border-rule bg-paper/90 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div class="mx-auto max-w-6xl px-4 py-3">
        <div class="flex items-center justify-between">
          <h1 class="font-serif text-lg italic tracking-wide md:text-xl">The Library of Babel</h1>
          <SearchDialog />
        </div>

        <dl class="mt-2 grid grid-cols-3 gap-2 lg:max-w-2xl">
          <Stat label="Pages" stat="pages" value={formatPageNumber(game.state.pagesGenerated)} />
          <Stat label="Money" stat="money" value={formatMoney(game.state.money)} />
          <Stat label="Pages/s" stat="pps" value={formatNumber(game.pps())} />
        </dl>

        <div class="mt-2 flex items-center justify-between gap-2 text-xs text-ink-muted">
          <span class="font-mono tabular-nums">
            {effectiveTickRate()} ticks/s
            <Show when={game.tickSpeedMultiplier() > 1}>
              <span class="ml-1 text-accent">×{game.tickSpeedMultiplier()}</span>
            </Show>
            <Show when={game.state.tickRateLevel > 0}>
              <span class="ml-1">· lv.{formatNumber(game.state.tickRateLevel)}</span>
            </Show>
          </span>
          <button
            onClick={() => game.upgradeTickRate()}
            disabled={!canAfford()}
            class={[
              'rounded-full border px-3 py-1 font-medium transition-colors',
              canAfford()
                ? 'cursor-pointer border-accent bg-accent text-paper hover:bg-accent-hover'
                : 'cursor-not-allowed border-rule text-ink-muted',
            ]}
          >
            Faster · <span class="font-mono tabular-nums">{formatMoney(game.state.tickRateCost)}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Stat(props: { label: string; stat: string; value: string }) {
  return (
    <div class="min-w-0">
      <dt class="section-title text-[0.65rem]">{props.label}</dt>
      <dd data-stat={props.stat} class="truncate font-mono text-base tabular-nums md:text-lg">
        {props.value}
      </dd>
    </div>
  );
}
