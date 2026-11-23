import { createSignal, type Accessor } from 'solid-js';
import { TICK_MS } from '@game/config';

/**
 * Device preferences, kept apart from the game save: an exported save moves
 * between devices, but what suits a phone doesn't suit a desktop.
 */

export const SETTINGS_KEY = 'library-of-babel:settings';

/** Update rates the player can pick. Production follows real time, so this only sets smoothness (and CPU/battery use). */
export const FPS_OPTIONS = [5, 10, 15, 20, 30, 60] as const;
export type Fps = (typeof FPS_OPTIONS)[number];

/** Phones and tablets get a lower default: re-rendering the map is the heavy part. */
export const MOBILE_DEFAULT_FPS: Fps = 15;
export const DESKTOP_DEFAULT_FPS = (1000 / TICK_MS) as Fps;

export interface Settings {
  fps: Fps;
}

const isFps = (x: unknown): x is Fps => (FPS_OPTIONS as readonly unknown[]).includes(x);

/** Touch-first devices, where `(pointer: coarse)` matches. */
export function isMobileDevice(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
}

export function defaultSettings(mobile = isMobileDevice()): Settings {
  return { fps: mobile ? MOBILE_DEFAULT_FPS : DESKTOP_DEFAULT_FPS };
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Saved settings over the device defaults; anything unreadable keeps its default. */
export function readSettings(store: Storage | null = storage(), mobile = isMobileDevice()): Settings {
  const settings = defaultSettings(mobile);
  try {
    const saved: unknown = JSON.parse(store?.getItem(SETTINGS_KEY) ?? 'null');
    if (typeof saved === 'object' && saved !== null && isFps((saved as { fps?: unknown }).fps)) {
      settings.fps = (saved as { fps: Fps }).fps;
    }
  } catch {
    // Corrupt settings: defaults
  }
  return settings;
}

function writeSettings(settings: Settings, store: Storage | null = storage()): void {
  try {
    store?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Not saved; it still applies until reload
  }
}

export interface SettingsStore {
  readonly fps: Accessor<Fps>;
  setFps(fps: Fps): void;
  /** Real-time interval between game ticks for the current FPS cap. */
  readonly tickMs: Accessor<number>;
}

export function createSettingsStore(initial: Settings = readSettings()): SettingsStore {
  const [fps, setFpsSignal] = createSignal<Fps>(initial.fps);
  return {
    fps,
    setFps(next) {
      setFpsSignal(next);
      writeSettings({ fps: next });
    },
    tickMs: () => 1000 / fps(),
  };
}
