import { OFFLINE_BOOST_MAX_SECONDS, OFFLINE_BOOST_MULTIPLIER, SPEED_MULTIPLIER } from './config.js';
import { ACHIEVEMENT_BONUS } from './achievements.js';
import { D, Decimal } from './bignum.js';
import type { GameState } from './types.js';

/**
 * The Insight shop. Insight comes from solving the Reading Room's puzzles
 * (src/puzzles.ts). It buys leveled upgrades that are much stronger than the
 * money upgrades, and nothing is ever reset.
 *
 * - power:      straight page-output multipliers
 * - systems:    make existing systems stronger (offline boost, "Faster", achievements)
 * - automation: one-off purchases that buy things for you (switchable)
 */

export type InsightGroup = 'power' | 'systems' | 'automation';

export interface InsightUpgrade {
  id: string;
  name: string;
  group: InsightGroup;
  /** What one level does. */
  description: string;
  /** Price of the first level. Each level after that costs `costGrowth` times more. */
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
}

/** Page output × this per level of Lucidity. */
export const LUCIDITY_FACTOR = 1.5;
/** Page output + this per word solved, per level of Erudition. */
export const ERUDITION_PER_SOLVE = 0.02;
/** Offline boost cap + this many seconds per level of Long Memory. */
export const LONG_MEMORY_SECONDS = 3600;
/** Offline boost multiplier + this per level of Deep Focus. */
export const DEEP_FOCUS_STEP = 5;
/** "Faster" per-level multiplier + this per level of Haste. */
export const HASTE_STEP = 0.05;
/** Achievement bonus + this per level of Renown. */
export const RENOWN_STEP = 0.01;

export const INSIGHT_UPGRADES: InsightUpgrade[] = [
  { id: 'lucidity', name: 'Lucidity', group: 'power', description: `All page output ×${LUCIDITY_FACTOR}`, baseCost: 2, costGrowth: 4, maxLevel: Infinity },
  {
    id: 'erudition',
    name: 'Erudition',
    group: 'power',
    description: `All page output +${ERUDITION_PER_SOLVE * 100}% per word solved`,
    baseCost: 6,
    costGrowth: 4,
    maxLevel: 5,
  },
  { id: 'long-memory', name: 'Long Memory', group: 'systems', description: 'Offline boost holds 1 h more', baseCost: 3, costGrowth: 2, maxLevel: 5 },
  { id: 'deep-focus', name: 'Deep Focus', group: 'systems', description: `Offline boost +${DEEP_FOCUS_STEP}×`, baseCost: 4, costGrowth: 2.5, maxLevel: 4 },
  { id: 'haste', name: 'Haste', group: 'systems', description: `Each "Faster" level +${HASTE_STEP}×`, baseCost: 8, costGrowth: 3, maxLevel: 5 },
  { id: 'renown', name: 'Renown', group: 'systems', description: `Each achievement +${RENOWN_STEP * 100}% output`, baseCost: 6, costGrowth: 3, maxLevel: 3 },
  { id: 'clerks', name: 'Clerks', group: 'automation', description: 'Hire workers automatically', baseCost: 10, costGrowth: 1, maxLevel: 1 },
  { id: 'purchasing', name: 'Purchasing Office', group: 'automation', description: 'Buy upgrades automatically', baseCost: 25, costGrowth: 1, maxLevel: 1 },
  { id: 'momentum', name: 'Momentum', group: 'automation', description: 'Buy "Faster" automatically', baseCost: 40, costGrowth: 1, maxLevel: 1 },
];

const BY_ID = new Map(INSIGHT_UPGRADES.map(u => [u.id, u]));

export function getInsightUpgrade(id: string): InsightUpgrade | undefined {
  return BY_ID.get(id);
}

export function insightLevel(s: GameState, id: string): number {
  return s.insightUpgrades[id] ?? 0;
}

/** Price of the level after `level`. */
export function insightCost(u: InsightUpgrade, level: number): number {
  return Math.round(u.baseCost * u.costGrowth ** level);
}

export function isMaxed(s: GameState, u: InsightUpgrade): boolean {
  return insightLevel(s, u.id) >= u.maxLevel;
}

/** Buy the next level of `id`. Mutates `s`; returns the Insight paid, or null if it's unknown, maxed or unaffordable. */
export function buyInsightUpgrade(s: GameState, id: string): number | null {
  const u = BY_ID.get(id);
  if (!u || isMaxed(s, u)) return null;
  const level = insightLevel(s, id);
  const cost = insightCost(u, level);
  if (s.insight < cost) return null;
  s.insight -= cost;
  s.insightUpgrades[id] = level + 1;
  return cost;
}

// ─── Effects ──────────────────────────────────────────────

/** Page output multiplier from Lucidity and Erudition. */
export function insightGlobalMultiplier(s: GameState): Decimal {
  const lucidity = D(LUCIDITY_FACTOR).pow(insightLevel(s, 'lucidity'));
  const erudition = 1 + ERUDITION_PER_SOLVE * insightLevel(s, 'erudition') * s.puzzlesSolved.length;
  return lucidity.mul(erudition);
}

/** Most offline boost that can be banked, in seconds. */
export function insightBoostCap(s: GameState): number {
  return OFFLINE_BOOST_MAX_SECONDS + LONG_MEMORY_SECONDS * insightLevel(s, 'long-memory');
}

/** Output multiplier while the offline boost runs. */
export function insightBoostMultiplier(s: GameState): number {
  return OFFLINE_BOOST_MULTIPLIER + DEEP_FOCUS_STEP * insightLevel(s, 'deep-focus');
}

/** What each "Faster" level multiplies output by. */
export function speedFactor(s: GameState): number {
  return SPEED_MULTIPLIER + HASTE_STEP * insightLevel(s, 'haste');
}

/** What each achievement multiplies output by. */
export function achievementBonus(s: GameState): number {
  return ACHIEVEMENT_BONUS + RENOWN_STEP * insightLevel(s, 'renown');
}

// ─── Automation ───────────────────────────────────────────

/** Switch keys: `hire-<tierId>` (Clerks), `upgrades` (Purchasing Office), `speed` (Momentum). */
export function automationUpgradeFor(key: string): string | null {
  if (key.startsWith('hire-')) return 'clerks';
  if (key === 'upgrades') return 'purchasing';
  if (key === 'speed') return 'momentum';
  return null;
}

/** True if the automation behind `key` is bought and not switched off. */
export function isAutomationOn(s: GameState, key: string): boolean {
  const upgrade = automationUpgradeFor(key);
  return upgrade !== null && insightLevel(s, upgrade) > 0 && s.automation[key] !== false;
}
