import * as ScrollArea from '@radix-ui/react-scroll-area';
import { useGameStore } from '@game/stores/gameStore';
import { LOG_MAX_ENTRIES } from '@game/config';

export function LogPanel() {
  const log = useGameStore(s => s.log);
  const recent = log.slice(0, LOG_MAX_ENTRIES);

  return (
    <div className="border border-yellow-500/50 rounded-lg p-3 bg-gray-900/50 flex flex-col h-full">
      <h2 className="text-sm font-semibold text-yellow-400 mb-2">📋 Event Log</h2>
      <ScrollArea.Root className="flex-1 max-h-48">
        <ScrollArea.Viewport className="w-full h-full overflow-hidden">
          <div className="space-y-1 pr-2">
            {recent.length === 0 ? (
              <p className="text-xs text-gray-500">Starting up...</p>
            ) : (
              recent.map((entry, i) => (
                <div key={i} className="text-xs">
                  <span className="text-gray-500 font-mono">{entry.timestamp}</span>{' '}
                  <span className="text-gray-300">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="flex m-0.5 select-none touch-none p-0 data-[orientation=vertical]:w-2"
        >
          <ScrollArea.Thumb className="flex-1 bg-gray-600 rounded-[10px] m-0.5" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
