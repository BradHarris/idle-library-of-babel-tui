// Buy the repeatable "Faster" upgrade and a one-off tier upgrade (Sharper Quills, unlocked at 25 writers).
const card = id => `button[data-upgrade-id="${id}"][data-upgrade-state="available"]`;

export default async function (t) {
  await t.step('Fresh game: Sharper Quills is locked with its requirement shown', async () => {
    await t.open('#/upgrades');
    const req = await t.text('[data-upgrade-id="writer-25"][data-upgrade-state="locked"] [data-requirement]');
    t.expect(req === 'Hire 25 writers', `requirement reads "Hire 25 writers" (got ${req})`);
    t.expect(await t.page.$eval(card('speed'), b => b.disabled), 'Faster is unaffordable at $0');
  });

  await t.step('Seed rich save ($1B, 25 writers): both are buyable', async () => {
    await t.seed('rich');
    await t.tab('upgrades');
    t.expect(!(await t.page.$eval(card('writer-25'), b => b.disabled)), 'Sharper Quills is available and affordable');
    return { count: await t.text('[data-upgrade-count]'), output: (await t.hud()).output };
  });
  await t.shot('before');

  await t.step('Buy Faster: level advances, output multiplier rises', async () => {
    const before = await t.text(card('speed'));
    await t.page.click(card('speed'));
    await t.waitFor(() => document.querySelector('button[data-upgrade-id="speed"]')?.textContent.includes('level 2'), 'Faster (level 2)');
    const hud = await t.hud();
    t.expect(hud.output.includes('faster lv.1'), `HUD shows "faster lv.1" (${hud.output})`);
    return { before, after: await t.text(card('speed')), output: hud.output };
  });

  await t.step('Buy Sharper Quills: it leaves the shop and the count goes up', async () => {
    await t.page.click(card('writer-25'));
    await t.waitFor(() => !document.querySelector('[data-upgrade-id="writer-25"]'), 'Sharper Quills gone');
    const count = await t.text('[data-upgrade-count]');
    t.expect(count.startsWith('1/'), `upgrade count is 1/N (${count})`);
    await t.tab('settings');
    await t.page.click('button[data-save="now"]');
    const saved = await t.stored();
    t.expect(saved.state.upgrades.includes('writer-25') && saved.state.speedLevel === 1, 'save has writer-25 and speedLevel 1');
    return { count, upgrades: saved.state.upgrades, speedLevel: saved.state.speedLevel };
  });
  await t.shot('after');
}
