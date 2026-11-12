// A small static server for playing and testing locally. It serves only the
// published files (scripts/site.mjs) and sends the live site's security
// headers, so what works here works behind nginx.
//
//   node scripts/serve.mjs [dir] [--port 8765]
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEADERS, SITE_FILES } from './site.mjs';

const args = process.argv.slice(2);
const portAt = args.indexOf('--port');
const port = portAt >= 0 ? Number(args.splice(portAt, 2)[1]) : 8765;
const root = resolve(args[0] || fileURLToPath(new URL('..', import.meta.url)));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json',
};

function answer(res, code, body) {
  res.writeHead(code, { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return answer(res, 405, 'method not allowed');
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    return answer(res, 400, 'bad request');
  }
  if (path.endsWith('/')) path += 'index.html';
  const parts = normalize(path).split(sep).filter(Boolean);
  const file = join(root, ...parts);
  // Only the published files, never the rest of the folder (.git, tests, notes).
  const published = parts.length > 0 && SITE_FILES.includes(parts[0]) && !parts.some((p) => p.startsWith('.'));
  if (!published || !file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
    return answer(res, 404, 'not found');
  }
  res.writeHead(200, {
    ...HEADERS,
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Content-Length': statSync(file).size,
    'Cache-Control': 'no-cache',
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Jelajah Kerinci: http://127.0.0.1:${port}  (${root})`);
});
