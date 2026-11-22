import { STORAGE_TIERS, TIERS, createInitialState, getSpeedCost, getWorkerCost } from './config.js';
import { checkAchievements } from './achievements.js';
import { advance, buySpeed, buyWorkers } from './economy.js';
import type { Decimal } from './bignum.js';
import type { GameState } from './types.js';

/**
 * Headless balance simulator: plays the real economy with a simple greedy
 * player who, every step, keeps buying whatever single thing is cheapest
 * until nothing is affordable. Real players are less efficient (and offline
 * sometimes), so treat its times as a lower bound on pacing.
 */

export interface Milestone {
  /** Minutes of game time when it was reached. */
  minutes: number;
  speedLevel: number;
  /** Workers bought per tier at that point. */
  bought: number[];
}

export interface SimulationResult {
  /** Storage tier id → when the first one was filled. */
  filled: Record<string, Milestone>;
  /** Achievement id → minutes when it unlocked. */
  achievements: Record<string, number>;
  final: GameState;
}

const CAPACITY: [string, bigint][] = (() => {
  let pages = 1n;
  return STORAGE_TIERS.map(tier => [tier.id, (pages *= tier.multiplier)] as [string, bigint]);
})();

export function simulate({ minutes, stepSeconds = 1 }: { minutes: number; stepSeconds?: number }): SimulationResult {
  const s = createInitialState();
  const filled: Record<string, Milestone> = {};

  while (s.time < minutes * 60) {
    advance(s, stepSeconds);
    buyGreedily(s);
    checkAchievements(s);

    for (const [tierId, capacity] of CAPACITY) {
      if (!filled[tierId] && s.pagesGenerated >= capacity) {
        filled[tierId] = {
          minutes: s.time / 60,
          speedLevel: s.speedLevel,
          bought: TIERS.map(t => s.playerWorkers[t.id] ?? 0),
        };
      }
    }
  }

  const achievements = Object.fromEntries(s.achievements.map(a => [a.id, a.at / 60]));
  return { filled, achievements, final: s };
}

function buyGreedily(s: GameState): void {
  for (;;) {
    let cheapest: { cost: Decimal; buy: () => void } | null = null;
    for (const tier of TIERS) {
      const cost = getWorkerCost(tier, s.playerWorkers[tier.id] ?? 0);
      if (cost.lte(s.money) && (!cheapest || cost.lt(cheapest.cost))) {
        cheapest = { cost, buy: () => buyWorkers(s, tier.id, 1) };
      }
    }
    const speedCost = getSpeedCost(s.speedLevel);
    if (speedCost.lte(s.money) && (!cheapest || speedCost.lt(cheapest.cost))) {
      cheapest = { cost: speedCost, buy: () => buySpeed(s) };
    }
    if (!cheapest) return;
    cheapest.buy();
  }
}
