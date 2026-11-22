import { STORAGE_TIERS, TIERS } from './config.js';
import { D, type Decimal } from './bignum.js';
import type { GameState } from './types.js';

/**
 * Milestone achievements (issue #4). Each unlocked achievement multiplies all
 * output by ACHIEVEMENT_BONUS; some also unlock features (see FEATURE_UNLOCKS).
 * They're checked after every tick and purchase.
 */

export const ACHIEVEMENT_BONUS = 1.02; // +2% output each, compounding

export interface Achievement {
  id: string;
  name: string;
  description: string;
  check: (s: GameState) => boolean;
}

/** Pages that fill one of each storage tier (a drive, a server, ...). */
export const STORAGE_CAPACITY: Record<string, bigint> = (() => {
  const capacity: Record<string, bigint> = {};
  let pages = 1n;
  for (const tier of STORAGE_TIERS) capacity[tier.id] = pages *= tier.multiplier;
  return capacity;
})();

const STORAGE_ACHIEVEMENTS: [tierId: string, name: string, what: string][] = [
  ['hardDrive', 'Disk Full', 'a drive'],
  ['server', 'Server Side', 'a server'],
  ['serverRack', 'Rack and Ruin', 'a rack'],
  ['serverFloor', 'Floor Plan', 'a floor of racks'],
  ['building', 'House of Pages', 'a building'],
  ['city', 'City of Words', 'a city'],
  ['planet', 'World Library', 'a planet'],
  ['solarSystem', 'Solar Archive', 'a solar system'],
  ['galaxy', 'Galactic Catalogue', 'a galaxy'],
  ['universe', 'The Universe (Which Others Call the Library)', 'a universe'],
];

const FIRST_HIRE_NAMES: Record<string, string> = {
  manager: 'Middle Management',
  overseer: 'Oversight',
  rector: 'Rectory',
  cardinal: 'Red Hats',
  pope: 'Habemus Papam',
  archbishop: 'A Higher Calling',
};

const pages = (n: bigint) => (s: GameState) => s.pagesGenerated >= n;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'pages-1', name: 'First Words', description: 'Write your first page', check: pages(1n) },
  { id: 'pages-1k', name: 'A Thousand Pages', description: 'Write 1,000 pages', check: pages(1_000n) },
  { id: 'pages-1m', name: 'A Million Pages', description: 'Write 1,000,000 pages', check: pages(1_000_000n) },
  { id: 'pages-1b', name: 'A Billion Pages', description: 'Write 1,000,000,000 pages', check: pages(1_000_000_000n) },

  {
    id: 'writers-room',
    name: "Writers' Room",
    description: 'Hire 10 writers. Unlocks hiring up to the next bonus.',
    check: s => (s.playerWorkers.writer ?? 0) >= 10,
  },
  ...TIERS.slice(1).map(
    (tier): Achievement => ({
      id: `hire-${tier.id}`,
      name: FIRST_HIRE_NAMES[tier.id] ?? `First ${tier.name}`,
      description:
        tier.id === 'manager'
          ? 'Hire your first manager. Unlocks hiring as many as you can afford.'
          : `Hire your first ${tier.name.toLowerCase()}`,
      check: s => (s.playerWorkers[tier.id] ?? 0) >= 1,
    })
  ),
  {
    id: 'full-staff',
    name: 'Full Staff',
    description: 'Hire 10 of every kind of worker',
    check: s => TIERS.every(t => (s.playerWorkers[t.id] ?? 0) >= 10),
  },

  { id: 'speed-1', name: 'Picking Up the Pace', description: 'Buy your first "Faster"', check: s => s.speedLevel >= 1 },
  { id: 'speed-5', name: 'Breakneck', description: 'Reach "Faster" level 5', check: s => s.speedLevel >= 5 },

  {
    id: 'upgrade-1',
    name: 'Self-Improvement',
    description: 'Buy your first upgrade',
    check: s => s.upgrades.length >= 1,
  },
  { id: 'upgrade-10', name: 'Renovations', description: 'Buy 10 upgrades', check: s => s.upgrades.length >= 10 },

  { id: 'search-1', name: 'Seeker', description: 'Search the library', check: s => s.searches >= 1 },
  {
    id: 'search-found',
    name: 'Found It',
    description: 'Search for something that has already been written',
    check: s => s.searchesFound >= 1,
  },

  ...STORAGE_ACHIEVEMENTS.map(
    ([tierId, name, what]): Achievement => ({
      id: `fill-${tierId}`,
      name,
      description: `Fill ${what} with pages`,
      check: pages(STORAGE_CAPACITY[tierId]!),
    })
  ),
];

/** Features gated behind achievements. */
export const FEATURE_UNLOCKS = {
  hireNext: 'writers-room',
  hireMax: 'hire-manager',
} as const;

export function hasAchievement(s: GameState, id: string): boolean {
  return s.achievements.some(a => a.id === id);
}

/** Output multiplier from `count` unlocked achievements. */
export function achievementMultiplier(count: number): Decimal {
  return D(ACHIEVEMENT_BONUS).pow(count);
}

/**
 * Unlock every achievement whose condition now holds. Mutates `s` (pass a
 * store draft) and returns the newly unlocked ones.
 */
export function checkAchievements(s: GameState): Achievement[] {
  const have = new Set(s.achievements.map(a => a.id));
  const unlocked: Achievement[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!have.has(achievement.id) && achievement.check(s)) {
      s.achievements.push({ id: achievement.id, at: s.time });
      unlocked.push(achievement);
    }
  }
  return unlocked;
}
