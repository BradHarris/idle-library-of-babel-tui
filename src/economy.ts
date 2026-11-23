import { EARNINGS_PER_PAGE, OFFLINE_BOOST_MULTIPLIER, TIERS, getAffordable, getDoublingMultiplier, getSpeedCost, getSpeedMultiplier } from './config.js';
import { achievementMultiplier } from './achievements.js';
import { upgradeGlobalMultiplier, upgradeTierMultiplier } from './upgrades.js';
import {
  achievementBonus,
  insightBoostCap,
  insightBoostMultiplier,
  insightGlobalMultiplier,
  speedFactor,
} from './insight.js';
import { Decimal } from './bignum.js';
import type { GameState } from './types.js';

/**
 * The economy as plain functions over GameState, shared by the store (which
 * passes its draft) and the balance simulator. Amounts are Decimals so they
 * can grow past the float range.
 *
 * Production is per second of game time:
 * - writers make pages: writers × writer bonus × global multiplier
 * - every other tier makes workers of the tier directly below it:
 *   count × tier.rate × that tier's multiplier
 * - a tier's multiplier is its doubling bonus × its upgrades (tier and synergy)
 * - the global multiplier ("Faster" × achievements × global upgrades × Insight) applies to pages only,
 *   so it scales output without compounding down the chain of tiers.
 */

/** Pages added straight to the bigint total once a step is this big (no fractional part worth tracking). */
const WHOLE_PAGES_FROM = 1e15;

/** A tier's output multiplier: its doubling bonus from how many the player has bought, × its upgrades. */
export function tierMultiplier(s: GameState, tierId: string): number {
  return getDoublingMultiplier(s.playerWorkers[tierId] ?? 0) * upgradeTierMultiplier(s, tierId);
}

/** Output multiplier from "Faster", achievements, global upgrades, Insight upgrades and any offline boost. */
export function globalMultiplier(s: GameState): Decimal {
  const base = getSpeedMultiplier(s.speedLevel, speedFactor(s))
    .mul(achievementMultiplier(s.achievements.length, achievementBonus(s)))
    .mul(upgradeGlobalMultiplier(s))
    .mul(insightGlobalMultiplier(s));
  return s.boostSeconds > 0 ? base.mul(insightBoostMultiplier(s)) : base;
}

/**
 * Bank time away as offline boost: one boosted second per
 * OFFLINE_BOOST_MULTIPLIER seconds away, capped at insightBoostCap (an hour,
 * more with Long Memory). Deep Focus raises the boost's multiplier but not the
 * banking rate, so it makes time away worth more. Mutates `s`; returns the
 * seconds of boost added.
 */
export function bankOffline(s: GameState, awaySeconds: number): number {
  if (!(awaySeconds > 0)) return 0;
  const before = s.boostSeconds;
  s.boostSeconds = Math.min(insightBoostCap(s), before + awaySeconds / OFFLINE_BOOST_MULTIPLIER);
  return Math.max(0, s.boostSeconds - before);
}

export function pagesPerSecond(s: GameState): Decimal {
  return (s.workers.writer ?? Decimal.ZERO).mul(tierMultiplier(s, 'writer')).mul(globalMultiplier(s));
}

/** Workers of the tier below that tier `index` (≥ 1) makes per second. */
export function productionPerSecond(s: GameState, index: number): Decimal {
  const tier = TIERS[index]!;
  return (s.workers[tier.id] ?? Decimal.ZERO).mul(tier.rate * tierMultiplier(s, tier.id));
}

/** Run the economy forward by `seconds`, spending offline boost first. Mutates `s`. */
export function advance(s: GameState, seconds: number): void {
  if (seconds <= 0) return;
  if (s.boostSeconds > 0) {
    // Split the step where the boost runs out, so only its boosted part is multiplied
    const boosted = Math.min(seconds, s.boostSeconds);
    step(s, boosted);
    s.boostSeconds = Math.max(0, s.boostSeconds - boosted);
    seconds -= boosted;
    if (seconds <= 0) return;
  }
  step(s, seconds);
}

/** One linear step of `seconds` at the current rates. */
function step(s: GameState, seconds: number): void {
  // Lowest tier first, so each tier grows from the count above it at the start of the step
  for (let i = 1; i < TIERS.length; i++) {
    const made = productionPerSecond(s, i).mul(seconds);
    if (!made.isZero()) {
      const below = TIERS[i - 1]!.id;
      s.workers[below] = (s.workers[below] ?? Decimal.ZERO).add(made);
    }
  }

  const pages = pagesPerSecond(s).mul(seconds);
  if (pages.isZero()) {
    s.time += seconds;
    return;
  }
  s.money = s.money.add(pages.mul(EARNINGS_PER_PAGE));

  let whole: bigint;
  if (pages.gte(WHOLE_PAGES_FROM)) {
    whole = pages.toBigInt();
  } else {
    s._fractionalPages += pages.toNumber();
    whole = BigInt(Math.floor(s._fractionalPages));
    s._fractionalPages -= Number(whole);
  }
  if (whole > 0n) {
    s.pagesGenerated += whole;
    s.currentPage += whole;
  }
  s.time += seconds;
}

/** Buy up to `count` workers of `tierId`. Mutates `s`; returns what was bought, or null if none were affordable. */
export function buyWorkers(s: GameState, tierId: string, count: number): { hired: number; cost: Decimal } | null {
  const tier = TIERS.find(t => t.id === tierId);
  if (!tier || count < 1) return null;
  const owned = s.playerWorkers[tier.id] ?? 0;
  const { count: hired, cost } = getAffordable(tier, owned, s.money, count);
  if (hired === 0) return null;
  s.money = Decimal.max(0, s.money.sub(cost));
  s.workers[tier.id] = (s.workers[tier.id] ?? Decimal.ZERO).add(hired);
  s.playerWorkers[tier.id] = owned + hired;
  return { hired, cost };
}

/** Buy the next "Faster" level. Mutates `s`; returns the price paid, or null if unaffordable. */
export function buySpeed(s: GameState): Decimal | null {
  const cost = getSpeedCost(s.speedLevel);
  if (s.money.lt(cost)) return null;
  s.money = Decimal.max(0, s.money.sub(cost));
  s.speedLevel += 1;
  return cost;
}
