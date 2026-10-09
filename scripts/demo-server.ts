import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { createReferencePage, ingredientCompatibilityRoutes, partAnchor, referencePath } from '../src/reference/index.ts';
import type { ReferenceKind } from '../src/reference/index.ts';
import { loadReferenceCorpus } from './reference-corpus.ts';

export const demoRecipes = [
  { id: 'butter-cake', name: 'Butter Cake', note: 'Explicit egg parts · retained original source' },
  { id: 'bread', name: 'Bread', note: 'Practical notes · retained original source' },
  { id: 'apple-pie', name: 'Apple Pie', note: 'Baking · overlapping & optional steps' },
  { id: 'tiramisu', name: 'Tiramisù', note: 'Ingredient parts · repeated layers' },
  { id: 'no-knead-bread', name: 'No-knead Bread', note: 'Ingredient choices · implicit results' },
  { id: 'ginger-garlic-broccoli', name: 'Broccoli with Ginger & Garlic', note: 'Alternatives · equivalent quantities' },
  { id: 'medieval-beef-soup', name: 'Medieval Beef Soup', note: 'Historical measures · free-text values' },
  { id: 'banana-bread', name: 'Banana Bread', note: 'Named choices · equipment alternatives' }
];
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types: Record<string, string> = { '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.opensauce': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

/** Read-only, loopback-only demo. Serve only demo assets, built modules, and promoted recipes. */
export async function createDemoServer() {
  const vocabulary = await loadVocabulary(root);
  const corpus = await loadReferenceCorpus(root, vocabulary);
  const realRoot = await realpath(root);
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: http:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    response.setHeader('Cache-Control', 'no-store');
    const send = (status: number, type: string, body: string | Buffer) => {
      response.writeHead(status, { 'Content-Type': type }); response.end(request.method === 'HEAD' ? undefined : body);
    };
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') { response.setHeader('Allow', 'GET, HEAD'); send(405, 'text/plain', 'Method not allowed'); return; }
      const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      if (path === '/api/recipes') { send(200, 'application/json', JSON.stringify(demoRecipes)); return; }
      if (path === '/api/vocabulary') { send(200, 'application/json', JSON.stringify(vocabulary.entries)); return; }
      if (path === '/api/corpus') { send(200, 'application/json', JSON.stringify(corpus.catalog)); return; }
      const reference = /^\/(api\/)?reference\/(ingredient|process|equipment)\/([^/]+)$/.exec(path);
      if (reference) {
        const retired = reference[2] === 'ingredient' && ingredientCompatibilityRoutes.find(r => r.from === reference[3]);
        if (retired) {
          response.setHeader('Location', (reference[1] ? '/api' : '') + referencePath('ingredient', retired.base) + '#' + partAnchor(retired.parts));
          send(308, 'text/plain', 'Moved to the parent ingredient part'); return;
        }
        const page = createReferencePage(vocabulary, reference[2] as ReferenceKind, reference[3], corpus.usage);
        if (!page) { send(404, 'text/plain', 'Unknown reference'); return; }
        if (reference[1]) { send(200, 'application/json', JSON.stringify(page)); return; }
      }
      const asset = path === '/' || reference ? '/demo/index.html' : path;
      const selectedRecipe = corpus.catalog.some(r => asset.startsWith(`/examples/public-domain-recipes/${r.id}/`));
      const allowed = ['/demo/index.html', '/demo/app.js', '/demo/style.css', '/demo/theme-init.js', '/demo/dark-mode.js', '/demo/fonts/manrope.woff2', '/demo/fonts/fira-code.woff2', '/SPEC.md'].includes(asset) ||
        (asset.startsWith('/dist/') && extname(asset) === '.js') || (selectedRecipe && ['.opensauce', '.webp', '.jpg', '.jpeg', '.png'].includes(extname(asset)));
      if (!allowed || asset.includes('\\') || asset.includes('\0')) { send(404, 'text/plain', 'Not found'); return; }
      const full = await realpath(resolve(root, '.' + asset));
      const within = relative(realRoot, full);
      if (isAbsolute(within) || within.startsWith('..') || !(await stat(full)).isFile()) { send(404, 'text/plain', 'Not found'); return; }
      send(200, types[extname(full)] ?? 'application/octet-stream', await readFile(full));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      send(error instanceof URIError ? 400 : code === 'ENOENT' || code === 'ENOTDIR' ? 404 : 500, 'text/plain', 'Unable to serve this resource');
    }
  });
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  const server = await createDemoServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Open Sauce Food demo: http://127.0.0.1:${port}/ (Ctrl+C to stop)`));
}
