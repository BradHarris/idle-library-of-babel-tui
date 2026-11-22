import { createContext, createSignal, type Accessor } from 'solid-js';
import { MIN_LEVEL, zoomPath, type MapView } from '@game/storageMap';

export type Tab = 'workers' | 'library' | 'log';

/** Delay between levels when zooming the storage map to a search result. */
export const ZOOM_STEP_MS = 600;

/** View state shared across panels (not game state, so not saved with the game). */
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

export type MapState = { follow: true; level: number } | { follow: false; view: MapView };

export function createUiStore(): UiStore {
  const [tab, setTab] = createSignal<Tab>('workers');
  // Default: zoomed all the way in, following the newest page
  const [map, setMap] = createSignal<MapState>({ follow: true, level: MIN_LEVEL });
  const [mapTarget, setMapTarget] = createSignal<bigint | null>(null);

  let timers: ReturnType<typeof setTimeout>[] = [];
  const cancelZoom = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  return {
    tab,
    setTab: t => setTab(t),
    map,
    setMapView(view) {
      cancelZoom();
      setMap({ follow: false, view });
    },
    followAt(level) {
      cancelZoom();
      setMap({ follow: true, level });
    },
    mapTarget,
    zoomTo(address, frontier) {
      cancelZoom();
      setMapTarget(address);
      zoomPath(address, frontier).forEach((view, i) => {
        timers.push(setTimeout(() => setMap({ follow: false, view }), i * ZOOM_STEP_MS));
      });
    },
    dispose: cancelZoom,
  };
}

/** No default: useContext throws if there's no provider. */
export const UiContext = createContext<UiStore>();
