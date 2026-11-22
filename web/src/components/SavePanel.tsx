import { Show, createSignal, onFlush, onSettled, snapshot, useContext } from 'solid-js';
import type { Autosave } from '@game/store';
import type { GameState } from '@game/types';
import { clearSave, exportSave, importSave } from '@game/save';
import { GameContext } from '../game';

/** How long "Reset" waits for the confirming second click. */
export const RESET_CONFIRM_MS = 4000;

type Notice = { kind: 'ok' | 'error'; text: string };

const button =
  'cursor-pointer rounded-full border border-rule px-3 py-1 text-xs font-medium transition-colors hover:border-ink-muted';

export function SavePanel(props: { autosave: Autosave; loadError?: string | null }) {
  const game = useContext(GameContext);
  const [notice, setNotice] = createSignal<Notice | null>(null);
  const [exported, setExported] = createSignal<string | null>(null);
  const [importText, setImportText] = createSignal('');
  const [confirmReset, setConfirmReset] = createSignal(false);

  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  onSettled(() => () => clearTimeout(resetTimer));

  // Saves run after the pending flush, so they see the state the action just wrote
  const saveAfterFlush = (message: string) =>
    onFlush(() => {
      const saved = props.autosave.save(true);
      setNotice(saved ? { kind: 'ok', text: message } : { kind: 'error', text: "Couldn't save: browser storage is unavailable" });
    });

  const saveNow = () => {
    const saved = props.autosave.save(true);
    setNotice(saved ? { kind: 'ok', text: 'Saved' } : { kind: 'error', text: "Couldn't save: browser storage is unavailable" });
  };

  const doExport = () => {
    const text = exportSave(snapshot(game.state) as GameState);
    setExported(text);
    navigator.clipboard?.writeText(text).then(
      () => setNotice({ kind: 'ok', text: 'Save copied to clipboard' }),
      () => setNotice({ kind: 'ok', text: 'Copy the save below' })
    );
  };

  const doImport = () => {
    const result = importSave(importText());
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error });
      return;
    }
    game.load(result.state);
    setImportText('');
    setExported(null);
    saveAfterFlush('Save loaded');
  };

  const doReset = () => {
    clearTimeout(resetTimer);
    if (!confirmReset()) {
      setConfirmReset(true);
      resetTimer = setTimeout(() => setConfirmReset(false), RESET_CONFIRM_MS);
      return;
    }
    setConfirmReset(false);
    clearSave();
    game.reset();
    setExported(null);
    saveAfterFlush('Game reset');
  };

  return (
    <div data-panel-save>
      <h2 class="section-title mb-2">Save</h2>

      <Show when={props.loadError}>
        {error => (
          <p data-save-load-error class="mb-2 text-xs text-accent">
            Your saved game couldn't be loaded ({error()}). A copy was kept in this browser. Autosave is off until you
            import a save or reset.
          </p>
        )}
      </Show>

      <p class="mb-2 text-xs text-ink-muted italic">
        Progress saves automatically in this browser. Time away becomes a boost when you return.
      </p>

      <div class="flex flex-wrap gap-2">
        <button data-save="now" class={button} onClick={saveNow}>
          Save now
        </button>
        <button data-save="export" class={button} onClick={doExport}>
          Export
        </button>
        <button
          data-save="reset"
          class={[button, { 'border-accent bg-accent text-paper hover:bg-accent-hover': confirmReset() }]}
          onClick={doReset}
        >
          {confirmReset() ? 'Click again to reset' : 'Reset'}
        </button>
      </div>

      <Show when={notice()}>
        {n => (
          <p data-save-notice class={['mt-2 text-xs', n().kind === 'error' ? 'text-accent' : 'text-led']}>{n().text}</p>
        )}
      </Show>

      <Show when={exported()}>
        {text => (
          <textarea
            data-save-export
            readonly
            rows={3}
            value={text()}
            onFocus={e => e.currentTarget.select()}
            class="mt-2 w-full resize-none rounded border border-rule bg-paper-deep p-2 font-mono text-xs break-all"
          />
        )}
      </Show>

      <div class="mt-3 flex gap-2">
        <textarea
          data-save-import
          rows={2}
          placeholder="Paste a save to import"
          value={importText()}
          onInput={e => setImportText(e.currentTarget.value)}
          class="min-w-0 flex-1 resize-none rounded border border-rule bg-paper p-2 font-mono text-xs"
        />
        <button data-save="import" class={[button, 'self-start']} onClick={doImport}>
          Import
        </button>
      </div>
    </div>
  );
}
