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

/**
 * A fake server: a site root and a collector root, each with a releases
 * folder. `curl` stands in for the collector's health answer: like the real
 * collector, it reports the release that `current` points at, unless that
 * release is listed in the file `broken`.
 */
function server() {
  const dir = mkdtempSync(join(tmpdir(), 'kerinciku-remote-'));
  const site = join(dir, 'www', 'site');
  const collector = join(dir, 'opt', 'stats');
  const bin = join(dir, 'bin');
  const broken = join(dir, 'broken');
  mkdirSync(join(site, 'releases'), { recursive: true });
  mkdirSync(join(collector, 'releases'), { recursive: true });
  mkdirSync(bin);
  writeFileSync(broken, '');
  writeFileSync(
    join(bin, 'curl'),
    `#!/usr/bin/env bash
release=$(cat "${collector}/current/RELEASE" 2>/dev/null) || exit 7
grep -qxF "$release" "${broken}" && exit 22
printf '{"ok":true,"release":"%s"}' "$release"
`,
  );
  chmodSync(join(bin, 'curl'), 0o755);
  if (MV === 'gmv') {
    writeFileSync(join(bin, 'mv'), '#!/usr/bin/env bash\nexec gmv "$@"\n');
    chmodSync(join(bin, 'mv'), 0o755);
  }
  let clock = Date.now() / 1000 - 1000;
  return {
    site,
    collector,
    /** Upload a release to both roots; `without` leaves one file out. Older calls get older timestamps. */
    upload(name, without) {
      const r = join(site, 'releases', name);
      mkdirSync(join(r, 'js'), { recursive: true });
      for (const f of ['index.html', 'sw.js', 'js/version.js']) if (f !== without) writeFileSync(join(r, f), name);
      const c = join(collector, 'releases', name);
      mkdirSync(join(c, 'panel'), { recursive: true });
      for (const f of ['index.mjs', 'store.mjs', 'panel/index.html', 'RELEASE']) if (f !== without) writeFileSync(join(c, f), name);
      clock += 10;
      utimesSync(r, clock, clock);
      utimesSync(c, clock, clock);
    },
    /** From now on the collector of this release does not come up. */
    breakCollector: (name) => writeFileSync(broken, `${name}\n`),
    run(...args) {
      return spawnSync('bash', [SCRIPT, ...args], {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, KERINCIKU_HEALTH_TRIES: '2', KERINCIKU_HEALTH_WAIT: '0' },
      });
    },
    link: (name, root = site) => (existsSync(join(root, name)) ? readlinkSync(join(root, name)) : null),
    releases: (root = site) => readdirSync(join(root, 'releases')).sort(),
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

  assert.equal(s.run('activate', s.site, s.collector, A).status, 0);
  assert.equal(s.link('current'), `releases/${A}`);
  assert.equal(s.link('previous'), null);

  const second = s.run('activate', s.site, s.collector, B);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(s.link('current'), `releases/${B}`);
  assert.equal(s.link('previous'), `releases/${A}`);
  assert.equal(s.link('current', s.collector), `releases/${B}`);
  assert.equal(s.link('previous', s.collector), `releases/${A}`);
});

test('a collector that does not come up stops the deploy: both go back to what was live', { skip }, (t) => {
  const s = server();
  t.after(s.cleanup);
  s.upload(A);
  s.upload(B);
  s.run('activate', s.site, s.collector, A);
  s.breakCollector(B);

  const r = s.run('activate', s.site, s.collector, B);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /failed its health check/);
  assert.match(r.stderr, /collector restored/);
  assert.equal(s.link('current'), `releases/${A}`, 'the site never moved');
  assert.equal(s.link('current', s.collector), `releases/${A}`);
});

test('an incomplete upload is refused and the live release stays', { skip }, (t) => {
  const s = server();
  t.after(s.cleanup);
  s.upload(A);
  s.run('activate', s.site, s.collector, A);

  for (const missing of ['index.html', 'sw.js', 'js/version.js', 'index.mjs', 'store.mjs', 'panel/index.html', 'RELEASE']) {
    s.upload(B, missing);
    const r = s.run('activate', s.site, s.collector, B);
    assert.notEqual(r.status, 0, missing);
    assert.match(r.stderr, /not uploaded completely/);
    assert.equal(s.link('current'), `releases/${A}`);
    assert.equal(s.link('current', s.collector), `releases/${A}`);
    rmSync(join(s.site, 'releases', B), { recursive: true });
    rmSync(join(s.collector, 'releases', B), { recursive: true });
  }
});

test('rollback swaps current and previous, and a second rollback undoes it', { skip }, (t) => {
  const s = server();
  t.after(s.cleanup);
  s.upload(A);
  s.upload(B);
  s.run('activate', s.site, s.collector, A);
  s.run('activate', s.site, s.collector, B);

  assert.equal(s.run('rollback', s.site, s.collector).status, 0);
  assert.equal(s.link('current'), `releases/${A}`);
  assert.equal(s.link('previous'), `releases/${B}`);
  assert.equal(s.link('current', s.collector), `releases/${A}`);

  assert.equal(s.run('rollback', s.site, s.collector).status, 0);
  assert.equal(s.link('current'), `releases/${B}`);
  assert.equal(s.link('previous'), `releases/${A}`);
});

test('rollback without a previous release refuses and changes nothing', { skip }, (t) => {
  const s = server();
  t.after(s.cleanup);
  s.upload(A);
  s.run('activate', s.site, s.collector, A);

  const r = s.run('rollback', s.site, s.collector);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /no previous release/);
  assert.equal(s.link('current'), `releases/${A}`);
});

test('pruning keeps five releases plus whatever current and previous point at', { skip }, (t) => {
  const s = server();
  t.after(s.cleanup);
  const names = Array.from({ length: 8 }, (_, i) => `2026111200000${i}-${String(i).repeat(7)}`);
  s.upload(names[0]);
  s.run('activate', s.site, s.collector, names[0]); // the oldest is live...
  for (const n of names.slice(1)) s.upload(n);
  const r = s.run('activate', s.site, s.collector, names[7]); // ...and becomes previous
  assert.equal(r.status, 0, r.stderr);

  assert.deepEqual(s.releases(), [names[0], ...names.slice(3)]);
  assert.deepEqual(s.releases(s.collector), [names[0], ...names.slice(3)]);
  assert.equal(s.link('previous'), `releases/${names[0]}`);
});

test('bad input is refused before anything moves', { skip }, (t) => {
  const s = server();
  t.after(s.cleanup);
  s.upload(A);

  for (const args of [
    ['activate', s.site, s.collector, '../../etc'],
    ['activate', s.site, s.collector, 'latest'],
    ['activate', 'relative/path', s.collector, A],
    ['activate', '/', s.collector, A],
    ['activate', s.site, 'relative/path', A],
    ['activate', `${s.site}/../site`, s.collector, A],
    ['activate', s.site, A],
    ['rollback'],
    ['rollback', s.site],
    ['destroy', s.site],
    [],
  ]) {
    assert.notEqual(s.run(...args).status, 0, args.join(' '));
  }
  assert.equal(s.link('current'), null);
  assert.deepEqual(s.releases(), [A]);
});
