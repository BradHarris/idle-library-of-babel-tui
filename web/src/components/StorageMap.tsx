import { For, Show, createEffect, createMemo, createUniqueId, useContext } from 'solid-js';
import { formatNumber, formatPageNumber } from '@game/format';
import { generatePage } from '@game/page';
import {
  MIN_LEVEL,
  ancestry,
  bounds,
  cellOf,
  cellRect,
  childView,
  containerOf,
  firstPage,
  gridFill,
  gridLayout,
  layoutFor,
  levelName,
  localIndex,
  parentOf,
  prefixRects,
  sameView,
  type CellRect,
  type GridLayout,
  type MapView,
} from '@game/storageMap';
import type { JSX } from '@solidjs/web';
import { GameContext } from '../game';
import { UiContext } from '../ui';

/** Gap between cells, as a fraction of the cell. */
const GAP = 0.14;
const ZOOM_MS = 380;

export function StorageMap() {
  const game = useContext(GameContext);
  const ui = useContext(UiContext);
  const id = createUniqueId();
  let stage!: HTMLDivElement;

  /** The last page generated. */
  const frontier = createMemo(() => {
    const generated = game.state.pagesGenerated;
    return generated > 0n ? generated - 1n : 0n;
  });
  const following = createMemo(() => ui.map().follow);
  const view = createMemo(
    () => {
      const map = ui.map();
      return map.follow ? containerOf(frontier(), map.level) : map.view;
    },
    { equals: sameView }
  );
  const isPage = createMemo(() => view().level === MIN_LEVEL);
  const layout = createMemo(() => layoutFor(view()));
  const fill = createMemo(() => gridFill(view(), game.state.pagesGenerated), {
    equals: (a, b) => a.full === b.full && a.partial === b.partial && a.total === b.total,
  });
  const frontierCell = createMemo(() => cellOf(view(), frontier()));
  const targetCell = createMemo(() => {
    const target = ui.mapTarget();
    return target === null ? null : cellOf(view(), target);
  });
  const crumbs = createMemo(() => visibleCrumbs(view()));
  const filledLabel = createMemo(() => {
    const started = game.state.pagesGenerated > firstPage(view());
    const pct = fill().total * 100;
    if (!started) return 'empty';
    if (pct < 0.01) return '<0.01% filled';
    return `${pct.toFixed(pct < 10 ? 2 : 1)}% filled`;
  });
  const cellLabel = createMemo(() => {
    const { level } = view();
    if (level === MIN_LEVEL) return '';
    const per = layout().perCell;
    const child = levelName(level - 1).toLowerCase();
    if (per === 1n) {
      const pages = level - 1 === MIN_LEVEL ? '' : ` (${formatPageNumber(layout().pagesPerCell)} pages)`;
      return `each cell is one ${child}${pages}`;
    }
    return `each cell ≈ ${formatNumber(Number(per))} ${child}s`;
  });

  // Animate between levels: zooming in grows the chosen cell to fill the stage,
  // zooming out shrinks the old view back into its cell.
  // While following, stepping sideways to the next container is not animated
  // (at high tick rates that would flicker every tick).
  createEffect(
    () => ({ view: view(), following: following() }),
    (current, previous) => {
      if (!previous || typeof stage.animate !== 'function') return;
      const next = current.view;
      const prev = previous.view;
      if (sameView(next, prev)) return;
      if (current.following && previous.following && next.level === prev.level) return;
      let from: string | null = null;
      if (next.level === prev.level - 1) {
        const cell = cellOf(prev, firstPage(next));
        if (cell !== null) {
          const r = cellRect(gridLayout(prev.level), cell);
          from = `translate(${r.x * 100}%, ${r.y * 100}%) scale(${r.w}, ${r.h})`;
        }
      } else if (next.level === prev.level + 1) {
        const cell = cellOf(next, firstPage(prev));
        if (cell !== null) {
          const r = cellRect(gridLayout(next.level), cell);
          from = `scale(${1 / r.w}, ${1 / r.h}) translate(${-r.x * 100}%, ${-r.y * 100}%)`;
        }
      }
      stage.animate(
        from ? [{ transform: from, opacity: 0.4 }, { transform: 'none', opacity: 1 }] : [{ opacity: 0 }, { opacity: 1 }],
        { duration: ZOOM_MS, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }
      );
    }
  );

  const zoomIntoCell = (cell: number) => {
    const child = childView(view(), cell);
    if (!child) return;
    // Zooming into the newest page's cell keeps following it
    if (following() && cell === frontierCell()) ui.followAt(child.level);
    else ui.setMapView(child);
  };

  const onStageClick = (e: MouseEvent) => {
    if (isPage()) return;
    const box = stage.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const l = layout();
    const col = Math.floor(((e.clientX - box.left) / box.width) * l.cols);
    let row = Math.floor(((e.clientY - box.top) / box.height) * l.rows);
    if (l.flipY) row = l.rows - 1 - row;
    const cell = row * l.cols + col;
    if (cell >= 0 && cell < l.cells) zoomIntoCell(cell);
  };

  const zoomIn = () => zoomIntoCell((following() ? frontierCell() : targetCell() ?? frontierCell()) ?? 0);
  const zoomOut = () => {
    const parent = parentOf(view());
    if (!parent) return;
    if (following()) ui.followAt(parent.level);
    else ui.setMapView(parent);
  };

  return (
    <div id="storage-map">
      <div class="mb-2 flex items-center justify-between gap-2">
        <h2 class="section-title">Map</h2>
        <div class="flex items-center gap-1">
          <Show when={ui.mapTarget() !== null}>
            <MapButton label="Zoom to search result" onClick={() => ui.zoomTo(ui.mapTarget()!, frontier())}>
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
              <circle cx="12" cy="12" r="5" />
            </MapButton>
          </Show>
          <button
            data-follow
            title="Follow the newest page"
            aria-pressed={following() ? 'true' : 'false'}
            onClick={() => ui.followAt(view().level)}
            class={[
              'mr-1 flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs transition-colors',
              following() ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-muted hover:text-ink',
            ]}
          >
            <span class={['size-1.5 rounded-full', following() ? 'animate-pulse bg-paper' : 'bg-ink-muted']} />
            {following() ? 'Following' : 'Follow'}
          </button>
          <MapButton label="Zoom out" disabled={!parentOf(view())} onClick={zoomOut}>
            <path d="M6 12h12" />
          </MapButton>
          <MapButton label="Zoom in" disabled={isPage()} onClick={zoomIn}>
            <path d="M6 12h12M12 6v12" />
          </MapButton>
        </div>
      </div>

      <nav aria-label="Map location" class="mb-2 flex flex-wrap items-baseline gap-x-1 text-sm">
        <For each={crumbs()} keyed={c => `${c.level}:${c.index}`}>
          {(crumb, i) => (
            <>
              <Show when={i() > 0}>
                <span class="text-ink-muted">›</span>
              </Show>
              <Show
                when={i() < crumbs().length - 1}
                fallback={
                  <span data-map-title class="font-medium">
                    {crumbLabel(crumb())}
                  </span>
                }
              >
                <button
                  onClick={() => (following() ? ui.followAt(crumb().level) : ui.setMapView(crumb()))}
                  class="cursor-pointer text-ink-muted underline decoration-rule underline-offset-2 hover:text-ink"
                >
                  {crumbLabel(crumb())}
                </button>
              </Show>
            </>
          )}
        </For>
      </nav>

      <div class="mx-auto max-w-md overflow-hidden rounded-sm border border-rule bg-paper p-2">
        <div
          ref={stage}
          onClick={onStageClick}
          role="img"
          aria-label={`${crumbLabel(view())}, ${filledLabel()}`}
          class={['relative aspect-square w-full origin-top-left', { 'cursor-zoom-in': !isPage() }]}
        >
          <Show when={!isPage()} fallback={<PageCell view={view()} pagesGenerated={game.state.pagesGenerated} target={targetCell() !== null} />}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 size-full">
            <defs>
              <CellPattern id={`${id}-empty`} layout={layout()} class="fill-rule/60" />
              <CellPattern id={`${id}-full`} layout={layout()} class="fill-ink/80" />
            </defs>
            <For each={prefixRects(layout(), layout().cells)} keyed={false}>
              {r => <Rect rect={r()} fill={`url(#${id}-empty)`} />}
            </For>
            <For each={prefixRects(layout(), fill().full)} keyed={false}>
              {r => <Rect rect={r()} fill={`url(#${id}-full)`} />}
            </For>
            <Show when={fill().full < layout().cells && fill().partial > 0}>
              <PartialCell rect={cellRect(layout(), fill().full)} fraction={fill().partial} />
            </Show>
            <Show when={frontierCell() !== null}>
              <Marker rect={cellRect(layout(), frontierCell()!)} class="stroke-ink-muted" dashed />
            </Show>
            <Show when={targetCell() !== null}>
              <Marker rect={cellRect(layout(), targetCell()!)} class="animate-pulse stroke-accent" />
            </Show>
          </svg>
          </Show>
        </div>
      </div>

      <Show when={!isPage()}>
        <p class="mt-2 flex justify-between gap-2 text-xs text-ink-muted">
          <span>{cellLabel()}</span>
          <span data-map-fill class="font-mono tabular-nums">
            {filledLabel()}
          </span>
        </p>
      </Show>
      <Show when={ui.mapTarget() !== null && targetCell() === null}>
        <p class="mt-1 text-xs italic text-accent">The search result lies outside this {levelName(view().level).toLowerCase()}.</p>
      </Show>
    </div>
  );
}

function crumbLabel(view: MapView): string {
  return `${levelName(view.level)} ${formatPageNumber(localIndex(view))}`;
}

/**
 * Ancestors worth showing: from the highest one with a non-zero position
 * (or the parent, if all are zero) down to the view itself.
 */
function visibleCrumbs(view: MapView): MapView[] {
  const chain = ancestry(view);
  const firstNonZero = chain.findIndex(v => localIndex(v) !== 0n);
  const parentIdx = Math.max(0, chain.length - 2);
  const start = firstNonZero === -1 ? parentIdx : Math.min(firstNonZero, parentIdx);
  return chain.slice(start);
}

/** The deepest zoom: one page, with its text once it has been written. */
function PageCell(props: { view: MapView; pagesGenerated: bigint; target: boolean }) {
  const page = () => bounds(props.view).start;
  const written = () => page() < props.pagesGenerated;
  return (
    <div
      data-map-page
      class={[
        'absolute inset-0 flex flex-col rounded-sm border bg-paper-deep p-4',
        props.target ? 'border-accent' : 'border-rule',
      ]}
    >
      <Show
        when={written()}
        fallback={<p class="m-auto text-center text-sm italic text-ink-muted">This page has not been written yet.</p>}
      >
        <p class="min-h-0 flex-1 overflow-y-auto font-mono text-[0.8rem] leading-relaxed break-all whitespace-pre-wrap text-ink/85">
          {generatePage(page())}
        </p>
      </Show>
      <p class="mt-2 border-t border-rule pt-2 text-center text-xs italic text-ink-muted">
        — page <span class="font-mono not-italic tabular-nums">{formatPageNumber(page())}</span> —
      </p>
    </div>
  );
}

function CellPattern(props: { id: string; layout: GridLayout; class: string }) {
  const cw = () => 100 / props.layout.cols;
  const ch = () => 100 / props.layout.rows;
  return (
    <pattern id={props.id} width={cw()} height={ch()} patternUnits="userSpaceOnUse">
      <rect x={(cw() * GAP) / 2} y={(ch() * GAP) / 2} width={cw() * (1 - GAP)} height={ch() * (1 - GAP)} class={props.class} />
    </pattern>
  );
}

function Rect(props: { rect: CellRect; fill: string }) {
  return (
    <rect
      x={props.rect.x * 100}
      y={props.rect.y * 100}
      width={props.rect.w * 100}
      height={props.rect.h * 100}
      fill={props.fill}
    />
  );
}

/** The cell being filled: a faint cell with a bar showing its progress. */
function PartialCell(props: { rect: CellRect; fraction: number }) {
  const cell = () => {
    const r = props.rect;
    return { x: r.x * 100, y: r.y * 100, w: r.w * 100, h: r.h * 100 };
  };
  const g = () => ({ x: cell().w * GAP, y: cell().h * GAP });
  return (
    <>
      <rect
        x={cell().x + g().x / 2}
        y={cell().y + g().y / 2}
        width={cell().w - g().x}
        height={cell().h - g().y}
        class="fill-ink/25"
      />
      <rect
        x={cell().x + g().x / 2}
        y={cell().y + g().y / 2}
        width={Math.max(0.3, (cell().w - g().x) * props.fraction)}
        height={cell().h - g().y}
        class="fill-ink/80"
      />
    </>
  );
}

function Marker(props: { rect: CellRect; class: string; dashed?: boolean }) {
  return (
    <rect
      x={props.rect.x * 100}
      y={props.rect.y * 100}
      width={props.rect.w * 100}
      height={props.rect.h * 100}
      fill="none"
      stroke-width={2}
      stroke-dasharray={props.dashed ? '3 2' : undefined}
      vector-effect="non-scaling-stroke"
      class={props.class}
    />
  );
}

function MapButton(props: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: JSX.Element;
}) {
  return (
    <button
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={() => props.onClick()}
      class={[
        'flex size-9 items-center justify-center rounded-full border transition-colors',
        props.disabled
          ? 'cursor-not-allowed border-transparent text-rule'
          : 'cursor-pointer border-rule text-ink-muted hover:text-ink',
      ]}
    >
      <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        {props.children}
      </svg>
    </button>
  );
}
