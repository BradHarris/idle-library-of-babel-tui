// Two tabs of the game in one browser profile: when one saves, the other pauses instead of
// overwriting it, and a reload hands the game over to the reloaded tab.
const HALTED = '[data-halted]';

export default async function (t) {
  const a = t.page;
  let b; // opened in step 2: a new tab takes the foreground, and background tabs are throttled
  const halted = p => p.evaluate(s => !!document.querySelector(s), HALTED);
  const pages = p => p.evaluate(() => document.querySelector('[data-stat="pages"]')?.textContent.trim());
  const ready = p => p.waitForFunction(() => document.querySelector('[data-stat="pages"]')?.textContent.trim(), { timeout: 15000 });

  await t.step('Tab A opens the game and saves', async () => {
    await t.open('#/settings'); // Save now lives on the Settings tab
    const p0 = await pages(a);
    await new Promise(r => setTimeout(r, 2500));
    const p1 = await pages(a);
    t.expect(p0 !== p1, `control: a running tab's page count grows (${p0} -> ${p1})`);
    await a.click('button[data-save="now"]');
    t.expect(!(await halted(a)), 'tab A is running');
    return { pages: [p0, p1] };
  });

  const bSave = await t.step('Tab B opens the same game and presses Save now', async () => {
    b = await a.browser().newPage();
    await b.setViewport(a.viewport());
    await b.goto(`${t.url}#/settings`);
    await ready(b);
    await b.click('button[data-save="now"]');
    const raw = await b.evaluate(() => localStorage.getItem('library-of-babel:save'));
    t.expect(!(await halted(b)), 'tab B is running');
    return raw;
  });

  await t.step('Tab A pauses (storage event), its game stops, and it shows the notice', async () => {
    await t.waitFor(s => !!document.querySelector(s), 'tab A paused', 5000, HALTED);
    const text = await t.text(HALTED);
    t.expect(text.includes('another tab'), 'notice says the game may be running in another tab');
    await a.bringToFront(); // background tabs are throttled; measure in the foreground
    const before = await pages(a);
    await new Promise(r => setTimeout(r, 2500)); // real time passing: a running game would make pages
    const after = await pages(a);
    t.expect(before === after, `tab A's page count is frozen (${before} -> ${after})`);
    return text;
  });
  await t.shot('tab-a-paused');

  await t.step("Tab A never overwrites tab B's save, even when it is hidden or closed", async () => {
    // Tab B saves too (e.g. when it went to the background above), so compare around A's events only
    const { before, after } = await a.evaluate(() => {
      const before = localStorage.getItem('library-of-babel:save');
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pagehide'));
      delete document.visibilityState;
      return { before, after: localStorage.getItem('library-of-babel:save') };
    });
    t.expect(before === after, 'tab A wrote nothing on hide or pagehide');
    t.expect(JSON.parse(after).savedAt >= JSON.parse(bSave).savedAt, "slot holds tab B's save (or a later one from B)");
  });

  await t.step('Reload in tab A: it carries on from the latest save; tab B now pauses when A saves', async () => {
    await Promise.all([a.waitForNavigation(), a.click('[data-halted-reload]')]);
    await ready(a);
    t.expect(!(await halted(a)), 'tab A runs again after the reload');
    await a.click('button[data-save="now"]');
    await b.waitForFunction(s => !!document.querySelector(s), { timeout: 5000 }, HALTED);
    t.expect(await halted(b), 'tab B paused after tab A saved');
  });
  await t.shot('tab-a-after-reload');
  await b.screenshot({ path: `${t.out}/tab-b-paused.png` });
  await b.close();
}
