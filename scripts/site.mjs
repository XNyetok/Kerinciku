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
 * Download budgets, in bytes. The game is played on cheap phones with weak
 * signal: the first is for everything a game needs before it can be played,
 * the second for the sounds in audio/, which arrive afterwards.
 */
export const SIZE_BUDGET = 400 * 1024;
export const AUDIO_BUDGET = 1200 * 1024;
