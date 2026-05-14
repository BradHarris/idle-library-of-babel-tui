import { useGameStore } from '@game/stores/gameStore';
import { TIERS, getWorkerCost } from '@game/config';
import { formatNumber, formatMoney } from '@game/format';

export function WorkersPanel() {
  const workers = useGameStore(s => s.workers);
  const canAfford = useGameStore(s => s.canAfford);

  const handleHire = (tierId) => {
    useGameStore.getState().hire(tierId);
  };

  return (
    <div className="border border-green-500/50 rounded-lg p-3 bg-gray-900/50">
      <h2 className="text-sm font-semibold text-green-400 mb-2">👥 Workers</h2>
      <div className="space-y-2">
        {TIERS.map((tier, i) => {
          const count = workers[tier.id] || 0;
          const cost = getWorkerCost(tier, count);
          const can = canAfford[tier.id];
          const progress = i / (TIERS.length - 1);
          const progressPct = Math.round(progress * 100);

          return (
            <div key={tier.id} className="border-b border-gray-800 last:border-0 pb-2 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${count > 0 ? 'text-white' : 'text-gray-500'}`}>
                      {tier.name}
                    </span>
                    <span className="text-xs text-gray-500">[{i + 1}]</span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400 mt-0.5">
                    <span>Count: <span className="text-white font-mono">{formatNumber(count)}</span></span>
                    <span>Cost: <span className="text-white font-mono">{formatMoney(cost)}</span></span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500/60 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleHire(tier.id)}
                  disabled={!can}
                  className={`ml-3 px-3 py-1 text-xs rounded font-medium whitespace-nowrap transition-colors ${
                    can
                      ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Hire
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
