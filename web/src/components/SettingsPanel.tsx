import { For } from 'solid-js';
import { FPS_OPTIONS, type SettingsStore } from '../settings';

export function SettingsPanel(props: { settings: SettingsStore }) {
  return (
    <div data-panel-settings>
      <h2 class="section-title mb-2">Settings</h2>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-sm">
          Frame rate
          <span class="block text-xs text-ink-muted italic">Lower is smoother on slow devices and saves battery.</span>
        </span>
        <div role="group" aria-label="Frame rate cap" class="flex rounded-full border border-rule p-0.5 text-xs">
          <For each={FPS_OPTIONS}>
            {fps => (
              <button
                data-fps={fps}
                aria-pressed={props.settings.fps() === fps ? 'true' : 'false'}
                onClick={() => props.settings.setFps(fps)}
                class={[
                  'min-w-9 cursor-pointer rounded-full px-2 py-1 font-mono tabular-nums transition-colors',
                  props.settings.fps() === fps ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink',
                ]}
              >
                {fps}
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
