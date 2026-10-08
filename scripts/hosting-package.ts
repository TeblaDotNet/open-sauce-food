import { readFile, readdir, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = resolve('.');
const release = process.argv[2] ?? 'local-rehearsal';
if (!/^[a-z0-9][a-z0-9-]*$/.test(release)) throw new Error('Use a simple release identifier.');
const destination = join(root, 'hosting-work', release);
await mkdir(join(root, 'hosting-work'), { recursive: true });
await mkdir(destination); // Never overwrite an existing package.
const owned = JSON.parse(await readFile('site-dist/.site-output.json', 'utf8')) as { hashes: Record<string, string> };
const sha = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
const entries: { path: string; bytes: number; sha256: string }[] = [];
for (const path of Object.keys(owned.hashes).sort()) {
  if (!path.endsWith('.html') && !path.startsWith('assets/')) continue;
  if (path.includes('..') || path.includes('\\') || path.startsWith('/')) throw new Error('Unsafe artifact path');
  const data = await readFile(join('site-dist', path));
  if (sha(data) !== owned.hashes[path]) throw new Error(`Generated artifact was modified: ${path}`);
  const target = join(destination, 'web', path); await mkdir(dirname(target), { recursive: true }); await writeFile(target, data);
  entries.push({ path, bytes: data.length, sha256: sha(data) });
}
for (const [source, path] of [['hosting/opensaucefood.htaccess','.htaccess'],['hosting/404.html','404.html']]) {
  const data = await readFile(source); await copyFile(source, join(destination, 'web', path)); entries.push({ path, bytes: data.length, sha256: sha(data) });
}
const sourceFiles = execFileSync('git', ['ls-files','--cached','--others','--exclude-standard','-z'], { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, sha(await readFile(path))])));
const dirty = execFileSync('git', ['status','--porcelain'], { encoding: 'utf8' }).trim().length > 0;
const manifest = { release, purpose: 'hosting rehearsal; not production authorization', destinationUrl: 'https://tebla.net/opensaucefood/', sourceCommit: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), sourceDirty: dirty, sourceFingerprint: sha(JSON.stringify(sourceHashes)), sourceHashes, fileCount: entries.length, bytes: entries.reduce((n,e)=>n+e.bytes,0), entries };
await writeFile(join(destination,'release-manifest.json'), JSON.stringify(manifest,null,2)+'\n');
await writeFile(join(destination,'SHA256SUMS'), entries.map(e=>`${e.sha256}  ${e.path}`).join('\n')+'\n');
console.log(JSON.stringify({ release, fileCount: manifest.fileCount, bytes: manifest.bytes, sourceCommit: manifest.sourceCommit, sourceDirty: dirty, sourceFingerprint: manifest.sourceFingerprint, directory: destination },null,2));
