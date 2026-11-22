import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { STORAGE_TIERS } from './config.js';
import { locationFromPageOffset } from './storageScale.js';
import { queryToPageAddress } from './page.js';
import {
  MIN_LEVEL,
  PAGES_PER,
  TOP_LEVEL,
  bounds,
  childCount,
  layoutFor,
  levelId,
  levelName,
  tierLevel,
  ancestry,
  cellOf,
  cellRect,
  childView,
  commonLevel,
  containerOf,
  gridFill,
  gridLayout,
  localIndex,
  parentOf,
  zoomPath,
} from './storageMap.js';

const DRIVE = PAGES_PER[0]!;

describe('container math', () => {
  it('PAGES_PER multiplies up the tiers', () => {
    assert.strictEqual(PAGES_PER[0], STORAGE_TIERS[0]!.multiplier);
    assert.strictEqual(PAGES_PER[1], DRIVE * 20n);
    assert.strictEqual(PAGES_PER[2], DRIVE * 200n);
  });

  it('containerOf agrees with locationFromPageOffset at every level', () => {
    const page = queryToPageAddress('the library is unlimited and cyclical');
    const location = locationFromPageOffset(page);
    for (const tier of STORAGE_TIERS) {
      assert.strictEqual(containerOf(page, tierLevel(tier.id)).index, location[tier.id], tier.id);
    }
  });

  it('parentOf / localIndex walk up the hierarchy', () => {
    const drive = { level: 0, index: 47n }; // server 2, bay 7
    assert.deepStrictEqual(parentOf(drive), { level: 1, index: 2n });
    assert.strictEqual(localIndex(drive), 7n);
    assert.strictEqual(parentOf({ level: TOP_LEVEL, index: 0n }), null);
    const chain = ancestry(drive);
    assert.strictEqual(chain.length, TOP_LEVEL + 1);
    assert.deepStrictEqual(chain.at(-1), drive);
    assert.strictEqual(chain[0]!.level, TOP_LEVEL);
  });

  it('commonLevel finds the lowest shared container', () => {
    assert.strictEqual(commonLevel(0n, 5n), 0);
    assert.strictEqual(commonLevel(0n, DRIVE), 1); // neighbouring drives, same server
    assert.strictEqual(commonLevel(0n, DRIVE * 20n), 2); // next server, same rack
    assert.strictEqual(commonLevel(0n, PAGES_PER[TOP_LEVEL]!), TOP_LEVEL);
  });
});

describe('zoomPath', () => {
  it('starts at least at floor level and ends on the target page', () => {
    const path = zoomPath(10n, 3n);
    assert.deepStrictEqual(
      path.map(v => v.level),
      [3, 2, 1, 0, -1, -2, -3, -4]
    );
    assert.deepStrictEqual(bounds(path.at(-1)!), { start: 10n, size: 1n });
  });

  it('starts from the container shared with the frontier', () => {
    const city = tierLevel('city');
    const target = PAGES_PER[city]! * 3n + 12345n; // city 3
    const path = zoomPath(target, 100n);
    assert.strictEqual(levelName(path[0]!.level), 'Province'); // province 0 holds both
    path.forEach(v => assert.deepStrictEqual(v, containerOf(target, v.level)));
  });

  it('is deterministic', () => {
    const a = queryToPageAddress('hello world');
    assert.deepStrictEqual(zoomPath(a, 0n), zoomPath(a, 0n));
  });
});

describe('gridLayout', () => {
  it('uses explicit shapes for small containers', () => {
    assert.deepStrictEqual(
      { ...gridLayout(2), pagesPerCell: undefined },
      { cols: 1, rows: 10, cells: 10, flipY: true, pagesPerCell: undefined }
    );
    assert.strictEqual(gridLayout(4).rows, 100);
    assert.strictEqual(gridLayout(1).cells, 20);
  });

  it('gives every child its own cell at every level', () => {
    for (let level = MIN_LEVEL + 1; level <= TOP_LEVEL; level++) {
      const layout = gridLayout(level);
      assert.strictEqual(layout.cells, Number(childCount(level)), levelId(level));
      assert.ok(layout.cells <= layout.cols * layout.rows && layout.cols * layout.rows <= 1024);
    }
  });
});

describe('gridFill', () => {
  it('is empty before the container and full after it', () => {
    assert.deepStrictEqual(gridFill({ level: 1, index: 1n }, 5n), { full: 0, partial: 0, total: 0 });
    assert.deepStrictEqual(gridFill({ level: 1, index: 0n }, PAGES_PER[1]! * 2n), {
      full: 20,
      partial: 0,
      total: 1,
    });
  });

  it('counts whole and partial cells', () => {
    const fill = gridFill({ level: 1, index: 0n }, DRIVE * 3n + DRIVE / 2n);
    assert.strictEqual(fill.full, 3);
    assert.ok(Math.abs(fill.partial - 0.5) < 1e-5);
    assert.ok(Math.abs(fill.total - 3.5 / 20) < 1e-5);
  });
});

describe('cells', () => {
  it('cellOf locates a page and childView zooms into it', () => {
    const server = { level: 1, index: 0n };
    const page = DRIVE * 7n + 3n;
    assert.strictEqual(cellOf(server, page), 7);
    assert.strictEqual(cellOf({ level: 1, index: 1n }, page), null);
    assert.deepStrictEqual(childView(server, 7), containerOf(page, 0));
    assert.strictEqual(childView({ level: MIN_LEVEL, index: 0n }, 0), null);
  });

  it('cellRect flips stacked layouts so cell 0 is at the bottom', () => {
    const rack = gridLayout(2);
    assert.deepStrictEqual(cellRect(rack, 0), { x: 0, y: 0.9, w: 1, h: 0.1 });
    const server = gridLayout(1);
    assert.deepStrictEqual(cellRect(server, 12), { x: 0.2, y: 0.5, w: 0.1, h: 0.5 });
  });
});

describe('map-only levels', () => {
  it('splits the big tiers into levels of 1,000', () => {
    const names = [];
    for (let level = tierLevel('building') + 1; level <= TOP_LEVEL; level++) names.push(levelName(level));
    assert.deepStrictEqual(names, [
      'District',
      'City',
      'Province',
      'Planet',
      'Solar System',
      'Star Cluster',
      'Nebula',
      'Spiral Arm',
      'Galaxy',
      'Galaxy Group',
      'Galaxy Cluster',
      'Supercluster',
      'Universe',
    ]);
  });

  it('keeps each storage tier exactly where the game puts it', () => {
    let pages = 1n;
    for (const tier of STORAGE_TIERS) {
      pages *= tier.multiplier;
      assert.strictEqual(PAGES_PER[tierLevel(tier.id)], pages, tier.id);
    }
    assert.strictEqual(levelId(TOP_LEVEL), 'universe');
  });

  it('childView picks out the exact child', () => {
    const galaxy = containerOf(0n, tierLevel('galaxy'));
    const arm = childView(galaxy, 737)!;
    assert.strictEqual(levelName(arm.level), 'Spiral Arm');
    assert.strictEqual(bounds(arm).start, 737n * PAGES_PER[arm.level]!);
  });
});

describe('below the drive', () => {
  it('splits a drive into partitions, sectors, volumes and pages', () => {
    assert.strictEqual(MIN_LEVEL, -4);
    assert.deepStrictEqual(
      [0, -1, -2, -3, -4].map(levelName),
      ['Drive', 'Partition', 'Sector', 'Volume', 'Page']
    );
    assert.strictEqual(childCount(0), 1024n);
    assert.strictEqual(childCount(-3), 118n);
    const drive = gridLayout(0);
    assert.strictEqual(drive.cells, 1024);
  });

  it('containerOf and bounds agree for pages deep inside later drives', () => {
    const pages = [0n, 117n, 118n, DRIVE - 1n, DRIVE, DRIVE * 7n + 123_456_789n, queryToPageAddress('babel')];
    for (const page of pages) {
      for (let level = 0; level >= MIN_LEVEL; level--) {
        const view = containerOf(page, level);
        const { start, size } = bounds(view);
        assert.ok(page >= start && page < start + size, `page ${page} level ${level}`);
        if (level < 0) {
          // A child sits inside its parent
          const parent = bounds(parentOf(view)!);
          assert.ok(start >= parent.start && start + size <= parent.start + parent.size);
        }
      }
      assert.deepStrictEqual(bounds(containerOf(page, MIN_LEVEL)), { start: page, size: 1n });
    }
  });

  it('childView steps down to the next page range', () => {
    const volume = containerOf(DRIVE * 2n + 500n, -3);
    const pageView = childView(volume, 5)!;
    assert.strictEqual(bounds(pageView).start, bounds(volume).start + 5n);
  });

  it('the last child of a parent is ragged and uses fewer cells', () => {
    const lastPartition = { level: -1, index: 1023n };
    const { start, size } = bounds(lastPartition);
    assert.strictEqual(start + size, DRIVE);
    assert.ok(size < bounds({ level: -1, index: 0n }).size);
    const lastVolume = containerOf(DRIVE - 1n, -3);
    assert.ok(layoutFor(lastVolume).cells < gridLayout(-3).cells);
    assert.strictEqual(layoutFor(lastVolume).cells, Number(bounds(lastVolume).size));
  });

  it('gridFill counts single pages at the volume level', () => {
    const fill = gridFill({ level: -3, index: 0n }, 40n);
    assert.strictEqual(fill.full, 40);
    assert.strictEqual(fill.partial, 0);
  });
});
