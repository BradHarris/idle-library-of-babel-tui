import { For } from 'solid-js';
import type { Tab } from '../ui';

const TABS: { id: Tab; label: string }[] = [
  { id: 'workers', label: 'Workers' },
  { id: 'library', label: 'Library' },
  { id: 'log', label: 'Log' },
];

export function TabBar(props: { value: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav
      aria-label="Sections"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div class="mx-auto grid max-w-md grid-cols-3">
        <For each={TABS}>
          {t => (
            <button
              data-tab={t.id}
              aria-current={props.value === t.id ? 'page' : undefined}
              onClick={() => props.onChange(t.id)}
              class={[
                'relative min-h-12 cursor-pointer font-serif text-sm tracking-wide transition-colors',
                props.value === t.id ? 'text-accent' : 'text-ink-muted hover:text-ink',
              ]}
            >
              {t.label}
              <span
                class={[
                  'absolute inset-x-8 top-0 h-0.5 rounded-full bg-accent transition-opacity',
                  { 'opacity-0': props.value !== t.id },
                ]}
              />
            </button>
          )}
        </For>
      </div>
    </nav>
  );
}
