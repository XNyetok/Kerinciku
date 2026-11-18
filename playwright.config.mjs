import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const GAME_PORT = 4174;
const GAME_TESTS = /[\\/]e2e[\\/]game[\\/]/;

/**
 * Browser tests against release builds, served with the live headers.
 *
 * The live game (dist/, served by scripts/serve.mjs with the live site's security
 * headers): the tests play every game to the end, so a broken game, a blocked script or
 * a lost stamp fails here.
 *
 * The new game (game/dist/, served by `vite preview` with the staging site's headers):
 * tests in tests/e2e/game/.
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
    { name: 'phone', testIgnore: GAME_TESTS, use: { ...devices['Pixel 7'] } },
    { name: 'desktop', testIgnore: GAME_TESTS, use: { ...devices['Desktop Chrome'], viewport: { width: 1000, height: 780 } } },
    // The new game is played with the phone held sideways (landscape). It needs WebGL2:
    // where there is no GPU (CI), Chromium draws with SwiftShader.
    {
      name: 'game',
      testMatch: GAME_TESTS,
      use: {
        ...devices['Pixel 7 landscape'],
        baseURL: `http://127.0.0.1:${GAME_PORT}`,
        launchOptions: { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
      },
    },
  ],
  webServer: [
    {
      // A release-like label, so the service worker runs in release mode as it does live.
      command: `BUILD_LABEL=0.0.0-test node scripts/build.mjs && node scripts/serve.mjs dist --port ${PORT}`,
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `BUILD_LABEL=0.0.0-test npm run game:build && npm run game:preview -- --port ${GAME_PORT} --strictPort`,
      url: `http://127.0.0.1:${GAME_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
