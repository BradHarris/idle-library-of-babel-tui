import { describe, it } from 'vitest';
import { createRoot, flush, snapshot } from 'solid-js';
import assert from 'node:assert/strict';
import { planHire, getBulkCost, TIERS, getWorkerCost, getDoublingMultiplier, getDoublingProgress, getDoublingThresholds, getSpeedCost, SPEED_MULTIPLIER } from './config.js';
import { formatNumber, formatMoney, formatPageNumber, formatPagesPerSecond, wrapText } from './format.js';
import { generatePage } from './page.js';
import { createGameStore, type GameStore } from './store.js';
import { D } from './bignum.js';

let game: GameStore;
let disposeGame: (() => void) | undefined;

// Helper: start each test with a fresh store (its memos need a reactive owner)
function resetStore(): void {
  disposeGame?.();
  createRoot(dispose => {
    disposeGame = dispose;
    game = createGameStore();
  });
}

// Helper: apply pending writes, then read committed state plus derived values
function get() {
  flush();
  const state = snapshot(game.state);
  // Decimal amounts as plain numbers, so assertions stay readable
  return {
    ...state,
    money: state.money.toNumber(),
    workers: Object.fromEntries(Object.entries(state.workers).map(([id, n]) => [id, n.toNumber()])),
    pps: game.pps().toNumber(),
    canAfford: game.canAfford(),
    speedMultiplier: game.speedMultiplier().toNumber(),
  };
}

describe('Game Engine — Tick', () => {
  it('produces pages proportional to elapsed time', () => {
    resetStore();
    game.tick(1000); // 1 second with 1 writer
    const state = get();
    assert.strictEqual(state.pagesGenerated, 1n, '1 page after 1 sec with 1 writer');
    assert.strictEqual(state.money, 1, '$1 after 1 page');
  });

  it('handles sub-second intervals', () => {
    resetStore();
    game.setState(s => { s.workers.writer = D(4); });
    game.tick(500); // 0.5 seconds with 4 writers = 2 pages
    const state = get();
    assert.strictEqual(state._fractionalPages, 0, 'fractional pages accumulated to whole number');
    assert.strictEqual(state.pagesGenerated, 2n, '2 pages from 4 writers × 0.5s');
    assert.strictEqual(state.money, 2, '$2 from 2 pages');
  });

  it('handles fractional page accumulation', () => {
    resetStore();
    game.setState(s => {
      s.workers.writer = D(1);
      s._fractionalPages = 0;
      s.pagesGenerated = 0n;
      s.currentPage = 0n;
    });
    
    game.tick(750); // 0.75 pages
    assert.strictEqual(get()._fractionalPages, 0.75, '0.75 fractional pages');
    assert.strictEqual(get().pagesGenerated, 0n, 'no whole pages yet');
    
    game.tick(250); // 0.25 more = 1.0 total
    assert.strictEqual(get()._fractionalPages, 0, 'fractional pages cleared');
    assert.strictEqual(get().pagesGenerated, 1n, '1 page generated');
  });

  it('zero-delta tick only applies cascade, no production', () => {
    resetStore();
    game.setState(s => {
      s.workers.writer = D(1);
      s.money = D(100);
      s.pagesGenerated = 5n;
      s.currentPage = 5n;
      s._fractionalPages = 0;
      s.log = [];
    });
    
    game.tick(0);
    const state = get();
    
    assert.strictEqual(state.money, 100, 'money unchanged');
    assert.strictEqual(state.pagesGenerated, 5n, 'pages unchanged');
    assert.strictEqual(state._fractionalPages, 0, 'fractional unchanged');
  });

  it('tick updates money correctly with multiple writers', () => {
    resetStore();
    game.setState(s => { s.workers.writer = D(3); });
    game.tick(2000); // 2 seconds × 3 writers = 6 pages
    const state = get();
    assert.strictEqual(state.money, 6, '$6 from 3 writers × 2 seconds × $1/page');
  });
});

describe('Game Engine — Worker Costs', () => {
  it('first worker costs base price', () => {
    const writer = TIERS[0]!;
    assert.strictEqual(getWorkerCost(writer, 0).toNumber(), 10);
  });

  it('each purchase multiplies the price by the tier growth', () => {
    for (const tier of TIERS) {
      assert.ok(Math.abs(getWorkerCost(tier, 1).toNumber() - tier.baseCost * tier.costGrowth) < 1e-6, `${tier.name} count=1`);
      assert.ok(Math.abs(getWorkerCost(tier, 3).toNumber() - tier.baseCost * tier.costGrowth ** 3) < 1e-6, `${tier.name} count=3`);
    }
  });

  it('higher tiers cost more and scale faster', () => {
    for (let i = 1; i < TIERS.length; i++) {
      assert.ok(TIERS[i]!.baseCost > TIERS[i - 1]!.baseCost, `${TIERS[i]!.name} base`);
      assert.ok(TIERS[i]!.costGrowth > TIERS[i - 1]!.costGrowth, `${TIERS[i]!.name} growth`);
    }
  });
});

describe('Game Engine — Production', () => {
  it('each tier makes workers of the tier below, per second', () => {
    resetStore();
    game.setState(s => {
      s.workers.manager = D(2);
    });
    game.tick(1000);
    const manager = TIERS[1]!;
    assert.ok(Math.abs(get().workers.writer! - (1 + 2 * manager.rate)) < 1e-9, `writers: ${get().workers.writer}`);
  });

  it('production is per second, independent of the tick size', () => {
    const run = (ticks: number, ms: number) => {
      resetStore();
      game.setState(s => {
        s.workers.overseer = D(3);
      });
      for (let i = 0; i < ticks; i++) game.tick(ms);
      return get().workers.manager!;
    };
    assert.ok(Math.abs(run(1, 1000) - run(20, 50)) < 1e-9);
  });

  it('only the tier directly below grows', () => {
    resetStore();
    game.setState(s => {
      s.workers.overseer = D(5);
    });
    game.tick(1000);
    const state = get();
    assert.ok(state.workers.manager! > 0, 'overseers make managers');
    assert.strictEqual(state.workers.writer, 1, 'writers only come from managers');
  });

  it("a tier's doubling bonus multiplies what it makes", () => {
    resetStore();
    game.setState(s => {
      s.workers.manager = D(10);
      s.playerWorkers.manager = 10; // first threshold: ×2
    });
    game.tick(1000);
    const manager = TIERS[1]!;
    assert.ok(Math.abs(get().workers.writer! - (1 + 10 * manager.rate * 2)) < 1e-9);
  });

  it('produced workers do not count as hired', () => {
    resetStore();
    game.setState(s => {
      s.workers.manager = D(4);
      s.playerWorkers.manager = 4;
    });
    game.tick(10_000);
    assert.strictEqual(get().playerWorkers.writer, 1);
    assert.ok(get().workers.writer! > 1);
  });
});

describe('Game Engine — Hire', () => {
  it('successful hire deducts correct amount', () => {
    resetStore();
    game.setState(s => { s.money = D(1000); });
    const result = game.hire('manager');
    const state = get();
    assert.strictEqual(result.success, true, 'hire should succeed');
    assert.strictEqual(state.money, 920, `money: expected 920, got ${state.money}`);
    assert.strictEqual(state.workers.manager, 1, `manager count: expected 1, got ${state.workers.manager}`);
  });

  it('failed hire — insufficient funds', () => {
    resetStore();
    game.setState(s => { s.money = D(79); });
    
    const result = game.hire('manager');
    const state = get();
    assert.strictEqual(result.success, false, 'hire should fail');
    assert.strictEqual(state.money, 79, 'money unchanged');
    assert.strictEqual(state.workers.manager, 0, 'manager count unchanged');
  });

  it('purchase appends to log with timestamp', () => {
    resetStore();
    game.setState(s => { s.money = D(1000); s.log = []; });
    game.hire('manager');
    const state = get();
    const entry = state.log.find(e => e.message.startsWith('Hired Manager'));
    assert.ok(entry, 'hire is logged');
    assert.ok(entry.timestamp, 'log has timestamp');
    assert.ok(entry.message.includes('$80'), 'log includes cost');
    // The first manager also unlocks an achievement, logged after the hire
    assert.strictEqual(state.log.at(-1)!.message, 'Achievement: Middle Management');
  });

  it('worker cost scales with count', () => {
    resetStore();
    game.setState(s => { s.money = D(5000); });
    // $80, then $96, then $115.20
    game.hire('manager');
    assert.strictEqual(get().workers.manager, 1);
    game.hire('manager');
    assert.strictEqual(get().workers.manager, 2);
    game.hire('manager');
    assert.strictEqual(get().workers.manager, 3);
  });
});

describe('Game Engine — Faster', () => {
  it('successful upgrade', () => {
    resetStore();
    game.setState(s => { s.money = getSpeedCost(0); });
    const result = game.upgradeSpeed();
    const state = get();
    assert.strictEqual(result.success, true, 'upgrade should succeed');
    assert.strictEqual(state.speedLevel, 1);
    assert.strictEqual(state.money, 0);
    assert.strictEqual(state.speedMultiplier, SPEED_MULTIPLIER);
  });

  it('failed upgrade — insufficient funds', () => {
    resetStore();
    game.setState(s => { s.money = getSpeedCost(0).sub(1); });
    const result = game.upgradeSpeed();
    assert.strictEqual(result.success, false, 'upgrade should fail');
    assert.strictEqual(get().speedLevel, 0, 'level unchanged');
  });

  it('cost ratio between levels keeps growing (super-exponential)', () => {
    let previousRatio = 0;
    for (let level = 1; level < 8; level++) {
      const ratio = getSpeedCost(level).div(getSpeedCost(level - 1)).toNumber();
      assert.ok(ratio > previousRatio, `ratio at level ${level}: ${ratio}`);
      assert.ok(ratio > SPEED_MULTIPLIER * 4, 'each level costs far more than it pays back at once');
      previousRatio = ratio;
    }
  });

  it('multiplies page output', () => {
    resetStore();
    game.setState(s => { s.speedLevel = 2; s.workers.writer = D(4); });
    assert.ok(Math.abs(get().pps - 4 * SPEED_MULTIPLIER ** 2) < 1e-9);
  });

  it('upgrade appends to log', () => {
    resetStore();
    game.setState(s => { s.money = getSpeedCost(0); s.log = []; });
    game.upgradeSpeed();
    const state = get();
    assert.ok(state.log.some(e => e.message.startsWith('Faster: level 1')), 'log mentions upgrade');
  });
});

describe('Game Engine — Reset', () => {
  it('full reset restores initial state', () => {
    resetStore();
    game.setState(s => {
      s.pagesGenerated = 1000n;
      s.money = D(50000);
      s.workers.writer = D(5);
      s.speedLevel = 3;
      s.achievements.push({ id: 'pages-1', at: 0 });
    });
    game.reset();
    const state = get();
    assert.strictEqual(state.pagesGenerated, 0n, 'pages reset');
    assert.strictEqual(state.money, 0, 'money reset');
    assert.strictEqual(state.workers.writer, 1, 'writer reset to 1');
    assert.strictEqual(state.speedLevel, 0, 'speed level reset');
    assert.deepStrictEqual(state.achievements, [], 'achievements reset');
  });
});

describe('Game Engine — Page Generation', () => {
  it('generates deterministic page from page number', () => {
    const page1 = generatePage(1n);
    const page2 = generatePage(2n);
    
    assert.strictEqual(page1.length, 280, 'page length is 280');
    assert.notStrictEqual(page1, page2, 'different pages have different content');
  });

  it('same page number produces same content', () => {
    const page1a = generatePage(42n);
    const page1b = generatePage(42n);
    
    assert.strictEqual(page1a, page1b, 'same page number produces identical content');
  });
});

describe('Game Engine — Computed Getters', () => {
  it('pps is computed from worker counts', () => {
    resetStore();
    assert.strictEqual(get().pps, 1, '1 writer = 1 pps');
    game.setState(s => { s.workers.writer = D(5); });
    game.tick(0); // triggers derived state recomputation
    assert.strictEqual(get().pps, 5, '5 writers = 5 pps');
  });

  it('speed multiplier follows the Faster level', () => {
    resetStore();
    assert.strictEqual(get().speedMultiplier, 1, 'level 0 = ×1');
    game.setState(s => { s.speedLevel = 3; });
    assert.strictEqual(get().speedMultiplier, SPEED_MULTIPLIER ** 3);
  });

  it('canAfford is computed correctly', () => {
    resetStore();
    assert.strictEqual(get().canAfford.manager, false, "can't afford manager with $0");
    game.setState(s => { s.money = D(80); });
    assert.strictEqual(get().canAfford.manager, true, 'can afford manager with $80');
  });
});

describe('Format Tests — 1K Boundary', () => {
  it('formatMoney at 999 boundary', () => {
    assert.strictEqual(formatMoney(999), '$999');
  });

  it('formatMoney at 1000 boundary', () => {
    assert.strictEqual(formatMoney(1000), '$1.00K');
  });

  it('formatNumber at 999 boundary', () => {
    assert.strictEqual(formatNumber(999), '999');
  });

  it('formatNumber at 1000 boundary', () => {
    assert.strictEqual(formatNumber(1000), '1.00K');
  });

  it('formatNumber for large worker counts', () => {
    assert.strictEqual(formatNumber(1500), '1.50K');
  });

  it('formatNumber uses scientific notation for very large numbers', () => {
    const result = formatNumber(99999999999999999999);
    assert.strictEqual(result, '1.00e20', 'uses scientific notation');
  });
});

describe('Format Tests — formatPageNumber', () => {
  it('formats bigint page numbers with commas', () => {
    assert.strictEqual(formatPageNumber(1000n), '1,000');
    assert.strictEqual(formatPageNumber(1000000n), '1,000,000');
  });

  it('handles very large page numbers with scientific notation', () => {
    const result = formatPageNumber(99999999999999999999n);
    assert.strictEqual(result, '1.00e20', 'uses scientific notation for very large pages');
  });
});

describe('Format Tests — formatPagesPerSecond', () => {
  it('formats pps with 2 decimal places', () => {
    assert.strictEqual(formatPagesPerSecond(0), '0.00');
    assert.strictEqual(formatPagesPerSecond(1), '1.00');
    assert.strictEqual(formatPagesPerSecond(42.123), '42.12');
  });
});

describe('Format Tests — Worker Count Display', () => {
  it('formatNumber for small counts matches raw string', () => {
    assert.strictEqual(formatNumber(42), '42');
    assert.strictEqual(formatNumber(0), '0');
    assert.strictEqual(formatNumber(99), '99');
  });

  it('formatNumber for large counts uses suffix', () => {
    assert.strictEqual(formatNumber(1000), '1.00K');
    assert.strictEqual(formatNumber(15000), '15.00K');
    assert.strictEqual(formatNumber(2500000), '2.50M');
  });
});

describe('Format Tests — wrapText', () => {
  it('wraps text at character boundaries', () => {
    const lines = wrapText('hello world this is a test', 10);
    assert.deepStrictEqual(lines, ['hello worl', 'd this is ', 'a test']);
  });

  it('returns empty array for empty text', () => {
    assert.deepStrictEqual(wrapText('', 80), ['']);
  });

  it('returns single line for short text', () => {
    assert.deepStrictEqual(wrapText('hello', 80), ['hello']);
  });
});

describe('Doubling Milestones — Multiplier', () => {
  it('doubles at 10, 40, 160, ... bought', () => {
    const cases: [number, number][] = [[0, 1], [9, 1], [10, 2], [39, 2], [40, 4], [159, 4], [160, 8], [640, 16]];
    for (const [bought, multiplier] of cases) {
      assert.strictEqual(getDoublingMultiplier(bought), multiplier, `${bought} bought`);
    }
  });
});

describe('Doubling Milestones — Progress', () => {
  it('measures progress from the last threshold to the next', () => {
    assert.strictEqual(getDoublingProgress(0), 0);
    assert.strictEqual(getDoublingProgress(5), 0.5, '5/10');
    assert.strictEqual(getDoublingProgress(10), 0, 'milestone reached');
    assert.strictEqual(getDoublingProgress(25), 0.5, '(25-10)/(40-10)');
    assert.strictEqual(getDoublingProgress(100), 0.5, '(100-40)/(160-40)');
  });
});

describe('Doubling Milestones — Thresholds', () => {
  it('grow by ×4', () => {
    assert.deepStrictEqual(getDoublingThresholds().slice(0, 5), [10, 40, 160, 640, 2560]);
  });
});

describe('Doubling Milestones — PPS with Multiplier', () => {
  it('total output = worker count × multiplier', () => {
    resetStore();
    // 12 writers, 10 bought (multiplier ×2)
    game.setState(s => {
      s.workers.writer = D(12);
      s.playerWorkers.writer = 10;
    });
    const state = get();
    assert.strictEqual(state.pps, 24, '12 writers × 2 multiplier = 24 pps');
  });

  it('no doubling below first milestone', () => {
    resetStore();
    game.setState(s => {
      s.workers.writer = D(5);
      s.playerWorkers.writer = 5;
    });
    game.tick(0);
    assert.strictEqual(get().pps, 5, '5 writers × 1 multiplier = 5 pps');
  });
});

describe('Game Engine — Hire with Player Workers', () => {
  it('hire updates playerWorkers, cost uses player count', () => {
    resetStore();
    game.setState(s => { s.money = D(10000); });
    // Start: 1 writer (free), cost of next = $10 × 1.5^1 = $15
    game.hire('writer');
    const state = get();
    assert.strictEqual(state.playerWorkers.writer, 2, 'playerWorkers writer = 2');
  });

});

describe('Game Engine — Actions in one frame', () => {
  // Solid batches writes until flush; actions must see each other's pending writes
  it('back-to-back hires without a flush spend correctly', () => {
    resetStore();
    game.setState(s => { s.money = D(100); });
    assert.strictEqual(game.hire('manager').success, true); // $80
    const second = game.hire('manager'); // costs $96, only $20 left
    const state = get();
    assert.strictEqual(second.success, false, 'second hire sees reduced money');
    assert.strictEqual(state.money, 20);
    assert.strictEqual(state.playerWorkers.manager, 1);
  });

  it('a tick then a hire in the same frame uses the new money', () => {
    resetStore();
    const price = getWorkerCost(TIERS[0]!, 1); // 2nd writer
    game.setState(s => { s.money = price.sub(1); });
    game.tick(1000); // +$1
    assert.strictEqual(game.hire('writer').success, true);
    assert.ok(Math.abs(get().money) < 1e-9);
  });

  it('hireBulk stops when money runs out', () => {
    resetStore();
    const manager = TIERS.find(t => t.id === 'manager')!;
    game.setState(s => { s.money = getBulkCost(manager, 0, 3).add(1); });
    const result = game.hireBulk('manager', 10);
    assert.strictEqual(result.message.startsWith('Hired 3 Managers'), true, result.message);
    assert.strictEqual(get().money, 1);
  });
});

describe('planHire', () => {
  const writer = TIERS[0]!;

  it('one: single worker at current cost', () => {
    assert.deepStrictEqual(planHire('one', writer, 1, 0), { count: 1, cost: getWorkerCost(writer, 1) });
  });

  it('next: enough to reach the next doubling threshold', () => {
    const next = getDoublingThresholds().find(t => t > 1)!;
    assert.deepStrictEqual(planHire('next', writer, 1, 0), {
      count: next - 1,
      cost: getBulkCost(writer, 1, next - 1),
    });
  });

  it('max: as many as money allows, or 0 when none', () => {
    assert.strictEqual(planHire('max', writer, 1, getWorkerCost(writer, 1).sub(0.01)).count, 0);
    const cost = getBulkCost(writer, 1, 3);
    assert.deepStrictEqual(planHire('max', writer, 1, cost), { count: 3, cost });
  });
});
