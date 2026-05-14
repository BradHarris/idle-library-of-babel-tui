import { useEffect, useState } from 'react';
import { useGameStore } from '@game/stores/gameStore';
import { StatsPanel } from './components/StatsPanel';
import { WorkersPanel } from './components/WorkersPanel';
import { StorageScalePanel } from './components/StorageScalePanel';
import { LogPanel } from './components/LogPanel';
import { LatestPagePanel } from './components/LatestPagePanel';
import { SearchDialog } from './components/SearchDialog';

export function App() {
  const tickInterval = useGameStore(s => s.tickInterval);
  const [renderTick, setRenderTick] = useState(0);

  // Game tick driver — runs at the store's configured interval
  useEffect(() => {
    const interval = setInterval(() => {
      useGameStore.getState().tick(tickInterval);
    }, tickInterval);
    return () => clearInterval(interval);
  }, [tickInterval]);

  // Force re-render at ~100ms for smooth UI updates
  useEffect(() => {
    const interval = setInterval(() => setRenderTick(t => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

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
          <StatsPanel key={`stats-${renderTick}`} />
        </div>
        <div className="space-y-3">
          <StorageScalePanel key={`storage-${renderTick}`} />
        </div>

        {/* Bottom row */}
        <div>
          <WorkersPanel key={`workers-${renderTick}`} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LogPanel key={`log-${renderTick}`} />
          <LatestPagePanel key={`page-${renderTick}`} />
        </div>
      </div>
    </div>
  );
}
