import { useGameStore } from '@game/stores/gameStore';
import { computeStorageScale } from '@game/storageScale';
import { formatNumber } from '@game/format';

export function StorageScalePanel() {
  const pagesGenerated = useGameStore(s => s.pagesGenerated);
  const scale = computeStorageScale(pagesGenerated);

  return (
    <div className="border border-cyan-500/50 rounded-lg p-3 bg-gray-900/50">
      <h2 className="text-sm font-semibold text-cyan-400 mb-2">📦 Storage Scale</h2>
      <div className="space-y-1 text-sm">
        {scale.map((tier) => (
          <div key={tier.name} className="flex items-center gap-2">
            <span className="text-base">{tier.emoji}</span>
            <span className="text-gray-400 flex-1 truncate">{tier.name}</span>
            <span className="text-white font-mono">{formatNumber(Number(tier.count))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
