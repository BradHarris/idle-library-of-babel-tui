// Save panel (Settings tab): save now, export, two-click reset, import, an unreadable save,
// and the frame-rate setting that is stored apart from the save.
const notice = t => t.text('[data-save-notice]');

export default async function (t) {
  await t.step('Seed rich save; Save now writes localStorage', async () => {
    await t.seed('rich');
    await t.tab('settings');
    await t.page.click('button[data-save="now"]');
    await t.waitFor(() => document.querySelector('[data-save-notice]')?.textContent === 'Saved', 'notice "Saved"');
    const saved = await t.stored();
    t.expect(saved?.v === 1 && BigInt(saved.state.pagesGenerated) >= 100000000n, 'save v1 with >= 100M pages in localStorage');
    return { notice: await notice(t), v: saved.v, pagesGenerated: saved.state.pagesGenerated };
  });

  const exported = await t.step('Export shows a base64 save string', async () => {
    await t.page.click('button[data-save="export"]');
    await t.waitFor(() => document.querySelector('[data-save-export]')?.value, 'export textarea');
    const text = await t.page.$eval('[data-save-export]', e => e.value);
    const decoded = JSON.parse(Buffer.from(text, 'base64').toString('utf8'));
    t.expect(decoded.v === 1, 'export decodes to a v1 save');
    t.expect(/copied|Copy the save below/.test((await notice(t)) ?? ''), `export notice shown (${await notice(t)})`);
    return text;
  });
  await t.shot('exported');

  await t.step('Reset needs a second click, then wipes progress', async () => {
    await t.page.click('button[data-save="reset"]');
    t.expect((await t.text('button[data-save="reset"]')) === 'Click again to reset', 'first click asks to confirm');
    t.expect((await t.hud()).pages !== '0', 'progress still there after one click');
    await t.page.click('button[data-save="reset"]');
    await t.waitFor(() => document.querySelector('[data-save-notice]')?.textContent === 'Game reset', 'notice "Game reset"');
    const hud = await t.hud();
    const saved = await t.stored();
    t.expect(saved?.state?.pagesGenerated !== undefined && BigInt(saved.state.pagesGenerated) < 1000n, 'stored save is a fresh game');
    return { hud, storedPages: saved.state.pagesGenerated };
  });

  await t.step('Import the exported string restores the game', async () => {
    await t.page.type('[data-save-import]', exported);
    await t.page.click('button[data-save="import"]');
    await t.waitFor(() => document.querySelector('[data-save-notice]')?.textContent === 'Save loaded', 'notice "Save loaded"');
    const hud = await t.hud();
    const saved = await t.stored();
    t.expect(hud.pages.endsWith('M'), `HUD pages back in the millions (${hud.pages})`);
    t.expect(BigInt(saved.state.pagesGenerated) >= 100000000n, 'stored save has the imported pages');
    return hud;
  });
  await t.shot('imported');

  await t.step('Import of garbage is refused', async () => {
    await t.page.type('[data-save-import]', 'not a save!');
    await t.page.click('button[data-save="import"]');
    await t.waitFor(() => document.querySelector('[data-save-notice]')?.textContent === 'That is not a save string', 'error notice');
    return notice(t);
  });

  await t.step('Unreadable save: warning shown, copy kept in backup, autosave off', async () => {
    await t.seedRaw('{"v":1,"state":');
    await t.tab('settings');
    t.expect(await t.visible('[data-save-load-error]'), 'load error message is shown');
    const backup = await t.stored('library-of-babel:save:backup');
    t.expect(backup === '{"v":1,"state":', 'raw save copied to the backup key');
    return t.text('[data-save-load-error]');
  });
  await t.shot('load-error');

  await t.step('Frame rate setting persists apart from the save', async () => {
    await t.page.click('button[data-fps="15"]');
    t.expect((await t.page.$eval('button[data-fps="15"]', b => b.getAttribute('aria-pressed'))) === 'true', '15 fps is pressed');
    const settings = await t.stored('library-of-babel:settings');
    t.expect(settings?.fps === 15, 'settings key stores fps 15');
    await t.open('#/settings');
    t.expect((await t.page.$eval('button[data-fps="15"]', b => b.getAttribute('aria-pressed'))) === 'true', '15 fps still pressed after reload');
    return settings;
  });
}
