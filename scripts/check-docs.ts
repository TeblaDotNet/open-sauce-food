import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {parseRecipe,renderCompact} from '../src/index.ts';
const docs=['README.md','CORE.md','MODEL.md','SPEC.md','HTML-RENDERER.md','ROADMAP.md','CONTRIBUTING.md','CURATION.md','DATA-SOURCES.md','PRIOR-ART.md','docs/README.md','TERMINOLOGY.md','VOCABULARY-SCHEMA.md','IMPLEMENTATION-ISSUES.md','docs/visual-review/README.md'];
let links=0;const missing:string[]=[];
for(const p of docs){const text=readFileSync(p,'utf8').replace(/```[\s\S]*?```/g,'').replace(/`[^`\n]+`/g,'');
 for(const m of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)){const target=m[1].split('#')[0];if(!target||/^[a-z]+:/i.test(target))continue;links++;if(!existsSync(resolve(dirname(p),decodeURIComponent(target))))missing.push(p+': '+target);}}
assert.deepEqual(missing,[]);
const readme=readFileSync('README.md','utf8');const source=readme.match(/```opensauce\r?\n([\s\S]*?)```/)![1];const recipe=parseRecipe(source);assert.deepEqual(recipe.diagnostics,[]);
const expected=readme.match(/> Combine[^\n]+\n> Mix[^\n]+/)![0].replace(/^> /gm,'').replaceAll('\r','');assert.equal(renderCompact(recipe).split('Instructions:\n')[1].trim(),expected);
console.log(JSON.stringify({documents:docs.length,relativeLinks:links,missing,readmeCodeAndCompact:'passed'}));
