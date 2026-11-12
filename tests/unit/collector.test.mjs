import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { cleanModel, readAgent } from '../../server/agent.mjs';
import { addressBytes, openGeo } from '../../server/geo.mjs';
import { redactMessage } from '../../server/redact.mjs';
import { normaliseEvent, openStore } from '../../server/store.mjs';

const SERVER = fileURLToPath(new URL('../../server/', import.meta.url));
const CLIENT = fileURLToPath(new URL('../../js/telemetry.js', import.meta.url));

const temp = (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kerinciku-stats-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};

/* ---------- What is kept of a beacon ---------- */

test('only known events are kept, and only their own fields', () => {
  assert.equal(normaliseEvent(null), null);
  assert.equal(normaliseEvent({ type: 'login', user: 'x' }), null);
  assert.equal(normaliseEvent({ type: 'game_started' }), null, 'a game needs its place');
  assert.equal(normaliseEvent({ type: 'game_started', place: '../etc' }), null);
  assert.equal(normaliseEvent({ type: 'game_ended', place: 'tea', ending: 'exploded' }), null);
  assert.equal(normaliseEvent({ type: 'error', message: '   ' }), null);

  const visit = normaliseEvent({
    type: 'visit', rev: '1.2.0+abc1234', installed: true, sound: false, stamps: 3, width: 412,
    name: 'someone', id: 'abc', place: 'tea', stars: 3,
  });
  assert.deepEqual(
    { ...visit },
    {
      type: 'visit', rev: '1.2.0+abc1234', place: null, ending: null, stars: null, seconds: null, first: null,
      sound: 0, installed: 1, stamps: 3, width: 412, message: null, browser: null, version: null, os: null,
      device: null, model: null, country: null, region: null, city: null,
    },
  );
});

test('numbers from the network are bounded, and a quit game carries no stars', () => {
  const done = normaliseEvent({ type: 'game_ended', place: 'lake', ending: 'finished', stars: 99, seconds: 1e9, first: true, sound: true });
  assert.equal(done.stars, 3);
  assert.equal(done.seconds, 3600);
  assert.equal(done.first, 1);

  const quit = normaliseEvent({ type: 'game_ended', place: 'lake', ending: 'quit', stars: 3, seconds: 'soon', first: true });
  assert.equal(quit.stars, null);
  assert.equal(quit.first, null);
  assert.equal(quit.seconds, null);

  assert.equal(normaliseEvent({ type: 'visit', stamps: -4, width: 5 }).stamps, 0);
  assert.equal(normaliseEvent({ type: 'visit', stamps: -4, width: 5 }).width, 100);
});

test('the browser and the place come from the server side, the model from either', () => {
  const agent = { browser: 'Chrome', version: 130, os: 'Android', device: 'phone', model: null };
  const where = { country: 'ID', region: 'Jambi', city: 'Sungai Penuh' };
  const event = normaliseEvent({ type: 'visit', model: 'Infinix X6525', browser: 'Lynx', country: 'XX' }, agent, where);
  assert.equal(event.browser, 'Chrome');
  assert.equal(event.country, 'ID');
  assert.equal(event.city, 'Sungai Penuh');
  assert.equal(event.model, 'Infinix X6525');
  assert.equal(normaliseEvent({ type: 'visit', model: 'K' }, { ...agent, model: 'SM-A135F' }).model, 'SM-A135F');
});

test('an error message loses its addresses before it is stored', () => {
  assert.equal(
    redactMessage('TypeError: x at https://kerinciku.web.id/js/main.js:12:3\nstack line'),
    'TypeError: x at <url>',
  );
  assert.equal(redactMessage('mail someone@example.org now'), 'mail <email> now');
  assert.equal(redactMessage('x'.repeat(1000)).length, 300);
  assert.equal(normaliseEvent({ type: 'error', message: 'Boom at http://localhost/x' }).message, 'Boom at <url>');
});

/* ---------- The User-Agent header ---------- */

/** A browser build number as Chrome writes it: 130 -> "130" followed by three zeros. */
const build = (major) => [major, 0, 0, 0].join('.');

test('a User-Agent header is reduced to a browser, a system, a device and a model', () => {
  const read = (ua) => {
    const { browser, version, os, device, model } = readAgent(ua);
    return [browser, version, os, device, model];
  };
  assert.deepEqual(
    read(`Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${build(130)} Mobile Safari/537.36`),
    ['Chrome', 130, 'Android', 'phone', null],
  );
  assert.deepEqual(
    read(`Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/${build(122)} Mobile Safari/537.36`),
    ['Samsung Internet', 26, 'Android', 'phone', 'SM-A135F'],
  );
  assert.deepEqual(
    read(`Mozilla/5.0 (Linux; Android 11; Redmi Note 8 Build/RKQ1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${build(120)} Mobile Safari/537.36`),
    ['Android WebView', 120, 'Android', 'phone', 'Redmi Note 8'],
  );
  assert.deepEqual(
    read('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'),
    ['Safari', 17, 'iOS', 'phone', 'iPhone'],
  );
  assert.deepEqual(
    read(`Mozilla/5.0 (Linux; Android 9; SM-T295) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${build(110)} Safari/537.36`),
    ['Chrome', 110, 'Android', 'tablet', 'SM-T295'],
  );
  assert.deepEqual(
    read(`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${build(130)} Safari/537.36 Edg/${build(130)}`),
    ['Edge', 130, 'Windows', 'desktop', null],
  );
  assert.deepEqual(read(''), [null, null, null, null, null]);
  assert.deepEqual(read(undefined), [null, null, null, null, null]);

  assert.equal(readAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)').bot, true);
  assert.equal(readAgent(`Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/${build(130)}`).bot, true);
  assert.equal(cleanModel('  <script>X1</script>  '), 'scriptX1/script');
  assert.equal(cleanModel('K'), null);
  assert.equal(cleanModel(42), null);
});

/* ---------- The GeoIP lookup ---------- */

/** Encodes a value the way a MaxMind DB stores it. Enough of the format for a small fixture. */
function field(value) {
  const head = (type, size) =>
    type <= 7 ? Buffer.from([(type << 5) | size]) : Buffer.from([size, type - 7]);
  if (typeof value === 'string') {
    const text = Buffer.from(value, 'utf8');
    return Buffer.concat([head(2, text.length), text]);
  }
  if (typeof value === 'number') {
    const bytes = Buffer.alloc(4);
    bytes.writeUInt32BE(value);
    return Buffer.concat([head(6, 4), bytes]);
  }
  if (Array.isArray(value)) return Buffer.concat([head(11, value.length), ...value.map(field)]);
  const entries = Object.entries(value);
  return Buffer.concat([head(7, entries.length), ...entries.flatMap(([k, v]) => [field(k), field(v)])]);
}

/** Writes a MaxMind DB with the given IPv4 networks, each `a.b.c.0/24` -> record. */
function geoFixture(path, networks) {
  const nodes = [[null, null]];
  const data = [];
  let offset = 0;
  for (const [network, record] of Object.entries(networks)) {
    const bytes = network.split('.').map(Number);
    let node = 0;
    for (let i = 0; i < 24; i++) {
      const bit = (bytes[i >> 3] >> (7 - (i & 7))) & 1;
      if (i === 23) {
        nodes[node][bit] = { data: offset };
      } else {
        if (nodes[node][bit] === null) nodes[node][bit] = nodes.push([null, null]) - 1;
        node = nodes[node][bit];
      }
    }
    const encoded = field(record);
    data.push(encoded);
    offset += encoded.length;
  }
  const tree = Buffer.alloc(nodes.length * 6);
  nodes.forEach((pair, n) => {
    pair.forEach((record, side) => {
      const value = record === null ? nodes.length : typeof record === 'number' ? record : nodes.length + 16 + record.data;
      tree.writeUIntBE(value, n * 6 + side * 3, 3);
    });
  });
  const meta = field({ node_count: nodes.length, record_size: 24, ip_version: 4, build_epoch: 1793491200 });
  writeFileSync(path, Buffer.concat([tree, Buffer.alloc(16), ...data, Buffer.from('\xab\xcd\xefMaxMind.com', 'latin1'), meta]));
}

test('an address is looked up to a country, a province and a town, and nothing else', (t) => {
  const file = join(temp(t), 'city.mmdb');
  geoFixture(file, {
    '203.0.113': { country: { iso_code: 'ID' }, subdivisions: [{ names: { en: 'Jambi' } }], city: { names: { en: 'Sungai Penuh' } }, location: { latitude: 2 } },
    '198.51.100': { country: { iso_code: 'US' } },
  });
  const geo = openGeo(file);
  t.after(() => geo.close());

  assert.equal(geo.built, '2026-11-01');
  assert.deepEqual(geo.lookup('203.0.113.77'), { country: 'ID', region: 'Jambi', city: 'Sungai Penuh' });
  assert.deepEqual(geo.lookup('::ffff:203.0.113.77'), { country: 'ID', region: 'Jambi', city: 'Sungai Penuh' });
  assert.deepEqual(geo.lookup('198.51.100.1'), { country: 'US', region: null, city: null });
  assert.equal(geo.lookup('192.0.2.1'), null, 'an address the database does not know');
  assert.equal(geo.lookup('2001:db8::1'), null, 'an IPv6 address in an IPv4 database');
  for (const junk of ['', 'nonsense', [999, 1, 1, 1].join('.'), null, undefined, '203.0.113']) assert.equal(geo.lookup(junk), null);
});

test('a missing or broken GeoIP file means no lookup, not a crash', (t) => {
  const dir = temp(t);
  assert.equal(openGeo(join(dir, 'nothing.mmdb')), null);
  writeFileSync(join(dir, 'junk.mmdb'), 'not a database');
  const error = t.mock.method(console, 'error', () => {});
  assert.equal(openGeo(join(dir, 'junk.mmdb')), null);
  assert.equal(error.mock.callCount(), 1);
});

test('IPv6 addresses are read in every spelling', () => {
  assert.deepEqual([...addressBytes('192.0.2.1')], [192, 0, 2, 1]);
  assert.deepEqual([...addressBytes('::ffff:192.0.2.1')], [192, 0, 2, 1]);
  assert.deepEqual([...addressBytes('2001:db8::1')], [0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual([...addressBytes('::1')].slice(-2), [0, 1]);
  assert.equal(addressBytes('2001:db8::g'), null);
});

/* ---------- The statistics ---------- */

test('the statistics count visits and games per place, device and origin', (t) => {
  const store = openStore(join(temp(t), 'stats.db'));
  t.after(() => store.close());
  const phone = { browser: 'Chrome', version: 130, os: 'Android', device: 'phone', model: 'SM-A135F' };
  const laptop = { browser: 'Firefox', version: 128, os: 'Linux', device: 'desktop', model: null };
  const jambi = { country: 'ID', region: 'Jambi', city: 'Sungai Penuh' };
  const add = (input, agent = phone, where = jambi) => store.insert(normaliseEvent({ rev: '1.0.0+abc1234', ...input }, agent, where));

  add({ type: 'visit', installed: true, sound: true, stamps: 0, width: 393 });
  add({ type: 'visit', installed: false, sound: false, stamps: 4, width: 1280 }, laptop, { country: 'US', region: 'Ohio', city: 'Columbus' });
  add({ type: 'visit' }, { ...phone, version: 118 });
  add({ type: 'game_started', place: 'tea' });
  add({ type: 'game_ended', place: 'tea', ending: 'finished', stars: 3, seconds: 40, first: true, sound: true });
  add({ type: 'game_started', place: 'tea' });
  add({ type: 'game_ended', place: 'tea', ending: 'finished', stars: 1, seconds: 44, first: false, sound: true });
  add({ type: 'game_started', place: 'tea' });
  add({ type: 'game_ended', place: 'tea', ending: 'quit', seconds: 9, sound: true });
  add({ type: 'game_started', place: 'lake' }, laptop);
  add({ type: 'game_ended', place: 'lake', ending: 'left', seconds: 3, sound: false }, laptop);
  add({ type: 'error', message: 'Boom' });
  add({ type: 'error', message: 'Boom' });

  const stats = store.stats(7, { built: '2026-11-01' });
  assert.deepEqual(stats.totals, { visits: 3, started: 4, finished: 2, quit: 1, left: 1, errors: 2 });
  assert.equal(stats.daily.length, 1);
  assert.deepEqual(stats.places, [
    { place: 'tea', started: 3, finished: 2, quit: 1, left: 0, first: 1, stars: [1, 0, 1], seconds: 42, abandonedSeconds: 9 },
    { place: 'lake', started: 1, finished: 0, quit: 0, left: 1, first: 0, stars: [0, 0, 0], seconds: null, abandonedSeconds: 3 },
  ]);
  assert.deepEqual(stats.visitors, {
    installed: { said: 2, yes: 1 },
    returning: { said: 2, yes: 1 },
    muted: { said: 2, yes: 1 },
    stamps: 2,
  });
  assert.deepEqual(stats.devices.map((d) => ({ ...d })), [
    { device: 'phone', visits: 2, started: 3, finished: 2 },
    { device: 'desktop', visits: 1, started: 1, finished: 0 },
  ]);
  assert.deepEqual(stats.browsers.map((b) => ({ ...b })), [
    { name: 'Chrome', n: 2, oldest: 118, common: 130 },
    { name: 'Firefox', n: 1, oldest: 128, common: 128 },
  ]);
  assert.deepEqual(stats.models.map((m) => ({ ...m })), [{ name: 'SM-A135F', n: 2 }]);
  assert.deepEqual(stats.widths, [
    { name: 'narrow', n: 0 }, { name: 'phone', n: 1 }, { name: 'wide', n: 0 }, { name: 'desktop', n: 1 },
  ]);
  assert.deepEqual(stats.countries.map((c) => ({ ...c })), [{ name: 'ID', n: 2 }, { name: 'US', n: 1 }]);
  assert.deepEqual(stats.regions.map((r) => ({ ...r })), [{ name: 'Jambi', n: 2 }], 'provinces are Indonesia only');
  assert.deepEqual(stats.cities.map((c) => ({ ...c })), [{ name: 'Sungai Penuh', n: 2 }]);
  assert.equal(stats.hours.reduce((sum, h) => sum + h.n, 0), 3);
  assert.equal(stats.errors[0].n, 2);
  assert.deepEqual(stats.geo, { available: true, built: '2026-11-01' });
  // Every part of the answer is explained to whoever reads the file later.
  for (const key of Object.keys(stats)) {
    if (!['format', 'generated', 'about', 'days', 'since'].includes(key)) assert.ok(stats.about[key], `about.${key}`);
  }
});

test('old events age out', (t) => {
  const store = openStore(join(temp(t), 'stats.db'));
  t.after(() => store.close());
  store.insert(normaliseEvent({ type: 'visit' }), Date.now() - 100 * 86_400_000);
  store.insert(normaliseEvent({ type: 'visit' }));
  assert.equal(store.prune(90), 1);
  assert.equal(store.stats(365).totals.visits, 1);
});

/* ---------- The collector as a service ---------- */

const UA = `Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/${build(122)} Mobile Safari/537.36`;

/** Starts the collector from `dir` and waits until it answers. */
async function collector(t, dir, env = {}) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const data = temp(t);
  const child = spawn(process.execPath, ['--no-warnings', join(dir, 'index.mjs')], {
    env: { ...process.env, PORT: String(port), DB_PATH: join(data, 'stats.db'), GEO_DB: join(data, 'none.mmdb'), ...env },
    stdio: 'ignore',
  });
  const exited = new Promise((resolve) => child.once('exit', resolve));
  t.after(() => child.kill());
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return { base, exited };
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new Error('the collector did not start');
}

test('the collector stores beacons, ignores crawlers and Do Not Track, and serves the panel', async (t) => {
  const { base } = await collector(t, SERVER);
  const post = (body, headers = {}) =>
    fetch(`${base}/api/beacon`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': UA, 'x-real-ip': '203.0.113.9', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }).then((r) => r.status);

  assert.equal(await post({ type: 'visit', stamps: 2 }), 204);
  assert.equal(await post({ type: 'visit' }, { dnt: '1' }), 204);
  assert.equal(await post({ type: 'visit' }, { 'sec-gpc': '1' }), 204);
  assert.equal(await post({ type: 'visit' }, { 'user-agent': 'Googlebot/2.1' }), 204);
  assert.equal(await post({ type: 'unknown' }), 422);
  assert.equal(await post('{not json'), 400);
  assert.equal(await post({ type: 'visit', pad: 'x'.repeat(4000) }), 400, 'a body over 2 kB is refused');

  const stats = await (await fetch(`${base}/api/stats?days=7`)).json();
  assert.equal(stats.totals.visits, 1, 'only the one honest visit was stored');
  assert.equal(stats.browsers[0].name, 'Samsung Internet');
  assert.deepEqual(stats.geo, { available: false, built: null });
  // The address was used for nothing: without a GeoIP file there is no place, and it is nowhere in the answer.
  assert.equal(JSON.stringify(stats).includes('203.0.113'), false);

  const panel = await fetch(`${base}/panel/`);
  assert.equal(panel.status, 200);
  assert.match(panel.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(panel.headers.get('cache-control'), 'no-store');
  assert.match(await panel.text(), /Jelajah Kerinci/);
  assert.equal((await fetch(`${base}/panel/panel.js`)).status, 200);
  assert.equal((await fetch(`${base}/panel/..%2fstore.mjs`)).status, 404);
  assert.equal((await fetch(`${base}/panel/%2e%2e/index.mjs`)).status, 404);
  assert.equal((await fetch(`${base}/`)).status, 404);
  assert.equal((await fetch(`${base}/api/stats`, { method: 'POST' })).status, 404);
});

test('the collector stops when the deploy points current at another release', async (t) => {
  const root = temp(t);
  for (const name of ['a', 'b']) {
    cpSync(SERVER, join(root, 'releases', name), { recursive: true });
    writeFileSync(join(root, 'releases', name, 'RELEASE'), `${name}\n`);
  }
  mkdirSync(join(root, 'tmp'));
  symlinkSync('releases/a', join(root, 'current'));

  const { base, exited } = await collector(t, join(root, 'current'), { WATCH_RELEASE: '1' });
  assert.equal((await (await fetch(`${base}/api/health`)).json()).release, 'a');

  symlinkSync('releases/b', join(root, 'current.next'));
  renameSync(join(root, 'current.next'), join(root, 'current'));
  const code = await Promise.race([exited, new Promise((r) => setTimeout(() => r('still running'), 8000))]);
  assert.equal(code, 0, 'the old release exits cleanly, for the service manager to start the new one');
});

/* ---------- The page's side ---------- */

/** Runs js/telemetry.js in a page of its own. `sent` collects what it posts. */
function page({ version = '1.0.0+abc1234', protocol = 'https:', navigator = {} } = {}) {
  const sent = [];
  const listeners = {};
  const window = {
    JK: { version },
    location: { protocol },
    innerWidth: 393,
    navigator: {
      sendBeacon: (url, blob) => {
        sent.push({ url, ...JSON.parse(blob.parts[0]) });
        return true;
      },
      ...navigator,
    },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    Blob: class { constructor(parts) { this.parts = parts; } },
    setTimeout,
  };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(readFileSync(CLIENT, 'utf8'), window, { filename: 'js/telemetry.js' });
  return { telemetry: window.JK.telemetry, sent, listeners };
}

test('the page posts what happened, with the build and nothing about the player', () => {
  const { telemetry, sent, listeners } = page();
  telemetry.track('game_started', { place: 'tea' });
  telemetry.visit({ stamps: 2, sound: true });
  assert.deepEqual(sent, [
    { url: '/api/beacon', type: 'game_started', rev: '1.0.0+abc1234', place: 'tea' },
    { url: '/api/beacon', type: 'visit', rev: '1.0.0+abc1234', stamps: 2, sound: true, width: 393, installed: false },
  ]);

  listeners.error({ message: 'Boom at https://kerinciku.web.id/js/main.js:3' });
  assert.deepEqual(sent[2], { url: '/api/beacon', type: 'error', rev: '1.0.0+abc1234', message: 'Boom at <url>' });

  for (let i = 0; i < 200; i++) telemetry.track('game_started', { place: 'tea' });
  assert.equal(sent.length, 60, 'a page gone wrong cannot flood the collector');
});

test('nothing is posted from a development build, over plain http, or when the browser says not to track', () => {
  for (const options of [
    { version: 'dev' },
    { protocol: 'http:' },
    { navigator: { doNotTrack: '1' } },
    { navigator: { globalPrivacyControl: true } },
  ]) {
    const { telemetry, sent, listeners } = page(options);
    telemetry.track('game_started', { place: 'tea' });
    telemetry.visit({ stamps: 0 });
    assert.equal(telemetry.on, false);
    assert.deepEqual(sent, [], JSON.stringify(options));
    assert.equal(listeners.error, undefined);
  }
});

test('a browser without sendBeacon, or one that throws, never breaks the game', () => {
  // No sendBeacon and no fetch in this page: the fallback throws, and is swallowed.
  const { telemetry } = page({ navigator: { sendBeacon: undefined } });
  assert.doesNotThrow(() => telemetry.track('visit', {}));
  const broken = page({ navigator: { sendBeacon: () => { throw new Error('no'); } } });
  assert.doesNotThrow(() => broken.telemetry.track('visit', {}));
});
