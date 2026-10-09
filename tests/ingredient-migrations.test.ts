import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {Vocabulary, parseRecipe, semanticTokens, renderCode, renderHtml, recipeReferenceUrl, buildUsageIndex, createReferencePage} from '../src/index.ts';
import type {Node, Token, VocabularyEntry} from '../src/index.ts';
import {loadVocabulary} from '../src/vocabulary/node.ts';
import {recipeFiles} from '../scripts/corpus.ts';
import {restoreIngredientMigrations} from './helpers/ingredient-migrations.ts';
const vocabulary = await loadVocabulary('.');
const ledger = JSON.parse(await readFile('ingredient-migration-decisions.json','utf8'));
const tokens = (nodes: readonly Node[]): Token[] => nodes.flatMap(n => n.kind === 'statement' ? [...semanticTokens(n.tokens), ...tokens(n.children)] : n.kind === 'group' ? [...(n.condition ? tokens([n.condition]) : []), ...tokens(n.children)] : []);
const things = (r: ReturnType<typeof parseRecipe>) => r.sections.filter(s=>!s.originalSource).flatMap(s=>tokens(s.children)).filter(t=>t.kind==='thing');
const parse = (text: string) => parseRecipe('::recipe\nname: Migration test\n'+text,{vocabulary});

for (const form of ['lemon: juice','lemon: juice, fresh','lemon: juice, bottled','lemon: juice, freshly squeezed','lemon juice','lemon juice, strained','lemon-juice']) test(`lemon product identity preserves ${form}`,()=>{
  const source=`::ingredients\n(${form}) 1tbsp\n`;
  const r=parse(source),t=things(r)[0];
  assert.equal(t.canonicalId,'lemon');
  assert.deepEqual(t.partResolution,{ids:['juice'],complete:true});
  assert.equal(t.raw,`(${form})`);
  assert.ok(renderCode(r).includes(`(${form})`));
  assert.match(renderHtml(r,{referenceUrl:recipeReferenceUrl}),/href="\/reference\/ingredient\/lemon#part-juice"/);
  if(form.includes(','))assert.deepEqual(t.qualifiers,[form.split(', ')[1]]);
});

for(const [decl,ref] of [['lemon juice','lemon: juice'],['lemon: juice','lemon juice'],['lemon','lemon juice'],['flour; self-raising','self-rising flour'],['self raising flour','flour; self raising'],['flour; self-raising','flour'],['flour','flour; self-raising']]) test(`local compatibility ${decl} -> ${ref}`,()=>{
  const r=parse(`::ingredients\n(${decl})\n::instructions\n(${ref}) <mix>`),ts=things(r);
  assert.deepEqual(r.diagnostics,[]);
  assert.equal(ts[1].thingKind,'ingredient'); assert.ok(ts[1].declarationIds?.length);
  assert.equal(ts[1].canonicalId,decl.startsWith('lemon')?'lemon':'self-raising-flour');
});

test('local compatibility does not equate whole fruit, sibling parts, plain flour or different types',()=>{
  for(const [decl,ref] of [['lemon juice','lemon'],['lemon juice','lemon: peel'],['lemon: peel','lemon juice'],['flour; self-raising','flour; plain'],['flour','self-raising flour']]) {
    const r=parse(`::ingredients\n(${decl})\n::instructions\n(${ref}) <mix>`);
    assert.ok(r.diagnostics.some(d=>d.code==='UNRESOLVED_REFERENCE'),`${decl} -> ${ref}`);
  }
  const r=parse('::ingredients\n(lemon juice, fresh)\n(lemon: juice, bottled)\n::instructions\n(lemon-juice)');
  assert.equal(things(r).at(-1)?.thingKind,'ambiguous');
});

test('self-raising spellings and authored variants map to an independent child',()=>{
  for(const form of ['self-raising flour','self raising flour','self-rising flour','flour; self-raising','flour; self raising']){
    const r=parse(`::ingredients\n(${form}, sifted) 200g`),t=things(r)[0];
    assert.equal(t.canonicalId,'self-raising-flour');assert.deepEqual(t.qualifiers,['sifted']);
    assert.ok(renderCode(r).includes(`(${form}, sifted)`));
    assert.deepEqual(vocabulary.resolveIngredient(t.name!,t.variant,t.parts).map(t=>t.entry.id),['self-raising-flour']);
  }
  // Comma qualifiers are deliberately not reinterpreted as types or states.
  assert.equal(things(parse('::ingredients\n(flour, self-raising)'))[0].canonicalId,'flour');
  assert.equal(createReferencePage(vocabulary,'ingredient','self-raising-flour')?.typeOf?.id,'flour');
  assert.ok(createReferencePage(vocabulary,'ingredient','flour')?.types?.some(t=>t.id==='self-raising-flour'));
  assert.equal(createReferencePage(vocabulary,'ingredient','lemon-juice'),undefined);
  assert.deepEqual(vocabulary.resolve('lemon juice','ingredient'),[]);
});

test('lexical and variant targets validate at the data boundary and survive JSON',()=>{
  const base={id:'base',kind:'ingredient',names:{en:'base'}} as const;
  for(const extra of [
    {parts:{juice:{names:{en:'juice'},lexical_names:[]}}},
    {parts:{juice:{names:{en:'juice'},lexical_names:['base']}}},
    {parts:{juice:{names:{en:'juice'},lexical_names:['compound']},peel:{names:{en:'peel'},lexical_names:['compound']}}},
    {variants:{special:{names:{en:'special'},canonical_id:'missing'}}},
  ])assert.throws(()=>new Vocabulary([{...base,...extra} as VocabularyEntry]),/lexical_names|canonical_id/);
  assert.throws(()=>new Vocabulary([{...base,variants:{special:{names:{en:'special'},canonical_id:'child'}}},{id:'child',kind:'ingredient',names:{en:'child'}}]),/direct family child/);
  const copy=new Vocabulary(JSON.parse(JSON.stringify(vocabulary.entries)));
  assert.deepEqual(copy.resolveIngredient('lemon juice')[0].parts,['juice']);
  assert.equal(copy.resolveIngredient('flour','self raising')[0].entry.id,'self-raising-flour');
});

test('corpus backlinks merge lemon part uses and keep self-raising usage child-specific',async()=>{
  const corpus=[];
  for(const file of await recipeFiles('examples/public-domain-recipes'))corpus.push({id:file.replaceAll('\\','/').split('/').at(-2)!,name:file,recipe:parseRecipe(await readFile(file,'utf8'),{vocabulary})});
  const usage=buildUsageIndex(corpus),lemon=createReferencePage(vocabulary,'ingredient','lemon',usage)!;
  const juice=lemon.parts.find(p=>p.id==='juice')!;
  for(const id of ['apple-pie','hummus','red-lentil-dahl'])assert.ok(juice.usage!.some(r=>r.id===id));
  assert.equal(new Set(juice.usage!.map(r=>r.id)).size,juice.usage!.length);
  const child=createReferencePage(vocabulary,'ingredient','self-raising-flour',usage)!;
  assert.deepEqual(child.usage!.map(r=>r.id).sort(),['butter-cake','damper']);
  const flour=createReferencePage(vocabulary,'ingredient','flour',usage)!;
  assert.ok(!flour.usage!.some(r=>r.id==='butter-cake'));
  // Damper separately declares ordinary flour for the work surface.
  assert.deepEqual(flour.usage!.find(r=>r.id==='damper')!.forms,[{parts:[]}]);
  for(const r of corpus)assert.equal(r.recipe.diagnostics.filter(d=>d.code==='AMBIGUOUS_VOCABULARY'||d.severity==='error').length,0,r.id);
});

test('only approved annotations change across all recipes; original payloads and Damper non-migration bytes stay protected',async()=>{
  const entries=structuredClone(vocabulary.entries).filter(e=>e.id!=='self-raising-flour');
  delete entries.find(e=>e.id==='flour'&&e.kind==='ingredient')!.variants!['self-raising'].canonical_id;
  delete entries.find(e=>e.id==='lemon'&&e.kind==='ingredient')!.parts!.juice.lexical_names;
  entries.push(ledger.retired[0].entry);
  const beforeVocabulary=new Vocabulary(entries);
  for(const file of await recipeFiles('examples/public-domain-recipes')){
    const source=await readFile(file,'utf8'),after=parseRecipe(source,{vocabulary}),before=parseRecipe(source,{vocabulary:beforeVocabulary});
    const allowed=new Set(things(after).filter(t=>t.canonicalId==='self-raising-flour'||['lemon juice','lemon-juice'].includes(t.name!)).map(t=>t.span.start));
    const withoutMigration=(r:unknown)=>JSON.parse(JSON.stringify(r),(_k,v)=>{if(v?.kind==='thing'&&allowed.has(v.span.start)){delete v.canonicalId;delete v.partResolution;}return v;});
    assert.deepEqual(withoutMigration(after),withoutMigration(before),file);
    if(file.includes('damper')){
      const restored=restoreIngredientMigrations(source,file);
      assert.deepEqual(parseRecipe(restored).sections.filter(s=>s.originalSource).map(s=>s.originalSource!.text),after.sections.filter(s=>s.originalSource).map(s=>s.originalSource!.text));
      assert.throws(()=>restoreIngredientMigrations(source.replace('4cups','5cups'),file));
    }
  }
  for(const name of ['seasoning','sweetener','heat seasoning','frying fat'])assert.deepEqual(vocabulary.resolveIngredient(name),[]);
});

test('competing local variant names do not silently prefer a promoted target',()=>{
  const v=new Vocabulary([{id:'base',kind:'ingredient',names:{en:'base'},variants:{one:{names:{en:'shared'},canonical_id:'child'},two:{names:{en:'shared'}}}},{id:'child',kind:'ingredient',type_of:'base',names:{en:'child'}}]);
  assert.equal(v.resolveIngredient('base','shared').length,2);
  const r=parseRecipe('::ingredients\n(base; shared)',{vocabulary:v});
  assert.ok(r.diagnostics.some(d=>d.code==='AMBIGUOUS_VOCABULARY'));
});
