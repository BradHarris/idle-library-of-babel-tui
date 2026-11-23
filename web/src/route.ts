import { MIN_LEVEL, TOP_LEVEL, levelId, type MapView } from '@game/storageMap';

/**
 * View state in the URL hash, so tabs and map positions survive reloads, can
 * be shared, and work with back/forward. A hash (not a path) works on any
 * static host without rewrite rules.
 *
 *   #/library?view=serverRack.12&target=123456789
 *   #/library?follow=volume
 *   (empty)  → the Workers tab, following the newest page at page level
 *
 * - path: the tab
 * - follow=<level id>: follow the newest page at that level (default: page)
 * - view=<level id>.<index>: pinned to one container
 * - target=<page>: page highlighted on the map (the last search result)
 *
 * Anything malformed falls back to its default, so a bad link never breaks the app.
 */

export const TABS = ['workers', 'upgrades', 'puzzles', 'library', 'log', 'achievements', 'settings'] as const;
export type Tab = (typeof TABS)[number];
export const DEFAULT_TAB: Tab = 'workers';

export type MapState = { follow: true; level: number } | { follow: false; view: MapView };

export interface Route {
  tab: Tab;
  map: MapState;
  target: bigint | null;
}

export const DEFAULT_ROUTE: Route = { tab: DEFAULT_TAB, map: { follow: true, level: MIN_LEVEL }, target: null };

const isTab = (x: string): x is Tab => (TABS as readonly string[]).includes(x);

function levelFromId(id: string): number | null {
  for (let level = MIN_LEVEL; level <= TOP_LEVEL; level++) if (levelId(level) === id) return level;
  return null;
}

const toBigInt = (x: string | null): bigint | null => (x !== null && /^\d{1,400}$/.test(x) ? BigInt(x) : null);

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const q = raw.indexOf('?');
  const path = q === -1 ? raw : raw.slice(0, q);
  const params = new URLSearchParams(q === -1 ? '' : raw.slice(q + 1));

  const tab = isTab(path) ? path : DEFAULT_TAB;
  let map: MapState = DEFAULT_ROUTE.map;

  const view = params.get('view');
  const follow = params.get('follow');
  if (view !== null) {
    const dot = view.lastIndexOf('.');
    const level = dot === -1 ? null : levelFromId(view.slice(0, dot));
    const index = dot === -1 ? null : toBigInt(view.slice(dot + 1));
    if (level !== null && index !== null) map = { follow: false, view: { level, index } };
  } else if (follow !== null) {
    const level = levelFromId(follow);
    if (level !== null) map = { follow: true, level };
  }

  return { tab, map, target: toBigInt(params.get('target')) };
}

/** The hash for `route` ('' for the default route). */
export function formatRoute(route: Route): string {
  const params: string[] = [];
  if (!route.map.follow) params.push(`view=${levelId(route.map.view.level)}.${route.map.view.index}`);
  else if (route.map.level !== MIN_LEVEL) params.push(`follow=${levelId(route.map.level)}`);
  if (route.target !== null) params.push(`target=${route.target}`);

  if (route.tab === DEFAULT_TAB && params.length === 0) return '';
  return `#/${route.tab}${params.length ? `?${params.join('&')}` : ''}`;
}
