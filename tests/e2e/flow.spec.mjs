import { exists, expect, SAVED_AS, openGame, openMap, savedStamps, tap, tapPin, test, withStamps } from './helpers.mjs';

test('the title leads to a map with six places, the mountain not open yet', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('JelajahKerinci');
  await expect(page.locator('.version')).toHaveText('v0.0.0-test');
  await expect(page.locator('.credit a')).toHaveAttribute('href', 'https://nyetok.id');
  await tap(page, '#play');
  await expect(page.locator('.pin')).toHaveCount(6);
  await expect(page.locator('.pin[data-id="mountain"]')).toHaveClass(/pin-locked/);

  await tapPin(page, 'mountain');
  await expect(page.locator('#say')).toContainText('belum dibuka');
  await expect(page.locator('.map')).toBeVisible();
});

test('leaving a game asks first, pauses meanwhile, and gives no stamp', async ({ page }) => {
  await openMap(page);
  await openGame(page, 'tea');
  const bar = () => page.evaluate(() => document.querySelector('#bar').style.transform);

  await tap(page, '#quit');
  await expect(page.locator('.overlay')).toBeVisible();
  const whenAsked = await bar();
  await page.waitForTimeout(700);
  expect(await bar(), 'the clock stands still while the question is open').toBe(whenAsked);

  await tap(page, '.overlay [data-answer="no"]');
  await expect.poll(bar, { message: 'the clock runs again after "no"' }).not.toBe(whenAsked);

  await tap(page, '#quit');
  await tap(page, '.overlay [data-answer="yes"]');
  await expect(page.locator('.map')).toBeVisible();
  expect(await savedStamps(page)).toEqual({});
});

test('the phone back button goes game to map to title', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'market');
  await expect(page.locator('.intro')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.map')).toBeVisible();

  await openGame(page, 'market');
  await page.goBack();
  await expect(page.locator('.map')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.home')).toBeVisible();
});

test('stamps and the sound setting survive a reload, and can be reset', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => JK.debug.result('tea', { stars: 2, message: 'x' }));
  await page.evaluate(() => JK.debug.result('tea', { stars: 1, message: 'x' }));
  expect(await savedStamps(page), 'a worse run keeps the better stamp').toEqual({ tea: 2 });

  await tap(page, '#to-map');
  await expect(page.locator('#book')).toContainText('1/5');
  await tap(page, '#sound');
  await page.reload();
  await expect(page.locator('#book')).toContainText('1/5');
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');

  await tap(page, '#book');
  await expect(page.locator('.stamp-tile.owned')).toHaveCount(1);
  await tap(page, '.stamp-tile[data-id="tea"]');
  await expect(page.locator('#detail')).toContainText('Kayu Aro');
  await expect(page.locator('#detail')).toContainText('aro');
  await tap(page, '.stamp-tile[data-id="lake"]');
  await expect(page.locator('#detail')).toContainText('Mainkan dulu');

  await tap(page, '#reset');
  await tap(page, '.overlay [data-answer="yes"]');
  await expect(page.locator('.stamp-tile.owned')).toHaveCount(0);
  expect(await savedStamps(page)).toEqual({});
});

test('progress saved by version 0.1.0 is carried over', async ({ page }) => {
  // 0.1.0 stored Indonesian field names and place ids under the same key.
  await page.addInitScript(
    ([key, old]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(key, JSON.stringify(old));
        sessionStorage.setItem('seeded', '1');
      }
    },
    [SAVED_AS, { stempel: { teh: 3, danau: 1, rimba: 2, rentak: 3, pasar: 2 }, suara: false }],
  );
  await openMap(page);
  await expect(page.locator('#book')).toContainText('5/5');
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');

  // The first save rewrites it in the current format, with nothing lost.
  await tap(page, '#sound');
  expect(await savedStamps(page)).toEqual({ tea: 3, lake: 1, forest: 2, rhythm: 3, market: 2 });
  await page.reload();
  await expect(page.locator('#book')).toContainText('5/5');
});

test('place colours are applied without inline styles', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'lake');
  const color = await page.evaluate(() => getComputedStyle(document.querySelector('.intro-art')).borderTopColor);
  expect(color).toBe('rgb(47, 127, 209)');
  expect(await page.evaluate(() => document.querySelectorAll('[onclick], [onload], [onerror]').length)).toBe(0);
});

test('the site keeps working offline after one visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(async () => {
      const names = await caches.keys();
      return names.length ? (await (await caches.open(names[0])).keys()).length : 0;
    }))
    .toBeGreaterThan(15);
  expect(await page.evaluate(() => caches.keys())).toEqual(['jelajah-kerinci-0.0.0-test']);

  await context.setOffline(true);
  await page.reload();
  await tap(page, '#play');
  await openGame(page, 'market');
  await expect(page.locator('.card')).toHaveCount(12);
});

test('a new version reloads the page on the map, never in the middle of a game', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.reload(); // from here on the page starts under a service worker

  await tap(page, '#play');
  await openGame(page, 'market');
  await page.evaluate(() => {
    window.__notReloaded = true;
    navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
  });
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__notReloaded), 'no reload while a game runs').toBe(true);

  await tap(page, '#quit');
  await tap(page, '.overlay [data-answer="yes"]');
  // The marker is gone once the page has loaded again; mid-navigation there is no page to ask.
  await expect
    .poll(() => page.evaluate(() => window.__notReloaded === undefined).catch(() => false))
    .toBe(true);
  await expect(page.locator('.map')).toBeVisible();
});

test.describe('when a file does not arrive', () => {
  test.use({ allowedErrors: /Failed to load resource|ERR_FAILED/ });

  test('the page offers a reload instead of freezing', async ({ page }) => {
    await page.route('**/js/game/forest.js', (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('#load-failed')).toBeVisible();
    await expect(page.locator('#reload')).toBeVisible();

    await page.unroute('**/js/game/forest.js');
    await tap(page, '#reload');
    await expect(page.locator('.home')).toBeVisible();
    await expect(page.locator('#load-failed')).toBeHidden();
    expect(await page.evaluate(() => typeof JK.game.forest)).toBe('function');
  });
});

test('every stamp completes the book while the mountain stays closed, and its game still plays', async ({ page }) => {
  // A stamp from the time the mountain was open is kept, but not shown.
  await withStamps(page, { tea: 1, lake: 1, forest: 1, rhythm: 1, market: 1, mountain: 3 });
  await openMap(page);
  await expect(page.locator('#book')).toContainText('5/5');
  await expect(page.locator('#say')).toContainText('tempat baru');
  await expect(page.locator('.pin[data-id="mountain"]')).toHaveClass(/pin-locked/);
  expect(await exists(page, '.pin-pulse'), 'no place is left to visit').toBe(false);

  await tapPin(page, 'mountain');
  await expect(page.locator('#say')).toContainText('belum dibuka');
  await tap(page, '#sound');
  expect((await savedStamps(page)).mountain).toBe(3);

  await tap(page, '#book');
  await expect(page.locator('.stamp-tile.owned')).toHaveCount(5);
  await tap(page, '.stamp-tile[data-id="mountain"]');
  await expect(page.locator('#detail')).toContainText('belum dibuka');

  // The climb is kept for the day the summit opens: it must still play to the end.
  await page.evaluate(() => JK.debug.play('mountain'));
  await expect(page.locator('#countdown')).toHaveCount(0);
  for (let i = 0; i < 36; i++) {
    await tap(page, '#stage');
    await page.waitForTimeout(30);
  }
  await expect(page.locator('#score')).toHaveText('3.805 m');
  await expect(page.locator('.mountain-post')).toContainText('Puncak Gunung Kerinci');
  await expect(page.locator('.result')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.result-stars .star.got')).toHaveCount(3);
});

const sound = (page) => page.evaluate(() => window.JK.audio.status());
const quitGame = async (page) => {
  await tap(page, '#quit');
  await tap(page, '.overlay [data-answer="yes"]');
  await expect(page.locator('.map')).toBeVisible();
};

test('the recorded sounds load, and the music follows the screen and the sound button', async ({ page }) => {
  await openMap(page);
  await expect.poll(async () => (await sound(page)).music).toBe('map');
  await expect.poll(async () => (await sound(page)).loaded).toEqual(expect.arrayContaining(['sfx/tap', 'sfx/gong', 'music/play']));

  await openGame(page, 'market');
  await expect.poll(async () => (await sound(page)).music).toBe('play');
  await quitGame(page);
  await expect.poll(async () => (await sound(page)).music).toBe('map');

  // The rhythm game is about hearing the instruments: no music under it.
  await openGame(page, 'rhythm');
  await expect.poll(async () => (await sound(page)).music).toBe(null);
  await quitGame(page);

  await tap(page, '#sound');
  await expect.poll(async () => (await sound(page)).music).toBe(null);
  await tap(page, '#sound');
  await expect.poll(async () => (await sound(page)).music).toBe('map');
});

test('a place is introduced by its recorded narration, which stops when the screen is left', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'lake');
  await expect.poll(async () => (await sound(page)).speaking).toBe(true);
  expect((await sound(page)).loaded).toContain('voice/intro-lake');
  await tap(page, '#back');
  await expect.poll(async () => (await sound(page)).speaking).toBe(false);
});
