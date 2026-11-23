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
import { SettingsPanel } from './components/SettingsPanel';
import { createSettingsStore } from './settings';
import { HaltedNotice } from './components/HaltedNotice';
import { PuzzlesPanel } from './components/PuzzlesPanel';

export function App() {
  // One-time setup: load the save and bank the time away as boost (on the plain state, before it's a store)
  const loaded = readSave();
  if (loaded.ok) welcomeBack(loaded.state, (Date.now() - loaded.savedAt) / 1000);
  const game = createGameStore(loaded.ok ? loaded.state : undefined);
  const settings = createSettingsStore();
  // Never autosave over a save we couldn't read (a copy is kept in the backup key either way)
  const autosave = startAutosave(game, { enabled: loaded.ok || loaded.reason === 'empty' });
  // Another tab saved over us: stop the game rather than let two tabs fight over the save
  startTickLoop(game, settings.tickMs, () => !autosave.halted());
  const loadError = !loaded.ok && loaded.reason !== 'empty' ? loaded.error : null;
  const ui = createUiStore();
  onSettled(() => () => ui.dispose());

  return (
    <GameContext value={game}>
      <UiContext value={ui}>
        <div class="min-h-dvh">
          {/* Not the Hud's own header: its backdrop-blur would trap the tab bar's mobile `fixed` */}
          <div class="sticky top-0 z-20">
            <Hud />
            <TabBar value={ui.tab()} onChange={t => ui.setTab(t)} badges={{ upgrades: game.purchasableUpgrades(), puzzles: game.openPuzzles().length }} />
          </div>

          <main class="mx-auto max-w-6xl px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pt-6 lg:pb-10">
            <section data-panel="workers" class={['mx-auto max-w-3xl', { hidden: ui.tab() !== 'workers' }]}>
              <WorkersPanel />
            </section>
            <section data-panel="upgrades" class={['mx-auto max-w-3xl', { hidden: ui.tab() !== 'upgrades' }]}>
              <UpgradesPanel />
            </section>
            <section data-panel="puzzles" class={['mx-auto max-w-3xl space-y-8', { hidden: ui.tab() !== 'puzzles' }]}>
              <PuzzlesPanel />
            </section>
            <section data-panel="library" class={['grid gap-8 lg:grid-cols-2', { hidden: ui.tab() !== 'library' }]}>
              <StorageMap />
              <StorageScalePanel />
            </section>
            <section data-panel="log" class={['mx-auto max-w-3xl', { hidden: ui.tab() !== 'log' }]}>
              <LogPanel />
            </section>
            <section data-panel="achievements" class={['mx-auto max-w-3xl', { hidden: ui.tab() !== 'achievements' }]}>
              <AchievementsPanel />
            </section>
            <section data-panel="settings" class={['mx-auto max-w-3xl space-y-8', { hidden: ui.tab() !== 'settings' }]}>
              <SettingsPanel settings={settings} />
              <SavePanel autosave={autosave} loadError={loadError} />
            </section>
          </main>

          <AchievementToast />
          <HaltedNotice show={autosave.halted()} />
        </div>
      </UiContext>
    </GameContext>
  );
}
