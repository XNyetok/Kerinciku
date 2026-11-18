import { expect, test } from '@playwright/test';

// The new game, built and served with the staging site's headers
// (playwright.config.mjs). A script, style or worker the policy blocks shows up here as
// a console or page error.

function watch(page) {
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(e.message));
  return problems;
}

async function ready(page) {
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 90_000 });
  expect(await page.evaluate(() => window.__error ?? null)).toBeNull();
}

test('the page is served with the staging policy and names its build', async ({ page }) => {
  const problems = watch(page);
  const response = await page.goto('/?stalls=2&npcs=1&aa=0');
  expect(response.headers()['content-security-policy']).toContain("script-src 'self' 'unsafe-eval'");
  expect(response.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('#label')).toHaveText('versi 0.0.0-test');
  await ready(page);
  expect(problems).toEqual([]);
});

test('the market loads and the player walks to where the screen is tapped', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/?stalls=4&npcs=2&aa=0');
  await ready(page);
  const before = await page.evaluate(() => ({ ...window.__player.pos }));
  const { width, height } = page.viewportSize();
  await page.touchscreen.tap(width * 0.75, height * 0.35);
  await expect.poll(async () => {
    const now = await page.evaluate(() => ({ ...window.__player.pos }));
    return Math.hypot(now.x - before.x, now.z - before.z);
  }, { timeout: 20_000 }).toBeGreaterThan(0.5);
  await expect(page.locator('#hud')).toContainText('draw call');
  expect(problems).toEqual([]);
});

test('version.txt and robots.txt are published with the build', async ({ request }) => {
  expect((await (await request.get('/version.txt')).text()).trim()).toBe('0.0.0-test');
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
});
