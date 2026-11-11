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
const HOME = ['', 'Users', 'budi', 'project', 'notes.txt'].join('/');
const HOME_LINUX = ['', 'home', 'siti', 'work'].join('/');
const EMAIL = ['siti.aminah', 'kantor.co.id'].join('@');
const IP = [36, 85, 12, 7].join('.');
const PHONE = '08' + '1234567890';
const ID_NUMBER = '15' + '0'.repeat(13) + '1';

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
  git('config', 'user.name', 'Example');
  git('config', 'user.email', 'someone@example.com');
  mkdirSync(join(dir, 'scripts'));
  cpSync(SCRIPT, join(dir, 'scripts/check-privacy.sh'));
  return {
    git,
    write(name, body) {
      mkdirSync(dirname(join(dir, name)), { recursive: true });
      writeFileSync(join(dir, name), body);
      git('add', '-f', name);
    },
    check: (...args) => spawnSync('bash', ['scripts/check-privacy.sh', ...args], { cwd: dir, encoding: 'utf8' }),
  };
}

test('ordinary project files pass', (t) => {
  const r = repo(t);
  r.write('README.md', [
    'Write to debi@elysiumx.org or someone@example.com.',
    'Local server: http://127.0.0.1:8765, home network 192.168.1.10, example 203.0.113.9.',
    'Release 20261112000000-a1b2c3d, version 1.65.0, checkout@3d3c42e5aac5ba805825da76410c181273ba90b1.',
    'A bot account: 49699333+dependabot[bot]@users.noreply.github.com',
    '@media (max-height: 600px) { }',
  ].join('\n'));
  r.write('.env.example', 'API_URL=');
  const result = r.check('--staged');
  assert.equal(result.status, 0, result.stderr);
});

for (const [what, line] of [
  ['a macOS home folder', `open ${HOME}`],
  ['a Linux home folder', `cd ${HOME_LINUX}`],
  ['an e-mail address', `send it to ${EMAIL} please`],
  ['a public IP address', `ssh to ${IP}`],
  ['a phone number', `call ${PHONE}`],
  ['a phone number with a country code', `call +62${PHONE.slice(1)}`],
  ['an identity number', `identity number ${ID_NUMBER}`],
]) {
  test(`${what} is refused, in the staged files and in every tracked file`, (t) => {
    const r = repo(t);
    r.write('docs/notes.md', `first line\n${line}\n`);
    for (const mode of ['--staged', '--tracked']) {
      const result = r.check(mode);
      assert.equal(result.status, 1, `${mode}: ${result.stdout}${result.stderr}`);
      assert.match(result.stderr, /docs\/notes\.md:2: /);
    }
  });
}

test('a finding is reported without the text that matched, unless asked', (t) => {
  const r = repo(t);
  r.write('notes.md', `send it to ${EMAIL}\n`);
  const quiet = r.check('--staged');
  assert.ok(!quiet.stderr.includes(EMAIL) && !quiet.stdout.includes(EMAIL), 'the log repeats the leak');
  assert.match(quiet.stderr, /notes\.md:1: e-mail address/);
  assert.ok(r.check('--staged', '--show').stderr.includes(EMAIL));
});

test('an allowed address next to a private one does not excuse the line', (t) => {
  const r = repo(t);
  r.write('notes.md', `debi@elysiumx.org, ${EMAIL}\n`);
  assert.equal(r.check('--staged').status, 1);
});

for (const name of ['.env', 'config/.env.production', 'keys/id_ed25519', 'server.pem', 'data.sqlite', '.npmrc', 'folder/.DS_Store', 'backup.sql', '.ssh/config', 'known_hosts']) {
  test(`a file named ${name} is refused`, (t) => {
    const r = repo(t);
    r.write(name, 'x\n');
    const result = r.check('--staged');
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /must not be tracked/);
  });
}

test('a file over 2 MB is refused', (t) => {
  const r = repo(t);
  r.write('large.txt', 'word '.repeat(500_000));
  const result = r.check('--staged');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /larger than 2 MB/);
});

test('data deleted in a later commit is still found in the history', (t) => {
  const r = repo(t);
  r.write('notes.md', `server ${IP}\n`);
  r.git('commit', '-q', '-m', 'add notes');
  r.write('notes.md', 'server withheld\n');
  r.git('commit', '-q', '-m', 'remove the address');

  assert.equal(r.check('--tracked').status, 0);
  const history = r.check('--history');
  assert.equal(history.status, 1);
  assert.match(history.stderr, /[0-9a-f]{7}:notes\.md:1: public IP address/);
  assert.match(history.stderr, /stays public until the history is rewritten/);
});

test('an unknown mode is a usage error, not a pass', (t) => {
  const r = repo(t);
  assert.equal(r.check().status, 2);
  assert.equal(r.check('--everything').status, 2);
});
