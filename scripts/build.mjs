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
import { BATAS_UKURAN, SITUS } from './situs.mjs';

const akar = resolve(fileURLToPath(new URL('..', import.meta.url)));
const keluar = resolve(process.argv[2] || join(akar, 'dist'));
const label = process.env.BUILD_LABEL || 'dev';

function gagal(pesan) {
  console.error(`build: ${pesan}`);
  process.exit(1);
}

if (!/^[0-9A-Za-z.+-]{1,60}$/.test(label)) gagal(`bad BUILD_LABEL: ${label}`);
// The output folder is emptied first, so it must not be the repository or anything in it but dist/.
const dalam = keluar.startsWith(akar + sep) ? relative(akar, keluar).split(sep)[0] : null;
if (keluar === akar || akar.startsWith(keluar + sep) || (dalam !== null && dalam !== 'dist')) {
  gagal(`refusing to build into ${keluar}`);
}

rmSync(keluar, { recursive: true, force: true });
mkdirSync(keluar, { recursive: true });
for (const nama of SITUS) {
  if (!existsSync(join(akar, nama))) gagal(`${nama} is missing`);
  // Hidden files (.DS_Store and the like) are never published.
  cpSync(join(akar, nama), join(keluar, nama), { recursive: true, filter: (src) => !basename(src).startsWith('.') });
}

function semuaBerkas(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? semuaBerkas(join(dir, e.name)) : [join(dir, e.name)],
  );
}

/** Replace exactly one occurrence, or stop: a stamp that silently misses is worse than no build. */
function cap(berkas, dari, jadi) {
  const jalur = join(keluar, berkas);
  const isi = readFileSync(jalur, 'utf8');
  if (isi.split(dari).length !== 2) gagal(`${berkas}: expected exactly one "${dari}"`);
  writeFileSync(jalur, isi.replace(dari, () => jadi));
}

const berkas = semuaBerkas(keluar).map((f) => relative(keluar, f).split(sep).join('/')).sort();
const simpanan = ['./', ...berkas.filter((f) => f !== 'sw.js')];

cap('js/versi.js', "JK.versi = 'dev';", `JK.versi = ${JSON.stringify(label)};`);
if (label !== 'dev') {
  cap('sw.js', "var VERSI = 'dev';", `var VERSI = ${JSON.stringify(label)};`);
  cap('sw.js', 'var BERKAS = [];', `var BERKAS = ${JSON.stringify(simpanan)};`);
}

const ukuran = semuaBerkas(keluar).reduce((n, f) => n + statSync(f).size, 0);
console.log(`build: ${label}, ${berkas.length} files, ${(ukuran / 1024).toFixed(1)} KB -> ${relative(akar, keluar) || keluar}`);
if (ukuran > BATAS_UKURAN) gagal(`the site is ${ukuran} bytes, over the ${BATAS_UKURAN} byte budget`);
