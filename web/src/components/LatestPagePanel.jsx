import { useGameStore } from '@game/stores/gameStore';
import { formatPageNumber, wrapText } from '@game/format';

const WRAP_WIDTH = 30;

export function LatestPagePanel() {
  const currentPage = useGameStore(s => s.currentPage);
  const latestPage = useGameStore(s => s.latestPage);

  const lines = latestPage ? wrapText(latestPage, WRAP_WIDTH) : [''];

  return (
    <div className="border border-blue-500/50 rounded-lg p-3 bg-gray-900/50 flex flex-col h-full">
      <h2 className="text-sm font-semibold text-blue-400 mb-2">
        📄 Page {formatPageNumber(currentPage)}
      </h2>
      <div className="font-mono text-xs text-gray-300 whitespace-pre-wrap break-all leading-relaxed flex-1">
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
