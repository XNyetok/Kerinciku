import { ada, bukaGame, denganStempel, expect, kePeta, sentuh, sentuhPin, stempel, test } from './bantu.mjs';

test('the title leads to a map with six places, the mountain locked', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('JelajahKerinci');
  await expect(page.locator('.versi')).toHaveText('v0.0.0-test');
  await sentuh(page, '#main');
  await expect(page.locator('.pin')).toHaveCount(6);
  await expect(page.locator('.pin[data-id="gunung"]')).toHaveClass(/pin-kunci/);

  await sentuhPin(page, 'gunung');
  await expect(page.locator('#kata')).toContainText('5 stempel');
  await expect(page.locator('.peta')).toBeVisible();
});

test('leaving a game asks first, pauses meanwhile, and gives no stamp', async ({ page }) => {
  await kePeta(page);
  await bukaGame(page, 'teh');
  const waktu = () => page.evaluate(() => document.querySelector('#waktu').style.transform);

  await sentuh(page, '#keluar');
  await expect(page.locator('.tirai')).toBeVisible();
  const saatDitanya = await waktu();
  await page.waitForTimeout(700);
  expect(await waktu(), 'the clock stands still while the question is open').toBe(saatDitanya);

  await sentuh(page, '.tirai [data-j="t"]');
  await expect.poll(waktu, { message: 'the clock runs again after "Tidak"' }).not.toBe(saatDitanya);

  await sentuh(page, '#keluar');
  await sentuh(page, '.tirai [data-j="y"]');
  await expect(page.locator('.peta')).toBeVisible();
  expect(await stempel(page)).toEqual({});
});

test('the phone back button goes game to map to title', async ({ page }) => {
  await kePeta(page);
  await sentuhPin(page, 'pasar');
  await expect(page.locator('.pengantar')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.peta')).toBeVisible();

  await bukaGame(page, 'pasar');
  await page.goBack();
  await expect(page.locator('.peta')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.beranda')).toBeVisible();
});

test('stamps and the sound setting survive a reload, and can be reset', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => JK.uji.hasil('teh', { bintang: 2, pesan: 'x' }));
  await page.evaluate(() => JK.uji.hasil('teh', { bintang: 1, pesan: 'x' }));
  expect(await stempel(page), 'a worse run keeps the better stamp').toEqual({ teh: 2 });

  await sentuh(page, '#peta');
  await expect(page.locator('#buku')).toContainText('1/6');
  await sentuh(page, '#suara');
  await page.reload();
  await expect(page.locator('#buku')).toContainText('1/6');
  await expect(page.locator('#suara')).toHaveAttribute('aria-pressed', 'false');

  await sentuh(page, '#buku');
  await expect(page.locator('.cap-kotak.punya')).toHaveCount(1);
  await sentuh(page, '.cap-kotak[data-id="teh"]');
  await expect(page.locator('#rinci')).toContainText('Kayu Aro');
  await expect(page.locator('#rinci')).toContainText('aro');
  await sentuh(page, '.cap-kotak[data-id="danau"]');
  await expect(page.locator('#rinci')).toContainText('Mainkan dulu');

  await sentuh(page, '#hapus');
  await sentuh(page, '.tirai [data-j="y"]');
  await expect(page.locator('.cap-kotak.punya')).toHaveCount(0);
  expect(await stempel(page)).toEqual({});
});

test('place colours are applied without inline styles', async ({ page }) => {
  await kePeta(page);
  await sentuhPin(page, 'danau');
  const warna = await page.evaluate(() => getComputedStyle(document.querySelector('.pengantar-gambar')).borderTopColor);
  expect(warna).toBe('rgb(47, 127, 209)');
  expect(await page.evaluate(() => document.querySelectorAll('[onclick], [onload], [onerror]').length)).toBe(0);
});

test('the site keeps working offline after one visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(async () => {
      const nama = await caches.keys();
      return nama.length ? (await (await caches.open(nama[0])).keys()).length : 0;
    }))
    .toBeGreaterThan(15);
  expect(await page.evaluate(() => caches.keys())).toEqual(['jelajah-kerinci-0.0.0-test']);

  await context.setOffline(true);
  await page.reload();
  await sentuh(page, '#main');
  await bukaGame(page, 'pasar');
  await expect(page.locator('.kartu')).toHaveCount(12);
});

test('a new version reloads the page on the map, never in the middle of a game', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.reload(); // from here on the page starts under a service worker

  await sentuh(page, '#main');
  await bukaGame(page, 'pasar');
  await page.evaluate(() => {
    window.__belumMuatUlang = true;
    navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
  });
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__belumMuatUlang), 'no reload while a game runs').toBe(true);

  await sentuh(page, '#keluar');
  await sentuh(page, '.tirai [data-j="y"]');
  // The marker is gone once the page has loaded again; mid-navigation there is no page to ask.
  await expect
    .poll(() => page.evaluate(() => window.__belumMuatUlang === undefined).catch(() => false))
    .toBe(true);
  await expect(page.locator('.peta')).toBeVisible();
});

test.describe('when a file does not arrive', () => {
  test.use({ galatDiizinkan: /Failed to load resource|ERR_FAILED/ });

  test('the page offers a reload instead of freezing', async ({ page }) => {
    await page.route('**/js/game/rimba.js', (rute) => rute.abort());
    await page.goto('/');
    await expect(page.locator('#gagal')).toBeVisible();
    await expect(page.locator('#muat-ulang')).toBeVisible();

    await page.unroute('**/js/game/rimba.js');
    await sentuh(page, '#muat-ulang');
    await expect(page.locator('.beranda')).toBeVisible();
    await expect(page.locator('#gagal')).toBeHidden();
    expect(await page.evaluate(() => typeof JK.game.rimba)).toBe('function');
  });
});

test('five stamps open the mountain, and the summit completes the book', async ({ page }) => {
  await denganStempel(page, { teh: 1, danau: 1, rimba: 1, rentak: 1, pasar: 1 });
  await kePeta(page);
  await expect(page.locator('.pin[data-id="gunung"]')).not.toHaveClass(/pin-kunci/);
  await expect(page.locator('#kata')).toContainText('mendaki');

  await bukaGame(page, 'gunung');
  for (let i = 0; i < 36; i++) {
    await sentuh(page, '#panggung');
    await page.waitForTimeout(30);
  }
  await expect(page.locator('#skor')).toHaveText('3.805 m');
  await expect(page.locator('.gunung-pos')).toContainText('Puncak Gunung Kerinci');
  await expect(page.locator('.hasil')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.hasil-bintang .bt.dapat')).toHaveCount(3);
  await expect(page.locator('.hasil-catatan')).toContainText('seluruh Kerinci');

  await sentuh(page, '#peta');
  await expect(page.locator('#buku')).toContainText('6/6');
  expect(await ada(page, '.pin-denyut'), 'no place is left to visit').toBe(false);
});
