import { useState, useMemo } from 'react';
import { useGameStore } from '@game/stores/gameStore';
import { TIERS, getWorkerCost, getDoublingThresholds } from '@game/config';
import { formatNumber, formatMoney } from '@game/format';

/**
 * Total cost to hire `count` workers starting from `playerBoughtCount`.
 */
function getBulkCost(tier, playerBoughtCount, count) {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += getWorkerCost(tier, playerBoughtCount + i);
  }
  return total;
}

/**
 * Maximum number of workers that can be bought with `money`.
 */
function getMaxAffordable(tier, playerBoughtCount, money) {
  let count = 0;
  let total = 0;
  while (true) {
    const cost = getWorkerCost(tier, playerBoughtCount + count);
    if (total + cost > money) break;
    total += cost;
    count++;
  }
  return count;
}

/**
 * Short money formatter for button labels (compact).
 */
function formatMoneyCompact(n) {
  return formatMoney(n);
}

export function WorkersPanel() {
  const workers = useGameStore(s => s.workers);
  const playerWorkers = useGameStore(s => s.playerWorkers);
  const money = useGameStore(s => s.money);
  const canAfford = useGameStore(s => s.canAfford);
  const doublingMultipliers = useGameStore(s => s.doublingMultipliers);
  const doublingProgress = useGameStore(s => s.doublingProgress);
  const [hireMode, setHireMode] = useState('one');

  const thresholds = useMemo(() => getDoublingThresholds(), []);

  const handleHire = (tierId) => {
    const playerCount = playerWorkers[tierId] || 0;
    const tier = TIERS.find(t => t.id === tierId);

    let count = 1;
    if (hireMode === 'next') {
      const nextThreshold = thresholds.find(t => t > playerCount);
      if (nextThreshold) {
        count = nextThreshold - playerCount;
      }
    } else if (hireMode === 'max') {
      count = getMaxAffordable(tier, playerCount, money);
      if (count < 1) count = 1;
    }

    useGameStore.getState().hireBulk(tierId, count);
  };

  return (
    <div className="border border-green-500/50 rounded-lg p-3 bg-gray-900/50">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-green-400">👥 Workers</h2>
        <div className="flex gap-3 text-xs">
          <label className="flex items-center gap-1 text-gray-400 hover:text-gray-300 cursor-pointer">
            <input
              type="radio"
              name="hireMode"
              checked={hireMode === 'one'}
              onChange={() => setHireMode('one')}
              className="accent-green-500"
            />
            1×
          </label>
          <label className="flex items-center gap-1 text-gray-400 hover:text-gray-300 cursor-pointer">
            <input
              type="radio"
              name="hireMode"
              checked={hireMode === 'next'}
              onChange={() => setHireMode('next')}
              className="accent-green-500"
            />
            Next
          </label>
          <label className="flex items-center gap-1 text-gray-400 hover:text-gray-300 cursor-pointer">
            <input
              type="radio"
              name="hireMode"
              checked={hireMode === 'max'}
              onChange={() => setHireMode('max')}
              className="accent-green-500"
            />
            Max
          </label>
        </div>
      </div>
      <div className="space-y-2">
        {TIERS.map((tier, i) => {
          const playerCount = playerWorkers[tier.id] || 0;
          const totalCount = workers[tier.id] || 0;
          const cost = getWorkerCost(tier, playerCount);
          const can = canAfford[tier.id];
          const multiplier = doublingMultipliers[tier.id] || 1;
          const progress = doublingProgress[tier.id] ?? 0;
          const progressPct = Math.round(progress * 100);

          // Compute hire count and cost based on mode
          let hireCount = 1;
          let hireCost = cost;
          let buttonLabel = 'Hire';
          let buttonDisabled = !can;

          if (hireMode === 'next') {
            const nextThreshold = thresholds.find(t => t > playerCount);
            if (nextThreshold) {
              hireCount = nextThreshold - playerCount;
              if (hireCount > 1) {
                hireCost = getBulkCost(tier, playerCount, hireCount);
                buttonLabel = `Next ×${hireCount}  ${formatMoney(hireCost)}`;
                buttonDisabled = money < hireCost;
              } else {
                buttonDisabled = !can;
              }
            }
          } else if (hireMode === 'max') {
            hireCount = getMaxAffordable(tier, playerCount, money);
            if (hireCount === 0) {
              buttonDisabled = true;
            } else {
              hireCost = getBulkCost(tier, playerCount, hireCount);
              if (hireCount > 1) {
                buttonLabel = `Max ×${hireCount}  ${formatMoney(hireCost)}`;
              } else {
                buttonLabel = `Hire  ${formatMoney(hireCost)}`;
              }
              buttonDisabled = false;
            }
          }

          return (
            <div key={tier.id} className="border-b border-gray-800 last:border-0 pb-2 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${playerCount > 0 ? 'text-white' : 'text-gray-500'}`}>
                      {tier.name}
                    </span>
                    <span className="text-xs text-gray-500">[{i + 1}]</span>
                    {multiplier > 1 && (
                      <span className="text-xs font-semibold text-yellow-400">×{multiplier}</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400 mt-0.5">
                    <span>Count: <span className="text-white font-mono">{formatNumber(playerCount)}</span></span>
                    <span>Total: <span className="text-green-300 font-mono">{formatNumber(totalCount)}</span></span>
                    <span>Cost: <span className="text-white font-mono">{formatMoney(cost)}</span></span>
                  </div>
                  {/* Doubling progress bar */}
                  <div className="mt-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500/60 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleHire(tier.id)}
                  disabled={buttonDisabled}
                  className={`ml-3 px-3 py-1 text-xs rounded font-medium whitespace-nowrap transition-colors ${
                    buttonDisabled
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
                  }`}
                >
                  {buttonLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
