import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fixtureV1 from './__fixtures__/save-v1.json';
import { D, Decimal } from './bignum.js';
import { TIERS, createInitialState, OFFLINE_BOOST_MAX_SECONDS } from './config.js';
import {
  BACKUP_KEY,
  SAVE_KEY,
  SAVE_VERSION,
  clearSave,
  decodeSave,
  encodeSave,
  exportSave,
  hydrate,
  importSave,
  readSave,
  writeSave,
  type LoadResult,
} from './save.js';
import type { GameState } from './types.js';

/** In-memory Storage. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: k => data.get(k) ?? null,
    key: i => [...data.keys()][i] ?? null,
    removeItem: k => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

function loaded(result: LoadResult): GameState {
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.state;
}

function sampleState(): GameState {
  const s = createInitialState();
  s.pagesGenerated = 2n ** 80n + 7n;
  s.currentPage = 2n ** 80n + 7n;
  s.money = D(1.2345678901234).mul(D(10).pow(400));
  s.workers.writer = D(1234.5678);
  s.workers.manager = D(0.1);
  s.playerWorkers.writer = 25;
  s.log.push({ timestamp: '12:00:00', message: 'hello' });
  s._fractionalPages = 0.75;
  s.speedLevel = 2;
  s.time = 999.25;
  s.achievements.push({ id: 'pages-1', at: 3 });
  s.searches = 2;
  s.searchesFound = 1;
  s.boostSeconds = 12.5;
  s.upgrades.push('writer-25', 'fill-hardDrive');
  s.insight = 7;
  s.puzzlesSolved.push('babel');
  s.puzzlesFailed.push('codex');
  s.puzzleGuesses = { babel: ['lebba', 'babel'], shelf: ['slhfe'] };
  s.insightUpgrades = { lucidity: 2, clerks: 1 };
  s.automation = { 'hire-writer': false, speed: true };
  return s;
}

const sameDecimal = (a: Decimal, b: Decimal) => assert.deepEqual([a.m, a.e], [b.m, b.e]);

describe('save — round trip', () => {
  it('restores every field exactly, including bigints past 2^53 and huge Decimals', () => {
    const s = sampleState();
    const back = loaded(decodeSave(encodeSave(s, 1000)));
    assert.equal(back.pagesGenerated, s.pagesGenerated);
    assert.equal(back.currentPage, s.currentPage);
    sameDecimal(back.money, s.money);
    for (const tier of TIERS) sameDecimal(back.workers[tier.id]!, s.workers[tier.id]!);
    assert.deepEqual(back.playerWorkers, s.playerWorkers);
    assert.deepEqual(back.log, s.log);
    assert.deepEqual(back.achievements, s.achievements);
    assert.equal(back._fractionalPages, 0.75);
    assert.equal(back.speedLevel, 2);
    assert.equal(back.time, 999.25);
    assert.equal(back.searches, 2);
    assert.equal(back.searchesFound, 1);
    assert.equal(back.boostSeconds, 12.5);
    assert.deepEqual(back.upgrades, ['writer-25', 'fill-hardDrive']);
    assert.equal(back.insight, 7);
    assert.deepEqual(back.puzzlesSolved, ['babel']);
    assert.deepEqual(back.puzzlesFailed, ['codex']);
    assert.deepEqual(back.puzzleGuesses, s.puzzleGuesses);
    assert.deepEqual(back.insightUpgrades, s.insightUpgrades);
    assert.deepEqual(back.automation, s.automation);
  });

  it('drops bad Reading Room data, keeping the rest', () => {
    const back = hydrate({
      insight: -3,
      puzzlesSolved: ['babel', 'nope', 3, 'babel'],
      puzzlesFailed: ['babel', 'codex', 'nope'],
      puzzleGuesses: { babel: ['babel', 'label', 7, 'lebba', 'lebba', 'lebba', 'lebba', 'lebba'], nope: ['x'], shelf: 'slhfe' },
      insightUpgrades: { lucidity: 2.5, clerks: 9, haste: 2, bogus: 1 },
      automation: { 'hire-writer': 'no', upgrades: false, bogus: true },
    });
    assert.equal(back.insight, 0);
    assert.deepEqual(back.puzzlesSolved, ['babel']);
    assert.deepEqual(back.puzzlesFailed, ['codex'], 'solved wins over lost');
    assert.deepEqual(back.puzzleGuesses, { babel: ['babel', 'lebba', 'lebba', 'lebba', 'lebba'] }, 'at most MAX_GUESSES');
    assert.deepEqual(back.insightUpgrades, { clerks: 1, haste: 2 });
    assert.deepEqual(back.automation, { upgrades: false });
  });

  it('lets Long Memory hold more offline boost', () => {
    const back = hydrate({ boostSeconds: 1e9, insightUpgrades: { 'long-memory': 1 } });
    assert.equal(back.boostSeconds, OFFLINE_BOOST_MAX_SECONDS * 2);
  });

  it('keeps savedAt and the version', () => {
    const raw = encodeSave(createInitialState(), 4242);
    assert.equal(JSON.parse(raw).v, SAVE_VERSION);
    const result = decodeSave(raw);
    assert.ok(result.ok && result.savedAt === 4242);
  });

  it('export and import round-trip, and import accepts raw JSON too', () => {
    const s = sampleState();
    s.log.push({ timestamp: '12:00:01', message: 'ünïcødé — ✓' });
    const back = loaded(importSave(exportSave(s, 1)));
    assert.equal(back.pagesGenerated, s.pagesGenerated);
    assert.deepEqual(back.log, s.log);
    assert.equal(loaded(importSave(encodeSave(s, 1))).speedLevel, 2);
  });

  it('import rejects empty and garbage strings', () => {
    assert.equal(importSave('   ').ok, false);
    assert.equal(importSave('not a save!!').ok, false);
    assert.equal(importSave(btoa('{"nope": true}')).ok, false);
  });
});

describe('save — v1 fixture (old saves must keep loading)', () => {
  // Never edit the fixture to fix this test: add a migration instead
  it('decodes the committed v1 save', () => {
    const result = decodeSave(JSON.stringify(fixtureV1));
    const s = loaded(result);
    assert.ok(result.ok && result.savedAt === 1795000000000);
    assert.equal(s.pagesGenerated, 123456789012345678901n);
    sameDecimal(s.money, Decimal.fromParts(4.56789, 22));
    assert.equal(s.workers.writer!.toNumber(), 1250);
    assert.equal(s.workers.manager!.toNumber(), 35);
    assert.equal(s.playerWorkers.writer, 40);
    assert.equal(s.playerWorkers.manager, 12);
    assert.equal(s.speedLevel, 3);
    assert.equal(s.time, 5400.5);
    assert.equal(s._fractionalPages, 0.25);
    assert.deepEqual(
      s.achievements.map(a => a.id),
      ['pages-1', 'writers-room', 'hire-manager']
    );
    assert.equal(s.log.length, 2);
    assert.equal(s.searches, 4);
    assert.equal(s.searchesFound, 1);
    assert.equal(s.boostSeconds, 90);
    // Upgrades and the Reading Room were added after this save was made
    assert.deepEqual(s.upgrades, []);
    assert.equal(s.insight, 0);
    assert.deepEqual(s.puzzlesSolved, []);
    assert.deepEqual(s.puzzlesFailed, []);
    assert.deepEqual(s.puzzleGuesses, {});
    assert.deepEqual(s.insightUpgrades, {});
    assert.deepEqual(s.automation, {});
  });
});

describe('save — forward compatibility and bad data', () => {
  it('fills in missing fields and tiers with defaults', () => {
    const s = hydrate({ pagesGenerated: '5', workers: { writer: [3, 0] }, playerWorkers: { writer: 3 } });
    const fresh = createInitialState();
    assert.equal(s.pagesGenerated, 5n);
    assert.equal(s.workers.writer!.toNumber(), 3);
    assert.equal(s.workers.archbishop!.toNumber(), 0);
    assert.equal(s.playerWorkers.archbishop, 0);
    assert.equal(s.boostSeconds, fresh.boostSeconds);
    assert.equal(s.speedLevel, fresh.speedLevel);
    assert.deepEqual(s.achievements, []);
  });

  it('drops unknown tiers and achievements, and duplicate achievements', () => {
    const s = hydrate({
      workers: { writer: [2, 0], retired: [9, 9] },
      playerWorkers: { retired: 5 },
      achievements: [
        { id: 'pages-1', at: 1 },
        { id: 'pages-1', at: 2 },
        { id: 'no-such-achievement', at: 3 },
      ],
    });
    assert.ok(!('retired' in s.workers));
    assert.ok(!('retired' in s.playerWorkers));
    assert.deepEqual(s.achievements, [{ id: 'pages-1', at: 1 }]);
  });

  it('keeps only known upgrades, once each, in order', () => {
    const s = hydrate({ upgrades: ['manager-25', 'no-such-upgrade', 'writer-25', 'manager-25', 7, null] });
    assert.deepEqual(s.upgrades, ['manager-25', 'writer-25']);
    assert.deepEqual(hydrate({ upgrades: 'writer-25' }).upgrades, []);
  });

  it('falls back to defaults for wrong types without throwing', () => {
    const s = hydrate({
      pagesGenerated: 12,
      currentPage: '-4',
      money: 'lots',
      workers: { writer: [NaN, 0], manager: [1, 0.5] },
      playerWorkers: { writer: -1, manager: 1.5 },
      log: [{ timestamp: 1, message: 'x' }, 'junk', { timestamp: 'a', message: 'b' }],
      fractionalPages: 3,
      speedLevel: 'fast',
      time: -1,
      achievements: 'all of them',
      searches: null,
      boostSeconds: 1e9,
    });
    const fresh = createInitialState();
    assert.equal(s.pagesGenerated, 0n);
    assert.equal(s.currentPage, 0n);
    assert.ok(s.money.isZero());
    assert.equal(s.workers.writer!.toNumber(), 1);
    assert.ok(s.workers.manager!.isZero());
    assert.deepEqual(s.playerWorkers, fresh.playerWorkers);
    assert.deepEqual(s.log, [{ timestamp: 'a', message: 'b' }]);
    assert.equal(s._fractionalPages, 0);
    assert.equal(s.speedLevel, 0);
    assert.equal(s.time, 0);
    assert.equal(s.searches, 0);
    assert.equal(s.boostSeconds, OFFLINE_BOOST_MAX_SECONDS);
    assert.deepEqual(hydrate(null), fresh);
  });

  it('rejects corrupt JSON and envelopes without a version', () => {
    for (const raw of ['{', '[]', '{"state": {}}', '{"v": "1", "state": {}}', '{"v": 1}']) {
      const result = decodeSave(raw);
      assert.ok(!result.ok && result.reason === 'corrupt', raw);
    }
  });

  it('refuses saves from a newer version', () => {
    const result = decodeSave(JSON.stringify({ v: SAVE_VERSION + 1, savedAt: 0, state: {} }));
    assert.ok(!result.ok && result.reason === 'newer');
  });
});

describe('save — migrations', () => {
  it('runs each migration in order up to the current version', () => {
    const calls: number[] = [];
    const migrations = {
      1: (s: unknown) => (calls.push(1), { ...(s as object), speed: 4 }),
      2: (s: unknown) => {
        calls.push(2);
        const { speed, ...rest } = s as { speed: number };
        return { ...rest, speedLevel: speed };
      },
    };
    const raw = JSON.stringify({ v: 1, savedAt: 5, state: { pagesGenerated: '9' } });
    const s = loaded(decodeSave(raw, migrations, 3));
    assert.deepEqual(calls, [1, 2]);
    assert.equal(s.speedLevel, 4);
    assert.equal(s.pagesGenerated, 9n);
  });

  it('fails cleanly when a migration is missing or throws', () => {
    const raw = JSON.stringify({ v: 1, savedAt: 5, state: {} });
    assert.equal(decodeSave(raw, {}, 2).ok, false);
    const throwing = { 1: () => { throw new Error('boom'); } };
    const result = decodeSave(raw, throwing, 2);
    assert.ok(!result.ok && result.error.includes('boom'));
  });
});

describe('save — storage', () => {
  it('writes, reads and clears', () => {
    const storage = memoryStorage();
    assert.equal(readSave(storage).ok, false);
    assert.ok(writeSave(sampleState(), storage, 77));
    const result = readSave(storage);
    assert.ok(result.ok && result.savedAt === 77);
    clearSave(storage);
    assert.equal(storage.getItem(SAVE_KEY), null);
  });

  it('backs up a save it cannot read, and leaves the original in place', () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, '{ broken');
    const result = readSave(storage);
    assert.ok(!result.ok && result.reason === 'corrupt');
    assert.equal(storage.getItem(BACKUP_KEY), '{ broken');
    assert.equal(storage.getItem(SAVE_KEY), '{ broken');

    const newer = JSON.stringify({ v: SAVE_VERSION + 1, savedAt: 0, state: {} });
    storage.setItem(SAVE_KEY, newer);
    assert.ok(!readSave(storage).ok);
    assert.equal(storage.getItem(BACKUP_KEY), newer);
  });

  it('survives storage that throws or is missing', () => {
    const broken = memoryStorage();
    broken.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    broken.getItem = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    assert.equal(writeSave(createInitialState(), broken), false);
    assert.equal(readSave(broken).ok, false);
    assert.equal(writeSave(createInitialState(), null), false);
    assert.doesNotThrow(() => clearSave(null));
  });
});
