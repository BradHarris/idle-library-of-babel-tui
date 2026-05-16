import { useEffect } from 'react';
import { useGameStore } from '@game/stores/gameStore';
import { StatsPanel } from './components/StatsPanel';
import { WorkersPanel } from './components/WorkersPanel';
import { StorageScalePanel } from './components/StorageScalePanel';
import { LogPanel } from './components/LogPanel';
import { LatestPagePanel } from './components/LatestPagePanel';
import { SearchDialog } from './components/SearchDialog';

export function App() {
  const tickInterval = useGameStore(s => s.tickInterval);
  const tick = useGameStore(s => s.tick);

  // Game tick driver — runs at the store's configured interval
  useEffect(() => {
    const interval = setInterval(() => {
      tick(tickInterval);
    }, tickInterval);
    return () => clearInterval(interval);
  }, [tickInterval]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-2 md:p-4">
      <header className="flex items-center justify-between mb-3">
        <h1 className="text-lg md:text-xl font-bold text-blue-400">
          📖 The Library of Babel
        </h1>
        <SearchDialog />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {/* Top row */}
        <div className="space-y-3">
          <StatsPanel />
        </div>
        <div className="space-y-3">
          <StorageScalePanel />
        </div>

        {/* Bottom row */}
        <div>
          <WorkersPanel />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LogPanel />
          <LatestPagePanel />
        </div>
      </div>
    </div>
  );
}
