// What the site consists of, and the headers it is served with. Shared by the
// build, the local server and the checks, so they cannot drift apart.

/** Top-level files and folders that are published. Everything else stays in the repository. */
export const SITE_FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons', 'audio'];

/**
 * The Content-Security-Policy of the live site (deploy/nginx/). No inline script
 * or style is allowed, so the local server sends the same policy and a
 * violation shows up before a release, not after.
 */
export const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self'",
  "script-src 'self'",
  "worker-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ');

export const HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/**
 * The policy of the new game (game/), on the staging site
 * (deploy/nginx/kerinciku-dev-rewrite.conf). It differs from CSP only where the decoders
 * of the 3D files need it: blob: for the workers they start and the textures they unpack,
 * and 'unsafe-eval'. The Basis texture transcoder that ships with three.js is built with
 * Emscripten's embind, which creates functions with `new Function`; 'unsafe-eval' allows
 * that, and covers compiling WebAssembly too. Inline scripts stay blocked. A transcoder
 * built without dynamic execution, or a worker served with a policy of its own, would let
 * this go again.
 */
export const GAME_CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self'",
  "script-src 'self' 'unsafe-eval'",
  "worker-src 'self' blob:",
  "connect-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ');

export const GAME_HEADERS = { ...HEADERS, 'Content-Security-Policy': GAME_CSP, 'X-Robots-Tag': 'noindex, nofollow' };

/** Which policy each nginx file in deploy/nginx/ sends (npm run check compares them). */
export const NGINX_POLICIES = {
  'kerinciku-rewrite.conf': CSP,
  'kerinciku-dev-rewrite.conf': GAME_CSP,
};

/**
 * Download budgets, in bytes. The game is played on cheap phones with weak
 * signal: the first is for everything a game needs before it can be played,
 * the second for the sounds in audio/, which arrive afterwards.
 */
export const SIZE_BUDGET = 400 * 1024;
export const AUDIO_BUDGET = 1400 * 1024;
