import { createGameStore, startTickLoop } from '@game/store';
import { GameContext } from './game';
import { StatsPanel } from './components/StatsPanel';
import { WorkersPanel } from './components/WorkersPanel';
import { StorageScalePanel } from './components/StorageScalePanel';
import { LogPanel } from './components/LogPanel';
import { LatestPagePanel } from './components/LatestPagePanel';
import { SearchDialog } from './components/SearchDialog';

export function App() {
  const game = createGameStore();
  startTickLoop(game);

  return (
    <GameContext value={game}>
      <div class="min-h-screen bg-gray-950 text-gray-100 p-2 md:p-4">
        <header class="flex items-center justify-between mb-3">
          <h1 class="text-lg md:text-xl font-bold text-blue-400">📖 The Library of Babel</h1>
          <SearchDialog />
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {/* Top row */}
          <div class="space-y-3">
            <StatsPanel />
          </div>
          <div class="space-y-3">
            <StorageScalePanel />
          </div>

          {/* Bottom row */}
          <div>
            <WorkersPanel />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LogPanel />
            <LatestPagePanel />
          </div>
        </div>
      </div>
    </GameContext>
  );
}
