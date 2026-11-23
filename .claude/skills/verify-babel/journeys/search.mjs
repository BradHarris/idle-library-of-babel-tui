// Search the library from the HUD: not-yet-discovered, found, and Show on map.
// "hello" is page 73,259,716 (base-43 of the reversed query; see src/page.ts).
const OPEN = 'button[aria-label="Search the library"]';
const INPUT = 'input[aria-label="Phrase to search for"]';
const HELLO = '73259716';

async function search(t, query) {
  await t.page.click(OPEN);
  await t.waitFor(() => document.querySelector('dialog')?.open, 'search dialog open');
  await t.page.type(INPUT, query);
  await t.page.keyboard.press('Enter');
}

const dialogText = t => t.page.evaluate(() => document.querySelector('dialog')?.innerText.replace(/\n+/g, ' | '));

export default async function (t) {
  await t.step('Fresh game: search "hello" is not yet discovered', async () => {
    await t.open();
    await search(t, 'hello');
    await t.waitFor(() => document.querySelector('dialog')?.innerText.includes('Not yet discovered'), '"Not yet discovered"');
    const text = await dialogText(t);
    t.expect(text.includes('73,259,716') || text.includes(HELLO), 'target page 73,259,716 is shown');
    return text;
  });
  await t.shot('not-found');

  await t.step('Escape: first clears the search box (native type=search), second closes the dialog', async () => {
    await t.page.keyboard.press('Escape');
    await t.waitFor(() => document.querySelector('input[type="search"]')?.value === '', 'query cleared by first Escape');
    t.expect(await t.page.evaluate(() => document.querySelector('dialog').open), 'dialog still open after first Escape');
    await t.page.keyboard.press('Escape');
    await t.waitFor(() => !document.querySelector('dialog')?.open, 'dialog closed');
    const value = await t.page.$eval(INPUT, i => i.value);
    t.expect(value === '', 'query box is cleared on close');
  });

  await t.step('Seed rich save (100M pages): "hello" is found', async () => {
    await t.seed('rich');
    await search(t, 'hello');
    await t.waitFor(() => !!document.querySelector('dialog [data-show-on-map]') && !document.querySelector('dialog')?.innerText.includes('Not yet'), 'found result');
    const content = await t.page.$eval('dialog p.font-mono', p => p.textContent);
    t.expect(content.startsWith('hello'), 'page content starts with "hello"');
    t.expect(content.length === 280, `page content is 280 chars (got ${content.length})`);
    return dialogText(t);
  });
  await t.shot('found');

  await t.step('Show on map: Library tab, target in URL, map zooms to the page', async () => {
    await t.page.click('dialog [data-show-on-map]');
    await t.waitFor(() => !document.querySelector('dialog')?.open, 'dialog closed');
    // Zoom steps every 600ms (ZOOM_STEP_MS) down to the page level
    // The page-level view index is a container index, not the page address, so wait for the level only
    await t.waitFor(() => location.hash.includes('view=page.'), 'map zoomed to page level', 15000);
    const hash = await t.hash();
    t.expect(hash.startsWith('#/library?') && hash.includes(`target=${HELLO}`), `URL is the library tab with target=${HELLO} (${hash})`);
    const mapText = await t.page.$eval('#storage-map', e => e.innerText.replace(/\s+/g, ' '));
    t.expect(mapText.includes('73,259,716'), 'map shows page 73,259,716');
    return { hash, title: await t.text('[data-map-title]'), mapText };
  });
  await t.shot('on-map');
}
