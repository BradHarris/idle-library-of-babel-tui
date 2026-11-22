import { describe, it } from 'vitest';
import { createRoot, flush, snapshot } from 'solid-js';
import assert from 'node:assert/strict';
import { TIERS, createInitialState, getWorkerCost } from './config.js';
import { STORAGE_CAPACITY } from './achievements.js';
import { D } from './bignum.js';
import { pagesPerSecond, productionPerSecond } from './economy.js';
import { createGameStore, type GameStore } from './store.js';
import {
  UPGRADES,
  UPGRADE_COST_FACTOR,
  availableUpgrades,
  buyUpgrade,
  getUpgrade,
  isUnlocked,
  nextLocked,
  requirementProgress,
  requirementText,
  upgradeGlobalMultiplier,
  upgradeTierMultiplier,
} from './upgrades.js';
import type { GameState } from './types.js';

const rich = (s: GameState) => {
  s.money = D(10).pow(100);
  return s;
};
const upgrade = (id: string) => getUpgrade(id)!;

describe('upgrades — table', () => {
  it('has unique ids and four upgrades per tier plus milestones', () => {
    assert.equal(new Set(UPGRADES.map(u => u.id)).size, UPGRADES.length);
    for (const tier of TIERS) assert.equal(UPGRADES.filter(u => u.group === tier.id).length, 4);
    assert.ok(UPGRADES.some(u => u.group === 'milestone'));
  });

  it('prices tier upgrades from the worker that unlocks them', () => {
    const writer = TIERS[0]!;
    assert.ok(upgrade('writer-50').cost.eq(getWorkerCost(writer, 50).mul(UPGRADE_COST_FACTOR)));
  });

  it('describes requirements', () => {
    assert.equal(requirementText(upgrade('writer-50')), 'Hire 50 writers');
    assert.equal(requirementText(upgrade('fill-hardDrive')), 'Fill a hard drive');
  });

  it('describes small synergies without rounding them to 0%', () => {
    for (const u of UPGRADES.filter(u => u.effect.kind === 'synergy')) {
      assert.doesNotMatch(u.description, /\+0%/, u.id);
    }
    const coaching = upgrade('manager-75');
    assert.equal(coaching.effect.kind, 'synergy');
    if (coaching.effect.kind !== 'synergy') return;
    assert.equal(coaching.description, `Managers +${coaching.effect.perUnit * 100}% per writer hired`);
  });
});

describe('upgrades — unlocking', () => {
  it('unlocks a tier upgrade at exactly the hired count', () => {
    const s = createInitialState();
    s.playerWorkers.writer = 24;
    assert.equal(isUnlocked(s, upgrade('writer-25')), false);
    assert.equal(requirementProgress(s, upgrade('writer-25')), 24 / 25);
    s.playerWorkers.writer = 25;
    assert.equal(isUnlocked(s, upgrade('writer-25')), true);
    assert.deepEqual(availableUpgrades(s).map(u => u.id), ['writer-25']);
  });

  it('unlocks a milestone upgrade when a drive fills', () => {
    const s = createInitialState();
    s.pagesGenerated = STORAGE_CAPACITY.hardDrive! - 1n;
    assert.equal(isUnlocked(s, upgrade('fill-hardDrive')), false);
    s.pagesGenerated += 1n;
    assert.equal(isUnlocked(s, upgrade('fill-hardDrive')), true);
  });

  it('teases the next locked upgrade in each group', () => {
    const s = createInitialState();
    s.playerWorkers.writer = 30;
    const teasers = nextLocked(s);
    assert.equal(teasers.find(u => u.group === 'writer')?.id, 'writer-50');
    assert.equal(teasers.find(u => u.group === 'milestone')?.id, 'fill-hardDrive');
    assert.equal(new Set(teasers.map(u => u.group)).size, teasers.length);
  });
});

describe('upgrades — buying', () => {
  it('deducts the price once and refuses locked, bought or unaffordable upgrades', () => {
    const s = createInitialState();
    s.playerWorkers.writer = 25;
    s.money = upgrade('writer-25').cost.mul(1.5);
    assert.equal(buyUpgrade(s, 'writer-50'), null, 'locked');
    assert.ok(buyUpgrade(s, 'writer-25')?.eq(upgrade('writer-25').cost));
    assert.ok(Math.abs(s.money.div(upgrade('writer-25').cost).toNumber() - 0.5) < 1e-9);
    assert.equal(buyUpgrade(s, 'writer-25'), null, 'already bought');
    assert.deepEqual(s.upgrades, ['writer-25']);

    s.playerWorkers.manager = 25;
    assert.equal(buyUpgrade(s, 'manager-25'), null, 'unaffordable');
    assert.equal(buyUpgrade(s, 'no-such-upgrade'), null);
  });
});

describe('upgrades — effects', () => {
  it('a writer upgrade multiplies page output', () => {
    const s = rich(createInitialState());
    s.playerWorkers.writer = 25;
    const before = pagesPerSecond(s);
    buyUpgrade(s, 'writer-25');
    const factor = (upgrade('writer-25').effect as { factor: number }).factor;
    assert.ok(Math.abs(pagesPerSecond(s).div(before).toNumber() - factor) < 1e-9);
  });

  it('a synergy scales with workers bought of its source tier', () => {
    const s = rich(createInitialState());
    s.playerWorkers.writer = 75;
    s.playerWorkers.manager = 40;
    buyUpgrade(s, 'writer-75');
    const effect = upgrade('writer-75').effect;
    assert.equal(effect.kind, 'synergy');
    if (effect.kind !== 'synergy') return;
    assert.equal(effect.sourceTierId, 'manager');
    assert.equal(upgradeTierMultiplier(s, 'writer'), 1 + effect.perUnit * 40);
  });

  it('a milestone upgrade multiplies pages but not worker production', () => {
    const s = rich(createInitialState());
    s.workers.manager = D(10);
    s.pagesGenerated = STORAGE_CAPACITY.hardDrive!;
    const pps = pagesPerSecond(s);
    const managers = productionPerSecond(s, 1);
    buyUpgrade(s, 'fill-hardDrive');
    assert.ok(upgradeGlobalMultiplier(s).gt(1));
    assert.ok(pagesPerSecond(s).eq(pps.mul(upgradeGlobalMultiplier(s))));
    assert.ok(productionPerSecond(s, 1).eq(managers));
  });
});

describe('upgrades — store', () => {
  // Create the store inside a root (its memos need an owner), but act outside it
  function withStore(fn: (game: GameStore) => void): void {
    let game!: GameStore;
    let dispose!: () => void;
    createRoot(d => {
      dispose = d;
      game = createGameStore();
    });
    try {
      fn(game);
    } finally {
      dispose();
    }
  }

  it('buys through the draft, so two purchases before a flush both apply', () => {
    withStore(game => {
      game.setState(s => {
        s.playerWorkers.writer = 50;
        s.money = upgrade('writer-25').cost.add(upgrade('writer-50').cost);
      });
      assert.equal(game.buyUpgrade('writer-25').success, true);
      assert.equal(game.buyUpgrade('writer-50').success, true);
      assert.equal(game.buyUpgrade('writer-50').message, 'Already bought');
      flush();
      const state = snapshot(game.state);
      assert.deepEqual(state.upgrades, ['writer-25', 'writer-50']);
      assert.ok(state.money.lt(1));
      assert.ok(state.log.at(-1)!.message.startsWith('Upgrade: '));
      assert.ok(state.achievements.some(a => a.id === 'upgrade-1'));
      assert.deepEqual(game.availableUpgrades(), []);
      // 50 writers: two doublings (10, 40) × both upgrades
      const [a, b] = [upgrade('writer-25'), upgrade('writer-50')].map(u => (u.effect as { factor: number }).factor);
      assert.equal(game.tierMultipliers().writer, 4 * a! * b!);
    });
  });

  it('explains why a purchase failed', () => {
    withStore(game => {
      assert.equal(game.buyUpgrade('writer-25').message, 'Locked: Hire 25 writers');
      game.setState(s => {
        s.playerWorkers.writer = 25;
      });
      assert.match(game.buyUpgrade('writer-25').message, /^Not enough money/);
      assert.equal(game.buyUpgrade('nope').message, 'Unknown upgrade');
    });
  });
});
