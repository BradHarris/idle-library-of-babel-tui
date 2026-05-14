import { useGameStore } from '@game/stores/gameStore';
import { formatPageNumber, formatMoney, formatNumber } from '@game/format';

const TICK_INTERVAL = 1000;
const TICK_RATE_IMPROVEMENT_MS = 50;
const TICK_RATE_MIN_INTERVAL = 33;

export function StatsPanel() {
  const pagesGenerated = useGameStore(s => s.pagesGenerated);
  const money = useGameStore(s => s.money);
  const pps = useGameStore(s => s.pps);
  const tickRateLevel = useGameStore(s => s.tickRateLevel);
  const tickRateCost = useGameStore(s => s.tickRateCost);

  const canAfford = money >= tickRateCost;
  const tickInterval = Math.max(TICK_RATE_MIN_INTERVAL, Math.round(TICK_INTERVAL - tickRateLevel * TICK_RATE_IMPROVEMENT_MS));
  const tickRate = (1000 / tickInterval).toFixed(1);

  const handleUpgrade = () => {
    useGameStore.getState().upgradeTickRate();
  };

  return (
    <div className="border border-blue-500/50 rounded-lg p-3 bg-gray-900/50">
      <h2 className="text-sm font-semibold text-blue-400 mb-2">📖 Stats</h2>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Pages Generated:</span>
          <span className="text-white font-mono">{formatPageNumber(pagesGenerated)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Money:</span>
          <span className="text-green-400 font-mono">{formatMoney(money)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Pages/sec:</span>
          <span className="text-white font-mono">{formatNumber(pps)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Tick rate:</span>
          <span className="font-mono">
            {tickRate}/s
            {tickRateLevel > 0 && <span className="text-gray-500 text-xs ml-1">(level {formatNumber(tickRateLevel)})</span>}
          </span>
        </div>
        <button
          onClick={handleUpgrade}
          disabled={!canAfford}
          className={`w-full mt-2 text-xs px-2 py-1 rounded font-medium transition-colors ${
            canAfford
              ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          Tick Rate Upgrade: {formatMoney(tickRateCost)}
        </button>
      </div>
    </div>
  );
}
