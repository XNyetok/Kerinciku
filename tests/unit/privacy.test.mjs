import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../scripts/check-privacy.sh', import.meta.url));

// The samples are assembled here so that this file does not itself contain
// anything the check would refuse.
const RUMAH = ['', 'Users', 'budi', 'proyek', 'catatan.txt'].join('/');
const RUMAH_LINUX = ['', 'home', 'siti', 'kerja'].join('/');
const SUREL = ['siti.aminah', 'kantor.co.id'].join('@');
const IP = [36, 85, 12, 7].join('.');
const TELEPON = '08' + '1234567890';
const NIK = '15' + '0'.repeat(13) + '1';

/** A throwaway repository with the check script in it. */
function repo(t) {
  const dir = mkdtempSync(join(tmpdir(), 'kerinciku-privacy-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => {
    const r = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout;
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Contoh');
  git('config', 'user.email', 'contoh@example.com');
  mkdirSync(join(dir, 'scripts'));
  cpSync(SCRIPT, join(dir, 'scripts/check-privacy.sh'));
  return {
    git,
    tulis(nama, isi) {
      mkdirSync(dirname(join(dir, nama)), { recursive: true });
      writeFileSync(join(dir, nama), isi);
      git('add', '-f', nama);
    },
    cek: (...args) => spawnSync('bash', ['scripts/check-privacy.sh', ...args], { cwd: dir, encoding: 'utf8' }),
  };
}

test('ordinary project files pass', (t) => {
  const r = repo(t);
  r.tulis('README.md', [
    'Hubungi debi@elysiumx.org atau orang@example.com.',
    'Server lokal: http://127.0.0.1:8765, jaringan rumah 192.168.1.10, contoh 203.0.113.9.',
    'Rilis 20261112000000-a1b2c3d, versi 1.65.0, checkout@3d3c42e5aac5ba805825da76410c181273ba90b1.',
    'Akun bot: 49699333+dependabot[bot]@users.noreply.github.com',
    '@media (max-height: 600px) { }',
  ].join('\n'));
  r.tulis('.env.example', 'API_URL=');
  const hasil = r.cek('--staged');
  assert.equal(hasil.status, 0, hasil.stderr);
});

for (const [nama, isi] of [
  ['a macOS home folder', `buka ${RUMAH}`],
  ['a Linux home folder', `cd ${RUMAH_LINUX}`],
  ['an e-mail address', `kirim ke ${SUREL} ya`],
  ['a public IP address', `ssh ke ${IP}`],
  ['a phone number', `WA ${TELEPON}`],
  ['a phone number with a country code', `WA +62${TELEPON.slice(1)}`],
  ['an identity number', `NIK ${NIK}`],
]) {
  test(`${nama} is refused, in the staged files and in every tracked file`, (t) => {
    const r = repo(t);
    r.tulis('docs/catatan.md', `baris pertama\n${isi}\n`);
    for (const mode of ['--staged', '--tracked']) {
      const hasil = r.cek(mode);
      assert.equal(hasil.status, 1, `${mode}: ${hasil.stdout}${hasil.stderr}`);
      assert.match(hasil.stderr, /docs\/catatan\.md:2: /);
    }
  });
}

test('a finding is reported without the text that matched, unless asked', (t) => {
  const r = repo(t);
  r.tulis('catatan.md', `kirim ke ${SUREL}\n`);
  const diam = r.cek('--staged');
  assert.ok(!diam.stderr.includes(SUREL) && !diam.stdout.includes(SUREL), 'the log repeats the leak');
  assert.match(diam.stderr, /catatan\.md:1: e-mail address/);
  assert.ok(r.cek('--staged', '--show').stderr.includes(SUREL));
});

test('an allowed address next to a private one does not excuse the line', (t) => {
  const r = repo(t);
  r.tulis('catatan.md', `debi@elysiumx.org, ${SUREL}\n`);
  assert.equal(r.cek('--staged').status, 1);
});

for (const nama of ['.env', 'config/.env.production', 'kunci/id_ed25519', 'server.pem', 'data.sqlite', '.npmrc', 'folder/.DS_Store', 'cadangan.sql', '.ssh/config', 'known_hosts']) {
  test(`a file named ${nama} is refused`, (t) => {
    const r = repo(t);
    r.tulis(nama, 'x\n');
    const hasil = r.cek('--staged');
    assert.equal(hasil.status, 1, hasil.stdout);
    assert.match(hasil.stderr, /must not be tracked/);
  });
}

test('a file over 2 MB is refused', (t) => {
  const r = repo(t);
  r.tulis('besar.txt', 'kata '.repeat(500_000));
  const hasil = r.cek('--staged');
  assert.equal(hasil.status, 1);
  assert.match(hasil.stderr, /larger than 2 MB/);
});

test('data deleted in a later commit is still found in the history', (t) => {
  const r = repo(t);
  r.tulis('catatan.md', `server ${IP}\n`);
  r.git('commit', '-q', '-m', 'add notes');
  r.tulis('catatan.md', 'server dirahasiakan\n');
  r.git('commit', '-q', '-m', 'remove the address');

  assert.equal(r.cek('--tracked').status, 0);
  const riwayat = r.cek('--history');
  assert.equal(riwayat.status, 1);
  assert.match(riwayat.stderr, /[0-9a-f]{7}:catatan\.md:1: public IP address/);
  assert.match(riwayat.stderr, /stays public until the history is rewritten/);
});

test('an unknown mode is a usage error, not a pass', (t) => {
  const r = repo(t);
  assert.equal(r.cek().status, 2);
  assert.equal(r.cek('--semua').status, 2);
});
