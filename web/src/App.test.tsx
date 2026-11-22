import { afterEach, describe, expect, it, vi } from 'vitest';
import { flush } from 'solid-js';
import { render } from '@solidjs/web';
import { captureArtifact } from '@solidjs/diagnostics';
import '@solidjs/diagnostics/vitest';
import { generatePage, queryToPageAddress } from '@game/page';
import { formatPageNumber } from '@game/format';
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
        // 1 writer → 1 page/sec; 15 ticks earn $15, the cost of a second writer
        vi.advanceTimersByTime(15_000);
        flush();
        root.querySelector<HTMLButtonElement>('button[data-tier="writer"]')!.click();
      },
      { scenario: 'tick-and-hire' }
    );

    expect(artifact).toHaveNoDiagnostics();
    expect(stat(root, 'pages')).toBe('15');
    expect(root.textContent).toContain('Hired Writer for');
    expect(stat(root, 'pps')).toBe('2');
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
    root.querySelector<HTMLButtonElement>('nav[aria-label="Map location"] button')!.click();
    flush();
    expect(title()).toBe('Volume 0');
    expect(follow()).toBe('true');
  });
});
