import { TIERS, getSpeedCost, getWorkerCost } from './config.js';
import { buySpeed, buyWorkers } from './economy.js';
import { availableUpgrades, buyUpgrade } from './upgrades.js';
import { isAutomationOn } from './insight.js';
import type { Decimal } from './bignum.js';
import type { GameState } from './types.js';

/** What a greedy buyer may buy. */
export interface BuyRules {
  hire: (tierId: string) => boolean;
  upgrades: boolean;
  speed: boolean;
  /** Stop after this many purchases. */
  limit?: number;
}

export const BUY_EVERYTHING: BuyRules = { hire: () => true, upgrades: true, speed: true };

/**
 * Keep buying the single cheapest allowed thing (a worker, "Faster" or an
 * upgrade) until nothing allowed is affordable. Mutates `s`; returns how many
 * things were bought. The balance simulator and automation both use this.
 */
export function buyGreedily(s: GameState, rules: BuyRules = BUY_EVERYTHING): number {
  const limit = rules.limit ?? Infinity;
  let bought = 0;
  while (bought < limit) {
    let cheapest: { cost: Decimal; buy: () => void } | null = null;
    for (const tier of TIERS) {
      if (!rules.hire(tier.id)) continue;
      const cost = getWorkerCost(tier, s.playerWorkers[tier.id] ?? 0);
      if (cost.lte(s.money) && (!cheapest || cost.lt(cheapest.cost))) {
        cheapest = { cost, buy: () => buyWorkers(s, tier.id, 1) };
      }
    }
    if (rules.speed) {
      const speedCost = getSpeedCost(s.speedLevel);
      if (speedCost.lte(s.money) && (!cheapest || speedCost.lt(cheapest.cost))) {
        cheapest = { cost: speedCost, buy: () => buySpeed(s) };
      }
    }
    if (rules.upgrades) {
      for (const upgrade of availableUpgrades(s)) {
        if (upgrade.cost.lte(s.money) && (!cheapest || upgrade.cost.lt(cheapest.cost))) {
          cheapest = { cost: upgrade.cost, buy: () => buyUpgrade(s, upgrade.id) };
        }
      }
    }
    if (!cheapest) break;
    cheapest.buy();
    bought++;
  }
  return bought;
}

/** Real purchases automation makes in one go, at most (it runs once per game second). */
export const AUTOMATION_LIMIT = 200;

/** Run the bought, switched-on automation once. Mutates `s`; returns how many things were bought. */
export function runAutomation(s: GameState): number {
  const rules: BuyRules = {
    hire: tierId => isAutomationOn(s, `hire-${tierId}`),
    upgrades: isAutomationOn(s, 'upgrades'),
    speed: isAutomationOn(s, 'speed'),
    limit: AUTOMATION_LIMIT,
  };
  if (!rules.upgrades && !rules.speed && !TIERS.some(t => rules.hire(t.id))) return 0;
  return buyGreedily(s, rules);
}
