import { describe, expect, it } from 'vitest';
import { MIN_LEVEL, tierLevel } from '@game/storageMap';
import { DEFAULT_ROUTE, formatRoute, parseRoute, type Route } from './route';

describe('route', () => {
  it('formats the default route as an empty hash, and parses an empty hash to it', () => {
    expect(formatRoute(DEFAULT_ROUTE)).toBe('');
    expect(parseRoute('')).toEqual(DEFAULT_ROUTE);
    expect(parseRoute('#')).toEqual(DEFAULT_ROUTE);
    expect(parseRoute('#/')).toEqual(DEFAULT_ROUTE);
  });

  it('round-trips tabs, followed levels, pinned views and targets', () => {
    const rack = tierLevel('serverRack');
    const routes: Route[] = [
      { tab: 'upgrades', map: DEFAULT_ROUTE.map, target: null },
      { tab: 'puzzles', map: DEFAULT_ROUTE.map, target: null },
      { tab: 'log', map: DEFAULT_ROUTE.map, target: null },
      { tab: 'achievements', map: DEFAULT_ROUTE.map, target: null },
      { tab: 'settings', map: DEFAULT_ROUTE.map, target: null },
      { tab: 'library', map: { follow: true, level: MIN_LEVEL + 1 }, target: null },
      { tab: 'library', map: { follow: false, view: { level: rack, index: 12n } }, target: 2n ** 90n },
      { tab: 'workers', map: { follow: false, view: { level: MIN_LEVEL, index: 0n } }, target: 0n },
    ];
    for (const route of routes) expect(parseRoute(formatRoute(route))).toEqual(route);
  });

  it('uses readable level ids', () => {
    const route: Route = { tab: 'library', map: { follow: false, view: { level: tierLevel('serverRack'), index: 12n } }, target: 5n };
    expect(formatRoute(route)).toBe('#/library?view=serverRack.12&target=5');
    expect(formatRoute({ ...DEFAULT_ROUTE, map: { follow: true, level: MIN_LEVEL + 1 } })).toBe('#/workers?follow=volume');
  });

  it('falls back to defaults for anything malformed', () => {
    expect(parseRoute('#/nope')).toEqual(DEFAULT_ROUTE);
    expect(parseRoute('#/library?view=nowhere.3').map).toEqual(DEFAULT_ROUTE.map);
    expect(parseRoute('#/library?view=serverRack.-1').map).toEqual(DEFAULT_ROUTE.map);
    expect(parseRoute('#/library?view=serverRack').map).toEqual(DEFAULT_ROUTE.map);
    expect(parseRoute('#/library?follow=nowhere').map).toEqual(DEFAULT_ROUTE.map);
    expect(parseRoute('#/library?target=abc').target).toBeNull();
    expect(parseRoute('#/library?target=abc').tab).toBe('library');
  });
});
