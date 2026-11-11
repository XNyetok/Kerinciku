// Static checks that need no browser: the files the page asks for exist, the
// scripts parse, every place on the map has its game, and nothing in the page
// would be blocked by the live site's Content-Security-Policy.
//
//   node scripts/check.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { CSP } from './situs.mjs';

const akar = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baca = (f) => readFileSync(join(akar, f), 'utf8');
const galat = [];
const cek = (syarat, pesan) => { if (!syarat) galat.push(pesan); };

// 1. Every script parses.
const skrip = [
  'sw.js',
  ...readdirSync(join(akar, 'js')).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`),
  ...readdirSync(join(akar, 'js/game')).filter((f) => f.endsWith('.js')).map((f) => `js/game/${f}`),
];
for (const f of skrip) {
  try {
    new vm.Script(baca(f), { filename: f });
  } catch (e) {
    galat.push(`${f}: ${e.message}`);
  }
}

// 2. index.html: local files exist, and nothing inline that the CSP would block.
const html = baca('index.html');
const rujukan = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
for (const r of rujukan) {
  if (/^(https?:)?\/\//.test(r)) galat.push(`index.html loads ${r} from another origin`);
  else cek(existsSync(join(akar, r)), `index.html refers to ${r}, which does not exist`);
}
cek(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), 'index.html has an inline <script>');
cek(!/<style[\s>]/i.test(html), 'index.html has an inline <style>');
cek(!/\son[a-z]+\s*=/i.test(html), 'index.html has an inline event handler');
cek(!/\sstyle\s*=/i.test(html), 'index.html has an inline style attribute');
for (const f of skrip) {
  // Markup built in JavaScript is parsed like any other markup: a style attribute in it is blocked too.
  cek(!/style\s*=\s*\\?["']/.test(baca(f)), `${f} builds markup with a style attribute; set it through el.style instead`);
  cek(!/\bon[a-z]+\s*=\s*\\?["']/.test(baca(f)), `${f} builds markup with an inline event handler`);
  cek(!/\beval\s*\(|new Function\s*\(/.test(baca(f)), `${f} uses eval or new Function`);
}
const dimuat = rujukan.filter((r) => r.endsWith('.js'));
for (const f of skrip.filter((s) => s !== 'sw.js')) cek(dimuat.includes(f), `${f} is not loaded by index.html`);

// 3. The manifest is valid and its icons exist.
try {
  const manifest = JSON.parse(baca('manifest.webmanifest'));
  for (const ikon of manifest.icons || []) cek(existsSync(join(akar, ikon.src)), `manifest icon ${ikon.src} does not exist`);
  cek((manifest.icons || []).length > 0, 'manifest has no icons');
} catch (e) {
  galat.push(`manifest.webmanifest: ${e.message}`);
}

// 4. Every place on the map is complete and has its game.
const jendela = {};
jendela.window = jendela;
vm.createContext(jendela);
try {
  vm.runInContext(baca('js/teks.js'), jendela, { filename: 'js/teks.js' });
  const { lokasi, teks } = jendela.JK;
  const id = new Set();
  for (const l of lokasi) {
    cek(/^[a-z]+$/.test(l.id) && !id.has(l.id), `place id "${l.id}" is not unique lowercase letters`);
    id.add(l.id);
    for (const k of ['ikon', 'warna', 'pendek', 'tempat', 'nama', 'cara', 'fakta']) {
      cek(typeof l[k] === 'string' && l[k].trim() !== '', `place ${l.id}: "${k}" is empty`);
    }
    cek(l.kata && l.kata.kerinci && l.kata.arti, `place ${l.id}: the Kerinci word or its meaning is missing`);
    cek(l.x >= 30 && l.x <= 330 && l.y >= 40 && l.y <= 450, `place ${l.id}: the pin (${l.x}, ${l.y}) is off the map`);
    cek(existsSync(join(akar, `js/game/${l.id}.js`)), `place ${l.id} has no js/game/${l.id}.js`);
    cek(typeof teks.hasil[l.id] === 'function', `place ${l.id} has no result text in teks.hasil`);
    cek(new RegExp(`\\b${l.ikon}:`).test(baca('js/seni.js')), `place ${l.id}: icon "${l.ikon}" is not drawn in js/seni.js`);
  }
  cek(lokasi.filter((l) => l.akhir).length === 1, 'exactly one place must be the final one (akhir)');
} catch (e) {
  galat.push(`js/teks.js: ${e.message}`);
}

// 5. nginx sends the same policy the local server and the tests use.
const nginx = readdirSync(join(akar, 'deploy/nginx')).filter((f) => f.endsWith('.conf'));
cek(nginx.length > 0, 'deploy/nginx has no config');
for (const f of nginx) {
  const kebijakan = [...baca(`deploy/nginx/${f}`).matchAll(/add_header Content-Security-Policy "([^"]+)"/g)].map((m) => m[1]);
  cek(kebijakan.length > 0, `deploy/nginx/${f} sends no Content-Security-Policy`);
  for (const k of kebijakan) {
    cek(k.replace(/; upgrade-insecure-requests$/, '') === CSP, `deploy/nginx/${f}: the CSP differs from scripts/situs.mjs`);
  }
}

if (galat.length) {
  console.error(galat.map((g) => `check: ${g}`).join('\n'));
  process.exit(1);
}
console.log(`check: ${skrip.length} scripts, ${rujukan.length} references, the places and the CSP are consistent`);
