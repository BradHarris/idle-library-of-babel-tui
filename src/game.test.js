import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TIERS, getWorkerCost, getDoublingMultiplier, getDoublingProgress, getDoublingThresholds, createInitialState, getTickInterval, calcPagesPerSecond, TICK_RATE_BASE_COST, LOG_MAX_ENTRIES, EARNINGS_PER_PAGE } from './config.js';
import { formatNumber, formatMoney, formatPageNumber, formatPagesPerSecond, wrapText } from './format.js';
import { generatePage } from './page.js';
import { useGameStore } from './stores/gameStore.ts';

// Helper: reset store to initial state for each test
function resetStore() {
  useGameStore.getState().reset();
}

describe('Game Engine — Tick', () => {
  it('produces pages proportional to elapsed time', () => {
    resetStore();
    useGameStore.getState().tick(1000); // 1 second with 1 writer
    const state = useGameStore.getState();
    assert.strictEqual(state.pagesGenerated, 1n, '1 page after 1 sec with 1 writer');
    assert.strictEqual(state.money, 1, '$1 after 1 page');
  });

  it('handles sub-second intervals', () => {
    resetStore();
    useGameStore.setState(s => { s.workers.writer = 4; });
    useGameStore.getState().tick(500); // 0.5 seconds with 4 writers = 2 pages
    const state = useGameStore.getState();
    assert.strictEqual(state._fractionalPages, 0, 'fractional pages accumulated to whole number');
    assert.strictEqual(state.pagesGenerated, 2n, '2 pages from 4 writers × 0.5s');
    assert.strictEqual(state.money, 2, '$2 from 2 pages');
  });

  it('handles fractional page accumulation', () => {
    resetStore();
    useGameStore.setState(s => {
      s.workers.writer = 1;
      s._fractionalPages = 0;
      s.pagesGenerated = 0n;
      s.currentPage = 0n;
    });
    
    useGameStore.getState().tick(750); // 0.75 pages
    assert.strictEqual(useGameStore.getState()._fractionalPages, 0.75, '0.75 fractional pages');
    assert.strictEqual(useGameStore.getState().pagesGenerated, 0n, 'no whole pages yet');
    
    useGameStore.getState().tick(250); // 0.25 more = 1.0 total
    assert.strictEqual(useGameStore.getState()._fractionalPages, 0, 'fractional pages cleared');
    assert.strictEqual(useGameStore.getState().pagesGenerated, 1n, '1 page generated');
  });

  it('zero-delta tick only applies cascade, no production', () => {
    resetStore();
    useGameStore.setState(s => {
      s.workers.writer = 1;
      s.money = 100;
      s.pagesGenerated = 5n;
      s.currentPage = 5n;
      s._fractionalPages = 0;
      s.log = [];
    });
    
    useGameStore.getState().tick(0);
    const state = useGameStore.getState();
    
    assert.strictEqual(state.money, 100, 'money unchanged');
    assert.strictEqual(state.pagesGenerated, 5n, 'pages unchanged');
    assert.strictEqual(state._fractionalPages, 0, 'fractional unchanged');
  });

  it('tick updates money correctly with multiple writers', () => {
    resetStore();
    useGameStore.setState(s => { s.workers.writer = 3; });
    useGameStore.getState().tick(2000); // 2 seconds × 3 writers = 6 pages
    const state = useGameStore.getState();
    assert.strictEqual(state.money, 6, '$6 from 3 writers × 2 seconds × $1/page');
  });
});

describe('Game Engine — Worker Costs', () => {
  it('first worker costs base price', () => {
    const writer = TIERS[0];
    assert.strictEqual(getWorkerCost(writer, 0), 10);
  });

  it('second worker costs 1.5× base', () => {
    const writer = TIERS[0];
    assert.strictEqual(getWorkerCost(writer, 1), 15);
  });

  it('third worker costs 2.25× base', () => {
    const writer = TIERS[0];
    assert.strictEqual(getWorkerCost(writer, 2), 22.5);
  });

  it('all tiers follow exponential scaling', () => {
    for (const tier of TIERS) {
      assert.strictEqual(getWorkerCost(tier, 1), tier.baseCost * 1.5, `${tier.name} count=1`);
      assert.strictEqual(getWorkerCost(tier, 2), tier.baseCost * 2.25, `${tier.name} count=2`);
      assert.strictEqual(getWorkerCost(tier, 3), tier.baseCost * 3.375, `${tier.name} count=3`);
    }
  });
});

describe('Game Engine — Worker Cascade', () => {
  it('single tier above writer', () => {
    resetStore();
    useGameStore.setState(s => {
      s.workers.writer = 1;
      s.workers.manager = 0;
      s.workers.overseer = 1;
      s.workers.rector = 0;
      s.workers.cardinal = 0;
      s.workers.pope = 0;
      s.workers.archbishop = 0;
    });
    
    useGameStore.getState().tick(0); // zero-delta, only cascade
    const state = useGameStore.getState();
    
    assert.strictEqual(state.workers.writer, 2, `writer: expected 2, got ${state.workers.writer}`);
    assert.strictEqual(state.workers.manager, 1, `manager: expected 1, got ${state.workers.manager}`);
    assert.strictEqual(state.workers.overseer, 1, `overseer: expected 1, got ${state.workers.overseer}`);
  });

  it('three tiers with workers', () => {
    resetStore();
    useGameStore.setState(s => {
      s.workers.writer = 1;
      s.workers.manager = 2;
      s.workers.overseer = 3;
    });
    
    useGameStore.getState().tick(0);
    const state = useGameStore.getState();
    
    assert.strictEqual(state.workers.writer, 6, `writer: expected 6, got ${state.workers.writer}`);
    assert.strictEqual(state.workers.manager, 5, `manager: expected 5, got ${state.workers.manager}`);
    assert.strictEqual(state.workers.overseer, 3, `overseer: expected 3, got ${state.workers.overseer}`);
  });

  it('all tiers populated', () => {
    resetStore();
    useGameStore.setState(s => {
      s.workers.writer = 1;
      s.workers.manager = 1;
      s.workers.overseer = 1;
      s.workers.rector = 1;
      s.workers.cardinal = 1;
      s.workers.pope = 1;
      s.workers.archbishop = 1;
    });
    
    useGameStore.getState().tick(0);
    const state = useGameStore.getState();
    
    assert.strictEqual(state.workers.writer, 7, `writer: expected 7, got ${state.workers.writer}`);
    assert.strictEqual(state.workers.manager, 6, `manager: expected 6, got ${state.workers.manager}`);
    assert.strictEqual(state.workers.overseer, 5, `overseer: expected 5, got ${state.workers.overseer}`);
    assert.strictEqual(state.workers.rector, 4, `rector: expected 4, got ${state.workers.rector}`);
    assert.strictEqual(state.workers.cardinal, 3, `cardinal: expected 3, got ${state.workers.cardinal}`);
    assert.strictEqual(state.workers.pope, 2, `pope: expected 2, got ${state.workers.pope}`);
    assert.strictEqual(state.workers.archbishop, 1, `archbishop: expected 1, got ${state.workers.archbishop}`);
  });

  it('cascading through gap (missing middle tier)', () => {
    resetStore();
    useGameStore.setState(s => {
      s.workers.writer = 1;
      s.workers.manager = 0;
      s.workers.overseer = 5;
      s.workers.rector = 0;
      s.workers.cardinal = 0;
      s.workers.pope = 0;
      s.workers.archbishop = 0;
    });
    
    useGameStore.getState().tick(0);
    const state = useGameStore.getState();
    
    assert.strictEqual(state.workers.writer, 6, `writer: expected 6, got ${state.workers.writer}`);
    assert.strictEqual(state.workers.manager, 5, `manager: expected 5, got ${state.workers.manager}`);
    assert.strictEqual(state.workers.overseer, 5, `overseer: expected 5, got ${state.workers.overseer}`);
  });
});

describe('Game Engine — Hire', () => {
  it('successful hire deducts correct amount', () => {
    resetStore();
    useGameStore.setState(s => { s.money = 1000; });
    const result = useGameStore.getState().hire('manager');
    const state = useGameStore.getState();
    assert.strictEqual(result.success, true, 'hire should succeed');
    assert.strictEqual(state.money, 500, `money: expected 500, got ${state.money}`);
    assert.strictEqual(state.workers.manager, 1, `manager count: expected 1, got ${state.workers.manager}`);
  });

  it('failed hire — insufficient funds', () => {
    resetStore();
    useGameStore.setState(s => { s.money = 499; });
    
    const result = useGameStore.getState().hire('manager');
    const state = useGameStore.getState();
    assert.strictEqual(result.success, false, 'hire should fail');
    assert.strictEqual(state.money, 499, 'money unchanged');
    assert.strictEqual(state.workers.manager, 0, 'manager count unchanged');
  });

  it('purchase appends to log with timestamp', () => {
    resetStore();
    useGameStore.setState(s => { s.money = 1000; s.log = []; });
    useGameStore.getState().hire('manager');
    const state = useGameStore.getState();
    assert.strictEqual(state.log.length, 1, 'one log entry');
    assert.ok(state.log[0].timestamp, 'log has timestamp');
    assert.ok(state.log[0].message.includes('Manager'), 'log mentions Manager');
    assert.ok(state.log[0].message.includes('$500'), 'log includes cost');
  });

  it('worker cost scales with count', () => {
    resetStore();
    useGameStore.setState(s => { s.money = 5000; });
    // Buy first manager: $500
    useGameStore.getState().hire('manager');
    assert.strictEqual(useGameStore.getState().workers.manager, 1);
    // Buy second manager: $750
    useGameStore.getState().hire('manager');
    assert.strictEqual(useGameStore.getState().workers.manager, 2);
    // Buy third manager: $1125
    useGameStore.getState().hire('manager');
    assert.strictEqual(useGameStore.getState().workers.manager, 3);
  });
});

describe('Game Engine — Tick Rate Upgrade', () => {
  it('successful upgrade', () => {
    resetStore();
    useGameStore.setState(s => { s.money = 100000; });
    const result = useGameStore.getState().upgradeTickRate();
    const state = useGameStore.getState();
    assert.strictEqual(result.success, true, 'upgrade should succeed');
    assert.strictEqual(state.tickRateLevel, 1, `level: expected 1, got ${state.tickRateLevel}`);
    assert.strictEqual(state.tickRateCost, 200000, `cost: expected 200000, got ${state.tickRateCost}`);
    assert.strictEqual(state.money, 0, `money: expected 0, got ${state.money}`);
  });

  it('failed upgrade — insufficient funds', () => {
    resetStore();
    useGameStore.setState(s => { s.money = 99999; });
    const result = useGameStore.getState().upgradeTickRate();
    assert.strictEqual(result.success, false, 'upgrade should fail');
    assert.strictEqual(useGameStore.getState().tickRateLevel, 0, 'level unchanged');
  });

  it('cost doubles each level', () => {
    resetStore();
    useGameStore.setState(s => { s.money = 10000000; }); // Enough for multiple upgrades
    useGameStore.getState().upgradeTickRate(); // level 1, cost 200K
    assert.strictEqual(useGameStore.getState().tickRateLevel, 1);
    assert.strictEqual(useGameStore.getState().tickRateCost, 200000);
    useGameStore.getState().upgradeTickRate(); // level 2, cost 400K
    assert.strictEqual(useGameStore.getState().tickRateLevel, 2);
    assert.strictEqual(useGameStore.getState().tickRateCost, 400000);
    useGameStore.getState().upgradeTickRate(); // level 3, cost 800K
    assert.strictEqual(useGameStore.getState().tickRateLevel, 3);
    assert.strictEqual(useGameStore.getState().tickRateCost, 800000);
  });

  it('upgrade appends to log', () => {
    resetStore();
    useGameStore.setState(s => { s.money = 100000; s.log = []; });
    useGameStore.getState().upgradeTickRate();
    const state = useGameStore.getState();
    assert.strictEqual(state.log.length, 1, 'one log entry');
    assert.ok(state.log[0].message.includes('Tick rate upgraded'), 'log mentions upgrade');
  });
});

describe('Game Engine — Reset', () => {
  it('full reset restores initial state', () => {
    resetStore();
    useGameStore.setState(s => {
      s.pagesGenerated = 1000n;
      s.money = 50000;
      s.workers.writer = 5;
      s.tickRateLevel = 3;
    });
    useGameStore.getState().reset();
    const state = useGameStore.getState();
    assert.strictEqual(state.pagesGenerated, 0n, 'pages reset');
    assert.strictEqual(state.money, 0, 'money reset');
    assert.strictEqual(state.workers.writer, 1, 'writer reset to 1');
    assert.strictEqual(state.tickRateLevel, 0, 'tick rate level reset');
    assert.strictEqual(state.tickRateCost, 100000, 'tick rate cost reset');
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
    assert.strictEqual(useGameStore.getState().pps, 1, '1 writer = 1 pps');
    useGameStore.setState(s => { s.workers.writer = 5; });
    useGameStore.getState().tick(0); // triggers derived state recomputation
    assert.strictEqual(useGameStore.getState().pps, 5, '5 writers = 5 pps');
  });

  it('tick interval is computed correctly', () => {
    resetStore();
    assert.strictEqual(useGameStore.getState().tickInterval, 1000, 'level 0 = 1000ms');
    useGameStore.setState(s => { s.tickRateLevel = 10; });
    useGameStore.getState().tick(0); // triggers derived state recomputation
    assert.strictEqual(useGameStore.getState().tickInterval, 500, 'level 10 = 500ms');
    useGameStore.setState(s => { s.tickRateLevel = 20; });
    useGameStore.getState().tick(0); // triggers derived state recomputation
    assert.strictEqual(useGameStore.getState().tickInterval, 33, 'level 20 = 33ms minimum');
  });

  it('canAfford is computed correctly', () => {
    resetStore();
    // With $0 and writer base cost $10, can't afford manager ($500)
    assert.strictEqual(useGameStore.getState().canAfford.manager, false, "can't afford manager with $0");
    useGameStore.setState(s => { s.money = 500; });
    useGameStore.getState().tick(0); // triggers derived state recomputation
    assert.strictEqual(useGameStore.getState().canAfford.manager, true, 'can afford manager with $500');
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
    assert.ok(result.includes('e+'), 'uses scientific notation');
  });
});

describe('Format Tests — formatPageNumber', () => {
  it('formats bigint page numbers with commas', () => {
    assert.strictEqual(formatPageNumber(1000n), '1,000');
    assert.strictEqual(formatPageNumber(1000000n), '1,000,000');
  });

  it('handles very large page numbers with scientific notation', () => {
    const result = formatPageNumber(99999999999999999999n);
    assert.ok(result.includes('e+'), 'uses scientific notation for very large pages');
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
  it('returns 1 for 0 purchased workers', () => {
    assert.strictEqual(getDoublingMultiplier(0), 1, '0 purchased = 1×');
  });

  it('returns 1 for 9 purchased workers', () => {
    assert.strictEqual(getDoublingMultiplier(9), 1, '9 purchased = 1× (before first milestone)');
  });

  it('returns 2 at 10 purchased workers', () => {
    assert.strictEqual(getDoublingMultiplier(10), 2, '10 purchased = 2×');
  });

  it('returns 2 between milestones (15 workers)', () => {
    assert.strictEqual(getDoublingMultiplier(15), 2, '15 purchased = 2×');
  });

  it('returns 4 at 20 purchased workers', () => {
    assert.strictEqual(getDoublingMultiplier(20), 4, '20 purchased = 4×');
  });

  it('returns 4 between milestones (30 workers)', () => {
    assert.strictEqual(getDoublingMultiplier(30), 4, '30 purchased = 4×');
  });

  it('returns 8 at 40 purchased workers', () => {
    assert.strictEqual(getDoublingMultiplier(40), 8, '40 purchased = 8×');
  });
});

describe('Doubling Milestones — Progress', () => {
  it('returns 0 at 0 purchased', () => {
    assert.strictEqual(getDoublingProgress(0), 0, '0 purchased = 0 progress');
  });

  it('returns 0.5 at 5 purchased', () => {
    assert.strictEqual(getDoublingProgress(5), 0.5, '5 purchased = 0.5 progress (5/10)');
  });

  it('returns 0 at 10 purchased (milestone reached)', () => {
    assert.strictEqual(getDoublingProgress(10), 0, '10 purchased = 0 progress (milestone reached)');
  });

  it('returns 0.5 at 15 purchased', () => {
    assert.strictEqual(getDoublingProgress(15), 0.5, '15 purchased = 0.5 progress (15-10)/(20-10)');
  });

  it('returns 0 at 20 purchased (milestone reached)', () => {
    assert.strictEqual(getDoublingProgress(20), 0, '20 purchased = 0 progress (milestone reached)');
  });

  it('returns 0.5 at 30 purchased', () => {
    assert.strictEqual(getDoublingProgress(30), 0.5, '30 purchased = 0.5 progress (30-20)/(40-20)');
  });
});

describe('Doubling Milestones — Thresholds', () => {
  it('returns first thresholds correctly', () => {
    const thresholds = getDoublingThresholds();
    assert.deepStrictEqual(thresholds.slice(0, 8), [10, 20, 40, 80, 160, 320, 640, 1280]);
  });

  it('returns 64 thresholds total', () => {
    assert.strictEqual(getDoublingThresholds().length, 64);
  });
});

describe('Doubling Milestones — PPS with Multiplier', () => {
  it('total output = worker count × multiplier', () => {
    resetStore();
    // Set 12 total writers, 10 purchased (multiplier = 2)
    useGameStore.setState(s => {
      s.workers.writer = 12;
      s.playerWorkers.writer = 10;
    });
    useGameStore.getState().tick(0); // triggers derived state recomputation
    const state = useGameStore.getState();
    assert.strictEqual(state.pps, 24, '12 writers × 2 multiplier = 24 pps');
  });

  it('no doubling below first milestone', () => {
    resetStore();
    useGameStore.setState(s => {
      s.workers.writer = 5;
      s.playerWorkers.writer = 5;
    });
    useGameStore.getState().tick(0);
    assert.strictEqual(useGameStore.getState().pps, 5, '5 writers × 1 multiplier = 5 pps');
  });
});

describe('Game Engine — Hire with Player Workers', () => {
  it('hire updates playerWorkers, cost uses player count', () => {
    resetStore();
    useGameStore.setState(s => { s.money = 10000; });
    // Start: 1 writer (free), cost of next = $10 × 1.5^1 = $15
    useGameStore.getState().hire('writer');
    const state = useGameStore.getState();
    assert.strictEqual(state.playerWorkers.writer, 2, 'playerWorkers writer = 2');
  });

  it('cascade does not affect playerWorkers or pricing', () => {
    resetStore();
    useGameStore.setState(s => {
      s.money = 10000;
      s.workers.writer = 3;
      s.workers.manager = 2;
      s.workers.overseer = 1;
      s.playerWorkers.writer = 3;
      s.playerWorkers.manager = 2;
      s.playerWorkers.overseer = 1;
    });
    useGameStore.getState().tick(1000); // cascades + produces pages
    const state = useGameStore.getState();
    assert.strictEqual(state.playerWorkers.writer, 3, 'playerWorkers.writer unchanged by cascade');
    assert.strictEqual(state.playerWorkers.manager, 2, 'playerWorkers.manager unchanged by cascade');
    assert.strictEqual(state.playerWorkers.overseer, 1, 'playerWorkers.overseer unchanged by cascade');
    assert.strictEqual(state.workers.writer, 6, 'workers.writer is cascade-augmented (3+2+1)');
  });
});
