import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readlinkSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../deploy/remote.sh', import.meta.url));

/** The script relies on GNU `mv -T`. macOS has it only as `gmv` (coreutils). */
function gnuMv() {
  if (spawnSync('mv', ['--version']).status === 0) return 'mv';
  if (spawnSync('gmv', ['--version']).status === 0) return 'gmv';
  return null;
}
const MV = gnuMv();
const skip = MV ? false : 'needs GNU mv (coreutils)';

/** A fake server: one site root with a releases folder. */
function server() {
  const dir = mkdtempSync(join(tmpdir(), 'kerinciku-remote-'));
  const site = join(dir, 'www', 'site');
  const bin = join(dir, 'bin');
  mkdirSync(join(site, 'releases'), { recursive: true });
  mkdirSync(bin);
  if (MV === 'gmv') {
    writeFileSync(join(bin, 'mv'), '#!/usr/bin/env bash\nexec gmv "$@"\n');
    chmodSync(join(bin, 'mv'), 0o755);
  }
  let jam = Date.now() / 1000 - 1000;
  return {
    site,
    /** Upload a release; `tanpa` leaves one file out. Older calls get older timestamps. */
    unggah(nama, tanpa) {
      const r = join(site, 'releases', nama);
      mkdirSync(join(r, 'js'), { recursive: true });
      for (const f of ['index.html', 'sw.js', 'js/versi.js']) if (f !== tanpa) writeFileSync(join(r, f), nama);
      jam += 10;
      utimesSync(r, jam, jam);
    },
    jalan(...args) {
      return spawnSync('bash', [SCRIPT, ...args], {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
      });
    },
    tautan: (nama) => (existsSync(join(site, nama)) ? readlinkSync(join(site, nama)) : null),
    rilis: () => readdirSync(join(site, 'releases')).sort(),
    bersih: () => rmSync(dir, { recursive: true, force: true }),
  };
}

const A = '20261112000001-aaaaaaa';
const B = '20261112000002-bbbbbbb';

test('activate switches current and records the one before as previous', { skip }, (t) => {
  const s = server();
  t.after(s.bersih);
  s.unggah(A);
  s.unggah(B);

  assert.equal(s.jalan('activate', s.site, A).status, 0);
  assert.equal(s.tautan('current'), `releases/${A}`);
  assert.equal(s.tautan('previous'), null);

  const kedua = s.jalan('activate', s.site, B);
  assert.equal(kedua.status, 0, kedua.stderr);
  assert.equal(s.tautan('current'), `releases/${B}`);
  assert.equal(s.tautan('previous'), `releases/${A}`);
});

test('an incomplete upload is refused and the live release stays', { skip }, (t) => {
  const s = server();
  t.after(s.bersih);
  s.unggah(A);
  s.jalan('activate', s.site, A);

  for (const hilang of ['index.html', 'sw.js', 'js/versi.js']) {
    s.unggah(B, hilang);
    const r = s.jalan('activate', s.site, B);
    assert.notEqual(r.status, 0, hilang);
    assert.match(r.stderr, /not uploaded completely/);
    assert.equal(s.tautan('current'), `releases/${A}`);
    rmSync(join(s.site, 'releases', B), { recursive: true });
  }
});

test('rollback swaps current and previous, and a second rollback undoes it', { skip }, (t) => {
  const s = server();
  t.after(s.bersih);
  s.unggah(A);
  s.unggah(B);
  s.jalan('activate', s.site, A);
  s.jalan('activate', s.site, B);

  assert.equal(s.jalan('rollback', s.site).status, 0);
  assert.equal(s.tautan('current'), `releases/${A}`);
  assert.equal(s.tautan('previous'), `releases/${B}`);

  assert.equal(s.jalan('rollback', s.site).status, 0);
  assert.equal(s.tautan('current'), `releases/${B}`);
  assert.equal(s.tautan('previous'), `releases/${A}`);
});

test('rollback without a previous release refuses and changes nothing', { skip }, (t) => {
  const s = server();
  t.after(s.bersih);
  s.unggah(A);
  s.jalan('activate', s.site, A);

  const r = s.jalan('rollback', s.site);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /no previous release/);
  assert.equal(s.tautan('current'), `releases/${A}`);
});

test('pruning keeps five releases plus whatever current and previous point at', { skip }, (t) => {
  const s = server();
  t.after(s.bersih);
  const nama = Array.from({ length: 8 }, (_, i) => `2026111200000${i}-${String(i).repeat(7)}`);
  s.unggah(nama[0]);
  s.jalan('activate', s.site, nama[0]); // the oldest is live...
  for (const n of nama.slice(1)) s.unggah(n);
  const r = s.jalan('activate', s.site, nama[7]); // ...and becomes previous
  assert.equal(r.status, 0, r.stderr);

  assert.deepEqual(s.rilis(), [nama[0], ...nama.slice(3)]);
  assert.equal(s.tautan('previous'), `releases/${nama[0]}`);
});

test('bad input is refused before anything moves', { skip }, (t) => {
  const s = server();
  t.after(s.bersih);
  s.unggah(A);

  for (const args of [
    ['activate', s.site, '../../etc'],
    ['activate', s.site, 'latest'],
    ['activate', 'relative/path', A],
    ['activate', '/', A],
    ['activate', `${s.site}/../site`, A],
    ['activate', s.site],
    ['rollback'],
    ['destroy', s.site],
    [],
  ]) {
    assert.notEqual(s.jalan(...args).status, 0, args.join(' '));
  }
  assert.equal(s.tautan('current'), null);
  assert.deepEqual(s.rilis(), [A]);
});
