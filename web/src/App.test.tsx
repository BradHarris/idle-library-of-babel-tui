import { afterEach, describe, expect, it, vi } from 'vitest';
import { flush } from 'solid-js';
import { render } from '@solidjs/web';
import { captureArtifact } from '@solidjs/diagnostics';
import '@solidjs/diagnostics/vitest';
import { generatePage, queryToPageAddress } from '@game/page';
import { ACHIEVEMENTS } from '@game/achievements';
import { formatCount, formatMoney, formatMultiplier, formatPageNumber } from '@game/format';
import { UPGRADES, getUpgrade } from '@game/upgrades';
import { MAX_GUESSES, PUZZLES } from '@game/puzzles';
import { AUTOSAVE_MS, createInitialState, getSpeedCost } from '@game/config';
import { D } from '@game/bignum';
import { BACKUP_KEY, SAVE_KEY, SAVE_VERSION, encodeSave, exportSave } from '@game/save';
import { RESET_CONFIRM_MS } from './components/SavePanel';
import { MIN_LEVEL, PAGES_PER, TOP_LEVEL, containerOf, levelId, levelName, localIndex, zoomPath } from '@game/storageMap';
import { App } from './App';
import { ZOOM_STEP_MS } from './ui';
import { SETTINGS_KEY } from './settings';

// jsdom has no <dialog> methods
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
  this.dispatchEvent(new Event('close'));
};

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  localStorage.clear();
  // View state lives in the URL, which jsdom keeps between tests
  history.replaceState(null, '', '/');
  dispose = undefined;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  dispose = render(() => <App />, root);
  return root;
}

function stat(root: HTMLElement, name: string): string {
  return root.querySelector(`[data-stat="${name}"]`)?.textContent ?? '';
}

describe('App', () => {
  it('mounts, ticks and hires with no reactivity diagnostics', async () => {
    vi.useFakeTimers();
    let root!: HTMLElement;

    const { artifact } = await captureArtifact(
      () => {
        root = mount();
        flush();
        // 1 writer → 1 page/sec; 15 seconds earn ~$15, enough for a second writer ($11.50)
        vi.advanceTimersByTime(15_000);
        flush();
        root.querySelector<HTMLButtonElement>('button[data-tier="writer"]')!.click();
      },
      { scenario: 'tick-and-hire' }
    );

    expect(artifact).toHaveNoDiagnostics();
    expect(stat(root, 'pages')).toBe('15');
    expect(root.textContent).toContain('Hired Writer for');
    // 2 writers, ×1.02 from the "First Words" achievement
    expect(stat(root, 'pps')).toBe('2.04');
    // The map follows the newest page (page 14 of 0..14) and shows its text
    expect(root.querySelector('[data-map-title]')!.textContent).toBe('Page 14');
    expect(root.querySelector('[data-map-page]')!.textContent).toContain(generatePage(14n).slice(0, 40));
  });

  it('bottom tabs switch the visible panel', () => {
    const root = mount();
    flush();
    const panel = (id: string) => root.querySelector(`[data-panel="${id}"]`)!;
    expect(panel('workers').classList.contains('hidden')).toBe(false);
    expect(panel('log').classList.contains('hidden')).toBe(true);

    root.querySelector<HTMLButtonElement>('[data-tab="log"]')!.click();
    flush();
    expect(root.querySelector('[data-tab="log"]')!.getAttribute('aria-current')).toBe('page');
    expect(panel('log').classList.contains('hidden')).toBe(false);
    expect(panel('workers').classList.contains('hidden')).toBe(true);

    root.querySelector<HTMLButtonElement>('[data-tab="upgrades"]')!.click();
    flush();
    expect(panel('upgrades').classList.contains('hidden')).toBe(false);
    expect(panel('workers').classList.contains('hidden')).toBe(true);
    expect(panel('log').classList.contains('hidden')).toBe(true);

    // Log, Achievements and Settings (which holds Save) are each their own page
    const pages = ['log', 'achievements', 'settings'] as const;
    for (const tab of pages) {
      root.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`)!.click();
      flush();
      for (const other of pages) expect(panel(other).classList.contains('hidden')).toBe(other !== tab);
    }
    expect(window.location.hash).toBe('#/settings');
    expect(panel('settings').querySelector('[data-panel-save]')).not.toBeNull();
    expect(panel('settings').querySelector('[data-panel-settings]')).not.toBeNull();
  });

  it('search reports a phrase as not yet discovered at the start', () => {
    const root = mount();
    flush();
    const input = root.querySelector<HTMLInputElement>('dialog input')!;
    input.value = 'hello';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    flush();
    expect(root.querySelector('dialog')!.textContent).toContain('Not yet discovered');
  });

  it('"Show on map" zooms level by level down to the page holding the phrase', async () => {
    vi.useFakeTimers();
    const phrase = 'the library';
    const address = queryToPageAddress(phrase);
    const path = zoomPath(address, 0n);
    const title = (root: HTMLElement) => root.querySelector('[data-map-title]')!.textContent;
    const label = (level: number) => `${levelName(level)} ${formatPageNumber(localIndex(containerOf(address, level)))}`;
    let root!: HTMLElement;
    const seen: string[] = [];

    const { artifact } = await captureArtifact(
      () => {
        root = mount();
        flush();
        expect(title(root)).toBe('Page 0'); // follows the newest page

        const input = root.querySelector<HTMLInputElement>('dialog input')!;
        input.value = phrase;
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        flush();
        root.querySelector<HTMLButtonElement>('[data-show-on-map]')!.click();
        flush();
        expect(root.querySelector('[data-tab="library"]')!.getAttribute('aria-current')).toBe('page');

        for (let i = 0; i < path.length; i++) {
          vi.advanceTimersByTime(i === 0 ? 0 : ZOOM_STEP_MS);
          flush();
          seen.push(title(root)!);
        }
      },
      { scenario: 'search-zoom' }
    );

    expect(artifact).toHaveNoDiagnostics();
    expect(path.length).toBeGreaterThan(4);
    expect(seen).toEqual(path.map(v => label(v.level)));
    expect(seen.at(-1)).toMatch(/^Page /);
    // Not generated yet, so the page view says so instead of showing text
    expect(root.querySelector('[data-map-page]')!.textContent).toContain('not been written yet');
  });

  it('stays in follow mode while zooming, and breadcrumbs keep following', () => {
    vi.useFakeTimers();
    const root = mount();
    flush();
    const title = () => root.querySelector('[data-map-title]')!.textContent;
    const follow = () => root.querySelector('[data-follow]')!.getAttribute('aria-pressed');
    const button = (label: string) => root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

    expect(follow()).toBe('true');
    button('Zoom out').click();
    flush();
    expect(title()).toBe('Volume 0');
    expect(follow()).toBe('true');

    // Generating pages fills the volume but keeps the level
    vi.advanceTimersByTime(5_000);
    flush();
    expect(title()).toBe('Volume 0');
    expect(root.querySelector('[data-map-fill]')!.textContent).toMatch(/% filled/);

    // Zooming in while following goes back to the newest page
    button('Zoom in').click();
    flush();
    expect(title()).toMatch(/^Page [1-9]/);
    expect(follow()).toBe('true');

    // A breadcrumb jumps up a level and keeps following
    root.querySelector<HTMLButtonElement>('nav[aria-label="Map location"] button:not([data-map-top])')!.click();
    flush();
    expect(title()).toBe('Volume 0');
    expect(follow()).toBe('true');

    // The first crumb is always the universe: one tap to the top
    root.querySelector<HTMLButtonElement>('[data-map-top]')!.click();
    flush();
    expect(title()).toBe('Universe 0');
    expect(follow()).toBe('true');
    expect(root.querySelector('[data-map-top]')).toBeNull();
    expect(button('Zoom out').disabled).toBe(true);
  });

  it('pops up achievements, lists them, and unlocks hire modes', () => {
    vi.useFakeTimers();
    const root = mount();
    flush();
    const mode = (m: string) => root.querySelector<HTMLButtonElement>(`[data-hire-mode="${m}"]`)!;
    const unlocked = (id: string) => root.querySelector(`[data-achievement="${id}"]`)!.getAttribute('data-unlocked');

    expect(mode('next').disabled).toBe(true);
    expect(mode('max').disabled).toBe(true);
    expect(unlocked('pages-1')).toBe('false');

    vi.advanceTimersByTime(1_000);
    flush();
    expect(unlocked('pages-1')).toBe('true');
    expect(root.querySelector('[data-achievement-toast="pages-1"]')).not.toBeNull();
    expect(root.querySelector('[data-achievement-count]')!.textContent).toBe(`1/${ACHIEVEMENTS.length}`);

    // The toast goes after a few seconds of play
    vi.advanceTimersByTime(5_000);
    flush();
    expect(root.querySelector('[data-achievement-toast="pages-1"]')).toBeNull();

    // Hiring a manager ($80, ~80s of one writer) unlocks "Max"
    vi.advanceTimersByTime(75_000);
    flush();
    root.querySelector<HTMLButtonElement>('button[data-tier="manager"]')!.click();
    flush();
    expect(unlocked('hire-manager')).toBe('true');
    expect(mode('max').disabled).toBe(false);
    expect(mode('next').disabled).toBe(true);
  });
});

describe('App — saving', () => {
  const click = (root: HTMLElement, name: string) =>
    root.querySelector<HTMLButtonElement>(`button[data-save="${name}"]`)!.click();
  const notice = (root: HTMLElement) => root.querySelector('[data-save-notice]')?.textContent ?? '';
  const savedState = () => JSON.parse(localStorage.getItem(SAVE_KEY)!).state;
  /** Let onFlush callbacks (queued as microtasks) run, then apply their writes. */
  const settle = async () => {
    await Promise.resolve();
    flush();
  };

  function seed(edit: (s: ReturnType<typeof createInitialState>) => void, savedAt = Date.now()) {
    const s = createInitialState();
    edit(s);
    localStorage.setItem(SAVE_KEY, encodeSave(s, savedAt));
  }

  it('loads the saved game and banks the time away as a boost, with no diagnostics', async () => {
    vi.useFakeTimers();
    seed(s => {
      s.money = D(1234);
      s.pagesGenerated = 5000n;
    }, Date.now() - 20 * 3600_000);
    let root!: HTMLElement;

    const { artifact } = await captureArtifact(
      () => {
        root = mount();
        flush();
      },
      { scenario: 'load-save' }
    );

    expect(artifact).toHaveNoDiagnostics();
    expect(stat(root, 'money')).toBe(formatMoney(1234));
    // A count, like the other stats: "5.00K", not "5,000"
    expect(stat(root, 'pages')).toBe(formatCount(5000n));
    expect(stat(root, 'pages')).toBe('5.00K');
    expect(stat(root, 'boost')).toContain('10× boost 1:00:00');
    expect(root.textContent).toContain('Welcome back: away 20h, 10× output for 1h');
  });

  it('autosaves on an interval and when the tab is hidden', () => {
    vi.useFakeTimers();
    const root = mount();
    flush();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();

    vi.advanceTimersByTime(AUTOSAVE_MS);
    flush();
    const first = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    expect(first.v).toBe(SAVE_VERSION);
    expect(BigInt(first.state.pagesGenerated)).toBeGreaterThan(0n);

    vi.advanceTimersByTime(2_000);
    flush();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    // jsdom's own getter comes back once the override is removed
    delete (document as { visibilityState?: string }).visibilityState;
    expect(savedState().time).toBeGreaterThan(first.state.time);
    expect(root).toBeTruthy();
  });

  it('banks a long gap between ticks (a throttled tab) as boost instead of ticking through it', () => {
    vi.useFakeTimers();
    const root = mount();
    flush();
    // Jump the clock without running the interval in between
    vi.setSystemTime(Date.now() + 100_000);
    vi.advanceTimersByTime(50);
    flush();
    expect(stat(root, 'boost')).toContain('10× boost');
  });

  it('reset needs a second click, then clears the game and the save', async () => {
    vi.useFakeTimers();
    seed(s => (s.money = D(500)));
    let root!: HTMLElement;

    const { artifact } = await captureArtifact(
      () => {
        root = mount();
        flush();
        click(root, 'reset');
        flush();
      },
      { scenario: 'reset-confirm' }
    );
    expect(artifact).toHaveNoDiagnostics();
    expect(root.querySelector('button[data-save="reset"]')!.textContent).toBe('Click again to reset');
    expect(stat(root, 'money')).toBe(formatMoney(500));

    // The confirm lapses
    vi.advanceTimersByTime(RESET_CONFIRM_MS);
    flush();
    expect(root.querySelector('button[data-save="reset"]')!.textContent).toBe('Reset');

    click(root, 'reset');
    flush();
    click(root, 'reset');
    flush();
    await settle(); // the save runs on a microtask right after the reset's flush
    expect(stat(root, 'money')).toBe(formatMoney(0));
    expect(notice(root)).toBe('Game reset');
    expect(savedState().money).toEqual([0, 0]);
    // Its own reset isn't another tab's write
    expect(root.querySelector('[data-halted]')).toBeNull();
  });

  it('imports an exported save, and reports a bad one inline', async () => {
    vi.useFakeTimers();
    const root = mount();
    flush();
    const input = root.querySelector<HTMLTextAreaElement>('textarea[data-save-import]')!;

    input.value = 'definitely not a save';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flush();
    click(root, 'import');
    flush();
    expect(notice(root)).toBe('That is not a save string');

    const other = createInitialState();
    other.money = D(777);
    other.speedLevel = 2;
    input.value = exportSave(other);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flush();
    click(root, 'import');
    flush();
    await settle();
    expect(stat(root, 'money')).toBe(formatMoney(777));
    expect(notice(root)).toBe('Save loaded');
    expect(savedState().speedLevel).toBe(2);
    expect(input.value).toBe('');
  });

  it('export shows the save string', () => {
    const root = mount();
    flush();
    click(root, 'export');
    flush();
    const text = root.querySelector<HTMLTextAreaElement>('textarea[data-save-export]')!.value;
    expect(JSON.parse(atob(text)).v).toBe(SAVE_VERSION);
  });

  it('never autosaves over a save from a newer version', () => {
    vi.useFakeTimers();
    const newer = JSON.stringify({ v: SAVE_VERSION + 1, savedAt: 0, state: {} });
    localStorage.setItem(SAVE_KEY, newer);
    const root = mount();
    flush();
    expect(root.querySelector('[data-save-load-error]')!.textContent).toContain('newer version');

    vi.advanceTimersByTime(AUTOSAVE_MS * 2);
    flush();
    expect(localStorage.getItem(SAVE_KEY)).toBe(newer);
    expect(localStorage.getItem(BACKUP_KEY)).toBe(newer);

    // An explicit save is the player's choice, and turns autosave back on
    click(root, 'now');
    flush();
    expect(notice(root)).toBe('Saved');
    expect(localStorage.getItem(SAVE_KEY)).not.toBe(newer);
  });

  describe('another tab saving', () => {
    /** A save written by another tab running the game. */
    const otherTabSave = () => {
      const s = createInitialState();
      s.money = D(999);
      return encodeSave(s, Date.now());
    };
    const halted = (root: HTMLElement) => root.querySelector('[data-halted]') !== null;

    it('halts as soon as the browser reports it: stops the game, never writes again, asks for a reload', async () => {
      vi.useFakeTimers();
      const root = mount();
      flush();
      vi.advanceTimersByTime(AUTOSAVE_MS);
      flush();
      expect(halted(root)).toBe(false);

      const other = otherTabSave();
      localStorage.setItem(SAVE_KEY, other);
      window.dispatchEvent(new StorageEvent('storage', { key: SAVE_KEY }));
      flush();
      expect(halted(root)).toBe(true);
      expect(root.querySelector('[data-halted]')!.textContent).toContain('another tab');

      // The game is stopped
      const pages = stat(root, 'pages');
      vi.advanceTimersByTime(5_000);
      flush();
      expect(stat(root, 'pages')).toBe(pages);

      // Nothing writes over the other tab's save: autosave, hiding, closing, Save now, Reset
      vi.advanceTimersByTime(AUTOSAVE_MS * 2);
      flush();
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      delete (document as { visibilityState?: string }).visibilityState;
      click(root, 'now');
      click(root, 'reset');
      flush();
      click(root, 'reset');
      flush();
      await settle();
      window.dispatchEvent(new Event('pagehide'));
      expect(localStorage.getItem(SAVE_KEY)).toBe(other);
    });

    it('checks the save before writing, even if the browser has not reported the change yet', () => {
      vi.useFakeTimers();
      const root = mount();
      flush();
      const other = otherTabSave();
      localStorage.setItem(SAVE_KEY, other);

      vi.advanceTimersByTime(AUTOSAVE_MS);
      flush();
      expect(localStorage.getItem(SAVE_KEY)).toBe(other);
      expect(halted(root)).toBe(true);
    });

    it("halts instead of resetting another tab's save", async () => {
      vi.useFakeTimers();
      const root = mount();
      flush();
      const other = otherTabSave();
      localStorage.setItem(SAVE_KEY, other);

      click(root, 'reset');
      flush();
      click(root, 'reset');
      flush();
      await settle();
      expect(localStorage.getItem(SAVE_KEY)).toBe(other);
      expect(halted(root)).toBe(true);
    });

    it('ignores writes to other keys', () => {
      vi.useFakeTimers();
      const root = mount();
      flush();
      localStorage.setItem(SETTINGS_KEY, '{"fps":15}');
      window.dispatchEvent(new StorageEvent('storage', { key: SETTINGS_KEY }));
      vi.advanceTimersByTime(AUTOSAVE_MS);
      flush();
      expect(halted(root)).toBe(false);
      expect(savedState()).toBeTruthy();
    });
  });
});

describe('App — upgrades', () => {
  it('teases an upgrade, unlocks it by hiring, and buys it, with no diagnostics', async () => {
    vi.useFakeTimers();
    const s = createInitialState();
    s.playerWorkers.writer = 24;
    s.workers.writer = D(24);
    s.money = D(1_000_000);
    localStorage.setItem(SAVE_KEY, encodeSave(s, Date.now()));
    const upgrade = getUpgrade('writer-25')!;
    const el = (root: HTMLElement, state: string) =>
      root.querySelector<HTMLElement>(`[data-upgrade-id="writer-25"][data-upgrade-state="${state}"]`);
    const badge = (root: HTMLElement) =>
      root.querySelector('button[data-tier="writer"]')!.closest('li')!.querySelector('.text-accent')?.textContent;
    let root!: HTMLElement;

    const { artifact } = await captureArtifact(
      () => {
        root = mount();
        flush();
        expect(el(root, 'locked')!.querySelector('[data-requirement]')!.textContent).toBe('Hire 25 writers');
        expect(el(root, 'available')).toBeNull();

        root.querySelector<HTMLButtonElement>('button[data-tier="writer"]')!.click();
        flush();
        expect(el(root, 'locked')).toBeNull();
        el(root, 'available')!.click();
        flush();
      },
      { scenario: 'buy-upgrade' }
    );

    expect(artifact).toHaveNoDiagnostics();
    expect(el(root, 'available')).toBeNull();
    expect(root.querySelector('[data-upgrade-count]')!.textContent).toBe(`1/${UPGRADES.length}`);
    expect(root.textContent).toContain(`Upgrade: ${upgrade.name}`);
    // The next writer upgrade is teased now
    expect(root.querySelector('[data-upgrade-id="writer-50"][data-upgrade-state="locked"]')).not.toBeNull();
    // 25 writers: one doubling (at 10) × the upgrade
    const factor = (upgrade.effect as { factor: number }).factor;
    expect(badge(root)).toBe(formatMultiplier(2 * factor));
  });
});

describe('App — upgrades tab', () => {
  it('badges the tab with how many upgrades can be bought, including "Faster"', () => {
    vi.useFakeTimers();
    const s = createInitialState();
    s.playerWorkers.writer = 25;
    s.workers.writer = D(25);
    s.money = getSpeedCost(0).add(getUpgrade('writer-25')!.cost);
    localStorage.setItem(SAVE_KEY, encodeSave(s, Date.now()));
    const root = mount();
    flush();
    const badge = () => root.querySelector('[data-tab="upgrades"] [data-tab-badge]')?.textContent ?? null;

    // Faster and Sharper Quills
    expect(badge()).toBe('2');
    // Faster moved out of the HUD and into the Upgrades panel
    expect(root.querySelector('header [data-upgrade-id="speed"]')).toBeNull();
    const faster = root.querySelector<HTMLButtonElement>('[data-panel="upgrades"] [data-upgrade-id="speed"]')!;
    // Names the level you'd be buying, not the one you have
    expect(faster.textContent).toContain('Faster (level 1)');
    faster.click();
    flush();
    expect(faster.textContent).toContain('Faster (level 2)');
    expect(root.querySelector('[data-stat="output"]')!.textContent).toContain('faster lv.1');
    // Sharper Quills is still affordable; the next Faster isn't
    expect(badge()).toBe('1');
    root.querySelector<HTMLButtonElement>('[data-upgrade-id="writer-25"]')!.click();
    flush();
    expect(badge()).toBeNull();
  });
});

describe('App — URL routing', () => {
  const title = (root: HTMLElement) => root.querySelector('[data-map-title]')!.textContent;
  const panelHidden = (root: HTMLElement, id: string) =>
    root.querySelector(`[data-panel="${id}"]`)!.classList.contains('hidden');

  it('writes the tab and map position to the URL', () => {
    const root = mount();
    flush();
    expect(location.hash).toBe('');

    root.querySelector<HTMLButtonElement>('[data-tab="library"]')!.click();
    flush();
    expect(location.hash).toBe('#/library');

    root.querySelector<HTMLButtonElement>('button[aria-label="Zoom out"]')!.click();
    flush();
    expect(location.hash).toBe('#/library?follow=volume');
  });

  it('opens the tab and map position from the URL, with no diagnostics', async () => {
    history.replaceState(null, '', '/#/library?view=serverRack.0');
    let root!: HTMLElement;
    const { artifact } = await captureArtifact(
      () => {
        root = mount();
        flush();
      },
      { scenario: 'route-load' }
    );
    expect(artifact).toHaveNoDiagnostics();
    expect(panelHidden(root, 'library')).toBe(false);
    expect(panelHidden(root, 'workers')).toBe(true);
    expect(title(root)).toBe('Rack 0');
    expect(root.querySelector('[data-follow]')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('follows back/forward (popstate) and hand-edited URLs (hashchange)', () => {
    const root = mount();
    flush();
    history.pushState(null, '', '/#/upgrades');
    window.dispatchEvent(new PopStateEvent('popstate'));
    flush();
    expect(panelHidden(root, 'upgrades')).toBe(false);
    expect(root.querySelector('[data-tab="upgrades"]')!.getAttribute('aria-current')).toBe('page');

    history.replaceState(null, '', '/#/library?view=server.0');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    flush();
    expect(panelHidden(root, 'library')).toBe(false);
    expect(title(root)).toBe('Server 0');
  });

  it('keeps a search zoom in the URL as one history entry', () => {
    vi.useFakeTimers();
    const root = mount();
    flush();
    const address = queryToPageAddress('the library');
    const path = zoomPath(address, 0n);
    const input = root.querySelector<HTMLInputElement>('dialog input')!;
    input.value = 'the library';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    flush();
    const before = history.length;
    root.querySelector<HTMLButtonElement>('[data-show-on-map]')!.click();
    vi.advanceTimersByTime(path.length * ZOOM_STEP_MS);
    flush();
    // One entry for the tab, one for the zoom; the zoom's steps replace each other
    expect(history.length).toBe(before + 2);
    const page = containerOf(address, path.at(-1)!.level);
    expect(location.hash).toBe(`#/library?view=page.${page.index}&target=${address}`);
  });
});

describe('App — frame rate cap', () => {
  it('ticks at the chosen rate and remembers it', () => {
    vi.useFakeTimers();
    const intervals = vi.spyOn(globalThis, 'setInterval');
    const root = mount();
    flush();
    const tickDelays = () => intervals.mock.calls.map(c => c[1]).filter(ms => ms !== AUTOSAVE_MS);
    expect(tickDelays()).toEqual([50]); // desktop default: 20 fps

    root.querySelector<HTMLButtonElement>('[data-fps="5"]')!.click();
    flush();
    expect(tickDelays()).toEqual([50, 200]);
    expect(root.querySelector('[data-fps="5"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({ fps: 5 });

    // Time still counts in full at the lower rate: 10 s of one writer is ~10 pages
    vi.advanceTimersByTime(10_000);
    flush();
    expect(Number(stat(root, 'pages'))).toBeGreaterThanOrEqual(9);
  });
});

describe('App — storage map rendering', () => {
  it('walks every level with no diagnostics, nothing animating inside the SVG, and formatted cell sizes', async () => {
    let root!: HTMLElement;
    const labels: string[] = [];
    const svgPulses: number[] = [];
    const { artifact } = await captureArtifact(
      () => {
        root = mount();
        flush();
        for (let level = MIN_LEVEL + 1; level <= TOP_LEVEL; level++) {
          history.pushState(null, '', `/#/library?view=${levelId(level)}.0`);
          window.dispatchEvent(new PopStateEvent('popstate'));
          flush();
          labels.push(root.querySelector('#storage-map p > span')!.textContent ?? '');
          // Animating an SVG child repaints the whole drawing every frame
          svgPulses.push(root.querySelectorAll('#storage-map svg .animate-pulse').length);
        }
      },
      { scenario: 'map-every-level' }
    );
    expect(artifact).toHaveNoDiagnostics();
    expect(svgPulses.every(n => n === 0)).toBe(true);
    // e.g. "each cell is one drive (1.26e11 pages)": the number format, never "125,660,…"
    const sizes = labels.map(l => /\(([^)]*) pages\)/.exec(l)?.[1]).filter(Boolean);
    expect(sizes.length).toBeGreaterThan(10);
    for (const size of sizes) expect(size).not.toContain(',');
    expect(labels).toContain(`each cell is one drive (${formatCount(PAGES_PER[0]!)} pages)`);
  });

  it('pulses the cell being written as an HTML overlay', () => {
    vi.useFakeTimers();
    const root = mount();
    flush();
    // Up two levels, to cells of many pages each, so the first is part-written
    root.querySelector<HTMLButtonElement>('button[aria-label="Zoom out"]')!.click();
    flush();
    root.querySelector<HTMLButtonElement>('button[aria-label="Zoom out"]')!.click();
    vi.advanceTimersByTime(3_000);
    flush();
    const pulse = root.querySelector<HTMLElement>('#storage-map [data-map-pulse="writing"]');
    expect(pulse).not.toBeNull();
    expect(pulse!.closest('svg')).toBeNull();
    expect(pulse!.classList.contains('animate-pulse')).toBe(true);
  });
});

describe('Reading Room', () => {
  const first = PUZZLES[0]!;

  function mountWithPages(pages: bigint, patch: (s: ReturnType<typeof createInitialState>) => void = () => {}) {
    const s = createInitialState();
    s.pagesGenerated = pages;
    s.currentPage = pages;
    patch(s);
    localStorage.setItem(SAVE_KEY, encodeSave(s, Date.now()));
    history.replaceState(null, '', '/#/puzzles');
    const root = mount();
    flush();
    return root;
  }

  const tiles = (root: HTMLElement) =>
    [...root.querySelectorAll<HTMLButtonElement>('[data-puzzle-board] [data-tile]')].map(b => b.textContent).join('');
  const key = (k: string) => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    flush();
  };
  const click = (root: HTMLElement, sel: string) => {
    root.querySelector<HTMLButtonElement>(sel)!.click();
    flush();
  };

  it('waits for the first scrambled page, then shows only the count and the current puzzle', () => {
    const early = mountWithPages(0n);
    expect(early.querySelector('[data-puzzle-board]')).toBeNull();
    expect(early.querySelector('[data-next-puzzle]')!.textContent).toContain(`${first.length} letters`);
    expect(early.querySelector('[data-tab="puzzles"] [data-tab-badge]')).toBeNull();
    expect(early.querySelector('[data-stat="insight"]')).toBeNull();
    dispose?.();
    document.body.innerHTML = '';

    const open = PUZZLES.filter(p => p.length === 5);
    const root = mountWithPages(open.at(-1)!.unlockPage);
    expect(root.querySelector('[data-puzzles-available]')!.textContent).toBe(String(open.length));
    expect(root.querySelector('[data-tab="puzzles"] [data-tab-badge]')!.textContent).toBe(String(open.length));
    // One board, for the oldest puzzle; no list of the others
    expect(root.querySelectorAll('[data-puzzle-board]').length).toBe(1);
    expect(root.querySelector(`[data-puzzle-board="${first.id}"]`)).not.toBeNull();
    expect(root.querySelector('[data-puzzle-id]')).toBeNull();
    expect(root.querySelector('[data-stat="insight"]')!.textContent).toContain('0 insight');
  });

  it('swaps by tapping, types into the tiles, solves and spends the Insight, with no diagnostics', async () => {
    let root!: HTMLElement;
    const { artifact } = await captureArtifact(
      () => {
        root = mountWithPages(first.unlockPage);
        expect(tiles(root)).toBe(first.scramble);
        expect(root.querySelector('[data-guess-info]')!.textContent).toContain(`Guess 1 of ${MAX_GUESSES} · free`);

        // Tap two tiles to swap them, then guess
        click(root, '[data-puzzle-board] [data-tile="0"]');
        click(root, '[data-puzzle-board] [data-tile="1"]');
        const swapped = first.scramble[1]! + first.scramble[0]! + first.scramble.slice(2);
        expect(tiles(root)).toBe(swapped);
        click(root, '[data-submit-guess]');
        const marks = [...root.querySelectorAll('[data-guess-row] [data-correct]')].map(x => x.getAttribute('data-correct') === 'true');
        expect(marks).toEqual([...swapped].map((c, i) => c === first.word[i]));
        expect(root.querySelector('[data-puzzle-message]')!.textContent).toMatch(/in the right spot$/);

        // Typing moves each letter into place at the cursor; Backspace steps back
        key(first.word[0]!);
        expect(tiles(root)[0]).toBe(first.word[0]);
        expect(root.querySelector('[data-tile="1"]')!.getAttribute('data-cursor')).toBe('true');
        key('Backspace');
        expect(root.querySelector('[data-tile="0"]')!.getAttribute('data-cursor')).toBe('true');
        for (const c of first.word) key(c);
        expect(tiles(root)).toBe(first.word);
        key('Enter');
      },
      { scenario: 'reading-room' }
    );

    expect(artifact).toHaveNoDiagnostics();
    expect(root.querySelector('[data-puzzle-outcome="solved"]')!.textContent).toContain(`+${first.reward} ✦`);
    expect(root.querySelector('[data-puzzle-board]')).toBeNull();
    expect(root.textContent).toContain('No scrambled pages waiting');
    expect(root.textContent).toContain(`Unscrambled "${first.word}"`);
    click(root, '[data-insight-id="lucidity"]');
    expect(root.querySelector('[data-insight-level]')!.textContent).toBe('lv.1');
  });

  it('types from a phone keyboard through the hidden input, which keeps focus into the next puzzle, with no diagnostics', async () => {
    const second = PUZZLES[1]!;
    let root!: HTMLElement;
    let input!: HTMLInputElement;
    const { artifact } = await captureArtifact(
      () => {
        root = mountWithPages(second.unlockPage);
        input = root.querySelector<HTMLInputElement>('[data-puzzle-input]')!;
        // What a soft keyboard does: change the value, then fire input (its keydown says "Unidentified")
        const softType = (value: string, inputType = 'insertText') => {
          input.value = value;
          input.dispatchEvent(new InputEvent('input', { inputType, bubbles: true }));
          flush();
        };
        click(root, '[data-open-keyboard]');
        expect(document.activeElement).toBe(input);
        expect(root.querySelector('[data-open-keyboard]')!.getAttribute('aria-pressed')).toBe('true');

        // Several letters in one event (autocomplete, a paste) all land
        softType(' ' + first.word.slice(0, 3));
        expect(tiles(root).slice(0, 3)).toBe(first.word.slice(0, 3));
        expect(root.querySelector('[data-tile="3"]')!.getAttribute('data-cursor')).toBe('true');
        // Backspace removes a character from the value
        softType(' ' + first.word.slice(0, 2), 'deleteContentBackward');
        expect(root.querySelector('[data-tile="2"]')!.getAttribute('data-cursor')).toBe('true');
        // Backspace on the sentinel space (nothing typed in the field) still steps back
        softType('', 'deleteContentBackward');
        expect(root.querySelector('[data-tile="0"]')!.getAttribute('data-cursor')).toBe('true');
        expect(input.value).toBe(' ');

        softType(' ' + first.word);
        expect(tiles(root)).toBe(first.word);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        flush();
      },
      { scenario: 'reading-room-soft-keyboard' }
    );
    expect(artifact).toHaveNoDiagnostics();
    expect(root.querySelector('[data-puzzle-outcome="solved"]')).not.toBeNull();
    // The next puzzle, on the same board: the keyboard's input is the same element and still focused
    expect(root.querySelector(`[data-puzzle-board="${second.id}"]`)).not.toBeNull();
    expect(root.querySelector('[data-puzzle-input]')).toBe(input);
    expect(document.activeElement).toBe(input);
    // ...and the board's state started over
    expect(tiles(root)).toBe(second.scramble);
    expect(root.querySelector('[data-tile="0"]')!.getAttribute('data-cursor')).toBe('true');
    expect(root.querySelector('[data-guess-info]')!.textContent).toContain('Guess 1 of');
    expect(root.querySelector('[data-puzzle-message]')!.textContent).toBe('');
  });

  it('fades letters not yet typed, and a clicked tile can be carried with the arrows', () => {
    const root = mountWithPages(first.unlockPage);
    const tile = (i: number) => root.querySelector<HTMLButtonElement>(`[data-puzzle-board] [data-tile="${i}"]`)!;
    expect(tile(0).getAttribute('data-cursor')).toBe('true');
    expect(tile(0).querySelector('[data-caret]')).not.toBeNull();
    expect(tile(1).className).toContain('text-ink/40');
    key(first.scramble[0]!);
    expect(tile(0).className).not.toContain('text-ink/40');
    expect(tile(1).querySelector('[data-caret]')).not.toBeNull();
    expect(root.querySelectorAll('[data-caret]').length).toBe(1);

    const before = tiles(root);
    click(root, '[data-puzzle-board] [data-tile="2"]');
    key('ArrowRight');
    expect(tiles(root)).toBe(before.slice(0, 2) + before[3] + before[2] + before.slice(4));
    expect(tile(3).getAttribute('aria-pressed')).toBe('true');
  });

  it('charges for the fourth guess and loses on a wrong fifth', () => {
    const root = mountWithPages(first.unlockPage, s => {
      s.puzzleGuesses[first.id] = [first.scramble, first.scramble, first.scramble];
      s.insight = 1;
    });
    expect(root.querySelector('[data-guess-info]')!.textContent).toContain('Guess 4 of 5 · costs 1 ✦');
    click(root, '[data-submit-guess]');
    expect(root.querySelector('[data-stat="insight"]')!.textContent).toContain('0 insight');
    // Can't pay for the fifth: the Guess button is disabled
    expect(root.querySelector<HTMLButtonElement>('[data-submit-guess]')!.disabled).toBe(true);
    dispose?.();
    document.body.innerHTML = '';

    const again = mountWithPages(first.unlockPage, s => {
      s.puzzleGuesses[first.id] = [first.scramble, first.scramble, first.scramble, first.scramble];
      s.insight = 1;
    });
    click(again, '[data-submit-guess]');
    expect(again.querySelector('[data-puzzle-outcome="lost"]')!.textContent).toContain(first.word);
    expect(again.querySelector('[data-puzzle-board]')).toBeNull();
    expect(again.textContent).toContain(`Out of guesses: the word was "${first.word}"`);
  });

  it('gives up for nothing, moving on to the next puzzle', () => {
    const second = PUZZLES[1]!;
    const root = mountWithPages(second.unlockPage);
    click(root, '[data-give-up]');
    expect(root.querySelector('[data-puzzle-outcome="lost"]')).not.toBeNull();
    expect(root.querySelector(`[data-puzzle-board="${second.id}"]`)).not.toBeNull();
    expect(root.querySelector('[data-puzzles-available]')!.textContent).toBe('1');
  });

  it('remembers guesses across a reload and shows automation switches once bought', () => {
    const root = mountWithPages(first.unlockPage, s => {
      s.puzzleGuesses[first.id] = [first.scramble];
      s.insightUpgrades.clerks = 1;
    });
    expect(root.querySelectorAll('[data-guess-row]').length).toBe(1);
    expect(root.querySelector('[data-guess-info]')!.textContent).toContain('Guess 2 of');

    const writers = root.querySelector<HTMLInputElement>('[data-automation-key="hire-writer"]')!;
    expect(writers.checked).toBe(true);
    writers.click();
    flush();
    expect(writers.checked).toBe(false);
    expect(root.querySelector('[data-automation-key="speed"]')).toBeNull();
  });
});
