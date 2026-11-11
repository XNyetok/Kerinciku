import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const BUILD = fileURLToPath(new URL('../../scripts/build.mjs', import.meta.url));

function build(label, keluar = join(mkdtempSync(join(tmpdir(), 'kerinciku-build-')), 'dist')) {
  const env = { ...process.env };
  delete env.BUILD_LABEL;
  if (label !== undefined) env.BUILD_LABEL = label;
  const hasil = spawnSync(process.execPath, [BUILD, keluar], { env, encoding: 'utf8' });
  return { keluar, kode: hasil.status, galat: hasil.stderr };
}

/** Read VERSI and BERKAS out of a built service worker. */
function pekerja(keluar) {
  const diri = { addEventListener() {}, location: { origin: 'http://x' } };
  const konteks = vm.createContext({ self: diri });
  vm.runInContext(readFileSync(join(keluar, 'sw.js'), 'utf8'), konteks);
  return { versi: konteks.VERSI, berkas: [...konteks.BERKAS], nama: konteks.NAMA, rilis: konteks.RILIS };
}

test('a release build stamps its label into the page and the service worker', (t) => {
  const { keluar, kode, galat } = build('1.2.3+abc1234');
  t.after(() => rmSync(keluar, { recursive: true, force: true }));
  assert.equal(kode, 0, galat);

  assert.match(readFileSync(join(keluar, 'js/versi.js'), 'utf8'), /JK\.versi = "1\.2\.3\+abc1234";/);
  const sw = pekerja(keluar);
  assert.equal(sw.versi, '1.2.3+abc1234');
  assert.equal(sw.nama, 'jelajah-kerinci-1.2.3+abc1234');
  assert.equal(sw.rilis, true);
});

test('the service worker caches every published file, and only those', (t) => {
  const { keluar } = build('1.0.0+abc1234');
  t.after(() => rmSync(keluar, { recursive: true, force: true }));
  const { berkas } = pekerja(keluar);

  assert.equal(berkas[0], './');
  for (const f of berkas.slice(1)) assert.ok(existsSync(join(keluar, f)), `${f} is cached but not published`);
  for (const wajib of ['index.html', 'css/style.css', 'js/main.js', 'js/game/gunung.js', 'manifest.webmanifest', 'icons/icon-192.png']) {
    assert.ok(berkas.includes(wajib), `${wajib} is not cached`);
  }
  assert.ok(!berkas.includes('sw.js'), 'the worker must not cache itself');
  assert.equal(new Set(berkas).size, berkas.length);
});

test('only the site is published: no repository files, no hidden files', (t) => {
  const { keluar } = build('1.0.0+abc1234');
  t.after(() => rmSync(keluar, { recursive: true, force: true }));
  assert.deepEqual(readdirSync(keluar).sort(), ['css', 'icons', 'index.html', 'js', 'manifest.webmanifest', 'sw.js']);
  const semua = readdirSync(keluar, { recursive: true }).map(String);
  assert.deepEqual(semua.filter((f) => f.split(/[\\/]/).some((b) => b.startsWith('.'))), []);
});

test('a build without a label stays in development mode', (t) => {
  const { keluar, kode } = build(undefined);
  t.after(() => rmSync(keluar, { recursive: true, force: true }));
  assert.equal(kode, 0);
  const sw = pekerja(keluar);
  assert.equal(sw.versi, 'dev');
  assert.equal(sw.rilis, false);
  assert.deepEqual(sw.berkas, []);
});

test('a label that could break out of the stamp is refused', () => {
  for (const label of ['1.0.0"; alert(1); "', '../x', 'a b', '']) {
    if (label === '') continue; // an empty label means "dev"
    assert.notEqual(build(label).kode, 0, label);
  }
});

test('the build refuses to empty the repository or its source folders', () => {
  const akar = fileURLToPath(new URL('../..', import.meta.url));
  for (const sasaran of [akar, join(akar, 'js'), join(akar, 'scripts')]) {
    const { kode, galat } = build('1.0.0+abc1234', sasaran);
    assert.notEqual(kode, 0);
    assert.match(galat, /refusing to build into/);
  }
  assert.ok(existsSync(join(akar, 'js/main.js')));
});
