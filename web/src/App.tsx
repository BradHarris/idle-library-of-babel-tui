import { onSettled } from 'solid-js';
import { createGameStore, startAutosave, startTickLoop, welcomeBack } from '@game/store';
import { readSave } from '@game/save';
import { GameContext } from './game';
import { Hud } from './components/Hud';
import { TabBar } from './components/TabBar';
import { StorageMap } from './components/StorageMap';
import { UiContext, createUiStore } from './ui';
import { WorkersPanel } from './components/WorkersPanel';
import { UpgradesPanel } from './components/UpgradesPanel';
import { StorageScalePanel } from './components/StorageScalePanel';
import { LogPanel } from './components/LogPanel';
import { AchievementsPanel } from './components/AchievementsPanel';
import { AchievementToast } from './components/AchievementToast';
import { SavePanel } from './components/SavePanel';

export function App() {
  // One-time setup: load the save and bank the time away as boost (on the plain state, before it's a store)
  const loaded = readSave();
  if (loaded.ok) welcomeBack(loaded.state, (Date.now() - loaded.savedAt) / 1000);
  const game = createGameStore(loaded.ok ? loaded.state : undefined);
  startTickLoop(game);
  // Never autosave over a save we couldn't read (a copy is kept in the backup key either way)
  const autosave = startAutosave(game, { enabled: loaded.ok || loaded.reason === 'empty' });
  const loadError = !loaded.ok && loaded.reason !== 'empty' ? loaded.error : null;
  const ui = createUiStore();
  onSettled(() => () => ui.dispose());

  return (
    <GameContext value={game}>
      <UiContext value={ui}>
        <div class="min-h-dvh">
          <Hud />

          <main class="mx-auto grid max-w-6xl gap-8 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:grid-cols-2 lg:pb-10">
            <div class="space-y-8">
              <section data-panel="upgrades" class={{ hidden: ui.tab() !== 'upgrades', 'lg:block': true }}>
                <UpgradesPanel />
              </section>
              <section data-panel="workers" class={{ hidden: ui.tab() !== 'workers', 'lg:block': true }}>
                <WorkersPanel />
              </section>
              <section data-panel="achievements" class={{ hidden: ui.tab() !== 'log', 'lg:block': true }}>
                <AchievementsPanel />
                <div class="mt-8">
                  <SavePanel autosave={autosave} loadError={loadError} />
                </div>
              </section>
            </div>

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

          <TabBar value={ui.tab()} onChange={t => ui.setTab(t)} badges={{ upgrades: game.purchasableUpgrades() }} />
          <AchievementToast />
        </div>
      </UiContext>
    </GameContext>
  );
}
