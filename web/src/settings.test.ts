import { describe, expect, it } from 'vitest';
import { DESKTOP_DEFAULT_FPS, MOBILE_DEFAULT_FPS, SETTINGS_KEY, readSettings } from './settings';

function memoryStorage(entries: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(entries));
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

describe('settings', () => {
  it('defaults to 15 fps on mobile and the old tick rate on desktop', () => {
    expect(MOBILE_DEFAULT_FPS).toBe(15);
    expect(DESKTOP_DEFAULT_FPS).toBe(20);
    expect(readSettings(memoryStorage(), true).fps).toBe(15);
    expect(readSettings(memoryStorage(), false).fps).toBe(20);
  });

  it('uses a saved choice over the device default', () => {
    expect(readSettings(memoryStorage({ [SETTINGS_KEY]: '{"fps":60}' }), true).fps).toBe(60);
  });

  it('ignores corrupt or unsupported values', () => {
    expect(readSettings(memoryStorage({ [SETTINGS_KEY]: 'nope' }), true).fps).toBe(15);
    expect(readSettings(memoryStorage({ [SETTINGS_KEY]: '{"fps":7}' }), false).fps).toBe(20);
    expect(readSettings(null, true).fps).toBe(15);
  });
});
