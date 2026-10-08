import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliConfig } from './site/build.ts';
const root = resolve(fileURLToPath(new URL('..', import.meta.url))), config = cliConfig();
const output = await realpath(resolve(root, config.outDir));
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (!['GET','HEAD'].includes(req.method ?? '')) { res.writeHead(405); res.end(); return; }
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith(config.basePath)) { res.writeHead(404); res.end('Not found'); return; }
    const decoded = decodeURIComponent(url.pathname.slice(config.basePath.length));
    if (decoded.includes('\\') || decoded.split('/').some(s => s.startsWith('.'))) throw new Error('Invalid path');
    let file = await realpath(resolve(output, decoded));
    const inside = relative(output, file);
    if (inside.startsWith('..') || isAbsolute(inside)) throw new Error('Outside output');
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' + url.search }); res.end(); return; }
      file = resolve(file, 'index.html');
    }
    const data = await readFile(file); res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }); res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
const port = Number(process.env.PORT ?? 4174);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Static preview: http://127.0.0.1:${port}${config.basePath}`));
