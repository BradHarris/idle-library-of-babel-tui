import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { createRoot, flush } from 'solid-js';
import { createInitialState } from './config.js';
import { generatePage, queryToPageAddress } from './page.js';
import {
  PUZZLES,
  GUESS_COSTS,
  MAX_GUESSES,
  giveUp,
  insightForLength,
  nextGuessCost,
  openPuzzles,
  isArrangement,
  nextPuzzle,
  puzzlesUnlockedBetween,
  scorePositions,
  scrambleOf,
  submitGuess,
  unlockedPuzzles,
} from './puzzles.js';
import { createGameStore, type GameStore } from './store.js';

function permutations(letters: string): Set<string> {
  if (letters.length <= 1) return new Set([letters]);
  const out = new Set<string>();
  for (let i = 0; i < letters.length; i++) {
    for (const rest of permutations(letters.slice(0, i) + letters.slice(i + 1))) out.add(letters[i] + rest);
  }
  return out;
}

const withPages = (pages: bigint) => ({ ...createInitialState(), pagesGenerated: pages, currentPage: pages });

describe('puzzles — the word list', () => {
  it('each scramble is printed at the start of its unlock page, then spaces', () => {
    for (const p of PUZZLES) {
      const page = generatePage(p.unlockPage);
      assert.strictEqual(page.slice(0, p.length), p.scramble, p.word);
      assert.strictEqual(page.slice(p.length).trim(), '', p.word);
    }
  });

  it('the unlock page is the earliest page holding any arrangement of the letters', () => {
    for (const p of PUZZLES.filter(p => p.length <= 8)) {
      for (const arrangement of permutations(p.word)) {
        assert.ok(queryToPageAddress(arrangement) >= p.unlockPage, `${arrangement} comes before ${p.scramble}`);
      }
    }
  });

  it('never gives the answer away as the scramble', () => {
    for (const p of PUZZLES) {
      assert.notStrictEqual(p.scramble, p.word);
      for (const w of p.alsoAccept) assert.notStrictEqual(p.scramble, w, p.word);
    }
  });

  it('has only lowercase words, no duplicate letter sets, and real anagrams for extra answers', () => {
    const scrambles = new Set<string>();
    for (const p of PUZZLES) {
      assert.match(p.word, /^[a-z]+$/);
      assert.ok(!scrambles.has(p.scramble), `two puzzles share the letters of ${p.word}`);
      scrambles.add(p.scramble);
      for (const w of p.alsoAccept) assert.ok(isArrangement(p, w), `${w} is not an anagram of ${p.word}`);
    }
  });

  it('is sorted by unlock page, and longer words turn up later', () => {
    for (let i = 1; i < PUZZLES.length; i++) {
      assert.ok(PUZZLES[i - 1]!.unlockPage <= PUZZLES[i]!.unlockPage);
      assert.ok(PUZZLES[i - 1]!.length <= PUZZLES[i]!.length, `${PUZZLES[i - 1]!.word} before ${PUZZLES[i]!.word}`);
    }
  });

  it('doubles the reward with each letter', () => {
    assert.strictEqual(insightForLength(5), 2);
    assert.strictEqual(insightForLength(6), 4);
    assert.strictEqual(insightForLength(10), 64);
  });
});

describe('puzzles — rules', () => {
  it('scrambles into descending alphabet order', () => {
    assert.strictEqual(scrambleOf('babel'), 'lebba');
  });

  it('scores the right spots, repeated letters included', () => {
    assert.deepStrictEqual(scorePositions('lebba', 'babel'), [false, false, true, false, false]);
    assert.deepStrictEqual(scorePositions('babel', 'babel'), [true, true, true, true, true]);
    assert.deepStrictEqual(scorePositions('bbael', 'babel'), [true, false, false, true, true]);
  });

  it('unlocks puzzles as their pages are written', () => {
    const first = PUZZLES[0]!;
    assert.deepStrictEqual(unlockedPuzzles(withPages(first.unlockPage - 1n)), []);
    assert.strictEqual(nextPuzzle(withPages(first.unlockPage - 1n)), first);
    assert.deepStrictEqual(unlockedPuzzles(withPages(first.unlockPage)), [first]);
    assert.deepStrictEqual(puzzlesUnlockedBetween(first.unlockPage - 1n, first.unlockPage), [first]);
    assert.deepStrictEqual(puzzlesUnlockedBetween(first.unlockPage, first.unlockPage), []);
  });

  it('records wrong guesses, then solves once and credits Insight', () => {
    const p = PUZZLES.find(p => p.word === 'babel')!;
    const s = withPages(p.unlockPage);
    const wrong = submitGuess(s, p.id, 'bbael');
    assert.deepStrictEqual(wrong, { ok: true, solved: false, lost: false, correct: [true, false, false, true, true], reward: 0, cost: 0 });
    assert.strictEqual(s.insight, 0);

    const right = submitGuess(s, p.id, 'babel');
    assert.ok(right.ok && right.solved);
    assert.strictEqual(s.insight, p.reward);
    assert.deepStrictEqual(s.puzzlesSolved, ['babel']);
    assert.deepStrictEqual(s.puzzleGuesses.babel, ['bbael', 'babel']);

    assert.deepStrictEqual(submitGuess(s, p.id, 'babel'), { ok: false, message: 'Already solved' });
    assert.strictEqual(s.insight, p.reward);
  });

  it('gives three free guesses, charges for the rest, and loses on a wrong last guess', () => {
    const p = PUZZLES.find(p => p.word === 'babel')!;
    const s = withPages(p.unlockPage);
    s.insight = 1;
    for (let i = 0; i < 3; i++) assert.ok(submitGuess(s, p.id, 'lebba').ok);
    assert.strictEqual(s.insight, 1, 'first three free');
    assert.strictEqual(nextGuessCost(s, p.id), GUESS_COSTS[3]);

    const fourth = submitGuess(s, p.id, 'lebba');
    assert.ok(fourth.ok && fourth.cost === 1 && !fourth.lost);
    assert.strictEqual(s.insight, 0);
    assert.deepStrictEqual(submitGuess(s, p.id, 'lebba'), { ok: false, message: 'This guess costs 1 ✦' });
    assert.strictEqual(s.puzzleGuesses.babel!.length, 4, 'an unaffordable guess is not recorded');

    s.insight = 1;
    const fifth = submitGuess(s, p.id, 'lebba');
    assert.ok(fifth.ok && fifth.lost && !fifth.solved && fifth.reward === 0);
    assert.deepStrictEqual(s.puzzlesFailed, ['babel']);
    assert.deepStrictEqual(s.puzzlesSolved, []);
    assert.strictEqual(s.insight, 0);
    assert.deepStrictEqual(submitGuess(s, p.id, 'babel'), { ok: false, message: 'Already lost' });
    assert.ok(!openPuzzles(s).includes(p));
  });

  it('solves on the last guess instead of losing', () => {
    const p = PUZZLES.find(p => p.word === 'babel')!;
    const s = withPages(p.unlockPage);
    s.insight = 2;
    for (let i = 0; i < MAX_GUESSES - 1; i++) submitGuess(s, p.id, 'lebba');
    const last = submitGuess(s, p.id, 'babel');
    assert.ok(last.ok && last.solved && !last.lost);
    assert.strictEqual(s.insight, p.reward);
  });

  it('giving up loses an open puzzle', () => {
    const p = PUZZLES.find(p => p.word === 'babel')!;
    const s = withPages(p.unlockPage);
    assert.ok(giveUp(s, p.id));
    assert.ok(!giveUp(s, p.id), 'only once');
    assert.ok(!giveUp(withPages(0n), p.id), 'not before it unlocks');
    assert.deepStrictEqual(s.puzzlesFailed, ['babel']);
  });

  it('accepts listed anagrams', () => {
    const p = PUZZLES.find(p => p.word === 'words')!;
    const s = withPages(p.unlockPage);
    const r = submitGuess(s, p.id, 'sword');
    assert.ok(r.ok && r.solved);
  });

  it('rejects locked puzzles and guesses that are not the given letters', () => {
    const p = PUZZLES.find(p => p.word === 'babel')!;
    assert.strictEqual(submitGuess(withPages(0n), p.id, 'babel').ok, false);
    const s = withPages(p.unlockPage);
    assert.strictEqual(submitGuess(s, p.id, 'label').ok, false);
    assert.strictEqual(submitGuess(s, p.id, 'babe').ok, false);
    assert.strictEqual(submitGuess(s, 'nope', 'babel').ok, false);
    assert.deepStrictEqual(s.puzzleGuesses, {});
  });
});

describe('puzzles — through the store', () => {
  let game: GameStore;
  const fresh = () => createRoot(() => (game = createGameStore()));

  it('logs a puzzle when a tick writes its page', () => {
    fresh();
    const first = PUZZLES[0]!;
    game.setState(s => {
      s.pagesGenerated = first.unlockPage - 1n;
      s.currentPage = s.pagesGenerated;
    });
    game.tick(1000);
    flush();
    assert.deepStrictEqual(game.unlockedPuzzles(), [first]);
    assert.deepStrictEqual(game.openPuzzles(), [first]);
    assert.ok(game.state.log.some(e => e.message.includes(first.scramble)));
  });

  it('solves through guessPuzzle, unlocking the achievement', () => {
    fresh();
    const p = PUZZLES.find(p => p.word === 'babel')!;
    game.setState(s => {
      s.pagesGenerated = p.unlockPage;
    });
    // Two guesses in one frame: the second reads the first from the draft
    assert.deepStrictEqual(game.guessPuzzle(p.id, 'lebba'), { ok: true, solved: false, lost: false, correct: [false, false, true, false, false], reward: 0, cost: 0 });
    const r = game.guessPuzzle(p.id, 'babel');
    flush();
    assert.ok(r.ok && r.solved);
    assert.strictEqual(game.state.insight, p.reward);
    assert.ok(!game.openPuzzles().includes(p));
    assert.ok(game.state.achievements.some(a => a.id === 'solve-1'));
  });
});
