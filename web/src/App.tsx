import { createSignal } from 'solid-js';
import { createGameStore, startTickLoop } from '@game/store';
import { GameContext } from './game';
import { Hud } from './components/Hud';
import { TabBar, type Tab } from './components/TabBar';
import { WorkersPanel } from './components/WorkersPanel';
import { StorageScalePanel } from './components/StorageScalePanel';
import { LogPanel } from './components/LogPanel';
import { LatestPagePanel } from './components/LatestPagePanel';

export function App() {
  const game = createGameStore();
  startTickLoop(game);
  const [tab, setTab] = createSignal<Tab>('workers');

  return (
    <GameContext value={game}>
      <div class="min-h-dvh">
        <Hud />

        <main class="mx-auto grid max-w-6xl gap-8 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:grid-cols-2 lg:pb-10">
          <section data-panel="workers" class={{ hidden: tab() !== 'workers', 'lg:block': true }}>
            <WorkersPanel />
          </section>

          <div class="space-y-8">
            <section data-panel="library" class={['space-y-8', { hidden: tab() !== 'library', 'lg:block': true }]}>
              <LatestPagePanel />
              <StorageScalePanel />
            </section>
            <section data-panel="log" class={{ hidden: tab() !== 'log', 'lg:block': true }}>
              <LogPanel />
            </section>
          </div>
        </main>

        <TabBar value={tab()} onChange={setTab} />
      </div>
    </GameContext>
  );
}
