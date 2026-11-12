// Copies the site into dist/ and stamps the release into it. There is no
// bundling: the files are published as they are in the repository.
//
//   node scripts/build.mjs [outDir]
//
// BUILD_LABEL names the build ("1.2.0+a1b2c3d" in a release). Without it the
// build is labelled "dev" and the service worker stays in development mode.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUDIO_BUDGET, SITE_FILES, SIZE_BUDGET } from './site.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = resolve(process.argv[2] || join(root, 'dist'));
const label = process.env.BUILD_LABEL || 'dev';

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(1);
}

if (!/^[0-9A-Za-z.+-]{1,60}$/.test(label)) fail(`bad BUILD_LABEL: ${label}`);
// The output folder is emptied first, so it must not be the repository or anything in it but dist/.
const inside = out.startsWith(root + sep) ? relative(root, out).split(sep)[0] : null;
if (out === root || root.startsWith(out + sep) || (inside !== null && inside !== 'dist')) {
  fail(`refusing to build into ${out}`);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const name of SITE_FILES) {
  if (!existsSync(join(root, name))) fail(`${name} is missing`);
  // Hidden files (.DS_Store and the like) are never published.
  cpSync(join(root, name), join(out, name), { recursive: true, filter: (src) => !basename(src).startsWith('.') });
}

function allFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? allFiles(join(dir, e.name)) : [join(dir, e.name)],
  );
}

/** Replace exactly one occurrence, or stop: a stamp that silently misses is worse than no build. */
function stamp(file, from, to) {
  const path = join(out, file);
  const text = readFileSync(path, 'utf8');
  if (text.split(from).length !== 2) fail(`${file}: expected exactly one "${from}"`);
  writeFileSync(path, text.replace(from, () => to));
}

const files = allFiles(out).map((f) => relative(out, f).split(sep).join('/')).sort();
const isAudio = (f) => f.startsWith('audio/');
const cached = ['./', ...files.filter((f) => f !== 'sw.js' && !isAudio(f))];
const audio = files.filter(isAudio);

stamp('js/version.js', "JK.version = 'dev';", `JK.version = ${JSON.stringify(label)};`);
if (label !== 'dev') {
  stamp('sw.js', "var VERSION = 'dev';", `var VERSION = ${JSON.stringify(label)};`);
  stamp('sw.js', 'var FILES = [];', `var FILES = ${JSON.stringify(cached)};`);
  stamp('sw.js', 'var AUDIO = [];', `var AUDIO = ${JSON.stringify(audio)};`);
}

const bytes = (list) => list.reduce((n, f) => n + statSync(join(out, f)).size, 0);
const size = bytes(files.filter((f) => !isAudio(f)));
const audioSize = bytes(audio);
const kb = (n) => (n / 1024).toFixed(1);
console.log(`build: ${label}, ${files.length} files, ${kb(size)} KB + ${kb(audioSize)} KB of sound -> ${relative(root, out) || out}`);
if (size > SIZE_BUDGET) fail(`the site without its sounds is ${size} bytes, over the ${SIZE_BUDGET} byte budget`);
if (audioSize > AUDIO_BUDGET) fail(`the sounds are ${audioSize} bytes, over the ${AUDIO_BUDGET} byte budget`);
