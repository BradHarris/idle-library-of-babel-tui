import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { createRoot, flush } from 'solid-js';
import { OFFLINE_BOOST_MAX_SECONDS, OFFLINE_BOOST_MULTIPLIER, SPEED_MULTIPLIER, createInitialState } from './config.js';
import { ACHIEVEMENT_BONUS } from './achievements.js';
import { bankOffline, globalMultiplier, pagesPerSecond } from './economy.js';
import {
  DEEP_FOCUS_STEP,
  ERUDITION_PER_SOLVE,
  HASTE_STEP,
  INSIGHT_UPGRADES,
  LUCIDITY_FACTOR,
  RENOWN_STEP,
  achievementBonus,
  buyInsightUpgrade,
  getInsightUpgrade,
  insightBoostCap,
  insightBoostMultiplier,
  insightCost,
  insightGlobalMultiplier,
  isAutomationOn,
  speedFactor,
} from './insight.js';
import { runAutomation } from './automation.js';
import { D } from './bignum.js';
import { createGameStore, type GameStore } from './store.js';
import type { GameState } from './types.js';

const fresh = (patch: Partial<GameState> = {}): GameState => ({ ...createInitialState(), ...patch });

describe('insight — shop', () => {
  it('changes nothing until something is bought', () => {
    const s = fresh({ puzzlesSolved: ['babel', 'shelf'] });
    assert.ok(insightGlobalMultiplier(s).eq(1));
    assert.strictEqual(insightBoostCap(s), OFFLINE_BOOST_MAX_SECONDS);
    assert.strictEqual(insightBoostMultiplier(s), OFFLINE_BOOST_MULTIPLIER);
    assert.strictEqual(speedFactor(s), SPEED_MULTIPLIER);
    assert.strictEqual(achievementBonus(s), ACHIEVEMENT_BONUS);
  });

  it('prices each level by its growth', () => {
    const lucidity = getInsightUpgrade('lucidity')!;
    assert.deepStrictEqual(
      [0, 1, 2].map(l => insightCost(lucidity, l)),
      [0, 1, 2].map(l => Math.round(lucidity.baseCost * lucidity.costGrowth ** l))
    );
    assert.ok(insightCost(lucidity, 1) > insightCost(lucidity, 0));
  });

  it('buys levels with Insight, up to the max', () => {
    const s = fresh({ insight: 100 });
    assert.strictEqual(buyInsightUpgrade(s, 'clerks'), 10);
    assert.strictEqual(buyInsightUpgrade(s, 'clerks'), null, 'one-off');
    assert.strictEqual(s.insight, 90);
    assert.strictEqual(buyInsightUpgrade(fresh({ insight: 1 }), 'lucidity'), null, 'unaffordable');
    assert.strictEqual(buyInsightUpgrade(s, 'nope'), null);
  });

  it('every upgrade has a positive price and a max level', () => {
    for (const u of INSIGHT_UPGRADES) {
      assert.ok(insightCost(u, 0) > 0, u.id);
      assert.ok(u.maxLevel >= 1, u.id);
    }
  });
});

describe('insight — effects', () => {
  it('Lucidity and Erudition multiply page output', () => {
    const s = fresh({ insightUpgrades: { lucidity: 2, erudition: 1 }, puzzlesSolved: ['babel', 'shelf'] });
    const expected = LUCIDITY_FACTOR ** 2 * (1 + ERUDITION_PER_SOLVE * 2);
    assert.ok(Math.abs(insightGlobalMultiplier(s).toNumber() - expected) < 1e-9);
    assert.ok(Math.abs(globalMultiplier(s).toNumber() - expected) < 1e-9);
    assert.ok(Math.abs(pagesPerSecond(s).toNumber() - expected) < 1e-9);
  });

  it('Long Memory raises the boost cap and Deep Focus the boost', () => {
    const s = fresh({ insightUpgrades: { 'long-memory': 1, 'deep-focus': 2 } });
    bankOffline(s, 1e9);
    assert.strictEqual(s.boostSeconds, OFFLINE_BOOST_MAX_SECONDS * 2);
    assert.ok(globalMultiplier(s).eq(OFFLINE_BOOST_MULTIPLIER + 2 * DEEP_FOCUS_STEP));
  });

  it('Haste strengthens "Faster", Renown achievements', () => {
    const s = fresh({ speedLevel: 2, insightUpgrades: { haste: 1, renown: 1 }, achievements: [{ id: 'pages-1', at: 0 }] });
    const expected = (SPEED_MULTIPLIER + HASTE_STEP) ** 2 * (ACHIEVEMENT_BONUS + RENOWN_STEP);
    assert.ok(Math.abs(globalMultiplier(s).toNumber() - expected) < 1e-9);
  });
});

describe('insight — automation', () => {
  it('does nothing until bought, and respects the switches', () => {
    const s = fresh({ money: D(1e6) });
    assert.strictEqual(runAutomation(s), 0);
    s.insightUpgrades.clerks = 1;
    assert.ok(isAutomationOn(s, 'hire-writer'));
    assert.ok(!isAutomationOn(s, 'upgrades'));
    s.automation['hire-writer'] = false;
    runAutomation(s);
    assert.strictEqual(s.playerWorkers.writer, 1, 'writers switched off');
    assert.ok(s.playerWorkers.manager! > 0, 'managers hired');
    assert.strictEqual(s.speedLevel, 0, 'Momentum not bought');
  });

  it('buys "Faster" and upgrades once those are bought', () => {
    const s = fresh({ money: D(1e7), insightUpgrades: { momentum: 1, purchasing: 1 }, playerWorkers: { ...createInitialState().playerWorkers, writer: 25 } });
    runAutomation(s);
    assert.ok(s.speedLevel > 0);
    assert.ok(s.upgrades.includes('writer-25'));
  });

  it('runs from the store tick, once a game second', () => {
    let game!: GameStore;
    createRoot(() => (game = createGameStore()));
    game.setState(s => {
      s.money = D(1e6);
      s.insightUpgrades.clerks = 1;
    });
    game.tick(500);
    flush();
    assert.strictEqual(game.state.playerWorkers.manager, 0, 'not yet');
    game.tick(500);
    flush();
    assert.ok(game.state.playerWorkers.manager! > 0);
  });

  it('switches through the store, ignoring unknown keys', () => {
    let game!: GameStore;
    createRoot(() => (game = createGameStore()));
    game.setAutomation('speed', false);
    game.setAutomation('bogus', true);
    flush();
    assert.deepStrictEqual({ ...game.state.automation }, { speed: false });
  });
});
