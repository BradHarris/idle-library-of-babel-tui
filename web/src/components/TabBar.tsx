import { For, Show } from 'solid-js';
import type { Tab } from '../ui';

/** `icon`: stroke paths on a 24×24 grid, shown instead of the label in the mobile bar. */
const TABS: { id: Tab; label: string; icon: string[] }[] = [
  {
    id: 'workers',
    label: 'Workers',
    icon: ['M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0', 'M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2', 'M16 3.13a4 4 0 0 1 0 7.75', 'M21 21v-2a4 4 0 0 0-3-3.85'],
  },
  { id: 'upgrades', label: 'Upgrades', icon: ['m3 17 6-6 4 4 8-8', 'M14 7h7v7'] },
  {
    id: 'puzzles',
    label: 'Puzzles',
    // Two letter tiles, one raised: a scramble
    icon: ['M3 10h8v8H3Z', 'M13 6h8v8h-8Z', 'M6 14h2', 'M16 10h2'],
  },
  {
    id: 'library',
    label: 'Library',
    icon: ['M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2Z', 'M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z'],
  },
  { id: 'log', label: 'Log', icon: ['M8 6h13M8 12h13M8 18h13', 'M3 6h.01M3 12h.01M3 18h.01'] },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: ['M7 4h10v5a5 5 0 0 1-10 0Z', 'M7 6H4v1a3 3 0 0 0 3 3', 'M17 6h3v1a3 3 0 0 1-3 3', 'M12 14v4', 'M8 21h8'],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: ['M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3', 'M1 14h6M9 8h6M17 16h6'],
  },
];

/** Counts shown on tabs, e.g. upgrades you can buy; 0 or missing shows nothing. */
export type TabBadges = Partial<Record<Tab, number>>;

export function TabBar(props: { value: Tab; onChange: (tab: Tab) => void; badges?: TabBadges }) {
  return (
    <nav
      aria-label="Sections"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:static lg:border-t-0 lg:border-b lg:pb-0"
    >
      {/* Bottom bar on mobile; a row of tabs under the HUD on desktop */}
      <div class="mx-auto grid max-w-xl grid-cols-7 lg:flex lg:max-w-6xl lg:gap-2 lg:px-4">
        <For each={TABS}>
          {t => (
            <button
              data-tab={t.id}
              aria-current={props.value === t.id ? 'page' : undefined}
              onClick={() => props.onChange(t.id)}
              class={[
                'relative min-h-12 cursor-pointer font-serif text-sm tracking-wide transition-colors lg:min-h-10 lg:px-4',
                props.value === t.id ? 'text-accent' : 'text-ink-muted hover:text-ink',
              ]}
            >
              <svg
                viewBox="0 0 24 24"
                class="mx-auto size-6 lg:hidden"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <For each={t.icon}>{d => <path d={d} />}</For>
              </svg>
              {/* Icon only on mobile; the label stays as the button's accessible name */}
              <span class="sr-only lg:not-sr-only">{t.label}</span>
              <Show when={(props.badges?.[t.id] ?? 0) > 0}>
                <span
                  data-tab-badge
                  aria-label={`${props.badges?.[t.id]} available`}
                  class="absolute top-1.5 left-1/2 ml-1.5 min-w-4 rounded-full lg:static lg:ml-1 lg:inline-block lg:align-[0.4em] bg-accent px-1 font-mono text-[0.6rem] leading-4 text-paper tabular-nums"
                >
                  {props.badges?.[t.id]}
                </span>
              </Show>
              <span
                class={[
                  'absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent transition-opacity lg:inset-x-2 lg:top-auto lg:bottom-0',
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
