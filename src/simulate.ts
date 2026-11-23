import { STORAGE_TIERS, TIERS, createInitialState } from './config.js';
import { checkAchievements } from './achievements.js';
import { advance } from './economy.js';
import { buyGreedily } from './automation.js';
import { INSIGHT_UPGRADES, buyInsightUpgrade, insightCost, insightLevel, isMaxed } from './insight.js';
import { submitGuess, unlockedPuzzles } from './puzzles.js';
import type { GameState } from './types.js';

/**
 * Headless balance simulator: plays the real economy with a simple greedy
 * player who, every step, keeps buying whatever single thing (worker,
 * "Faster" or upgrade) is cheapest
 * until nothing is affordable. Real players are less efficient (and offline
 * sometimes), so treat its times as a lower bound on pacing.
 */

export interface Milestone {
  /** Minutes of game time when it was reached. */
  minutes: number;
  speedLevel: number;
  /** Upgrades bought by then. */
  upgrades: number;
  /** Workers bought per tier at that point. */
  bought: number[];
}

export interface SimulationResult {
  /** Storage tier id → when the first one was filled. */
  filled: Record<string, Milestone>;
  /** Achievement id → minutes when it unlocked. */
  achievements: Record<string, number>;
  /** Puzzle id → minutes when it was solved (only with `solvePuzzles`). */
  solved: Record<string, number>;
  final: GameState;
}

const CAPACITY: [string, bigint][] = (() => {
  let pages = 1n;
  return STORAGE_TIERS.map(tier => [tier.id, (pages *= tier.multiplier)] as [string, bigint]);
})();

/**
 * `solvePuzzles`: also solve each puzzle the moment it turns up and spend
 * Insight greedily on the cheapest power or systems upgrade (automation adds
 * nothing for a player who already buys everything).
 */
export function simulate({
  minutes,
  stepSeconds = 1,
  solvePuzzles = false,
}: {
  minutes: number;
  stepSeconds?: number;
  solvePuzzles?: boolean;
}): SimulationResult {
  const s = createInitialState();
  const filled: Record<string, Milestone> = {};
  const solved: Record<string, number> = {};

  while (s.time < minutes * 60) {
    advance(s, stepSeconds);
    if (solvePuzzles) {
      for (const p of unlockedPuzzles(s)) {
        if (!(p.id in solved) && submitGuess(s, p.id, p.word).ok) solved[p.id] = s.time / 60;
      }
      spendInsight(s);
    }
    buyGreedily(s);
    checkAchievements(s);

    for (const [tierId, capacity] of CAPACITY) {
      if (!filled[tierId] && s.pagesGenerated >= capacity) {
        filled[tierId] = {
          minutes: s.time / 60,
          speedLevel: s.speedLevel,
          upgrades: s.upgrades.length,
          bought: TIERS.map(t => s.playerWorkers[t.id] ?? 0),
        };
      }
    }
  }

  const achievements = Object.fromEntries(s.achievements.map(a => [a.id, a.at / 60]));
  return { filled, achievements, solved, final: s };
}

function spendInsight(s: GameState): void {
  for (;;) {
    const options = INSIGHT_UPGRADES.filter(u => u.group !== 'automation' && !isMaxed(s, u));
    const cheapest = options.sort((a, b) => insightCost(a, insightLevel(s, a.id)) - insightCost(b, insightLevel(s, b.id)))[0];
    if (!cheapest || buyInsightUpgrade(s, cheapest.id) === null) return;
  }
}
