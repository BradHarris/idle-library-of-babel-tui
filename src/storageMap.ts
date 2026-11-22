import { STORAGE_TIERS } from './config.js';

/**
 * Geometry for the zoomable storage map.
 *
 * A "container" is one storage unit at a given level. Levels 0..TOP_LEVEL are
 * the storage tiers (drive, server, ... universe): a container at level L ≥ 1
 * holds STORAGE_TIERS[L].multiplier children of level L-1.
 *
 * Below the drive are sub-levels (negative levels) down to a single page at
 * MIN_LEVEL. Each splits its parent into at most SUB_SPLIT children, aligned to
 * the parent's first page. Sizes don't divide evenly, so the last child of a
 * parent can be shorter than the rest ("ragged").
 *
 * Pages fill containers in order, so the generated region is always a prefix.
 */

export const TOP_LEVEL = STORAGE_TIERS.length - 1;

/** Pages held by one container at each storage tier level. */
export const PAGES_PER: readonly bigint[] = (() => {
  let pages = 1n;
  return STORAGE_TIERS.map(tier => (pages *= tier.multiplier));
})();

/** Most children a sub-drive container is split into (a 32×32 grid). */
const SUB_SPLIT = 1024n;

/** Nominal pages per container at levels -1, -2, ... down to a single page. */
const SUB_SIZES: readonly bigint[] = (() => {
  const sizes: bigint[] = [];
  let size = PAGES_PER[0]!;
  while (size > 1n) {
    size = size > SUB_SPLIT ? (size + SUB_SPLIT - 1n) / SUB_SPLIT : 1n;
    sizes.push(size);
  }
  return sizes;
})();

/** The deepest level: a single page. */
export const MIN_LEVEL = -SUB_SIZES.length;

const SUB_NAMES = ['Partition', 'Sector', 'Volume', 'Page'];
if (SUB_NAMES.length !== SUB_SIZES.length) throw new Error('storageMap: SUB_NAMES must match SUB_SIZES');

const TIER_NAMES = ['Drive', 'Server', 'Rack', 'Floor', 'Building', 'City', 'Planet', 'Solar System', 'Galaxy', 'Universe'];

/** Singular display name of a level. */
export function levelName(level: number): string {
  return level >= 0 ? TIER_NAMES[level]! : SUB_NAMES[-level - 1]!;
}

/** Nominal pages per container at `level`. */
export function sizeOf(level: number): bigint {
  return level >= 0 ? PAGES_PER[level]! : SUB_SIZES[-level - 1]!;
}

/** Nominal number of children of a container at `level`. */
export function childCount(level: number): bigint {
  if (level >= 1) return STORAGE_TIERS[level]!.multiplier;
  const size = sizeOf(level);
  const child = sizeOf(level - 1);
  return (size + child - 1n) / child;
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

/** Lowest storage tier level (≥ 0) at which pages `a` and `b` share a container (TOP_LEVEL if none). */
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
  /** Children represented by one cell. */
  perCell: bigint;
  /** Pages represented by one cell. */
  pagesPerCell: bigint;
  /** Fill from the bottom row up (racks and buildings stack upwards). */
  flipY: boolean;
}

/** Largest grid drawn for levels whose children are too many to show one by one. */
const AGGREGATE_SIDE = 32;

const SHAPES: Record<string, { cols: number; rows: number; flipY?: boolean }> = {
  server: { cols: 10, rows: 2 }, // 20 drive bays
  serverRack: { cols: 1, rows: 10, flipY: true }, // 10 servers, stacked
  serverFloor: { cols: 10, rows: 10 }, // 100 racks in rows
  building: { cols: 1, rows: 100, flipY: true }, // 100 floors
  solarSystem: { cols: 10, rows: 1 }, // 10 planets
};

/** Grid for a level. A single page (MIN_LEVEL) is one cell. */
export function gridLayout(level: number): GridLayout {
  if (level <= MIN_LEVEL) return { cols: 1, rows: 1, cells: 1, perCell: 1n, pagesPerCell: 1n, flipY: false };
  const children = childCount(level);
  const pagesPerChild = sizeOf(level - 1);
  const shape = level >= 0 ? SHAPES[STORAGE_TIERS[level]!.id] : undefined;

  if (shape && BigInt(shape.cols * shape.rows) === children) {
    return { ...shape, flipY: !!shape.flipY, cells: Number(children), perCell: 1n, pagesPerCell: pagesPerChild };
  }

  const maxCells = BigInt(AGGREGATE_SIDE * AGGREGATE_SIDE);
  if (children <= maxCells) {
    const n = Number(children);
    const cols = Math.ceil(Math.sqrt(n));
    return { cols, rows: Math.ceil(n / cols), cells: n, perCell: 1n, pagesPerCell: pagesPerChild, flipY: false };
  }

  const perCell = (children + maxCells - 1n) / maxCells;
  return {
    cols: AGGREGATE_SIDE,
    rows: AGGREGATE_SIDE,
    cells: Number((children + perCell - 1n) / perCell),
    perCell,
    pagesPerCell: perCell * pagesPerChild,
    flipY: false,
  };
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

/** The child container shown by `cell` (its first child, for aggregated cells). Null for a page. */
export function childView(view: MapView, cell: number): MapView | null {
  if (view.level <= MIN_LEVEL) return null;
  const layout = gridLayout(view.level);
  return { level: view.level - 1, index: view.index * childCount(view.level) + BigInt(cell) * layout.perCell };
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

/**
 * At most two rectangles covering the first `n` cells in fill order:
 * the completed rows, then the started row. Lets a renderer draw the
 * filled region without one element per cell.
 */
export function prefixRects(layout: GridLayout, n: number): CellRect[] {
  const count = Math.max(0, Math.min(n, layout.cols * layout.rows));
  const fullRows = Math.floor(count / layout.cols);
  const rest = count % layout.cols;
  const h = 1 / layout.rows;
  const rects: CellRect[] = [];
  const place = (row: number, rows: number) => (layout.flipY ? layout.rows - row - rows : row) * h;
  if (fullRows > 0) rects.push({ x: 0, y: place(0, fullRows), w: 1, h: fullRows * h });
  if (rest > 0) rects.push({ x: 0, y: place(fullRows, 1), w: rest / layout.cols, h });
  return rects;
}
