import { onSettled } from 'solid-js';
import { createGameStore, startTickLoop } from '@game/store';
import { GameContext } from './game';
import { Hud } from './components/Hud';
import { TabBar } from './components/TabBar';
import { StorageMap } from './components/StorageMap';
import { UiContext, createUiStore } from './ui';
import { WorkersPanel } from './components/WorkersPanel';
import { StorageScalePanel } from './components/StorageScalePanel';
import { LogPanel } from './components/LogPanel';

export function App() {
  const game = createGameStore();
  startTickLoop(game);
  const ui = createUiStore();
  onSettled(() => () => ui.dispose());

  return (
    <GameContext value={game}>
      <UiContext value={ui}>
        <div class="min-h-dvh">
          <Hud />

          <main class="mx-auto grid max-w-6xl gap-8 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:grid-cols-2 lg:pb-10">
            <section data-panel="workers" class={{ hidden: ui.tab() !== 'workers', 'lg:block': true }}>
              <WorkersPanel />
            </section>

            <div class="space-y-8">
              <section data-panel="library" class={['space-y-8', { hidden: ui.tab() !== 'library', 'lg:block': true }]}>
                <StorageMap />
                <StorageScalePanel />
              </section>
              <section data-panel="log" class={{ hidden: ui.tab() !== 'log', 'lg:block': true }}>
                <LogPanel />
              </section>
            </div>
          </main>

          <TabBar value={ui.tab()} onChange={t => ui.setTab(t)} />
        </div>
      </UiContext>
    </GameContext>
  );
}
