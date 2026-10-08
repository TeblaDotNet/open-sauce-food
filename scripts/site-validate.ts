import { readFile, readdir } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { cliConfig, generateSite } from './site/build.ts';
import { validateFiles } from './site/validate.ts';
const root = resolve(fileURLToPath(new URL('..', import.meta.url))), config = cliConfig();
const output = resolve(root, config.outDir), files = new Map<string, Buffer>();
async function walk(dir: string) { for (const entry of await readdir(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isSymbolicLink()) throw new Error('Symlink in site output'); if (entry.isDirectory()) await walk(path); else if (entry.name !== '.site-output.json') files.set(relative(output, path).replaceAll('\\', '/'), await readFile(path)); } }
await walk(output);
const expected = await generateSite(root, config);
assert.deepEqual([...files.keys()].sort(), [...expected.files.keys()].sort(), 'Unexpected or missing output files');
for (const [path, data] of expected.files) assert.ok(files.get(path)!.equals(Buffer.from(data)), `Output differs from current source: ${path}`);
console.log(JSON.stringify(validateFiles(files, expected.manifest), null, 2));
