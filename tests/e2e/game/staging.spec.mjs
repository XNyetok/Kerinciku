import { expect, test } from '@playwright/test';

// The new game's staging page, built and served with the staging site's headers
// (playwright.config.mjs). A script or style the policy blocks shows up here as a
// console error.

test('the staging page loads under its policy and names its build', async ({ page }) => {
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(e.message));

  const response = await page.goto('/');
  expect(response.headers()['content-security-policy']).toContain("'wasm-unsafe-eval'");
  expect(response.headers()['x-robots-tag']).toContain('noindex');

  await expect(page.locator('#label')).toHaveText('Versi 0.0.0-test');
  await expect(page.locator('#about')).not.toBeEmpty();
  await expect(page.locator('#webgl')).not.toBeEmpty();
  expect(problems).toEqual([]);
});

test('version.txt and robots.txt are published with the build', async ({ request }) => {
  expect((await (await request.get('/version.txt')).text()).trim()).toBe('0.0.0-test');
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
});
