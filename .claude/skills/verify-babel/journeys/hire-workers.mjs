// Hire workers from the Workers panel and prove the hire persists across a reload.
const row = tier => `li:has(> button[data-tier="${tier}"])`;
const hired = tier => `${row(tier)} p > span:first-child`;

export default async function (t) {
  await t.step('Fresh game: one writer, nothing affordable', async () => {
    await t.open();
    const writerCount = await t.text(`${row('writer')} [data-count]`);
    const managerDisabled = await t.page.$eval('button[data-tier="manager"]', b => b.disabled);
    const maxLocked = await t.page.$eval('button[data-hire-mode="max"]', b => b.disabled);
    t.expect(writerCount === '1', `writer count is 1 (got ${writerCount})`);
    t.expect(managerDisabled, 'Manager hire button is disabled with $0');
    t.expect(maxLocked, 'Max hire mode is locked before its achievement');
    return { writerCount, hud: await t.hud() };
  });

  await t.step('Seed rich save ($1B, 25 writers) and reload', async () => {
    await t.seed('rich');
    return t.hud();
  });

  const before = await t.step('Manager row before hiring', async () => {
    const price = await t.text('button[data-tier="manager"]');
    const enabled = await t.page.$eval('button[data-tier="manager"]', b => !b.disabled);
    t.expect(enabled, 'Manager hire button is enabled');
    return { price, money: (await t.hud()).money };
  });
  await t.shot('before-hire');

  await t.step('Click Hire on Manager (1× mode)', async () => {
    await t.page.click('button[data-tier="manager"]');
    await t.waitFor(s => document.querySelector(s)?.textContent?.trim() === '1 hired', 'manager "1 hired"', 5000, hired('manager'));
    const after = { hired: await t.text(hired('manager')), price: await t.text('button[data-tier="manager"]'), money: (await t.hud()).money };
    t.expect(after.hired === '1 hired', 'Manager row shows "1 hired"');
    t.expect(after.price !== before.price, `next Manager price changed (${before.price} -> ${after.price})`);
    return after;
  });
  await t.shot('after-hire');

  await t.step('Save now, reload: the hire persisted', async () => {
    await t.tab('settings');
    await t.page.click('button[data-save="now"]');
    const saved = await t.stored();
    t.expect(saved?.state?.playerWorkers?.manager === 1, 'localStorage save has playerWorkers.manager = 1');
    await t.open();
    const afterReload = await t.text(hired('manager'));
    t.expect(afterReload === '1 hired', 'after reload the Manager row still shows "1 hired"');
    return { savedPlayerWorkers: saved.state.playerWorkers, afterReload };
  });
  await t.shot('after-reload');
}
