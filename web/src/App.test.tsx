import { afterEach, describe, expect, it, vi } from 'vitest';
import { flush } from 'solid-js';
import { render } from '@solidjs/web';
import { captureArtifact } from '@solidjs/diagnostics';
import '@solidjs/diagnostics/vitest';
import { App } from './App';

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
});
