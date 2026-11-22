import { STORAGE_TIERS } from './config.js';

/**
 * Geometry for the zoomable storage map.
 *
 * A "container" is one storage unit at a given map level. Level 0 is a drive.
 * Above it are the storage tiers (server, rack, ... universe), plus map-only
 * levels in between (district, province, nebula, ...) so that no container has
 * more than ~1,000 children: every child gets its own cell on the map.
 *
 * Below the drive are sub-levels (negative levels) down to a single page at
 * MIN_LEVEL. Each splits its parent into at most MAX_CHILDREN children, aligned
 * to the parent's first page. Sizes don't divide evenly, so the last child of a
 * parent can be shorter than the rest ("ragged").
 *
 * Pages fill containers in order, so the generated region is always a prefix.
 */

/** Most children any container has (a 32×32 grid). */
const MAX_CHILDREN = 1024n;

interface LevelSpec {
  id: string;
  name: string;
  /** Children of one container at this level. */
  children: bigint;
  /** Fixed grid shape, for levels drawn as physical objects. */
  shape?: { cols: number; rows: number; flipY?: boolean };
}

/** Map levels above the drive, bottom to top. Ids matching a storage tier mark that tier. */
const ABOVE_DRIVE: readonly LevelSpec[] = [
  { id: 'server', name: 'Server', children: 20n, shape: { cols: 10, rows: 2 } }, // drive bays
  { id: 'serverRack', name: 'Rack', children: 10n, shape: { cols: 1, rows: 10, flipY: true } }, // stacked servers
  { id: 'serverFloor', name: 'Floor', children: 100n, shape: { cols: 10, rows: 10 } }, // rows of racks
  { id: 'building', name: 'Building', children: 100n, shape: { cols: 1, rows: 100, flipY: true } }, // floors
  { id: 'district', name: 'District', children: 1000n },
  { id: 'city', name: 'City', children: 1000n },
  { id: 'province', name: 'Province', children: 1000n },
  { id: 'planet', name: 'Planet', children: 1000n },
  { id: 'solarSystem', name: 'Solar System', children: 10n, shape: { cols: 10, rows: 1 } }, // planets
  { id: 'starCluster', name: 'Star Cluster', children: 1000n },
  { id: 'nebula', name: 'Nebula', children: 1000n },
  { id: 'spiralArm', name: 'Spiral Arm', children: 1000n },
  { id: 'galaxy', name: 'Galaxy', children: 1000n },
  { id: 'galaxyGroup', name: 'Galaxy Group', children: 1000n },
  { id: 'galaxyCluster', name: 'Galaxy Cluster', children: 1000n },
  { id: 'supercluster', name: 'Supercluster', children: 1000n },
  { id: 'universe', name: 'Universe', children: 1000n },
];

export const TOP_LEVEL = ABOVE_DRIVE.length;

/** Pages held by one container at each level from the drive (0) up. */
export const PAGES_PER: readonly bigint[] = (() => {
  let pages = STORAGE_TIERS[0]!.multiplier;
  return [pages, ...ABOVE_DRIVE.map(spec => (pages *= spec.children))];
})();

/** Map level of a storage tier (e.g. 'city'). */
export function tierLevel(tierId: string): number {
  if (tierId === STORAGE_TIERS[0]!.id) return 0;
  const i = ABOVE_DRIVE.findIndex(spec => spec.id === tierId);
  if (i === -1) throw new Error(`storageMap: no map level for tier ${tierId}`);
  return i + 1;
}

// The map levels must multiply out to exactly the storage tiers.
for (const tier of STORAGE_TIERS) {
  const level = tierLevel(tier.id);
  let expected = 1n;
  for (const t of STORAGE_TIERS.slice(0, STORAGE_TIERS.indexOf(tier) + 1)) expected *= t.multiplier;
  if (PAGES_PER[level] !== expected) throw new Error(`storageMap: map levels don't add up to tier ${tier.id}`);
}

/** Nominal pages per container at levels -1, -2, ... down to a single page. */
const SUB_SIZES: readonly bigint[] = (() => {
  const sizes: bigint[] = [];
  let size = PAGES_PER[0]!;
  while (size > 1n) {
    size = size > MAX_CHILDREN ? (size + MAX_CHILDREN - 1n) / MAX_CHILDREN : 1n;
    sizes.push(size);
  }
  return sizes;
})();

/** The deepest level: a single page. */
export const MIN_LEVEL = -SUB_SIZES.length;

const SUB_LEVELS = [
  { id: 'partition', name: 'Partition' },
  { id: 'sector', name: 'Sector' },
  { id: 'volume', name: 'Volume' },
  { id: 'page', name: 'Page' },
];
if (SUB_LEVELS.length !== SUB_SIZES.length) throw new Error('storageMap: SUB_LEVELS must match SUB_SIZES');

/** Stable id of a level, e.g. 'serverRack' or 'nebula'. */
export function levelId(level: number): string {
  if (level < 0) return SUB_LEVELS[-level - 1]!.id;
  return level === 0 ? STORAGE_TIERS[0]!.id : ABOVE_DRIVE[level - 1]!.id;
}

/** Singular display name of a level. */
export function levelName(level: number): string {
  if (level < 0) return SUB_LEVELS[-level - 1]!.name;
  return level === 0 ? 'Drive' : ABOVE_DRIVE[level - 1]!.name;
}

/** Nominal pages per container at `level`. */
export function sizeOf(level: number): bigint {
  return level >= 0 ? PAGES_PER[level]! : SUB_SIZES[-level - 1]!;
}

/** Nominal number of children of a container at `level`. */
export function childCount(level: number): bigint {
  if (level >= 1) return ABOVE_DRIVE[level - 1]!.children;
  const size = sizeOf(level);
  const child = sizeOf(level - 1);
  return (size + child - 1n) / child;
}

for (let level = MIN_LEVEL + 1; level <= TOP_LEVEL; level++) {
  if (childCount(level) > MAX_CHILDREN) throw new Error(`storageMap: ${levelId(level)} has too many children`);
}

export interface MapView {
  level: number;
  /** Global index of the container among all containers at this level. */
  index: bigint;
}

export function sameView(a: MapView, b: MapView): boolean {
  return a.level === b.level && a.index === b.index;
}

export interface Bounds {
  /** First page in the container. */
  start: bigint;
  /** Pages in the container (less than nominal for a ragged last child). */
  size: bigint;
}

/** The pages a container covers. */
export function bounds(view: MapView): Bounds {
  if (view.level >= 0) {
    const size = PAGES_PER[view.level]!;
    return { start: view.index * size, size };
  }
  const n = childCount(view.level + 1);
  const parent = bounds({ level: view.level + 1, index: view.index / n });
  const nominal = sizeOf(view.level);
  const start = parent.start + (view.index % n) * nominal;
  const end = parent.start + parent.size;
  return { start, size: start + nominal > end ? end - start : nominal };
}

export function firstPage(view: MapView): bigint {
  return bounds(view).start;
}

/** The container at `level` that holds `page`. */
export function containerOf(page: bigint, level: number): MapView {
  if (level >= 0) return { level, index: page / PAGES_PER[level]! };
  let view = containerOf(page, 0);
  for (let l = -1; l >= level; l--) {
    const local = (page - bounds(view).start) / sizeOf(l);
    view = { level: l, index: view.index * childCount(l + 1) + local };
  }
  return view;
}

/** The container one level up, or null at the top. */
export function parentOf(view: MapView): MapView | null {
  if (view.level >= TOP_LEVEL) return null;
  return { level: view.level + 1, index: view.index / childCount(view.level + 1) };
}

/** Every container from the top level down to `view` itself. */
export function ancestry(view: MapView): MapView[] {
  const chain: MapView[] = [view];
  for (let p = parentOf(view); p; p = parentOf(p)) chain.unshift(p);
  return chain;
}

/** Index of the container within its parent (the global index at the top level). */
export function localIndex(view: MapView): bigint {
  if (view.level >= TOP_LEVEL) return view.index;
  return view.index % childCount(view.level + 1);
}

/** Lowest level (≥ 0, the drive) at which pages `a` and `b` share a container (TOP_LEVEL if none). */
export function commonLevel(a: bigint, b: bigint): number {
  for (let level = 0; level < TOP_LEVEL; level++) {
    if (a / PAGES_PER[level]! === b / PAGES_PER[level]!) return level;
  }
  return TOP_LEVEL;
}

/** Zooming always starts at least this high, so a search shows some context. */
export const MIN_ZOOM_START_LEVEL = 3;

/**
 * Views to step through when zooming to `target`: from the container shared
 * with `from` (the generation frontier) down to the page itself.
 */
export function zoomPath(target: bigint, from: bigint): MapView[] {
  const start = Math.min(TOP_LEVEL, Math.max(commonLevel(target, from), MIN_ZOOM_START_LEVEL));
  const path: MapView[] = [];
  for (let level = start; level >= MIN_LEVEL; level--) path.push(containerOf(target, level));
  return path;
}

// ─── Grid layout ─────────────────────────────────────────

export interface GridLayout {
  cols: number;
  rows: number;
  /** Cells actually used (≤ cols × rows). */
  cells: number;
  /** Pages represented by one cell. */
  pagesPerCell: bigint;
  /** Fill from the bottom row up (racks and buildings stack upwards). */
  flipY: boolean;
}

/** Grid for a level. A single page (MIN_LEVEL) is one cell. */
export function gridLayout(level: number): GridLayout {
  if (level <= MIN_LEVEL) return { cols: 1, rows: 1, cells: 1, pagesPerCell: 1n, flipY: false };
  const cells = Number(childCount(level));
  const pagesPerCell = sizeOf(level - 1);
  const shape = level >= 1 ? ABOVE_DRIVE[level - 1]!.shape : undefined;
  if (shape) return { cols: shape.cols, rows: shape.rows, flipY: !!shape.flipY, cells, pagesPerCell };
  const cols = Math.ceil(Math.sqrt(cells));
  return { cols, rows: Math.ceil(cells / cols), cells, pagesPerCell, flipY: false };
}

/** Grid for a specific container: a ragged container uses fewer cells. */
export function layoutFor(view: MapView): GridLayout {
  const layout = gridLayout(view.level);
  if (view.level >= 0) return layout;
  const { size } = bounds(view);
  const used = Number((size + layout.pagesPerCell - 1n) / layout.pagesPerCell);
  return used < layout.cells ? { ...layout, cells: used } : layout;
}

export interface GridFill {
  /** Cells completely generated. */
  full: number;
  /** Fraction (0..1) of the next cell that is generated. */
  partial: number;
  /** Fraction (0..1) of the whole container that is generated. */
  total: number;
}

const FRACTION_SCALE = 1_000_000n;

function fraction(part: bigint, whole: bigint): number {
  return Number((part * FRACTION_SCALE) / whole) / Number(FRACTION_SCALE);
}

/** How much of the container `view` is filled once `pagesGenerated` pages exist. */
export function gridFill(view: MapView, pagesGenerated: bigint): GridFill {
  const { start, size } = bounds(view);
  let filled = pagesGenerated - start;
  if (filled < 0n) filled = 0n;
  if (filled > size) filled = size;
  const layout = layoutFor(view);
  const full = Math.min(layout.cells, Number(filled / layout.pagesPerCell));
  const partial = full >= layout.cells ? 0 : fraction(filled % layout.pagesPerCell, layout.pagesPerCell);
  return { full, partial, total: fraction(filled, size) };
}

/** Cell of `view` that holds `page`, or null if the page is elsewhere. */
export function cellOf(view: MapView, page: bigint): number | null {
  const { start, size } = bounds(view);
  if (page < start || page >= start + size) return null;
  return Number((page - start) / gridLayout(view.level).pagesPerCell);
}

/** The child container shown by `cell`. Null for a page. */
export function childView(view: MapView, cell: number): MapView | null {
  if (view.level <= MIN_LEVEL) return null;
  return { level: view.level - 1, index: view.index * childCount(view.level) + BigInt(cell) };
}

export interface CellRect {
  /** Fractions of the grid's width/height, measured from the top left. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export function cellRect(layout: GridLayout, cell: number): CellRect {
  const col = cell % layout.cols;
  const row = Math.floor(cell / layout.cols);
  const w = 1 / layout.cols;
  const h = 1 / layout.rows;
  return { x: col * w, y: (layout.flipY ? layout.rows - 1 - row : row) * h, w, h };
}
