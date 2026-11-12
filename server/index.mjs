/**
 * The collector: takes the game's anonymous beacons, keeps them in SQLite and
 * serves the panel that reads them. It listens on localhost only; nginx is the
 * way in (deploy/nginx/), and puts a password on everything but the beacon.
 * See docs/telemetry.md.
 */
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readAgent } from './agent.mjs';
import { openGeo } from './geo.mjs';
import { normaliseEvent, openStore } from './store.mjs';

const PORT = Number(process.env.PORT ?? 8788);
const HOST = process.env.HOST ?? '127.0.0.1';
const DB_PATH = process.env.DB_PATH ?? './data/stats.db';
const GEO_DB = process.env.GEO_DB ?? './data/city.mmdb';
const KEEP_DAYS = 90;
const MAX_BODY = 2048;

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PANEL_DIR = resolve(HERE, 'panel');
const store = openStore(DB_PATH);

// The GeoIP file is replaced now and then (docs/telemetry.md): open it again
// every day, so a new one is picked up without a restart.
let geo = openGeo(GEO_DB);
setInterval(() => {
  const fresh = openGeo(GEO_DB);
  if (!fresh) return;
  geo?.close();
  geo = fresh;
}, 24 * 3600_000).unref();

/**
 * The deploy writes the release folder name into RELEASE, and checks it in the
 * health answer: a switch that left the old code running must not pass.
 */
const RELEASE = await readFile(new URL('./RELEASE', import.meta.url), 'utf8')
  .then((text) => text.trim() || 'dev')
  .catch(() => 'dev');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const PANEL_HEADERS = {
  'content-type': 'text/plain; charset=utf-8',
  'content-security-policy':
    "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-robots-tag': 'noindex, nofollow',
  'cache-control': 'no-store',
};

function json(res, status, body) {
  res.writeHead(status, { ...PANEL_HEADERS, 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function empty(res) {
  res.writeHead(204, PANEL_HEADERS);
  res.end();
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      // Too large: answer now, and let the rest of the upload drain unread.
      if (size > MAX_BODY) reject(new Error('too large'));
      else chunks.push(chunk);
    });

    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function servePanel(pathname, res) {
  const rel = pathname.replace(/^\/panel\/?/, '') || 'index.html';
  const file = resolve(join(PANEL_DIR, rel));

  // Never serve anything outside the panel directory.
  if (file !== PANEL_DIR && !file.startsWith(PANEL_DIR + sep)) {
    json(res, 404, { error: 'not found' });
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, { ...PANEL_HEADERS, 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    json(res, 404, { error: 'not found' });
  }
}

const header = (req, name) => {
  const value = req.headers[name];
  return typeof value === 'string' ? value : '';
};

async function beacon(req, res) {
  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch {
    json(res, 400, { error: 'bad payload' });
    return;
  }

  // A browser that asks not to be tracked is not counted, and neither is a crawler.
  const agent = readAgent(header(req, 'user-agent'));
  if (agent.bot || header(req, 'dnt') === '1' || header(req, 'sec-gpc') === '1') {
    empty(res);
    return;
  }

  // nginx passes the visitor's address in X-Real-IP. It is looked up and then
  // forgotten: it is not stored, and nothing here logs it.
  const where = geo ? geo.lookup(header(req, 'x-real-ip')) : null;
  const event = normaliseEvent(input, agent, where);
  if (!event) {
    json(res, 422, { error: 'ignored' });
    return;
  }

  store.insert(event);
  empty(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');

  try {
    if (req.method === 'POST' && url.pathname === '/api/beacon') {
      await beacon(req, res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/stats') {
      const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? 30) || 30));
      json(res, 200, store.stats(days, geo));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/health') {
      json(res, 200, { ok: true, release: RELEASE, geo: !!geo, uptime: Math.round(process.uptime()) });
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/panel' || url.pathname.startsWith('/panel/'))) {
      await servePanel(url.pathname, res);
      return;
    }

    json(res, 404, { error: 'not found' });
  } catch (error) {
    json(res, 500, { error: 'failed' });
    console.error('request failed', error instanceof Error ? error.message : error);
  }
});

const prune = () => {
  const removed = store.prune(KEEP_DAYS);
  if (removed) console.log(`pruned ${removed} events older than ${KEEP_DAYS} days`);
};
prune();
setInterval(prune, 6 * 3600_000).unref();

server.listen(PORT, HOST, () => {
  console.log(`kerinciku stats ${RELEASE} listening on http://${HOST}:${PORT}`);
});

const shutdown = () => {
  server.close(() => {
    store.close();
    process.exit(0);
  });
  // Open connections must not keep an old release alive.
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

/**
 * A deploy switches the `current` link next to `releases/` to a new folder.
 * This process then runs code that is no longer current, so it stops, and the
 * service manager starts the new release (Restart=always in the unit). That
 * way the deploy user needs no right to restart a service.
 */
if (process.env.WATCH_RELEASE === '1') {
  const mine = realpathSync(HERE);
  const current = join(dirname(dirname(mine)), 'current');
  setInterval(() => {
    let target;
    try {
      target = realpathSync(current);
    } catch {
      return; // mid-switch, or not deployed that way: stay up
    }
    if (target !== mine) {
      console.log(`release switched to ${target}: stopping`);
      shutdown();
    }
  }, 2000).unref();
}
