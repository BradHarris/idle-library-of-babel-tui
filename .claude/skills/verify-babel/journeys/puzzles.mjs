// Reading Room: the oldest scrambled page is the current puzzle. Tap to swap, type into the tiles,
// guess, solve, spend Insight; give up to move on; everything persists.
const tiles = t => t.page.$$eval('[data-puzzle-board] [data-tile]', bs => bs.map(b => b.textContent).join(''));
const currentId = t => t.page.$eval('[data-puzzle-board]', b => b.dataset.puzzleBoard);

export default async function (t) {
  await t.step('Fresh game: no puzzle yet, only a teaser', async () => {
    await t.open('#/puzzles');
    const board = await t.visible('[data-puzzle-board]');
    const next = await t.text('[data-next-puzzle]');
    t.expect(!board, 'no puzzle board before any scrambled page is written');
    t.expect(/5 letters/.test(next), `teaser names the next 5-letter scramble (${next})`);
    return { next };
  });

  const start = await t.step('Seed rich save (100M pages: most 5-letter scrambles written)', async () => {
    await t.seed('rich');
    await t.tab('puzzles');
    const available = await t.text('[data-puzzles-available]');
    const boards = await t.page.$$eval('[data-puzzle-board]', bs => bs.length);
    const chips = await t.page.$$eval('[data-puzzle-id]', bs => bs.length);
    t.expect(Number(available) > 1, `several puzzles available (${available})`);
    t.expect(boards === 1 && chips === 0, `one current puzzle, no list (${boards} boards, ${chips} chips)`);
    return { available, id: await currentId(t), tiles: await tiles(t), info: await t.text('[data-guess-info]') };
  });
  await t.shot('puzzle-open');

  await t.step('Tap tiles 1 and 2 to swap them, and guess (free)', async () => {
    await t.page.click('[data-puzzle-board] [data-tile="0"]');
    await t.page.click('[data-puzzle-board] [data-tile="1"]');
    const swapped = start.tiles[1] + start.tiles[0] + start.tiles.slice(2);
    await t.waitFor(w => [...document.querySelectorAll('[data-puzzle-board] [data-tile]')].map(b => b.textContent).join('') === w, 'swapped', 5000, swapped);
    await t.page.click('[data-submit-guess]');
    await t.waitFor(() => document.querySelector('[data-guess-row]'), 'guess row');
    const marks = await t.page.$$eval('[data-guess-row] [data-correct]', ts => ts.map(x => x.dataset.correct === 'true'));
    const expected = [...swapped].map((c, i) => c === start.id[i]);
    t.expect(JSON.stringify(marks) === JSON.stringify(expected), `right-spot marks match (${marks})`);
    const info = await t.text('[data-guess-info]');
    t.expect(/Guess 2 of 5 · free/.test(info), `next guess is free (${info})`);
    return { swapped, marks, message: await t.text('[data-puzzle-message]'), info };
  });
  await t.shot('wrong-guess');

  await t.step('Type the answer on the keyboard and press Enter', async () => {
    const word = start.id;
    await t.page.keyboard.type(word.slice(0, 2));
    const midway = await tiles(t);
    t.expect(midway.startsWith(word.slice(0, 2)), `typed letters land at the start (${midway})`);
    // Tiles animate their colours; let the transitions finish (the caret's blink never does)
    await t.waitFor(() => !document.getAnimations().some(a => a instanceof CSSTransition), 'tile transitions done');
    await t.shot('typing');
    await t.page.keyboard.press('Backspace');
    await t.page.keyboard.type(word.slice(1));
    t.expect((await tiles(t)) === word, `tiles read the typed word (${await tiles(t)})`);
    await t.page.keyboard.press('Enter');
    await t.waitFor(() => document.querySelector('[data-puzzle-outcome="solved"]'), 'solved banner');
    const banner = await t.text('[data-puzzle-outcome]');
    const insight = await t.text('[data-stat="insight"]');
    const next = await currentId(t);
    t.expect(/\+2 ✦/.test(banner), `banner: ${banner}`);
    t.expect(/✦ 2 insight/.test(insight), `HUD: ${insight}`);
    t.expect(next !== word, `the next puzzle comes up (${next})`);
    return { banner, insight, next };
  });
  await t.shot('solved');

  await t.step('Phone path: type into the hidden input that the Type button focuses', async () => {
    const id = await currentId(t);
    const caretAt = () => t.page.$$eval('[data-puzzle-board] [data-tile]', bs => bs.findIndex(b => b.querySelector('[data-caret]')));
    // The Type button only shows on touch screens (pointer: coarse); focus its input the same way it does
    await t.page.$eval('[data-puzzle-input]', i => i.focus());
    await t.page.keyboard.type(id.slice(0, 2));
    const typed = await tiles(t);
    const caret = await caretAt();
    t.expect(typed.startsWith(id.slice(0, 2)), `letters typed into the input land on the tiles (${typed})`);
    t.expect(caret === 2, `caret underline under tile 3 (${caret})`);
    const faded = await t.page.$$eval('[data-puzzle-board] [data-tile]', bs => bs.map(b => b.className.includes('text-ink/40')));
    t.expect(faded.join() === 'false,false,true,true,true', `untyped tiles faded (${faded})`);
    await t.waitFor(() => !document.getAnimations().some(a => a instanceof CSSTransition), 'tile transitions done');
    await t.shot('soft-keyboard');
    for (let i = 0; i < 3; i++) await t.page.keyboard.press('Backspace');
    const back = await caretAt();
    t.expect(back === 0, `Backspace in the input steps the caret back, past the start of the field (${back})`);
    // A real mouse click on Guess must not take focus from the input (that would close a phone keyboard)
    await t.page.click('[data-submit-guess]');
    await t.waitFor(() => document.querySelector('[data-guess-row]'), 'guess row');
    const focusedAfterGuess = await t.page.evaluate(() => document.activeElement?.hasAttribute('data-puzzle-input'));
    t.expect(focusedAfterGuess, 'input keeps focus after clicking Guess');
    return { typed, caret, faded, afterBackspace: back, focusedAfterGuess };
  });

  const gaveUp = await t.step('Give up on the next one: lost, no reward, the one after comes up', async () => {
    const id = await currentId(t);
    await t.page.click('[data-give-up]');
    await t.waitFor(() => document.querySelector('[data-puzzle-outcome="lost"]'), 'lost banner');
    const banner = await t.text('[data-puzzle-outcome]');
    t.expect(banner.includes(id), `banner reveals the word (${banner})`);
    const focused = await t.page.evaluate(() => document.activeElement?.hasAttribute('data-puzzle-input'));
    t.expect(focused, 'the keyboard input still has focus on the next puzzle (a phone keyboard stays open)');
    const fresh = await t.page.$eval('[data-guess-info]', e => e.textContent);
    t.expect(/Guess 1 of 5/.test(fresh), `next puzzle starts fresh (${fresh})`);
    await t.page.keyboard.type((await currentId(t)).slice(0, 1));
    const typedNext = await t.page.$$eval('[data-puzzle-board] [data-tile]', bs => bs.findIndex(b => b.querySelector('[data-caret]')));
    t.expect(typedNext === 1, `typing goes straight into the next puzzle (caret at ${typedNext})`);
    await t.page.$eval('[data-puzzle-input]', i => i.blur());
    t.expect(/✦ 2 insight/.test(await t.text('[data-stat="insight"]')), 'Insight unchanged');
    return { id, banner, next: await currentId(t) };
  });

  await t.step('Buy Lucidity with the Insight', async () => {
    await t.page.click('[data-insight-id="lucidity"]');
    await t.waitFor(() => document.querySelector('[data-insight-level]')?.textContent === 'lv.1', 'lucidity lv.1');
    return { level: await t.text('[data-insight-level]'), balance: await t.text('[data-insight-balance]'), output: (await t.hud()).output };
  });
  await t.shot('lucidity');

  await t.step('Save now, reload: solved, lost, Insight and Lucidity persisted', async () => {
    await t.tab('settings');
    await t.page.click('button[data-save="now"]');
    const s = (await t.stored()).state;
    t.expect(s.puzzlesSolved.join() === start.id, `saved solved: ${s.puzzlesSolved}`);
    t.expect(s.puzzlesFailed.join() === gaveUp.id, `saved lost: ${s.puzzlesFailed}`);
    t.expect(s.insightUpgrades.lucidity === 1 && s.insight === 0, `saved lucidity 1, insight ${s.insight}`);
    await t.open('#/puzzles');
    const id = await currentId(t);
    t.expect(id === gaveUp.next, `after reload the same puzzle is current (${id})`);
    return { solved: s.puzzlesSolved, failed: s.puzzlesFailed, insight: s.insight, current: id };
  });
  await t.shot('after-reload');
}
