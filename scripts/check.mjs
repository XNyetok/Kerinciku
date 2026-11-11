// Static checks that need no browser: the files the page asks for exist, the
// scripts parse, every place on the map has its game, the interface text
// lives in one file, and nothing in the page would be blocked by the live
// site's Content-Security-Policy.
//
//   node scripts/check.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { CSP } from './site.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (f) => readFileSync(join(root, f), 'utf8');
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };

// 1. Every script parses.
const scripts = [
  'sw.js',
  ...readdirSync(join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`),
  ...readdirSync(join(root, 'js/game')).filter((f) => f.endsWith('.js')).map((f) => `js/game/${f}`),
];
for (const f of scripts) {
  try {
    new vm.Script(read(f), { filename: f });
  } catch (e) {
    errors.push(`${f}: ${e.message}`);
  }
}

// 2. index.html: local files exist, and nothing inline that the CSP would block.
const html = read('index.html');
const refs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
for (const r of refs) {
  if (/^(https?:)?\/\//.test(r)) errors.push(`index.html loads ${r} from another origin`);
  else check(existsSync(join(root, r)), `index.html refers to ${r}, which does not exist`);
}
check(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), 'index.html has an inline <script>');
check(!/<style[\s>]/i.test(html), 'index.html has an inline <style>');
check(!/\son[a-z]+\s*=/i.test(html), 'index.html has an inline event handler');
check(!/\sstyle\s*=/i.test(html), 'index.html has an inline style attribute');
for (const f of scripts) {
  // Markup built in JavaScript is parsed like any other markup: a style attribute in it is blocked too.
  check(!/style\s*=\s*\\?["']/.test(read(f)), `${f} builds markup with a style attribute; set it through el.style instead`);
  check(!/\bon[a-z]+\s*=\s*\\?["']/.test(read(f)), `${f} builds markup with an inline event handler`);
  check(!/\beval\s*\(|new Function\s*\(/.test(read(f)), `${f} uses eval or new Function`);
}
const loaded = refs.filter((r) => r.endsWith('.js'));
for (const f of scripts.filter((s) => s !== 'sw.js')) check(loaded.includes(f), `${f} is not loaded by index.html`);

// 3. The manifest is valid and its icons exist.
try {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  for (const icon of manifest.icons || []) check(existsSync(join(root, icon.src)), `manifest icon ${icon.src} does not exist`);
  check((manifest.icons || []).length > 0, 'manifest has no icons');
} catch (e) {
  errors.push(`manifest.webmanifest: ${e.message}`);
}

// 4. Every place on the map is complete and has its game.
const page = {};
page.window = page;
vm.createContext(page);
try {
  vm.runInContext(read('js/strings.js'), page, { filename: 'js/strings.js' });
  const { places, text } = page.JK;
  const ids = new Set();
  for (const l of places) {
    check(/^[a-z]+$/.test(l.id) && !ids.has(l.id), `place id "${l.id}" is not unique lowercase letters`);
    ids.add(l.id);
    for (const k of ['icon', 'color', 'short', 'place', 'title', 'how', 'fact']) {
      check(typeof l[k] === 'string' && l[k].trim() !== '', `place ${l.id}: "${k}" is empty`);
    }
    check(l.word && l.word.kerinci && l.word.meaning, `place ${l.id}: the Kerinci word or its meaning is missing`);
    check(l.x >= 30 && l.x <= 330 && l.y >= 40 && l.y <= 450, `place ${l.id}: the pin (${l.x}, ${l.y}) is off the map`);
    check(existsSync(join(root, `js/game/${l.id}.js`)), `place ${l.id} has no js/game/${l.id}.js`);
    check(typeof text.result[l.id] === 'function', `place ${l.id} has no result text in JK.text.result`);
    check(new RegExp(`\\b${l.icon}:`).test(read('js/art.js')), `place ${l.id}: icon "${l.icon}" is not drawn in js/art.js`);
  }
  check(places.filter((l) => l.final).length === 1, 'exactly one place must be the final one');
} catch (e) {
  errors.push(`js/strings.js: ${e.message}`);
}

// 5. Interface text lives in js/strings.js only, so it can be reviewed in one
//    place. A label written straight into a game would slip past that review.
for (const f of scripts.filter((s) => s !== 'js/strings.js')) {
  for (const m of read(f).matchAll(/aria-label\s*(?:=\s*\\?["']|',\s*')([^"'<>+]*[A-Za-z]{3}[^"'<>+]*)["']/g)) {
    check(false, `${f} spells out the label "${m[1]}"; put it in js/strings.js`);
  }
}

// 6. nginx sends the same policy the local server and the tests use.
const nginx = readdirSync(join(root, 'deploy/nginx')).filter((f) => f.endsWith('.conf'));
check(nginx.length > 0, 'deploy/nginx has no config');
for (const f of nginx) {
  const policies = [...read(`deploy/nginx/${f}`).matchAll(/add_header Content-Security-Policy "([^"]+)"/g)].map((m) => m[1]);
  check(policies.length > 0, `deploy/nginx/${f} sends no Content-Security-Policy`);
  for (const p of policies) {
    check(p.replace(/; upgrade-insecure-requests$/, '') === CSP, `deploy/nginx/${f}: the CSP differs from scripts/site.mjs`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `check: ${e}`).join('\n'));
  process.exit(1);
}
console.log(`check: ${scripts.length} scripts, ${refs.length} references, the places and the CSP are consistent`);
