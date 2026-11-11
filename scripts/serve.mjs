// A small static server for playing and testing locally. It serves only the
// published files (scripts/situs.mjs) and sends the live site's security
// headers, so what works here works behind nginx.
//
//   node scripts/serve.mjs [dir] [--port 8765]
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEPALA, SITUS } from './situs.mjs';

const args = process.argv.slice(2);
const iPort = args.indexOf('--port');
const port = iPort >= 0 ? Number(args.splice(iPort, 2)[1]) : 8765;
const akar = resolve(args[0] || fileURLToPath(new URL('..', import.meta.url)));

const JENIS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

function jawab(res, kode, isi) {
  res.writeHead(kode, { ...KEPALA, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(isi);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return jawab(res, 405, 'method not allowed');
  let jalur;
  try {
    jalur = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    return jawab(res, 400, 'bad request');
  }
  if (jalur.endsWith('/')) jalur += 'index.html';
  const bagian = normalize(jalur).split(sep).filter(Boolean);
  const berkas = join(akar, ...bagian);
  // Only the published files, never the rest of the folder (.git, tests, notes).
  const terbit = bagian.length > 0 && SITUS.includes(bagian[0]) && !bagian.some((b) => b.startsWith('.'));
  if (!terbit || !berkas.startsWith(akar + sep) || !existsSync(berkas) || !statSync(berkas).isFile()) {
    return jawab(res, 404, 'not found');
  }
  res.writeHead(200, {
    ...KEPALA,
    'Content-Type': JENIS[extname(berkas)] || 'application/octet-stream',
    'Content-Length': statSync(berkas).size,
    'Cache-Control': 'no-cache',
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(berkas).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Jelajah Kerinci: http://127.0.0.1:${port}  (${akar})`);
});
