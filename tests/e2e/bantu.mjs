import { test as dasar, expect } from '@playwright/test';

export const KUNCI = 'jelajah-kerinci-v1';

/** Whether the page's project emulates a touch screen. */
const sentuhan = new WeakMap();
export const layarSentuh = (page) => sentuhan.get(page) === true;

/**
 * Every test fails on a page error or a console error, which is also how a
 * Content-Security-Policy violation shows up. A test that breaks something on
 * purpose names what it expects in `galatDiizinkan`, a single RegExp.
 */
export const test = dasar.extend({
  galatDiizinkan: [null, { option: true }],
  page: async ({ page, galatDiizinkan, hasTouch }, use) => {
    sentuhan.set(page, !!hasTouch);
    const galat = [];
    const catat = (teks) => {
      if (!galatDiizinkan || !galatDiizinkan.test(teks)) galat.push(teks);
    };
    page.on('pageerror', (e) => catat(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') catat(`console: ${m.text()}`);
    });
    await use(page);
    expect(galat, 'the page reported errors').toEqual([]);
  },
});

export { expect };

/** Tap on a touch device, click otherwise. Map pins pulse, so they never count as "stable". */
export async function sentuh(page, pemilih, opsi = {}) {
  const lokator = typeof pemilih === 'string' ? page.locator(pemilih) : pemilih;
  if (layarSentuh(page)) await lokator.tap(opsi);
  else await lokator.click(opsi);
}

export const sentuhPin = (page, id) => sentuh(page, `.pin[data-id="${id}"]`, { force: true });

/** Start with these stamps already collected, for example { teh: 3, danau: 2 }. */
export async function denganStempel(page, stempel) {
  await page.addInitScript(
    ([kunci, data]) => {
      if (!localStorage.getItem(kunci)) localStorage.setItem(kunci, JSON.stringify(data));
    },
    [KUNCI, { stempel, suara: true }],
  );
}

export const stempel = (page) =>
  page.evaluate((kunci) => (JSON.parse(localStorage.getItem(kunci) || '{}').stempel || {}), KUNCI);

export async function kePeta(page) {
  await page.goto('/');
  await sentuh(page, '#main');
  await expect(page.locator('.peta')).toBeVisible();
}

/** From the map into a running game: pin, introduction, "Mulai", and the countdown gone. */
export async function bukaGame(page, id) {
  await sentuhPin(page, id);
  await expect(page.locator('.pengantar')).toBeVisible();
  await sentuh(page, '#mulai');
  await expect(page.locator(`.main-${id}`)).toBeVisible();
  await expect(page.locator('#aba')).toHaveCount(0);
}

/** Wait for the result screen; returns the stars and the number in the message. */
export async function tungguHasil(page, batas = 20_000) {
  await expect(page.locator('.hasil')).toBeVisible({ timeout: batas });
  const bintang = await page.locator('.hasil-bintang .bt.dapat').count();
  const pesan = await page.locator('.hasil-pesan').innerText();
  return { bintang, pesan, angka: Number((pesan.match(/\d+/) || [0])[0]) };
}

export const ada = (page, pemilih) => page.evaluate((p) => !!document.querySelector(p), pemilih);
