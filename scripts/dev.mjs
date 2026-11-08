import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const portFlag = process.argv.indexOf('--port');
const port = Number(process.env.PORT || (portFlag >= 0 ? process.argv[portFlag + 1] : 3000));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.geojson': 'application/geo+json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };

const server = http.createServer(async (req, res) => {
  try {
    const forwardedProto = req.headers['x-forwarded-proto']?.split(',')[0]?.trim();
    const protocol = forwardedProto === 'https' ? 'https' : 'http';
    const url = new URL(req.url, `${protocol}://${req.headers.host || `localhost:${port}`}`);
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/api/guide' || pathname === '/api/guide/status') {
      const entry = pathname.endsWith('/status') ? '../api/guide/status.js' : '../api/guide.js';
      const handler = (await import(entry)).default;
      const options = { method: req.method, headers: req.headers };
      if (!['GET', 'HEAD'].includes(req.method)) {
        options.body = Readable.toWeb(req);
        options.duplex = 'half';
      }
      const response = await handler.fetch(new Request(url, options));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
    }
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const target = path.resolve(publicDir, relative);
    if (!target.startsWith(publicDir) || relative.split('/').some(part => part.startsWith('.'))) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const file = await stat(target).catch(() => null);
    if (!file?.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(target));
  } catch {
    if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('요청을 처리할 수 없습니다.');
  }
});
server.listen(port, '0.0.0.0', () => console.log(`Local: http://localhost:${port}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
