import { test as base, expect } from '@playwright/test';

export const SAVED_AS = 'jelajah-kerinci-v1';

/** Whether the page's project emulates a touch screen. */
const touch = new WeakMap();
export const isTouch = (page) => touch.get(page) === true;

/**
 * Every test fails on a page error or a console error, which is also how a
 * Content-Security-Policy violation shows up. A test that breaks something on
 * purpose names what it expects in `allowedErrors`, a single RegExp.
 */
export const test = base.extend({
  allowedErrors: [null, { option: true }],
  page: async ({ page, allowedErrors, hasTouch }, use) => {
    touch.set(page, !!hasTouch);
    const errors = [];
    const note = (text) => {
      if (!allowedErrors || !allowedErrors.test(text)) errors.push(text);
    };
    page.on('pageerror', (e) => note(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') note(`console: ${m.text()}`);
    });
    await use(page);
    expect(errors, 'the page reported errors').toEqual([]);
  },
});

export { expect };

/** Tap on a touch device, click otherwise. */
export async function tap(page, target, options = {}) {
  const locator = typeof target === 'string' ? page.locator(target) : target;
  if (isTouch(page)) await locator.tap(options);
  else await locator.click(options);
}

/** Map pins pulse, so they never count as "stable": tap them without waiting for that. */
export const tapPin = (page, id) => tap(page, `.pin[data-id="${id}"]`, { force: true });

/** Start with these stamps already collected, for example { tea: 3, lake: 2 }. */
export async function withStamps(page, stamps) {
  await page.addInitScript(
    ([key, data]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
    },
    [SAVED_AS, { stamps, sound: true }],
  );
}

export const savedStamps = (page) =>
  page.evaluate((key) => (JSON.parse(localStorage.getItem(key) || '{}').stamps || {}), SAVED_AS);

export async function openMap(page) {
  await page.goto('/');
  await tap(page, '#play');
  await expect(page.locator('.map')).toBeVisible();
}

/** From the map into a running game: pin, introduction, the start button, and the countdown gone. */
export async function openGame(page, id) {
  await tapPin(page, id);
  await expect(page.locator('.intro')).toBeVisible();
  await tap(page, '#start');
  await expect(page.locator(`.game-${id}`)).toBeVisible();
  await expect(page.locator('#countdown')).toHaveCount(0);
}

/** Wait for the result screen; returns the stars and the number in the message. */
export async function waitForResult(page, timeout = 20_000) {
  await expect(page.locator('.result')).toBeVisible({ timeout });
  const stars = await page.locator('.result-stars .star.got').count();
  const message = await page.locator('.result-message').innerText();
  return { stars, message, number: Number((message.match(/\d+/) || [0])[0]) };
}

export const exists = (page, selector) => page.evaluate((s) => !!document.querySelector(s), selector);
