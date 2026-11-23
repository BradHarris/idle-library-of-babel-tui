import { ALPHABET, queryToPageAddress } from './page.js';
import type { GameState } from './types.js';

/**
 * Word-scramble puzzles found on library pages. The Reading Room takes the place
 * of a prestige layer.
 *
 * generatePage(N) writes N's base-43 digits, least significant first, then
 * spaces. So each arrangement of a word's letters sits on exactly one page,
 * queryToPageAddress(arrangement). The earliest of those pages has the letters
 * in descending ALPHABET order: the biggest digit goes in the lowest place. That
 * page reads as the scramble, and a puzzle unlocks once it has been written.
 * Word length sets when a puzzle turns up: each extra letter is ~43× more pages.
 *
 * If the LCG layer in generatePage is ever turned back on, pages stop looking
 * like this and this unlock rule has to change.
 *
 * Solving is semi-Wordle. The player rearranges the given letters, and each
 * guess shows which letters are in the right spot. There are MAX_GUESSES
 * guesses. The first ones are free, later ones cost Insight (GUESS_COSTS). Running
 * out, or giving up, loses the puzzle for good with no reward, and the next one comes up.
 */

export interface Puzzle {
  /** The answer, which is also the id. */
  id: string;
  word: string;
  length: number;
  /** The letters as they first appear in the library (descending alphabet order). */
  scramble: string;
  /** The page that first holds the scramble. The puzzle unlocks once it has been written. */
  unlockPage: bigint;
  /** Insight for solving it. */
  reward: number;
}

/**
 * The answer words. Only the word itself solves its puzzle: another real word from
 * the same letters (chapter/patcher, words/sword) is just a wrong guess. The
 * right-spot marks steer the player to the intended one.
 */
const WORDS: string[] = [
  // 5
  'babel', 'shelf', 'codex', 'quill', 'folio', 'atlas', 'fable', 'quote', 'words', 'verse',
  // 6
  'scribe', 'vellum', 'scroll', 'author', 'quarto', 'margin', 'glyphs', 'cipher', 'borges',
  // 7
  'library', 'chapter', 'lexicon', 'archive', 'scholar', 'lantern', 'mirrors', 'volumes',
  // 8
  'infinite', 'hexagons', 'alphabet', 'universe', 'notebook', 'symmetry', 'bookcase', 'vastness',
  // 9
  'labyrinth', 'hexagonal', 'librarian', 'catalogue', 'staircase', 'chronicle', 'gibberish', 'illegible', 'parchment',
  // 10
  'manuscript', 'typewriter', 'philosophy', 'palindrome', 'cryptogram',
  // 11
  'bookshelves', 'inscription', 'illuminated', 'permutation', 'punctuation',
  // 12
  'encyclopedia', 'combinations', 'permutations',
  // 13
  'librarianship', 'typographical',
  // 14
  'indecipherable',
  // 15
  'incomprehension',
  // 16
  'incomprehensible',
  // 17–19: a planet's worth of pages
  'misinterpretation',
  'interchangeability',
  'incomprehensibility',
];

/** Insight each guess costs, by guess number (1st, 2nd, …). Its length is the number of guesses allowed. */
export const GUESS_COSTS = [0, 0, 0, 1, 1] as const;
export const MAX_GUESSES = GUESS_COSTS.length;

/** Insight the next guess at puzzle `id` costs. */
export function nextGuessCost(s: GameState, id: string): number {
  return GUESS_COSTS[s.puzzleGuesses[id]?.length ?? 0] ?? 0;
}

/** Insight for solving a word of `length` letters: doubles with each letter. */
export function insightForLength(length: number): number {
  return 2 ** (length - 4);
}

/** The letters of `word` in descending ALPHABET order: the earliest page that holds them. */
export function scrambleOf(word: string): string {
  return [...word].sort((a, b) => ALPHABET.indexOf(b) - ALPHABET.indexOf(a)).join('');
}

/** Every puzzle, in the order it unlocks. */
export const PUZZLES: Puzzle[] = WORDS.map(word => {
  const scramble = scrambleOf(word);
  return {
    id: word,
    word,
    length: word.length,
    scramble,
    unlockPage: queryToPageAddress(scramble),
    reward: insightForLength(word.length),
  };
}).sort((a, b) => (a.unlockPage < b.unlockPage ? -1 : a.unlockPage > b.unlockPage ? 1 : 0));

const BY_ID = new Map(PUZZLES.map(p => [p.id, p]));

export function getPuzzle(id: string): Puzzle | undefined {
  return BY_ID.get(id);
}

// ─── Queries ──────────────────────────────────────────────

export function isPuzzleUnlocked(s: GameState, p: Puzzle): boolean {
  return s.pagesGenerated >= p.unlockPage;
}

export function isSolved(s: GameState, id: string): boolean {
  return s.puzzlesSolved.includes(id);
}

export function isFailed(s: GameState, id: string): boolean {
  return s.puzzlesFailed.includes(id);
}

/** Unlocked and neither solved nor lost. */
export function isOpen(s: GameState, p: Puzzle): boolean {
  return isPuzzleUnlocked(s, p) && !isSolved(s, p.id) && !isFailed(s, p.id);
}

/** Puzzles waiting to be played, in unlock order. The first is the one being played. */
export function openPuzzles(s: GameState): Puzzle[] {
  return PUZZLES.filter(p => isOpen(s, p));
}

/** Puzzles whose page has been written, in unlock order. */
export function unlockedPuzzles(s: GameState): Puzzle[] {
  return PUZZLES.filter(p => isPuzzleUnlocked(s, p));
}

/** The next puzzle still to turn up, if any. */
export function nextPuzzle(s: GameState): Puzzle | undefined {
  return PUZZLES.find(p => !isPuzzleUnlocked(s, p));
}

/** Puzzles whose page lies in (`before`, `after`]: they unlocked between the two page counts. */
export function puzzlesUnlockedBetween(before: bigint, after: bigint): Puzzle[] {
  return PUZZLES.filter(p => p.unlockPage > before && p.unlockPage <= after);
}

/** Which letters of `guess` are in the right spot. */
export function scorePositions(guess: string, word: string): boolean[] {
  return [...guess].map((c, i) => c === word[i]);
}

/** True if `guess` uses exactly the letters of `p`, rearranged. */
export function isArrangement(p: Puzzle, guess: string): boolean {
  return guess.length === p.length && scrambleOf(guess) === p.scramble;
}

export function isAnswer(p: Puzzle, guess: string): boolean {
  return guess === p.word;
}

export type GuessResult =
  | { ok: false; message: string }
  /** `lost`: that was the last guess, and it was wrong. */
  | { ok: true; solved: boolean; lost: boolean; correct: boolean[]; reward: number; cost: number };

/**
 * Submit a guess for puzzle `id`. Mutates `s` (pass a store draft). The guess
 * is recorded and paid for. A correct one marks the puzzle solved and credits
 * Insight. A wrong last guess loses the puzzle.
 */
export function submitGuess(s: GameState, id: string, guess: string): GuessResult {
  const p = BY_ID.get(id);
  if (!p) return { ok: false, message: 'Unknown puzzle' };
  if (!isPuzzleUnlocked(s, p)) return { ok: false, message: 'That page has not been written yet' };
  if (isSolved(s, id)) return { ok: false, message: 'Already solved' };
  if (isFailed(s, id)) return { ok: false, message: 'Already lost' };
  if (!isArrangement(p, guess)) return { ok: false, message: 'Use exactly the letters given' };
  const cost = nextGuessCost(s, id);
  if (s.insight < cost) return { ok: false, message: `This guess costs ${cost} ✦` };

  s.insight -= cost;
  const guesses = (s.puzzleGuesses[id] ??= []);
  guesses.push(guess);
  const solved = isAnswer(p, guess);
  const lost = !solved && guesses.length >= MAX_GUESSES;
  if (solved) {
    s.puzzlesSolved.push(id);
    s.insight += p.reward;
  }
  if (lost) s.puzzlesFailed.push(id);
  const correct = solved ? [...guess].map(() => true) : scorePositions(guess, p.word);
  return { ok: true, solved, lost, correct, reward: solved ? p.reward : 0, cost };
}

/** Give up on open puzzle `id`: it is lost, with no reward. Mutates `s`; returns false if it wasn't open. */
export function giveUp(s: GameState, id: string): boolean {
  const p = BY_ID.get(id);
  if (!p || !isOpen(s, p)) return false;
  s.puzzlesFailed.push(id);
  return true;
}
