import { Show } from 'solid-js';

/**
 * Shown when another tab saved the game after this one loaded it. The game
 * has stopped and won't save again, so the only way on is a reload, which
 * picks up the newest save.
 */
export function HaltedNotice(props: { show: boolean }) {
  return (
    <Show when={props.show}>
      <div
        data-halted
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="halted-title"
        aria-describedby="halted-text"
        class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      >
        <div class="w-full max-w-sm rounded-2xl border border-rule bg-paper p-5 text-ink shadow-2xl">
          <h2 id="halted-title" class="font-serif text-lg italic">
            Paused in this tab
          </h2>
          <p id="halted-text" class="mt-2 text-sm text-ink-muted">
            The game was saved from somewhere else, so it may already be running in another tab. This tab has stopped
            so it won't overwrite that progress. Reload to carry on from the latest save.
          </p>
          <button
            data-halted-reload
            onClick={() => location.reload()}
            class="mt-4 w-full cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent-hover"
          >
            Reload
          </button>
        </div>
      </div>
    </Show>
  );
}
