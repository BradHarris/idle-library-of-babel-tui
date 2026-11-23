/**
 * Ties the TLA+ model in verification/save-lifecycle/ to the real code. For every
 * step in the model's state graph (graph.json, written by check.mjs from TLC), it
 * replays the shortest path to that step on <App/> and checks that localStorage,
 * the open tab and the load warning match the model after every action. If the code
 * and the model ever disagree, the model's verdicts no longer describe the code.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flush } from 'solid-js';
import { render } from '@solidjs/web';
import { AUTOSAVE_MS, createInitialState } from '@game/config';
import { BACKUP_KEY, SAVE_KEY, SAVE_VERSION, decodeSave, encodeSave, exportSave } from '@game/save';
import { App } from './App';
import graphJson from '../../verification/save-lifecycle/graph.json';

type ModelState = { slot: string; backup: string; open: boolean; loaded: string; enabled: boolean; halted: boolean };
type Graph = { states: Record<string, ModelState>; init: string[]; edges: { from: string; action: string; to: string }[] };

const graph = graphJson as Graph;

/** A save this build can't read: the shape a newer deploy would write. */
const NEWER_SAVE = JSON.stringify({ v: SAVE_VERSION + 1, savedAt: 0, state: {} });

// jsdom has no <dialog> methods
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
  this.dispatchEvent(new Event('close'));
};

let dispose: (() => void) | undefined;
let root: HTMLElement | undefined;
let otherTabWrites = 0;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  root = undefined;
  localStorage.clear();
  history.replaceState(null, '', '/');
  document.body.innerHTML = '';
  vi.useRealTimers();
});

const settle = async () => {
  await Promise.resolve();
  flush();
};
const click = (name: string) => root!.querySelector<HTMLButtonElement>(`button[data-save="${name}"]`)!.click();

function close() {
  dispose!();
  dispose = undefined;
  root!.remove();
  root = undefined;
}

/** One model action, done the way the browser or the player does it. */
const actions: Record<string, () => void | Promise<void>> = {
  Open() {
    root = document.createElement('div');
    document.body.append(root);
    dispose = render(() => <App />, root);
    flush();
  },
  Autosave() {
    vi.advanceTimersByTime(AUTOSAVE_MS);
    flush();
  },
  TabHidden() {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    delete (document as { visibilityState?: string }).visibilityState;
  },
  PageClose() {
    window.dispatchEvent(new Event('pagehide'));
    close();
  },
  Crash() {
    close();
  },
  SaveNow() {
    click('now');
    flush();
  },
  async Import() {
    const input = root!.querySelector<HTMLTextAreaElement>('textarea[data-save-import]')!;
    input.value = exportSave(createInitialState());
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flush();
    click('import');
    flush();
    await settle();
  },
  async Reset() {
    click('reset');
    flush();
    click('reset');
    flush();
    await settle();
  },
  OtherTabSaves() {
    otherTabWrites += 1;
    const s = createInitialState();
    s.time = otherTabWrites; // a different save each time, as another tab's would be
    localStorage.setItem(SAVE_KEY, encodeSave(s, Date.now()));
  },
  OtherTabWritesNewer() {
    otherTabWrites += 1;
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_VERSION + 1, savedAt: otherTabWrites, state: {} }));
  },
  StorageEvent() {
    window.dispatchEvent(new StorageEvent('storage', { key: SAVE_KEY }));
    flush();
  },
};

const classify = (raw: string | null) => (raw === null ? 'empty' : decodeSave(raw).ok ? 'game' : 'unreadable');

/** What the model says about the real app right now (`enabled` and `foreign` are checked through their effects on later steps). */
function observe() {
  const backup = localStorage.getItem(BACKUP_KEY);
  return {
    slot: classify(localStorage.getItem(SAVE_KEY)),
    backup: backup === null ? 'none' : classify(backup) === 'unreadable' ? 'unreadable' : `readable backup?! ${backup}`,
    open: root !== undefined,
    warning: root?.querySelector('[data-save-load-error]') != null,
    halted: root?.querySelector('[data-halted]') != null,
  };
}
const expected = (s: ModelState) => ({
  slot: s.slot,
  backup: s.backup,
  open: s.open,
  warning: s.loaded === 'unreadable',
  halted: s.open && s.halted,
});

function initialSlot(slot: string) {
  if (slot === 'game') localStorage.setItem(SAVE_KEY, encodeSave(createInitialState(), Date.now()));
  if (slot === 'unreadable') localStorage.setItem(SAVE_KEY, NEWER_SAVE);
}

/** Shortest path (as edges) from a start state to every state. */
function shortestPaths(): Map<string, Graph['edges']> {
  const paths = new Map<string, Graph['edges']>(graph.init.map(id => [id, []]));
  const queue = [...graph.init];
  while (queue.length) {
    const at = queue.shift()!;
    for (const e of graph.edges.filter(e => e.from === at && !paths.has(e.to))) {
      paths.set(e.to, [...paths.get(at)!, e]);
      queue.push(e.to);
    }
  }
  return paths;
}

describe('save lifecycle: the code takes every step the model takes', () => {
  it('graph.json is a usable model graph', () => {
    expect(graph.init.length).toBeGreaterThan(0);
    expect(new Set(graph.edges.map(e => e.action))).toEqual(new Set(Object.keys(actions)));
    expect(shortestPaths().size).toBe(Object.keys(graph.states).length);
  });

  const paths = shortestPaths();
  for (const edge of graph.edges) {
    const path = [...paths.get(edge.from)!, edge];
    const start = path[0]?.from ?? edge.from;
    it(`${start}: ${path.map(e => e.action).join(' → ')}`, async () => {
      vi.useFakeTimers();
      initialSlot(graph.states[start]!.slot);
      expect(observe(), `start ${start}`).toEqual(expected(graph.states[start]!));
      for (const [i, step] of path.entries()) {
        await actions[step.action]!();
        expect(observe(), `after step ${i + 1} (${step.action}) the model is in ${step.to}`).toEqual(expected(graph.states[step.to]!));
      }
    });
  }
});
