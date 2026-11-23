import { For, Show, createMemo, createSignal, onSettled, useContext } from 'solid-js';
import { MAX_GUESSES, isAnswer, nextGuessCost, scorePositions, type Puzzle } from '@game/puzzles';
import { GameContext } from '../game';

/** How a puzzle ended, for the panel to announce. */
export interface PuzzleOutcome {
  word: string;
  solved: boolean;
  reward: number;
}

/**
 * One puzzle, played semi-Wordle style. The letters are given and the big tiles
 * are the input:
 * - Type: each key moves that letter (from the not-yet-typed tiles) to the cursor.
 *   Backspace steps back and Enter guesses. On touch screens, the Type button
 *   focuses a hidden input to bring up the soft keyboard.
 * - Tap: tap one tile, then another, to swap them. Arrow keys carry a picked-up tile.
 *
 * Each guess shows which letters are in the right spot. The first guesses are
 * free and later ones cost Insight. A wrong last guess loses the puzzle.
 */
export function PuzzleBoard(props: { puzzle: Puzzle; active: boolean; onFinish: (outcome: PuzzleOutcome) => void }) {
  const game = useContext(GameContext);
  const guesses = () => game.state.puzzleGuesses[props.puzzle.id] ?? [];
  // The row being arranged: it starts from the last guess (or the scramble) and resets to each new guess
  const [tiles, setTiles] = createSignal(() => [...(guesses().at(-1) ?? props.puzzle.scramble)]);
  // The rest of the board's state starts over with each puzzle. The board itself stays
  // mounted (so a phone keyboard's input keeps focus), so these derive from the puzzle.
  const [selected, setSelected] = createSignal<number | null>(() => (props.puzzle, null));
  /** Where the next typed letter goes. Tiles before it have been typed. */
  const [cursor, setCursor] = createSignal(() => (props.puzzle, 0));
  const [message, setMessage] = createSignal(() => (props.puzzle, ''));
  const cost = () => nextGuessCost(game.state, props.puzzle.id);
  const affordable = () => game.state.insight >= cost();
  /** Spots the last guess got right. They stay marked while they still hold the same letter. */
  const known = createMemo(() => {
    const last = guesses().at(-1);
    return last ? scorePositions(last, props.puzzle.word).map((ok, i) => (ok ? last[i]! : null)) : [];
  });
  const buttons: HTMLButtonElement[] = [];

  const swap = (a: number, b: number) => {
    const next = [...tiles()];
    [next[a], next[b]] = [next[b]!, next[a]!];
    setTiles(next);
  };

  const pick = (i: number) => {
    const sel = selected();
    if (sel === null) setSelected(i);
    else if (sel === i) setSelected(null);
    else {
      swap(sel, i);
      setSelected(null);
    }
  };

  /**
   * Type `letters` at the cursor, each moved there from the untyped tiles; letters
   * not among them are skipped. One write for all of them, since reads lag writes
   * and one soft-keyboard input event can carry several letters.
   */
  const type = (letters: string) => {
    const next = [...tiles()];
    let at = cursor();
    for (const letter of letters) {
      const from = next.findIndex((c, i) => i >= at && c === letter);
      if (from === -1) continue;
      [next[at], next[from]] = [next[from]!, next[at]!];
      at++;
    }
    if (at === cursor()) return;
    setTiles(next);
    setCursor(at);
    setSelected(null);
  };

  const backspace = (count = 1) => setCursor(c => Math.max(0, c - count));

  const onTileKeyDown = (i: number, e: KeyboardEvent) => {
    const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    const to = i + step;
    if (step === 0 || to < 0 || to >= props.puzzle.length) return;
    e.preventDefault();
    // With a tile picked up, the arrows carry it; otherwise they just move focus
    if (selected() === i) {
      swap(i, to);
      setSelected(to);
    }
    buttons[to]?.focus();
  };

  const submit = () => {
    const result = game.guessPuzzle(props.puzzle.id, tiles().join(''));
    setSelected(null);
    setCursor(0);
    if (!result.ok) setMessage(result.message);
    else if (result.solved || result.lost) {
      props.onFinish({ word: props.puzzle.word, solved: result.solved, reward: result.reward });
    } else {
      const right = result.correct.filter(Boolean).length;
      setMessage(`${right} of ${props.puzzle.length} in the right spot`);
    }
  };

  const giveUp = () => {
    if (game.giveUpPuzzle(props.puzzle.id).success) props.onFinish({ word: props.puzzle.word, solved: false, reward: 0 });
  };

  // Typing goes to the board while the Puzzles tab is showing, unless focus is in a text field
  onSettled(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!props.active || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable], dialog[open]')) return;
      if (e.key === 'Enter') {
        // A button reached with the keyboard (Tab) handles its own Enter. One that only has
        // focus because it was clicked (a tab, say) doesn't: Enter after typing means "guess".
        if (target?.closest('button') && focusVisible(target)) return;
        e.preventDefault();
        submit();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && selected() !== null) {
        // A tile picked up by a click (clicks don't focus tiles): the arrows carry it
        const from = selected()!;
        const to = from + (e.key === 'ArrowLeft' ? -1 : 1);
        if (to < 0 || to >= props.puzzle.length) return;
        e.preventDefault();
        swap(from, to);
        setSelected(to);
      } else if (/^[a-z]$/i.test(e.key)) {
        e.preventDefault();
        type(e.key.toLowerCase());
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  // ─── Soft keyboard ───
  // A hidden input holds focus so phones show their keyboard. Many soft keyboards
  // send no usable keydown for letters (key "Unidentified"), so typing is read from
  // the input's value instead: whatever was added since the last event is typed,
  // and whatever was removed is backspaced. A leading space lets Backspace fire
  // even when nothing has been typed. The value is only reset outside an IME
  // composition, so keyboards that compose (Gboard) aren't confused.
  const SENTINEL = ' ';
  let input!: HTMLInputElement;
  let seen = SENTINEL;
  const [typing, setTyping] = createSignal(false);

  const resetInput = () => {
    input.value = seen = SENTINEL;
  };

  const onInput = (e: InputEvent) => {
    const now = input.value;
    let common = 0;
    while (common < Math.min(now.length, seen.length) && now[common] === seen[common]) common++;
    if (seen.length > common) backspace(seen.length - common);
    type(now.slice(common).toLowerCase().replace(/[^a-z]/g, ''));
    seen = now;
    if (!e.isComposing && (now === '' || now.length > 32)) resetInput();
  };

  const onInputKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    submit();
    resetInput();
  };

  const openKeyboard = () => {
    resetInput();
    input.focus();
  };

  return (
    <div data-puzzle-board={props.puzzle.id} class="relative space-y-4">
      <Show when={guesses().length > 0}>
        <ol aria-label="Guesses" class="space-y-1.5">
          <For each={guesses()} keyed={false}>
            {guess => (
              <li data-guess-row class="flex flex-wrap gap-1">
                <For each={[...guess()]} keyed={false}>
                  {(letter, j) => (
                    <GuessTile
                      letter={letter()}
                      correct={isAnswer(props.puzzle, guess()) || guess()[j] === props.puzzle.word[j]}
                    />
                  )}
                </For>
              </li>
            )}
          </For>
        </ol>
      </Show>

      <div>
        <input
          ref={input}
          data-puzzle-input
          type="text"
          aria-label="Type the letters"
          autocomplete="off"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="go"
          value={SENTINEL}
          onInput={onInput}
          onKeyDown={onInputKeyDown}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          // Off-screen but focusable; 16px text stops iOS zooming in on focus
          class="pointer-events-none absolute size-px overflow-hidden text-base opacity-0"
        />
        <div role="group" aria-label="Arrange the letters: type them, or tap two tiles to swap" class="flex flex-wrap gap-1">
          <For each={tiles()} keyed={false}>
            {(letter, i) => (
              <button
                ref={el => (buttons[i] = el)}
                data-tile={i}
                data-cursor={cursor() === i ? 'true' : undefined}
                aria-pressed={selected() === i ? 'true' : 'false'}
                aria-label={`Letter ${letter()}, position ${i + 1}`}
                onClick={() => pick(i)}
                onKeyDown={e => onTileKeyDown(i, e)}
                // Keep focus where it is (the soft keyboard stays up while tapping tiles)
                onMouseDown={e => e.preventDefault()}
                class={[
                  'relative flex size-9 cursor-pointer items-center justify-center rounded-md border font-mono text-lg uppercase transition sm:size-11',
                  selected() === i
                    ? '-translate-y-1 border-accent bg-accent/10 text-accent shadow'
                    : i < cursor()
                      ? 'border-ink bg-paper text-ink'
                      : 'border-rule bg-paper-deep text-ink/40 hover:border-ink-muted',
                  { 'border-b-4 border-b-led': known()[i] === letter() },
                ]}
              >
                {letter()}
                {/* The caret: a blinking underline below the tile the next typed letter goes to */}
                <Show when={cursor() === i && selected() === null}>
                  <span
                    data-caret
                    aria-hidden="true"
                    class="absolute inset-x-1.5 -bottom-1 h-0.5 rounded-full bg-ink animate-caret motion-reduce:animate-none"
                  />
                </Show>
              </button>
            )}
          </For>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <button
            data-submit-guess
            onClick={submit}
            // Don't take focus from the phone keyboard's input
            onMouseDown={e => e.preventDefault()}
            disabled={!affordable()}
            class={[
              'rounded-md px-4 py-2 text-sm font-medium text-paper transition-colors',
              affordable() ? 'cursor-pointer bg-accent hover:bg-accent-hover' : 'cursor-not-allowed bg-ink-muted',
            ]}
          >
            Guess
          </button>
          <button
            data-open-keyboard
            onClick={openKeyboard}
            // Don't take focus from the phone keyboard's input
            onMouseDown={e => e.preventDefault()}
            aria-pressed={typing() ? 'true' : 'false'}
            class={[
              'hidden cursor-pointer items-center gap-1 rounded-md border px-3 py-2 text-sm pointer-coarse:inline-flex',
              typing() ? 'border-accent text-accent' : 'border-rule text-ink-muted',
            ]}
          >
            <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
            </svg>
            Type
          </button>
          <span data-guess-info class="text-xs text-ink-muted">
            Guess {guesses().length + 1} of {MAX_GUESSES} ·{' '}
            {cost() === 0 ? 'free' : <span class={{ 'text-accent': !affordable() }}>costs {cost()} ✦</span>}
          </span>
          <button
            data-give-up
            onClick={giveUp}
            // Don't take focus from the phone keyboard's input
            onMouseDown={e => e.preventDefault()}
            class="ml-auto cursor-pointer text-xs text-ink-muted underline decoration-rule underline-offset-2 hover:text-ink"
          >
            Give up
          </button>
        </div>
        <p data-puzzle-message aria-live="polite" class="mt-2 min-h-5 text-sm text-ink-muted">
          {message()}
        </p>
      </div>
    </div>
  );
}

function focusVisible(el: Element): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    // No :focus-visible support: assume keyboard focus, the old behaviour
    return true;
  }
}

function GuessTile(props: { letter: string; correct: boolean }) {
  return (
    <span
      data-correct={props.correct ? 'true' : 'false'}
      class={[
        'flex size-7 items-center justify-center rounded-sm border font-mono text-sm uppercase sm:size-8',
        props.correct ? 'border-led bg-led text-paper' : 'border-rule text-ink-muted',
      ]}
    >
      {props.letter}
    </span>
  );
}
