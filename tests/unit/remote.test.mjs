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
  let clock = Date.now() / 1000 - 1000;
  return {
    site,
    /** Upload a release; `without` leaves one file out. Older calls get older timestamps. */
    upload(name, without) {
      const r = join(site, 'releases', name);
      mkdirSync(join(r, 'js'), { recursive: true });
      for (const f of ['index.html', 'sw.js', 'js/version.js']) if (f !== without) writeFileSync(join(r, f), name);
      clock += 10;
      utimesSync(r, clock, clock);
    },
    run(...args) {
      return spawnSync('bash', [SCRIPT, ...args], {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
      });
    },
    link: (name) => (existsSync(join(site, name)) ? readlinkSync(join(site, name)) : null),
    releases: () => readdirSync(join(site, 'releases')).sort(),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

const A = '20261112000001-aaaaaaa';
const B = '20261112000002-bbbbbbb';

test('activate switches current and records the one before as previous', { skip }, (t) => {
  const s = server();
  t.after(s.cleanup);
  s.upload(A);
  s.upload(B);

  assert.equal(s.run('activate', s.site, A).status, 0);
  assert.equal(s.link('current'), `releases/${A}`);
  assert.equal(s.link('previous'), null);

  const second = s.run('activate', s.site, B);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(s.link('current'), `releases/${B}`);
  assert.equal(s.link('previous'), `releases/${A}`);
});

test('an incomplete upload is refused and the live release stays', { skip }, (t) => {
  const s = server();
  t.after(s.cleanup);
  s.upload(A);
  s.run('activate', s.site, A);

  for (const missing of ['index.html', 'sw.js', 'js/version.js']) {
    s.upload(B, missing);
    const r = s.run('activate', s.site, B);
    assert.notEqual(r.status, 0, missing);
    assert.match(r.stderr, /not uploaded completely/);
    assert.equal(s.link('current'), `releases/${A}`);
    rmSync(join(s.site, 'releases', B), { recursive: true });
  }
});

test('rollback swaps current and previous, and a second rollback undoes it', { skip }, (t) => {
  const s = server();
  t.after(s.cleanup);
  s.upload(A);
  s.upload(B);
  s.run('activate', s.site, A);
  s.run('activate', s.site, B);

  assert.equal(s.run('rollback', s.site).status, 0);
  assert.equal(s.link('current'), `releases/${A}`);
  assert.equal(s.link('previous'), `releases/${B}`);

  assert.equal(s.run('rollback', s.site).status, 0);
  assert.equal(s.link('current'), `releases/${B}`);
  assert.equal(s.link('previous'), `releases/${A}`);
});

test('rollback without a previous release refuses and changes nothing', { skip }, (t) => {
  const s = server();
  t.after(s.cleanup);
  s.upload(A);
  s.run('activate', s.site, A);

  const r = s.run('rollback', s.site);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /no previous release/);
  assert.equal(s.link('current'), `releases/${A}`);
});

test('pruning keeps five releases plus whatever current and previous point at', { skip }, (t) => {
  const s = server();
  t.after(s.cleanup);
  const names = Array.from({ length: 8 }, (_, i) => `2026111200000${i}-${String(i).repeat(7)}`);
  s.upload(names[0]);
  s.run('activate', s.site, names[0]); // the oldest is live...
  for (const n of names.slice(1)) s.upload(n);
  const r = s.run('activate', s.site, names[7]); // ...and becomes previous
  assert.equal(r.status, 0, r.stderr);

  assert.deepEqual(s.releases(), [names[0], ...names.slice(3)]);
  assert.equal(s.link('previous'), `releases/${names[0]}`);
});

test('bad input is refused before anything moves', { skip }, (t) => {
  const s = server();
  t.after(s.cleanup);
  s.upload(A);

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
    assert.notEqual(s.run(...args).status, 0, args.join(' '));
  }
  assert.equal(s.link('current'), null);
  assert.deepEqual(s.releases(), [A]);
});
