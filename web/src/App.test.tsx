import { afterEach, describe, expect, it, vi } from 'vitest';
import { flush } from 'solid-js';
import { render } from '@solidjs/web';
import { captureArtifact } from '@solidjs/diagnostics';
import '@solidjs/diagnostics/vitest';
import { generatePage, queryToPageAddress } from '@game/page';
import { ACHIEVEMENTS } from '@game/achievements';
import { formatCount, formatMoney, formatMultiplier, formatPageNumber } from '@game/format';
import { UPGRADES, getUpgrade } from '@game/upgrades';
import { AUTOSAVE_MS, createInitialState, getSpeedCost } from '@game/config';
import { D } from '@game/bignum';
import { BACKUP_KEY, SAVE_KEY, SAVE_VERSION, encodeSave, exportSave } from '@game/save';
import { RESET_CONFIRM_MS } from './components/SavePanel';
import { containerOf, levelName, localIndex, zoomPath } from '@game/storageMap';
import { App } from './App';
import { ZOOM_STEP_MS } from './ui';

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
    root.querySelector<HTMLButtonElement>('[data-panel="upgrades"] [data-upgrade-id="speed"]')!.click();
    flush();
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
