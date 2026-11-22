import { For, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { cellRect, gridLayout, levelId, type CellRect, type GridLayout } from '@game/storageMap';

/**
 * How each storage level is drawn on the map.
 *
 * Every skin draws into an SVG with a 0..100 viewBox. `frame` is where the
 * level's grid of children sits inside the drawing (as fractions of the
 * stage), so clicks, markers and zoom animations line up with the art.
 */

export type CellState = 'empty' | 'partial' | 'full';

export interface CellProps {
  /** Cell bounds in viewBox units. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Grid position (row 0 is the first row filled). */
  col: number;
  row: number;
  index: number;
  state: CellState;
  /** Varies per container, so neighbouring containers don't look identical. */
  seed: number;
  /** Prefix for SVG ids defined by the backdrop. */
  uid: string;
}

export interface BackdropProps {
  uid: string;
  seed: number;
  layout: GridLayout;
}

export interface Skin {
  frame: CellRect;
  Backdrop: (props: BackdropProps) => JSX.Element;
  Cell: (props: CellProps) => JSX.Element;
  /** Drawn over the cells (thin details like roads), below the markers. */
  Overlay?: (props: BackdropProps) => JSX.Element;
}

/** A cell's bounds on the stage, as fractions (for clicks, markers and animation). */
export function stageRect(level: number, cell: number): CellRect {
  const { frame } = skinFor(level);
  const r = cellRect(gridLayout(level), cell);
  return { x: frame.x + r.x * frame.w, y: frame.y + r.y * frame.h, w: r.w * frame.w, h: r.h * frame.h };
}

/** Which cell (if any) is under a point given as fractions of the stage. */
export function cellAt(level: number, layout: GridLayout, fx: number, fy: number): number | null {
  const { frame } = skinFor(level);
  const gx = (fx - frame.x) / frame.w;
  const gy = (fy - frame.y) / frame.h;
  if (gx < 0 || gx >= 1 || gy < 0 || gy >= 1) return null;
  const col = Math.floor(gx * layout.cols);
  let row = Math.floor(gy * layout.rows);
  if (layout.flipY) row = layout.rows - 1 - row;
  const cell = row * layout.cols + col;
  return cell < layout.cells ? cell : null;
}

/** Deterministic 0..1 hash, for per-cell variety that doesn't change between renders. */
export function hash(a: number, b = 0): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

const LED: Record<CellState, string> = {
  full: 'fill-led',
  partial: 'animate-pulse fill-accent',
  empty: 'fill-rule',
};

/** Shrink a cell by fractions of its size on each axis. */
function inset(p: CellProps, fx: number, fy: number) {
  return { x: p.x + p.w * fx, y: p.y + p.h * fy, w: p.w * (1 - 2 * fx), h: p.h * (1 - 2 * fy) };
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// ─── Default: plain grid (below the drive) ────────────────

const GridSkin: Skin = {
  frame: { x: 0, y: 0, w: 1, h: 1 },
  Backdrop: () => null,
  Cell: p => {
    const b = () => inset(p, 0.07, 0.07);
    return (
      <rect
        x={b().x}
        y={b().y}
        width={b().w}
        height={b().h}
        class={{ empty: 'fill-rule/60', partial: 'fill-ink/30', full: 'fill-ink/80' }[p.state]}
      />
    );
  },
};

// ─── Drive: a 3.5" drive seen from above; cells are partitions ───

const DriveSkin: Skin = {
  frame: { x: 0.12, y: 0.08, w: 0.76, h: 0.76 },
  Backdrop: p => (
    <>
      <defs>
        <pattern id={`${p.uid}-pins`} patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width={1 / 24} height={1}>
          <rect x={0.008} y={0.25} width={0.026} height={0.5} class="fill-paper/60" />
        </pattern>
      </defs>
      <rect x={4} y={2} width={92} height={96} rx={3} class="fill-ink/5 stroke-ink/60" stroke-width={0.6} />
      <For each={[[8, 6], [92, 6], [8, 94], [92, 94]]}>
        {([cx, cy]) => <circle cx={cx} cy={cy} r={1.4} class="fill-paper stroke-ink/50" stroke-width={0.4} />}
      </For>
      <rect x={10.5} y={6.5} width={79} height={79} rx={1.5} class="fill-paper stroke-rule" stroke-width={0.4} />
      <text x={50} y={88.3} text-anchor="middle" class="fill-ink-muted font-mono" font-size="2.2">
        BABEL · 32 TiB
      </text>
      <rect x={22} y={90} width={56} height={5} rx={0.6} class="fill-ink/70" />
      <rect x={22} y={90} width={56} height={5} fill={`url(#${p.uid}-pins)`} />
    </>
  ),
  Cell: GridSkin.Cell,
};

// ─── Server: 2U front panel with 20 hot-swap drive caddies ───

const GRILL = [0.14, 0.21, 0.28, 0.35, 0.42];

const ServerSkin: Skin = {
  frame: { x: 0.08, y: 0.28, w: 0.78, h: 0.44 },
  Backdrop: () => (
    <>
      {/* Rack ears with mounting screws */}
      <rect x={1} y={24} width={5} height={52} rx={0.8} class="fill-ink/20 stroke-ink/50" stroke-width={0.4} />
      <rect x={94} y={24} width={5} height={52} rx={0.8} class="fill-ink/20 stroke-ink/50" stroke-width={0.4} />
      <For each={[[3.5, 28], [3.5, 72], [96.5, 28], [96.5, 72]]}>
        {([cx, cy]) => <circle cx={cx} cy={cy} r={0.9} class="fill-paper" />}
      </For>
      {/* Chassis face */}
      <rect x={5} y={24} width={90} height={52} rx={1} class="fill-ink/5 stroke-ink/60" stroke-width={0.5} />
      {/* Control panel: power button, status lights, vents */}
      <circle cx={90.5} cy={31} r={1.6} fill="none" class="stroke-ink/60" stroke-width={0.4} />
      <circle cx={90.5} cy={36.5} r={0.6} class="fill-led" />
      <circle cx={90.5} cy={39.5} r={0.6} class="fill-led" />
      <For each={range(8)}>
        {i => <line x1={88} x2={93} y1={50 + i * 2.6} y2={50 + i * 2.6} class="stroke-ink/30" stroke-width={0.4} />}
      </For>
    </>
  ),
  Cell: p => {
    const b = () => inset(p, 0.08, 0.04);
    const ink = () => p.state !== 'empty';
    return (
      <g>
        <rect
          x={b().x}
          y={b().y}
          width={b().w}
          height={b().h}
          rx={0.5}
          stroke-width={0.25}
          class={{ empty: 'fill-rule/40 stroke-rule', partial: 'fill-ink/60 stroke-ink/60', full: 'fill-ink/85 stroke-ink' }[p.state]}
        />
        {/* Vent grill */}
        <For each={GRILL}>
          {f => (
            <line
              x1={b().x + b().w * 0.2}
              x2={b().x + b().w * 0.8}
              y1={b().y + b().h * f}
              y2={b().y + b().h * f}
              stroke-width={0.35}
              class={ink() ? 'stroke-paper/25' : 'stroke-rule'}
            />
          )}
        </For>
        {/* Release latch */}
        <rect
          x={b().x + b().w * 0.14}
          y={b().y + b().h * 0.62}
          width={b().w * 0.72}
          height={b().h * 0.28}
          rx={0.4}
          class={ink() ? 'fill-paper/20' : 'fill-paper/60'}
        />
        <rect
          x={b().x + b().w * 0.4}
          y={b().y + b().h * 0.66}
          width={b().w * 0.2}
          height={b().h * 0.06}
          rx={0.2}
          class={ink() ? 'fill-paper/40' : 'fill-rule'}
        />
        {/* Activity light */}
        <circle cx={b().x + b().w * 0.78} cy={b().y + b().h * 0.06} r={Math.min(b().w, b().h) * 0.08} class={LED[p.state]} />
      </g>
    );
  },
};

// ─── Rack: cabinet with rails; servers stacked bottom-up ───

const RackSkin: Skin = {
  frame: { x: 0.27, y: 0.06, w: 0.46, h: 0.88 },
  Backdrop: p => (
    <>
      <defs>
        <pattern id={`${p.uid}-holes`} patternUnits="userSpaceOnUse" width={3} height={1.76}>
          <rect x={1.1} y={0.48} width={0.8} height={0.8} class="fill-paper" />
        </pattern>
        <pattern id={`${p.uid}-bays`} patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width={0.1} height={0.5}>
          <rect x={0.012} y={0.06} width={0.076} height={0.38} class="fill-paper/25" />
        </pattern>
      </defs>
      <rect x={20} y={1.5} width={60} height={95} rx={1.2} class="fill-ink/5 stroke-ink/70" stroke-width={0.7} />
      {/* Top vents */}
      <For each={range(12)}>
        {i => <line x1={31 + i * 3.5} x2={31 + i * 3.5} y1={2.6} y2={4.6} class="stroke-ink/30" stroke-width={0.6} />}
      </For>
      {/* Mounting rails */}
      <rect x={23} y={5} width={3} height={90} class="fill-ink/20" />
      <rect x={74} y={5} width={3} height={90} class="fill-ink/20" />
      <rect x={23} y={5} width={3} height={90} fill={`url(#${p.uid}-holes)`} />
      <rect x={74} y={5} width={3} height={90} fill={`url(#${p.uid}-holes)`} />
      {/* Feet */}
      <rect x={22} y={96.5} width={5} height={2.5} class="fill-ink/60" />
      <rect x={73} y={96.5} width={5} height={2.5} class="fill-ink/60" />
    </>
  ),
  Cell: p => {
    const b = () => inset(p, 0, 0.07);
    return (
      <Show
        when={p.state !== 'empty'}
        fallback={
          // Blanking panel over an empty slot
          <g>
            <rect x={b().x} y={b().y} width={b().w} height={b().h} rx={0.3} stroke-width={0.25} class="fill-rule/40 stroke-rule" />
            <line x1={b().x + 2} x2={b().x + b().w - 2} y1={b().y + b().h * 0.38} y2={b().y + b().h * 0.38} stroke-width={0.25} class="stroke-rule" />
            <line x1={b().x + 2} x2={b().x + b().w - 2} y1={b().y + b().h * 0.62} y2={b().y + b().h * 0.62} stroke-width={0.25} class="stroke-rule" />
          </g>
        }
      >
        <g>
          <rect x={b().x} y={b().y} width={b().w} height={b().h} rx={0.4} class={p.state === 'full' ? 'fill-ink/85' : 'fill-ink/60'} />
          <rect x={b().x} y={b().y} width={b().w * 0.035} height={b().h} class="fill-ink" />
          <rect x={b().x + b().w * 0.965} y={b().y} width={b().w * 0.035} height={b().h} class="fill-ink" />
          <rect
            x={b().x + b().w * 0.06}
            y={b().y + b().h * 0.14}
            width={b().w * 0.68}
            height={b().h * 0.72}
            fill={`url(#${p.uid}-bays)`}
          />
          <circle cx={b().x + b().w * 0.82} cy={b().y + b().h / 2} r={b().h * 0.08} class={LED[p.state]} />
          <circle cx={b().x + b().w * 0.9} cy={b().y + b().h / 2} r={b().h * 0.14} fill="none" stroke-width={0.25} class="stroke-paper/50" />
        </g>
      </Show>
    );
  },
};

// ─── Floor: data hall from above; rows of racks and aisles ───

/** Racks take the middle of each row; the rest is aisle. */
const RACK_DEPTH = 0.46;

const FloorSkin: Skin = {
  frame: { x: 0.08, y: 0.06, w: 0.84, h: 0.88 },
  Backdrop: p => {
    const rowH = () => 88 / p.layout.rows;
    return (
      <>
        <defs>
          <pattern id={`${p.uid}-tiles`} patternUnits="userSpaceOnUse" width={4} height={4}>
            <path d="M4 0H0V4" fill="none" class="stroke-rule/70" stroke-width={0.15} />
          </pattern>
        </defs>
        <rect x={2} y={2} width={96} height={96} class="fill-paper" />
        <rect x={2} y={2} width={96} height={96} fill={`url(#${p.uid}-tiles)`} />
        {/* Cold aisles (every other aisle, where rack fronts face each other) */}
        <For each={range(Math.floor(p.layout.rows / 2))}>
          {k => (
            <rect
              x={8}
              y={6 + rowH() * (2 * k + 0.5 + RACK_DEPTH / 2)}
              width={84}
              height={rowH() * (1 - RACK_DEPTH)}
              class="fill-water/25"
            />
          )}
        </For>
        {/* Cooling units along the walls */}
        <For each={[22, 62]}>
          {y => (
            <>
              <rect x={2.8} y={y} width={3.6} height={12} rx={0.4} class="fill-water/50 stroke-ink/40" stroke-width={0.3} />
              <rect x={93.6} y={y} width={3.6} height={12} rx={0.4} class="fill-water/50 stroke-ink/40" stroke-width={0.3} />
            </>
          )}
        </For>
        {/* Walls and a door */}
        <rect x={2} y={2} width={96} height={96} fill="none" class="stroke-ink/70" stroke-width={0.8} />
        <line x1={44} x2={56} y1={98} y2={98} class="stroke-paper" stroke-width={1.2} />
        <path d="M44 98 A12 12 0 0 1 56 86" fill="none" class="stroke-ink/40" stroke-width={0.3} stroke-dasharray="1 0.8" />
      </>
    );
  },
  Cell: p => {
    const b = () => inset(p, 0.05, (1 - RACK_DEPTH) / 2);
    // Racks in even rows face down, odd rows face up, so fronts share a cold aisle
    const frontY = () => (p.row % 2 === 0 ? b().y + b().h - 0.7 : b().y + 0.7);
    return (
      <Show
        when={p.state !== 'empty'}
        fallback={
          <rect
            x={b().x}
            y={b().y}
            width={b().w}
            height={b().h}
            fill="none"
            stroke-width={0.25}
            stroke-dasharray="0.8 0.6"
            class="stroke-rule"
          />
        }
      >
        <g>
          <rect x={b().x} y={b().y} width={b().w} height={b().h} rx={0.3} class={p.state === 'full' ? 'fill-ink/85' : 'fill-ink/55'} />
          <circle cx={b().x + b().w / 2} cy={frontY()} r={0.45} class={LED[p.state]} />
        </g>
      </Show>
    );
  },
};

// ─── Building: a tower elevation; floors stacked bottom-up ───

const NEIGHBOURS: [number, number, number][] = [
  [3, 9, 28],
  [13, 12, 46],
  [74, 10, 36],
  [86, 11, 22],
];

const BuildingSkin: Skin = {
  frame: { x: 0.335, y: 0.085, w: 0.33, h: 0.855 },
  Backdrop: p => (
    <>
      <defs>
        <pattern id={`${p.uid}-windows`} patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width={1 / 12} height={1}>
          <rect x={0.018} y={0.18} width={0.047} height={0.64} class="fill-paper/55" />
        </pattern>
      </defs>
      {/* Neighbouring buildings and the ground */}
      <For each={NEIGHBOURS}>
        {([x, w, h]) => <rect x={x} y={95 - h} width={w} height={h} class="fill-rule/40" />}
      </For>
      <rect x={0} y={95} width={100} height={5} class="fill-rule/40" />
      <line x1={0} x2={100} y1={95} y2={95} class="stroke-ink/60" stroke-width={0.4} />
      {/* The tower, roof and antenna */}
      <rect x={32} y={7.5} width={36} height={87.5} class="fill-ink/5 stroke-ink/70" stroke-width={0.6} />
      <rect x={31} y={6} width={38} height={1.6} class="fill-ink/60" />
      <rect x={38} y={3.6} width={9} height={2.4} class="fill-ink/40" />
      <line x1={58} x2={58} y1={0.8} y2={6} class="stroke-ink/60" stroke-width={0.4} />
      <circle cx={58} cy={0.9} r={0.6} class="animate-pulse fill-accent" />
      {/* Entrance canopy */}
      <rect x={44} y={94.1} width={12} height={0.9} class="fill-ink/70" />
    </>
  ),
  Cell: p => {
    const b = () => inset(p, 0, 0.12);
    return (
      <g>
        <rect
          x={b().x}
          y={b().y}
          width={b().w}
          height={b().h}
          class={{ empty: 'fill-rule/45', partial: 'fill-ink/55', full: 'fill-ink/85' }[p.state]}
        />
        <Show when={p.state !== 'empty'}>
          <rect x={b().x} y={b().y} width={b().w} height={b().h} fill={`url(#${p.uid}-windows)`} />
        </Show>
      </g>
    );
  },
};

// ─── District: street grid from above; each cell a building ───

const DistrictSkin: Skin = {
  frame: { x: 0.01, y: 0.01, w: 0.98, h: 0.98 },
  Backdrop: () => <rect x={0} y={0} width={100} height={100} class="fill-paper-deep" />,
  Cell: p => {
    // Wider gaps every fourth row/column read as avenues
    const box = () => {
      const left = p.col % 4 === 0 ? 0.16 : 0.05;
      const right = p.col % 4 === 3 ? 0.16 : 0.05;
      const top = p.row % 4 === 0 ? 0.16 : 0.05;
      const bottom = p.row % 4 === 3 ? 0.16 : 0.05;
      const jitter = hash(p.index, p.seed) * 0.14;
      return {
        x: p.x + p.w * (left + (p.index % 2 ? jitter : 0)),
        y: p.y + p.h * (top + (p.index % 3 === 0 ? jitter : 0)),
        w: p.w * (1 - left - right - jitter),
        h: p.h * (1 - top - bottom - jitter),
      };
    };
    return (
      <rect
        x={box().x}
        y={box().y}
        width={box().w}
        height={box().h}
        class={{ empty: 'fill-rule/50', partial: 'fill-ink/50', full: 'fill-ink/80' }[p.state]}
      />
    );
  },
};

// ─── City: a city plan; each cell a district ───

const CitySkin: Skin = {
  frame: { x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
  Backdrop: () => <rect x={0} y={0} width={100} height={100} class="fill-paper" />,
  Cell: p => {
    const b = () => inset(p, 0.1, 0.1);
    return (
      <rect
        x={b().x}
        y={b().y}
        width={b().w}
        height={b().h}
        rx={b().w * 0.2}
        class={{ empty: 'fill-rule/45', partial: 'fill-ink/50', full: 'fill-ink/75' }[p.state]}
      />
    );
  },
  // Ring road and avenues over the district grid
  Overlay: () => (
    <g fill="none" class="stroke-paper" stroke-linecap="round">
      <circle cx={50} cy={50} r={30} stroke-width={1.2} />
      <circle cx={50} cy={50} r={12} stroke-width={0.8} />
      <line x1={4} y1={8} x2={96} y2={92} stroke-width={1} />
      <line x1={96} y1={14} x2={6} y2={86} stroke-width={1} />
      <line x1={50} y1={2} x2={50} y2={98} stroke-width={0.8} />
    </g>
  ),
};

// ─── Province: a regional map; each cell a city or town ───

const RIVERS = ['M-2 30 C 20 26, 30 44, 52 40 S 80 30, 102 36', 'M40 102 C 44 84, 36 70, 52 40'];
const ROADS = ['M2 70 L 40 58 L 70 66 L 98 52', 'M18 2 L 30 40 L 24 98', 'M70 2 L 64 46 L 82 98'];

const ProvinceSkin: Skin = {
  frame: { x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
  Backdrop: () => (
    <>
      <rect x={0} y={0} width={100} height={100} class="fill-paper-deep/70" />
      <For each={RIVERS}>{d => <path d={d} fill="none" class="stroke-water" stroke-width={2.2} />}</For>
      <For each={ROADS}>{d => <path d={d} fill="none" class="stroke-rule" stroke-width={0.7} />}</For>
    </>
  ),
  Cell: p => {
    // Mostly towns, the odd large city
    const size = () => 0.1 + 0.3 * hash(p.index, p.seed) ** 4;
    return (
      <circle
        cx={p.x + p.w / 2}
        cy={p.y + p.h / 2}
        r={Math.min(p.w, p.h) * size()}
        class={{ empty: 'fill-ink/20', partial: 'animate-pulse fill-accent', full: 'fill-ink' }[p.state]}
      />
    );
  },
};

// ─── Planet: a world map; each cell a province, lit once written ───

function isLand(col: number, row: number, seed: number): boolean {
  const s = seed % 97;
  const n =
    Math.sin(col * 0.42 + s) + Math.sin(row * 0.61 + s * 1.7) + Math.sin(col * 0.27 - row * 0.38 + s * 0.9);
  return n > 0.5;
}

const PlanetSkin: Skin = {
  frame: { x: 0.03, y: 0.27, w: 0.94, h: 0.46 },
  Backdrop: () => (
    <>
      {/* A moon */}
      <circle cx={88} cy={11} r={4.5} class="fill-rule/50" />
      <circle cx={86.5} cy={10} r={0.8} class="fill-rule" />
      <rect x={2} y={26} width={96} height={48} rx={2} class="fill-water/35 stroke-ink/40" stroke-width={0.4} />
    </>
  ),
  Cell: p => {
    const r = () => Math.min(p.w, p.h) * ({ empty: 0.14, partial: 0.4, full: 0.36 }[p.state]);
    return (
      <g>
        <Show when={isLand(p.col, p.row, p.seed)}>
          <rect x={p.x} y={p.y} width={p.w + 0.05} height={p.h + 0.05} class="fill-paper-deep" />
        </Show>
        <circle
          cx={p.x + p.w / 2}
          cy={p.y + p.h / 2}
          r={r()}
          class={{ empty: 'fill-ink/20', partial: 'animate-pulse fill-accent', full: 'fill-ink' }[p.state]}
        />
      </g>
    );
  },
};

// ─── Solar system: a sun, orbits and ten planets ───

const PLANET_SIZES = [1.1, 1.5, 1.7, 1.3, 3.4, 3.0, 2.4, 2.3, 1.0, 0.9];
const SUN = { cx: -20, cy: 50 };

const SolarSystemSkin: Skin = {
  frame: { x: 0.18, y: 0.4, w: 0.8, h: 0.2 },
  Backdrop: p => {
    const cellW = () => 80 / p.layout.cols;
    return (
      <>
        <For each={range(60)}>
          {i => <circle cx={hash(i, 1) * 100} cy={hash(i, 2) * 100} r={0.15 + hash(i, 3) * 0.25} class="fill-ink/25" />}
        </For>
        <circle cx={SUN.cx} cy={SUN.cy} r={34} class="fill-accent/15" />
        <circle cx={SUN.cx} cy={SUN.cy} r={30} class="fill-accent/80" />
        <For each={range(p.layout.cols)}>
          {i => (
            <circle
              cx={SUN.cx}
              cy={SUN.cy}
              r={18 + cellW() * (i + 0.5) - SUN.cx}
              fill="none"
              class="stroke-rule"
              stroke-width={0.25}
            />
          )}
        </For>
      </>
    );
  },
  Cell: p => {
    const r = () => PLANET_SIZES[p.index % PLANET_SIZES.length]!;
    const cx = () => p.x + p.w / 2;
    const cy = () => p.y + p.h / 2;
    return (
      <g>
        <circle
          cx={cx()}
          cy={cy()}
          r={r()}
          stroke-width={0.3}
          class={{ empty: 'fill-paper stroke-rule', partial: 'fill-accent stroke-accent', full: 'fill-ink/80 stroke-ink' }[p.state]}
        />
        <Show when={p.index === 5}>
          <ellipse cx={cx()} cy={cy()} rx={r() * 1.9} ry={r() * 0.45} fill="none" stroke-width={0.35} class="stroke-ink/50" />
        </Show>
      </g>
    );
  },
};

// ─── Space: fields of stars, nebulae and galaxies ───

/** How a cell in a field is drawn: a star, a tilted galaxy, or a small clump of them. */
type Mark = 'dot' | 'ellipse' | 'clump';

/**
 * A field skin: every cell is a mark whose size and brightness follow
 * `density` (0..1 at a point in viewBox units), so the grid reads as a
 * cluster, a spiral or a web rather than a lattice.
 */
function fieldSkin(opts: {
  Backdrop: (props: BackdropProps) => JSX.Element;
  density: (x: number, y: number) => number;
  mark: Mark;
}): Skin {
  return {
    frame: { x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
    Backdrop: opts.Backdrop,
    Cell: p => {
      const cx = () => p.x + p.w / 2;
      const cy = () => p.y + p.h / 2;
      const d = () => opts.density(cx(), cy());
      const size = () => Math.min(p.w, p.h) * (0.12 + 0.3 * d());
      const opacity = () => (p.state === 'empty' ? 0.2 + 0.55 * d() : 0.45 + 0.55 * d());
      const cls = () => ({ empty: 'fill-rule', partial: 'animate-pulse fill-accent', full: 'fill-ink' })[p.state];
      const angle = () => Math.round(hash(p.index, p.seed) * 180);
      return (
        <g opacity={opacity()} class={cls()}>
          <Show when={opts.mark === 'dot'}>
            <circle cx={cx()} cy={cy()} r={size()} />
          </Show>
          <Show when={opts.mark === 'ellipse'}>
            <ellipse cx={cx()} cy={cy()} rx={size() * 1.3} ry={size() * 0.55} transform={`rotate(${angle()} ${cx()} ${cy()})`} />
          </Show>
          <Show when={opts.mark === 'clump'}>
            <For each={[0, 1, 2]}>
              {k => (
                <circle
                  cx={cx() + (hash(p.index, p.seed + k) - 0.5) * p.w * 0.5}
                  cy={cy() + (hash(p.index, p.seed + k + 7) - 0.5) * p.h * 0.5}
                  r={size() * (k === 0 ? 0.8 : 0.5)}
                />
              )}
            </For>
          </Show>
        </g>
      );
    },
  };
}

/** Falloff from the centre: 1 at the middle, fading towards the edges. */
const radial = (spread: number) => (x: number, y: number) => {
  const r = Math.hypot(x - 50, y - 50) / 46;
  return Math.min(1, Math.exp(-(r * r) / (2 * spread * spread)) + 0.04);
};

/** Strongest near any of `blobs` ([x, y, radius]). */
const blobby = (blobs: readonly (readonly [number, number, number])[]) => (x: number, y: number) =>
  Math.min(1, Math.max(...blobs.map(([bx, by, r]) => Math.exp(-((x - bx) ** 2 + (y - by) ** 2) / (r * r)))) + 0.04);

type Point = readonly [number, number];

/** A cosmic web: nodes joined to their nearest neighbours, so the lines read as filaments. */
function web(count: number, salt: number): [Point, Point][] {
  const nodes: Point[] = range(count).map(i => [4 + hash(i, salt) * 92, 4 + hash(i, salt + 1) * 92] as const);
  const seen = new Set<string>();
  const links: [Point, Point][] = [];
  nodes.forEach((a, i) => {
    const nearest = nodes
      .map((b, j) => ({ j, d: Math.hypot(a[0] - b[0], a[1] - b[1]) }))
      .filter(n => n.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 2);
    for (const { j } of nearest) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        links.push([a, nodes[j]!]);
      }
    }
  });
  return links;
}

function distanceToSegment(x: number, y: number, [a, b]: [Point, Point]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}

/** Strongest along the filaments of `links`. */
const filaments = (links: [Point, Point][], width: number) => (x: number, y: number) => {
  const d = Math.min(...links.map(l => distanceToSegment(x, y, l)));
  return Math.min(1, Math.exp(-((d / width) ** 2)) + 0.04);
};

function WebLines(props: { links: [Point, Point][]; width: number }) {
  return (
    <For each={props.links}>
      {([a, b]) => (
        <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} class="stroke-rule/60" stroke-width={props.width} stroke-linecap="round" />
      )}
    </For>
  );
}

// Star cluster: solar systems crowded towards the core
const StarClusterSkin = fieldSkin({
  mark: 'dot',
  density: radial(0.4),
  Backdrop: () => (
    <>
      <circle cx={50} cy={50} r={40} class="fill-ink/5" />
      <circle cx={50} cy={50} r={18} class="fill-ink/5" />
    </>
  ),
});

// Nebula: star clusters forming inside clouds of gas
const NEBULA_BLOBS = [
  [30, 34, 22],
  [62, 28, 16],
  [70, 64, 24],
  [36, 72, 14],
  [50, 50, 12],
] as const;
const NebulaSkin = fieldSkin({
  mark: 'clump',
  density: blobby(NEBULA_BLOBS),
  Backdrop: () => (
    <For each={NEBULA_BLOBS}>
      {([x, y, r], i) => <circle cx={x} cy={y} r={r * 1.3} class={i() % 2 ? 'fill-accent/10' : 'fill-water/25'} />}
    </For>
  ),
});

// Spiral arm: nebulae along a curved band
const ARM = { cx: -30, cy: 130, r: 115, width: 22 };
const SpiralArmSkin = fieldSkin({
  mark: 'dot',
  density: (x, y) => Math.min(1, Math.exp(-(((Math.hypot(x - ARM.cx, y - ARM.cy) - ARM.r) / ARM.width) ** 2)) + 0.04),
  Backdrop: () => (
    <circle cx={ARM.cx} cy={ARM.cy} r={ARM.r} fill="none" class="stroke-ink/10" stroke-width={ARM.width * 1.2} />
  ),
});

// Galaxy: spiral arms around a bright core
function spiralDensity(x: number, y: number): number {
  const dx = (x - 50) / 46;
  const dy = (y - 50) / 46;
  const r = Math.hypot(dx, dy);
  const theta = Math.atan2(dy, dx);
  const arm = Math.cos(2 * (theta - 3.2 * Math.log(r + 0.05)));
  return Math.min(1, Math.exp(-r * 2.2) * (0.55 + 0.45 * arm) * 1.6 + 0.04);
}

function spiralPath(offset: number): string {
  const points: string[] = [];
  for (let t = 0.04; t <= 1; t += 0.02) {
    const theta = 3.2 * Math.log(t + 0.05) + offset;
    points.push(`${50 + Math.cos(theta) * t * 46},${50 + Math.sin(theta) * t * 46}`);
  }
  return `M${points.join(' L')}`;
}

const GalaxySkin = fieldSkin({
  mark: 'dot',
  density: spiralDensity,
  Backdrop: () => (
    <>
      <circle cx={50} cy={50} r={46} class="fill-ink/5" />
      <path d={spiralPath(0)} fill="none" class="stroke-ink/10" stroke-width={7} stroke-linecap="round" />
      <path d={spiralPath(Math.PI)} fill="none" class="stroke-ink/10" stroke-width={7} stroke-linecap="round" />
      <circle cx={50} cy={50} r={5} class="fill-ink/15" />
    </>
  ),
});

// Galaxy group: galaxies gathered around a few large ones
const GROUP_CORES = [
  [34, 38, 18],
  [66, 58, 20],
  [44, 76, 12],
  [74, 22, 10],
] as const;
const GalaxyGroupSkin = fieldSkin({
  mark: 'ellipse',
  density: blobby(GROUP_CORES),
  Backdrop: () => (
    <For each={GROUP_CORES}>
      {([x, y, r]) => (
        <>
          <circle cx={x} cy={y} r={r * 1.2} class="fill-ink/5" />
          <ellipse cx={x} cy={y} rx={r * 0.45} ry={r * 0.18} transform={`rotate(${x} ${x} ${y})`} class="fill-ink/15" />
        </>
      )}
    </For>
  ),
});

// Galaxy cluster: groups bound around a glowing core of hot gas
const GalaxyClusterSkin = fieldSkin({
  mark: 'clump',
  density: radial(0.5),
  Backdrop: () => (
    <>
      <circle cx={50} cy={50} r={44} class="fill-accent/5" />
      <circle cx={50} cy={50} r={26} class="fill-accent/10" />
      <circle cx={50} cy={50} r={10} class="fill-accent/10" />
    </>
  ),
});

// Supercluster: clusters strung along filaments
const SUPER_WEB = web(16, 21);
const SuperclusterSkin = fieldSkin({
  mark: 'ellipse',
  density: filaments(SUPER_WEB, 9),
  Backdrop: () => <WebLines links={SUPER_WEB} width={5} />,
});

// Universe: superclusters along the cosmic web
const COSMIC_WEB = web(26, 11);
const UniverseSkin = fieldSkin({
  mark: 'dot',
  density: filaments(COSMIC_WEB, 6),
  Backdrop: () => <WebLines links={COSMIC_WEB} width={2.5} />,
});

const SKINS: Record<string, Skin> = {
  hardDrive: DriveSkin,
  server: ServerSkin,
  serverRack: RackSkin,
  serverFloor: FloorSkin,
  building: BuildingSkin,
  district: DistrictSkin,
  city: CitySkin,
  province: ProvinceSkin,
  planet: PlanetSkin,
  solarSystem: SolarSystemSkin,
  starCluster: StarClusterSkin,
  nebula: NebulaSkin,
  spiralArm: SpiralArmSkin,
  galaxy: GalaxySkin,
  galaxyGroup: GalaxyGroupSkin,
  galaxyCluster: GalaxyClusterSkin,
  supercluster: SuperclusterSkin,
  universe: UniverseSkin,
};

export function skinFor(level: number): Skin {
  return SKINS[levelId(level)] ?? GridSkin;
}
