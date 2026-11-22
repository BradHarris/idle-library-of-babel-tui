import { createContext, createSignal, type Accessor } from 'solid-js';
import { zoomPath, type MapView } from '@game/storageMap';
import { formatRoute, parseRoute, type MapState, type Route, type Tab } from './route';

export type { MapState, Tab } from './route';

/** Delay between levels when zooming the storage map to a search result. */
export const ZOOM_STEP_MS = 600;

/**
 * View state shared across panels (not game state, so not saved with the
 * game). It lives in the URL hash (see route.ts): every change writes the URL,
 * and back/forward or an edited URL updates the view.
 */
export interface UiStore {
  readonly tab: Accessor<Tab>;
  setTab(tab: Tab): void;

  /**
   * What the storage map shows: either the container at `level` holding the
   * newest page (following it as pages are generated), or one fixed container.
   */
  readonly map: Accessor<MapState>;
  /** Pin the map to one container (cancels a running zoom). */
  setMapView(view: MapView): void;
  /** Follow the newest page at `level` (cancels a running zoom). */
  followAt(level: number): void;
  /** Page highlighted on the map, e.g. the last search result. */
  readonly mapTarget: Accessor<bigint | null>;
  /** Highlight `address` and zoom level by level from `frontier`'s shared container down to it. */
  zoomTo(address: bigint, frontier: bigint): void;

  dispose(): void;
}

type HistoryMode = 'push' | 'replace';

export function createUiStore(): UiStore {
  const hasWindow = typeof window !== 'undefined';
  // Plain mirror of the route. Signal reads lag writes until the flush, so
  // the URL is built from this rather than from the signals.
  let route: Route = parseRoute(hasWindow ? window.location.hash : '');

  const [tab, setTabSignal] = createSignal<Tab>(route.tab);
  const [map, setMap] = createSignal<MapState>(route.map);
  const [mapTarget, setMapTarget] = createSignal<bigint | null>(route.target);

  let timers: ReturnType<typeof setTimeout>[] = [];
  const cancelZoom = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  /** Apply `next` to the view; `history` also writes it to the URL. */
  function apply(next: Partial<Route>, history?: HistoryMode): void {
    const prev = route;
    route = { ...route, ...next };
    if (route.tab !== prev.tab) setTabSignal(route.tab);
    if (route.map !== prev.map) setMap(route.map);
    if (route.target !== prev.target) setMapTarget(route.target);
    if (history && hasWindow) writeUrl(history);
  }

  function writeUrl(mode: HistoryMode): void {
    const hash = formatRoute(route);
    if (hash === formatRoute(parseRoute(window.location.hash))) return;
    // An empty hash still leaves a bare "#", so drop it from the URL entirely
    const url = hash || window.location.pathname + window.location.search;
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }

  // Back/forward and hand-edited URLs
  const onUrlChange = () => {
    const next = parseRoute(window.location.hash);
    if (formatRoute(next) === formatRoute(route)) return;
    cancelZoom();
    apply(next);
  };
  if (hasWindow) {
    window.addEventListener('popstate', onUrlChange);
    window.addEventListener('hashchange', onUrlChange);
  }

  return {
    tab,
    setTab(t) {
      if (t !== route.tab) apply({ tab: t }, 'push');
    },
    map,
    setMapView(view) {
      cancelZoom();
      apply({ map: { follow: false, view } }, 'push');
    },
    followAt(level) {
      cancelZoom();
      apply({ map: { follow: true, level } }, 'push');
    },
    mapTarget,
    zoomTo(address, frontier) {
      cancelZoom();
      // One history entry for the whole zoom: back returns to where it started
      apply({ target: address }, 'push');
      zoomPath(address, frontier).forEach((view, i) => {
        timers.push(setTimeout(() => apply({ map: { follow: false, view } }, 'replace'), i * ZOOM_STEP_MS));
      });
    },
    dispose() {
      cancelZoom();
      if (hasWindow) {
        window.removeEventListener('popstate', onUrlChange);
        window.removeEventListener('hashchange', onUrlChange);
      }
    },
  };
}

/** No default: useContext throws if there's no provider. */
export const UiContext = createContext<UiStore>();
