/** Public source-tree checks; --pristine also forbids Git, dependencies and build output. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parseRecipe, renderCompact } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';

const root = resolve('.');
const exclusions = JSON.parse(readFileSync('release-exclusions.json', 'utf8')).records.map((r: any) => r.slug) as string[];
const files: string[] = [];
function walk(dir: string) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (['.git','node_modules','dist','site-dist','hosting-work'].includes(e.name)) {
        assert.ok(!process.argv.includes('--pristine'), `Generated/private directory: ${p}`);
        continue;
      }
      assert.ok(!['work','History','.codex','.agents'].includes(e.name), `Private directory: ${p}`);
      walk(p);
    } else {
      assert.ok(!e.isSymbolicLink(), `Symlink: ${p}`);
      assert.ok(!/\.(zip|7z|tar|gz|log)$/i.test(p), `Archive/log: ${p}`);
      files.push(p.replace(/^\.\//,''));
    }
  }
}
walk('.');
for (const slug of exclusions) {
  for (const dir of ['examples','source']) assert.ok(!existsSync(`${dir}/public-domain-recipes/${slug}`));
}
const promoted = files.filter(f => f.startsWith('examples/public-domain-recipes/') && f.endsWith('.opensauce'));
assert.equal(promoted.length, 410);
const vocabulary = await loadVocabulary('.');
assert.equal(vocabulary.entries.length, 721);
let links = 0, authoredDocs = 0;
const missing: string[] = [];
for (const f of files) {
  if (!/\.(md|json|yaml|yml|ts|js|html|css|opensauce|txt)$/.test(f)) continue;
  const text = readFileSync(f,'utf8');
  assert.ok(!/[A-Z]:[\\/](?:Users|Projects)[\\/]/.test(text), `Machine path: ${f}`);
  assert.ok(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}/.test(text), `Credential pattern: ${f}`);
  if (f !== 'release-exclusions.json') assert.ok(!exclusions.some(slug => text.includes(slug)), `Excluded identifier outside compact record: ${f}`);
  // Imported Markdown has upstream-root URLs and relative references; preserve it verbatim.
  if (!f.endsWith('.md') || f.startsWith('source/') || f.startsWith('examples/') || f.startsWith('demo/fonts/')) continue;
  authoredDocs++;
  const prose = text.replace(/```[\s\S]*?```/g,'').replace(/`[^`\n]+`/g,'');
  for (const m of prose.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target=m[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    links++;
    const dest=resolve(dirname(f),decodeURIComponent(target));
    if (!dest.startsWith(root) || !existsSync(dest)) missing.push(`${f}: ${target}`);
  }
}
assert.deepEqual(missing,[]);
for (const p of ['LICENSE','LICENSING.md','LICENSES/MIT.txt','LICENSES/GPL-2.0-or-later.txt','LICENSES/CC-BY-4.0.txt','LICENSES/CC0-1.0.txt','demo/fonts/Manrope-OFL.txt','demo/fonts/Fira-Code-OFL.txt','source/public-domain-recipes/UPSTREAM-LICENSE.md']) assert.ok(existsSync(p),p);
for (const slug of ['kombucha','naan-bread','pretzels']) assert.equal(JSON.parse(readFileSync(`source/public-domain-recipes/${slug}/author.json`,'utf8')).email,undefined);
const readme=readFileSync('README.md','utf8');
const example=readme.match(/```opensauce\r?\n([\s\S]*?)```/)![1];
const recipe=parseRecipe(example);
assert.deepEqual(recipe.diagnostics,[]);
const quoted=readme.match(/> Combine[^\n]+\n> Mix[^\n]+/)![0].replace(/^> /gm,'').replaceAll('\r','');
assert.equal(renderCompact(recipe).split('Instructions:\n')[1].trim(),quoted);
console.log(JSON.stringify({publicRecipes:promoted.length,vocabulary:vocabulary.entries.length,authoredDocs,relativeLinks:links,missing,readmeExample:'passed',exclusions:'passed',notices:'present'},null,2));
