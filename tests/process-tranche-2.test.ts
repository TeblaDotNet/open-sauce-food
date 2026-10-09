import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Vocabulary,parseRecipe,semanticTokens,renderHtml,createReferencePage,buildUsageIndex} from '../src/index.ts';
import type {Node,Recipe,Token} from '../src/index.ts';
import {loadVocabulary} from '../src/vocabulary/node.ts';
import {recipeFiles} from '../scripts/corpus.ts';
import {processTranche2,restoreProcessTranche2} from './helpers/process-tranche-2.ts';
const vocabulary=await loadVocabulary('.');
const demoted='adjust assemble bottle brush check clean combine discard distribute divide drizzle dust empty fill flip garnish grease halve keep keep-warm reduce-heat rinse sprinkle taste turn-off-heat'.split(' ');
const retained='drain line preheat rub shape spread submerge'.split(' ');
const added={'pan-fry':'pan-fry',microwave:'microwave','dry-roast':'dry roast','steam-dry':'steam dry','sun-dry':'sun dry',age:'age'};
const visit=(ns:Node[]):Token[]=>ns.flatMap(n=>[...(n.kind==='statement'?semanticTokens(n.tokens):[]),...('children'in n?visit(n.children):[]),...(n.kind==='group'&&n.condition?visit([n.condition]):[])]);
const tokens=(r:Recipe)=>[...visit(r.preamble),...r.sections.flatMap(s=>visit(s.children))];
const referenceUrl=(t:{canonicalId:string})=>'/processes/'+t.canonicalId+'/';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');

test('25 approved actions retain canonical IDs and semantic styling but no links/pages/backlinks',()=>{
 assert.equal(demoted.length,25);
 for(const id of demoted){
  const entry=vocabulary.entries.find(e=>e.kind==='process'&&e.id===id)!;
  for(const name of [entry.names.en,...(entry.aliases??[]).map(a=>typeof a==='string'?a:a.name)]){
   const r=parseRecipe('::instructions\n<'+name+'>',{vocabulary});const t=tokens(r).find(t=>t.kind==='process')!;
   assert.equal(t.canonicalId,id);assert.equal(t.reference,false);
   const html=renderHtml(r,{syntaxSpans:true,referenceUrl});assert.match(html,/os-syntax-process/);assert.doesNotMatch(html,/<a\b/);
   assert.equal(createReferencePage(vocabulary,'process',id),undefined);
   assert.deepEqual(Object.keys(buildUsageIndex([{id:'one',name:'one',recipe:r}]).concepts),[]);
  }
 }
});
test('retained boundaries and six new technique names resolve uniquely and link; unknown stays legal',()=>{
 for(const [id,name]of [...retained.map(id=>[id,id]),...Object.entries(added),['reduce','reduce']]){
  assert.deepEqual(vocabulary.resolve(name,'process').map(e=>e.id),[id]);
  const source='::instructions\r\n<'+name+', carefully>',r=parseRecipe(source,{vocabulary});const t=tokens(r).find(t=>t.kind==='process')!;
  assert.equal(t.name,name);assert.equal(source.slice(t.span.start,t.span.end),t.raw);
  assert.ok(createReferencePage(vocabulary,'process',id));const html=renderHtml(r,{syntaxSpans:true,referenceUrl});assert.match(html,/os-syntax-process/);assert.ok(html.includes('href="/processes/'+id+'/"'));
 }
 const r=parseRecipe('::instructions\n<local-unregistered-action>',{vocabulary});assert.ok(!r.diagnostics.some(d=>d.severity==='error'));
 const html=renderHtml(r,{syntaxSpans:true,referenceUrl});assert.match(html,/os-syntax-process/);assert.doesNotMatch(html,/<a\b/);
});

test('all 410 recipes retain exact baseline bytes except three registered heads; AST fields change only as allowed',async()=>{
 const before=new Vocabulary(vocabulary.entries.filter(e=>!(e.kind==='process'&&e.id in added)).map(e=>{const copy={...e};if(e.kind==='process'&&demoted.includes(e.id))delete copy.reference;return copy;}));
 const files=await recipeFiles('examples/public-domain-recipes');assert.equal(files.length,410);
 let changed=0;const resolved:string[]=[],reduction:string[]=[];
 for(const file of files){
  const slug=file.replaceAll('\\','/').split('/').at(-2)!;const source=await readFile(file,'utf8'),original=restoreProcessTranche2(source,slug);
  assert.equal(sha(original),processTranche2.recipeHashes[slug],slug);
  if(original!==source){changed++;assert.equal(sha(source),processTranche2.migrations[slug].afterSha256);}
  const current=parseRecipe(source,{vocabulary}),baseline=parseRecipe(original,{vocabulary:before});
  assert.deepEqual(current.sections.filter(s=>s.originalSource).map(s=>s.originalSource!.text),baseline.sections.filter(s=>s.originalSource).map(s=>s.originalSource!.text));
  // First prove vocabulary changes on identical source; all locations/text are compared intact.
  const sameSource=parseRecipe(source,{vocabulary:before});const ct=tokens(current),bt=tokens(sameSource);
  for(let i=0;i<ct.length;i++){
   const t=ct[i],b=bt[i];if(t.kind!=='process')continue;
   if(t.canonicalId!==b.canonicalId){assert.equal(b.canonicalId,undefined);assert.ok(t.canonicalId! in added);resolved.push(slug+':'+t.name);delete t.canonicalId;}
   if(t.reference!==b.reference){assert.ok(demoted.includes(t.canonicalId!));assert.equal(t.reference,false);assert.equal(b.reference,undefined);delete t.reference;}
  }
  assert.deepEqual(current,sameSource,file);
  // Then project only the approved head insertion and its five-character location shift back.
  const migration=processTranche2.migrations[slug];
  if(migration){
   const start=original.indexOf(migration.beforeLine)+migration.beforeLine.indexOf('<reduce')+7;
   const correction=tokens(current).find(t=>t.kind==='process'&&t.span.line===migration.line)!;
   assert.equal(correction.canonicalId,'reduce-heat');assert.equal(correction.name,'reduce heat');
   correction.name='reduce';correction.raw=correction.raw.replace('<reduce heat','<reduce');correction.canonicalId='reduce';
   const visited=new WeakSet<object>();
   const rebase=(o:any):void=>{if(!o||typeof o!=='object'||visited.has(o))return;visited.add(o);if(typeof o.start==='number'&&typeof o.end==='number'&&typeof o.line==='number'){
    if(o.line===migration.line&&o.start>=start+5)o.column-=5;
    if(o.start>=start+5)o.start-=5;if(o.end>=start+5)o.end-=5;
   }for(const v of Object.values(o))rebase(v);};rebase(current);current.source=original;
  }
  assert.deepEqual(current,baseline,slug+': only head correction and positional rebasing');
  for(const t of tokens(parseRecipe(source,{vocabulary})))if(t.kind==='process'&&t.canonicalId==='reduce')reduction.push(slug+':'+t.span.line);
 }
 assert.equal(changed,3);
 assert.deepEqual(resolved,['breakfast-wrap:microwave','cheese:age','colcannon-bake:steam dry','garam-masala:sun dry','garam-masala:dry roast','turkish-style-spiced-chicken:pan-fry']);
 assert.deepEqual(reduction,['apple-pie:82','ginger-garlic-broccoli:52','hoisin-pork-belly:61','spicy-sausage-pasta:51','spicy-sausage-pasta:53']);
});

test('historical adapter rejects unrelated edits in migrated recipes',async()=>{
 const source=await readFile('examples/public-domain-recipes/roesti/roesti.opensauce','utf8');
 assert.throws(()=>restoreProcessTranche2(source+'\n','roesti'),/unapproved/);
});
