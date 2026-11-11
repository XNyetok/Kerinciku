import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * Browser tests against a release build (dist/), served by scripts/serve.mjs
 * with the live site's security headers. They play every game to the end, so
 * a broken game, a blocked script or a lost stamp fails here.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 120_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1000, height: 780 } } },
  ],
  webServer: {
    // A release-like label, so the service worker runs in release mode as it does live.
    command: `BUILD_LABEL=0.0.0-test node scripts/build.mjs && node scripts/serve.mjs dist --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
