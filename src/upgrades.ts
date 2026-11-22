import { TIERS, getWorkerCost } from './config.js';
import { STORAGE_CAPACITY } from './achievements.js';
import { D, Decimal } from './bignum.js';
import { formatMultiplier } from './format.js';
import type { GameState } from './types.js';

/**
 * One-off upgrades. Each unlocks when a requirement is met, then can be bought
 * once. Requirements are derived from state rather than stored: workers bought
 * and pages written only ever go up, so an unlocked upgrade stays unlocked.
 *
 * Effects:
 * - tier:    one tier's output × factor
 * - global:  all page output × factor
 * - synergy: one tier's output × (1 + perUnit × workers bought of another
 *            tier). Uses workers *bought*, not the total: totals grow without
 *            bound because each tier makes the one below.
 */

export type UpgradeRequirement =
  | { kind: 'hired'; tierId: string; count: number }
  | { kind: 'pages'; pages: bigint; label: string };

export type UpgradeEffect =
  | { kind: 'tier'; tierId: string; factor: number }
  | { kind: 'global'; factor: number }
  | { kind: 'synergy'; tierId: string; sourceTierId: string; perUnit: number };

export interface Upgrade {
  id: string;
  name: string;
  /** What it does, e.g. "Writers ×2". */
  description: string;
  /** A tier id, or 'milestone'. Teasers show the next locked upgrade per group. */
  group: string;
  cost: Decimal;
  requirement: UpgradeRequirement;
  effect: UpgradeEffect;
}

/** A tier upgrade costs this many times the price of the worker that unlocks it. */
export const UPGRADE_COST_FACTOR = 50;
/** A milestone upgrade costs this many dollars per page of the container it fills. */
export const MILESTONE_COST_FACTOR = 1;
/** Page output multiplier from each milestone upgrade. */
const MILESTONE_FACTOR = 1.5;

/** Hired counts that unlock each tier's upgrades, in order: [tier, tier, synergy, tier]. */
const TIER_UPGRADE_COUNTS = [25, 50, 75, 100] as const;

/**
 * Upgrade strengths. Writers make pages, so their bonus applies once. Every
 * other tier makes the tier below, so a bonus there compounds down the chain
 * of tiers: producer upgrades have to be much weaker to keep pacing sane.
 */
const WRITER_UPGRADES = { factors: [1.5, 1.5, 2], perUnit: 0.005 } as const;
const PRODUCER_UPGRADES = { factors: [1.1, 1.1, 1.2], perUnit: 0.001 } as const;

/** Names per tier for the upgrades at TIER_UPGRADE_COUNTS. */
const TIER_UPGRADE_NAMES: Record<string, [string, string, string, string]> = {
  writer: ['Sharper Quills', 'Ink by the Barrel', 'Writing Circles', 'Typewriters'],
  manager: ['Memos', 'Open-Plan Office', 'Coaching', 'Quarterly Reviews'],
  overseer: ['Clipboards', 'Watchtowers', 'Chain of Command', 'Panopticon'],
  rector: ['Lecterns', 'Seminaries', 'Faculty Meetings', 'Tenure'],
  cardinal: ['Red Tape', 'Conclaves', 'Consistory', 'The Curia'],
  pope: ['Encyclicals', 'Papal Bulls', 'Infallibility', 'The Holy See'],
  archbishop: ['The Pallium', 'The Crosier', 'Synods', 'The Cathedra'],
};

const plural = (tierId: string) => `${TIERS.find(t => t.id === tierId)!.name.toLowerCase()}s`;
const Plural = (tierId: string) => `${TIERS.find(t => t.id === tierId)!.name}s`;

function tierUpgrades(): Upgrade[] {
  const upgrades: Upgrade[] = [];
  TIERS.forEach((tier, i) => {
    const names = TIER_UPGRADE_NAMES[tier.id] ?? ['', '', '', ''];
    // Writers draw on the managers above them; every other tier on the tier below
    const source = i === 0 ? TIERS[1]! : TIERS[i - 1]!;
    const { factors, perUnit } = i === 0 ? WRITER_UPGRADES : PRODUCER_UPGRADES;
    const effects: UpgradeEffect[] = [
      { kind: 'tier', tierId: tier.id, factor: factors[0] },
      { kind: 'tier', tierId: tier.id, factor: factors[1] },
      { kind: 'synergy', tierId: tier.id, sourceTierId: source.id, perUnit },
      { kind: 'tier', tierId: tier.id, factor: factors[2] },
    ];
    TIER_UPGRADE_COUNTS.forEach((count, j) => {
      const effect = effects[j]!;
      upgrades.push({
        id: `${tier.id}-${count}`,
        name: names[j] || `${tier.name} upgrade ${j + 1}`,
        description: describeEffect(effect),
        group: tier.id,
        cost: getWorkerCost(tier, count).mul(UPGRADE_COST_FACTOR),
        requirement: { kind: 'hired', tierId: tier.id, count },
        effect,
      });
    });
  });
  return upgrades;
}

const MILESTONES: [storageTierId: string, name: string, what: string][] = [
  ['hardDrive', 'Defragmentation', 'a hard drive'],
  ['server', 'Load Balancing', 'a server'],
  ['serverRack', 'Cable Management', 'a rack'],
  ['serverFloor', 'Raised Floors', 'a floor of racks'],
  ['building', 'Zoning Permits', 'a building'],
  ['city', 'Urban Planning', 'a city'],
];

function milestoneUpgrades(): Upgrade[] {
  return MILESTONES.map(([storageTierId, name, what]) => {
    const pages = STORAGE_CAPACITY[storageTierId]!;
    const effect: UpgradeEffect = { kind: 'global', factor: MILESTONE_FACTOR };
    return {
      id: `fill-${storageTierId}`,
      name,
      description: describeEffect(effect),
      group: 'milestone',
      cost: D(pages).mul(MILESTONE_COST_FACTOR),
      requirement: { kind: 'pages', pages, label: `Fill ${what}` },
      effect,
    };
  });
}

function describeEffect(effect: UpgradeEffect): string {
  switch (effect.kind) {
    case 'tier':
      return `${Plural(effect.tierId)} ${formatMultiplier(effect.factor)}`;
    case 'global':
      return `All page output ${formatMultiplier(effect.factor)}`;
    case 'synergy': {
      const source = TIERS.find(t => t.id === effect.sourceTierId)!.name.toLowerCase();
      // Up to two decimals, so small bonuses like 0.1% don't round to 0%
      return `${Plural(effect.tierId)} +${Number((effect.perUnit * 100).toFixed(2))}% per ${source} hired`;
    }
  }
}

export const UPGRADES: Upgrade[] = [...tierUpgrades(), ...milestoneUpgrades()];

const BY_ID = new Map(UPGRADES.map(u => [u.id, u]));

export function getUpgrade(id: string): Upgrade | undefined {
  return BY_ID.get(id);
}

// ─── Queries ──────────────────────────────────────────────

export function isBought(s: GameState, u: Upgrade): boolean {
  return s.upgrades.includes(u.id);
}

export function isUnlocked(s: GameState, u: Upgrade): boolean {
  const r = u.requirement;
  return r.kind === 'hired' ? (s.playerWorkers[r.tierId] ?? 0) >= r.count : s.pagesGenerated >= r.pages;
}

/** Unlocked upgrades not yet bought, in table order. */
export function availableUpgrades(s: GameState): Upgrade[] {
  return UPGRADES.filter(u => !isBought(s, u) && isUnlocked(s, u));
}

/** The next locked upgrade in each group (a teaser of what's coming). */
export function nextLocked(s: GameState): Upgrade[] {
  const seen = new Set<string>();
  const result: Upgrade[] = [];
  for (const u of UPGRADES) {
    if (seen.has(u.group) || isBought(s, u) || isUnlocked(s, u)) continue;
    seen.add(u.group);
    result.push(u);
  }
  return result;
}

export function requirementText(u: Upgrade): string {
  const r = u.requirement;
  return r.kind === 'hired' ? `Hire ${r.count} ${plural(r.tierId)}` : r.label;
}

/** Progress (0–1) toward an upgrade's requirement. */
export function requirementProgress(s: GameState, u: Upgrade): number {
  const r = u.requirement;
  const progress =
    r.kind === 'hired' ? (s.playerWorkers[r.tierId] ?? 0) / r.count : Number(s.pagesGenerated) / Number(r.pages);
  return Math.min(1, Math.max(0, progress));
}

// ─── Effects ──────────────────────────────────────────────

/** Output multiplier for one tier from bought tier and synergy upgrades. */
export function upgradeTierMultiplier(s: GameState, tierId: string): number {
  let mult = 1;
  for (const id of s.upgrades) {
    const effect = BY_ID.get(id)?.effect;
    if (!effect || effect.kind === 'global' || effect.tierId !== tierId) continue;
    mult *= effect.kind === 'tier' ? effect.factor : 1 + effect.perUnit * (s.playerWorkers[effect.sourceTierId] ?? 0);
  }
  return mult;
}

/** Page output multiplier from bought global upgrades. */
export function upgradeGlobalMultiplier(s: GameState): Decimal {
  let mult = 1;
  for (const id of s.upgrades) {
    const effect = BY_ID.get(id)?.effect;
    if (effect?.kind === 'global') mult *= effect.factor;
  }
  return D(mult);
}

/** Buy upgrade `id`. Mutates `s`; returns the price paid, or null if it's unknown, locked, bought or unaffordable. */
export function buyUpgrade(s: GameState, id: string): Decimal | null {
  const u = BY_ID.get(id);
  if (!u || isBought(s, u) || !isUnlocked(s, u) || s.money.lt(u.cost)) return null;
  s.money = Decimal.max(0, s.money.sub(u.cost));
  s.upgrades.push(u.id);
  return u.cost;
}
