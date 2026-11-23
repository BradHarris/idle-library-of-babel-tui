import { Show, useContext } from 'solid-js';
import { formatClock, formatCount, formatMoney, formatMultiplier, formatRate } from '@game/format';
import { GameContext } from '../game';
import { SearchDialog } from './SearchDialog';

export function Hud() {
  const game = useContext(GameContext);

  return (
    <header class="border-b border-rule bg-paper/90 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div class="mx-auto max-w-6xl px-4 py-3">
        <div class="flex items-center justify-between">
          <h1 class="font-serif text-lg italic tracking-wide md:text-xl">The Library of Babel</h1>
          <SearchDialog />
        </div>

        <dl class="mt-2 grid grid-cols-3 gap-2 lg:max-w-2xl">
          <Stat label="Pages" stat="pages" value={formatCount(game.state.pagesGenerated)} />
          <Stat label="Money" stat="money" value={formatMoney(game.state.money)} />
          <Stat label="Pages/s" stat="pps" value={formatRate(game.pps())} />
        </dl>

        <div class="mt-2 text-xs text-ink-muted">
          <span data-stat="output" class="font-mono tabular-nums">
            output {formatMultiplier(game.globalMultiplier())}
            <Show when={game.state.speedLevel > 0}>
              <span class="ml-1">· faster lv.{game.state.speedLevel}</span>
            </Show>
            <Show when={game.boost().active}>
              <span data-stat="boost" class="ml-1 text-accent" title="Offline boost, banked from time away">
                · {game.boost().multiplier}× boost {formatClock(game.boost().secondsLeft)}
              </span>
            </Show>
            <Show when={game.unlockedPuzzles().length > 0 || game.state.insight > 0}>
              <span data-stat="insight" class="ml-1" title="Insight, earned by solving puzzles">
                · ✦ {formatCount(game.state.insight)} insight
              </span>
            </Show>
          </span>
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
