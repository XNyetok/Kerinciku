import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const BUILD = fileURLToPath(new URL('../../scripts/build.mjs', import.meta.url));

function build(label, out = join(mkdtempSync(join(tmpdir(), 'kerinciku-build-')), 'dist')) {
  const env = { ...process.env };
  delete env.BUILD_LABEL;
  if (label !== undefined) env.BUILD_LABEL = label;
  const result = spawnSync(process.execPath, [BUILD, out], { env, encoding: 'utf8' });
  return { out, code: result.status, stderr: result.stderr };
}

/** Read VERSION and FILES out of a built service worker. */
function worker(out) {
  const self = { addEventListener() {}, location: { origin: 'http://x' } };
  const context = vm.createContext({ self });
  vm.runInContext(readFileSync(join(out, 'sw.js'), 'utf8'), context);
  return { version: context.VERSION, files: [...context.FILES], cache: context.CACHE, release: context.RELEASE };
}

test('a release build stamps its label into the page and the service worker', (t) => {
  const { out, code, stderr } = build('1.2.3+abc1234');
  t.after(() => rmSync(out, { recursive: true, force: true }));
  assert.equal(code, 0, stderr);

  assert.match(readFileSync(join(out, 'js/version.js'), 'utf8'), /JK\.version = "1\.2\.3\+abc1234";/);
  const sw = worker(out);
  assert.equal(sw.version, '1.2.3+abc1234');
  assert.equal(sw.cache, 'jelajah-kerinci-1.2.3+abc1234');
  assert.equal(sw.release, true);
});

test('the service worker caches every published file, and only those', (t) => {
  const { out } = build('1.0.0+abc1234');
  t.after(() => rmSync(out, { recursive: true, force: true }));
  const { files } = worker(out);

  assert.equal(files[0], './');
  for (const f of files.slice(1)) assert.ok(existsSync(join(out, f)), `${f} is cached but not published`);
  for (const required of ['index.html', 'css/style.css', 'js/main.js', 'js/game/mountain.js', 'manifest.webmanifest', 'icons/icon-192.png']) {
    assert.ok(files.includes(required), `${required} is not cached`);
  }
  assert.ok(!files.includes('sw.js'), 'the worker must not cache itself');
  assert.equal(new Set(files).size, files.length);
});

test('only the site is published: no repository files, no hidden files', (t) => {
  const { out } = build('1.0.0+abc1234');
  t.after(() => rmSync(out, { recursive: true, force: true }));
  assert.deepEqual(readdirSync(out).sort(), ['css', 'icons', 'index.html', 'js', 'manifest.webmanifest', 'sw.js']);
  const all = readdirSync(out, { recursive: true }).map(String);
  assert.deepEqual(all.filter((f) => f.split(/[\\/]/).some((b) => b.startsWith('.'))), []);
});

test('a build without a label stays in development mode', (t) => {
  const { out, code } = build(undefined);
  t.after(() => rmSync(out, { recursive: true, force: true }));
  assert.equal(code, 0);
  const sw = worker(out);
  assert.equal(sw.version, 'dev');
  assert.equal(sw.release, false);
  assert.deepEqual(sw.files, []);
});

test('a label that could break out of the stamp is refused', () => {
  for (const label of ['1.0.0"; alert(1); "', '../x', 'a b', '']) {
    if (label === '') continue; // an empty label means "dev"
    assert.notEqual(build(label).code, 0, label);
  }
});

test('the build refuses to empty the repository or its source folders', () => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  for (const target of [root, join(root, 'js'), join(root, 'scripts')]) {
    const { code, stderr } = build('1.0.0+abc1234', target);
    assert.notEqual(code, 0);
    assert.match(stderr, /refusing to build into/);
  }
  assert.ok(existsSync(join(root, 'js/main.js')));
});
