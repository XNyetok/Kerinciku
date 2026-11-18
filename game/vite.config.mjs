// Build of the new game (game/): Vite bundles the TypeScript and gives every built file
// a hashed name under assets/, so the server can cache them for a year.
//
//   npm run game:dev       development server, http://127.0.0.1:5173
//   npm run game:build     type check, then build into game/dist/
//   npm run game:preview   serve game/dist/ with the staging site's headers
//
// BUILD_LABEL names the build ("0.0.0-dev+a1b2c3d" on staging). Without it the build is
// labelled "dev". The label is shown on the page and written to version.txt, which the
// staging deploy checks.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { GAME_HEADERS } from '../scripts/site.mjs';

const label = process.env.BUILD_LABEL || 'dev';
if (!/^[0-9A-Za-z.+-]{1,60}$/.test(label)) throw new Error(`bad BUILD_LABEL: ${label}`);

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/',
  define: { __BUILD_LABEL__: JSON.stringify(label) },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // No data: URIs: every asset is its own cached file, and the policy allows data: for
    // images only.
    assetsInlineLimit: 0,
  },
  server: { host: '127.0.0.1' },
  // The preview serves the build the way nginx does on staging, policy included, so a
  // violation shows up in the browser tests rather than on the server.
  preview: { host: '127.0.0.1', headers: GAME_HEADERS },
  plugins: [
    {
      name: 'build-label',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.txt', source: `${label}\n` });
      },
    },
  ],
});
