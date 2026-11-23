// Tabs: one section at a time, tab in the URL hash, back/forward, deep links.
// Works at either viewport (bottom bar on mobile, a row under the HUD on desktop).
const section = name => `section[data-panel="${name}"]`;

async function shown(t) {
  return t.page.evaluate(() => [...document.querySelectorAll('section[data-panel]')].filter(s => s.checkVisibility()).map(s => s.dataset.panel));
}

export default async function (t) {
  await t.step('Default route: Workers tab, only the workers section shown', async () => {
    await t.open();
    t.expect(await t.visible('nav[aria-label="Sections"]'), 'tab bar visible');
    const current = await t.page.$eval('[data-tab][aria-current="page"]', b => b.dataset.tab);
    const panels = await shown(t);
    t.expect(current === 'workers', 'Workers tab is current');
    t.expect(panels.join() === 'workers', `only workers shown (${panels})`);
    return { hash: await t.hash(), panels };
  });

  await t.step('Tap Upgrades: URL #/upgrades, upgrades shown', async () => {
    await t.page.click('button[data-tab="upgrades"]');
    await t.waitFor(() => location.hash === '#/upgrades', 'hash #/upgrades');
    const panels = await shown(t);
    t.expect(panels.join() === 'upgrades', `only upgrades shown (${panels})`);
    return { hash: await t.hash(), panels };
  });
  await t.shot('upgrades-tab');

  for (const tab of ['log', 'achievements', 'settings']) {
    await t.step(`Tap ${tab}: URL #/${tab}, only ${tab} shown`, async () => {
      await t.page.click(`button[data-tab="${tab}"]`);
      await t.waitFor(h => location.hash === h, `hash #/${tab}`, 8000, `#/${tab}`);
      const panels = await shown(t);
      t.expect(panels.join() === tab, `only ${tab} shown (${panels})`);
      return panels;
    });
  }
  await t.shot('settings-tab');

  await t.step('Back three times returns to Upgrades', async () => {
    // browser Back; puppeteer goBack() hangs on same-document entries
    for (let i = 0; i < 3; i++) await t.page.evaluate(() => history.back());
    await t.waitFor(() => location.hash === '#/upgrades', 'back to #/upgrades');
  });

  await t.step('Upgrades shown; Back again returns to Workers', async () => {
    t.expect((await shown(t)).join() === 'upgrades', 'upgrades shown after back');
    await t.page.evaluate(() => history.back()); // browser Back; puppeteer goBack() hangs on same-document entries
    await t.waitFor(() => location.hash === '', 'back to default route');
    t.expect((await shown(t)).join() === 'workers', 'workers shown after second back');
  });

  await t.step('Deep link #/library?follow=volume opens the Library following at volume level', async () => {
    await t.open('#/library?follow=volume');
    const current = await t.page.$eval('[data-tab][aria-current="page"]', b => b.dataset.tab);
    t.expect(current === 'library', 'Library tab is current');
    t.expect((await t.page.$eval('button[data-follow]', b => b.getAttribute('aria-pressed'))) === 'true', 'map is following');
    return { title: await t.text('[data-map-title]'), panels: await shown(t) };
  });
  await t.shot('deep-link');

  await t.step('Upgrades tab badge counts buyable upgrades', async () => {
    await t.seed('rich');
    const badge = await t.text('button[data-tab="upgrades"] [data-tab-badge]');
    t.expect(Number(badge) >= 2, `badge shows >= 2 (Faster + Sharper Quills; got ${badge})`);
    return badge;
  });
}
