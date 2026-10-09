import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecipe,renderCode,renderCompact,renderHtml,semanticTokens,Vocabulary} from '../src/index.ts';
import type {Statement,Token} from '../src/index.ts';
import {loadVocabulary} from '../src/vocabulary/node.ts';
import {auditConversion} from '../src/conversion-quality.ts';
const vocabulary=await loadVocabulary('.');
const line='{ravioli} <cook, 1-2m, in (water, boiling) + (salt)> ?= they float to the top';
const prefix='::recipe\nname: Context\n::ingredients\n(water)\n(salt)\n(oil)\n(onion)\n::equipment\n(plastic wrap)\n(pan)\n::instructions\n';
const source=prefix+line+'\n{dough} <cover, with (plastic wrap)>\n(onion) <fry, in (pan) + (oil)>\n';
const recipe=parseRecipe(source,{vocabulary});
const nodes=recipe.sections.at(-1)!.children as Statement[];
const process=(n:Statement)=>n.tokens.find(t=>t.kind==='process')!;

test('structured process context keeps qualified things, plus, normal resolution and exact spans',()=>{
  const p=process(nodes[0]);
  assert.deepEqual(p.parameters,['1-2m','in (water, boiling) + (salt)']);
  const nested=p.parameterParts![1].tokens;
  const things=nested.filter(t=>t.kind==='thing');
  assert.deepEqual(things.map(t=>[t.name,t.canonicalId,t.thingKind]),[['water','water','ingredient'],['salt','salt','ingredient']]);
  assert.deepEqual(things[0].qualifiers,['boiling']);
  assert.ok(things.every(t=>t.declarationIds?.length===1));
  assert.equal(nested.filter(t=>t.kind==='operator')[0].raw,'+');
  for(const ending of ['\n','\r\n','\r']) {
    const input=source.replaceAll('\n',ending),r=parseRecipe(input,{vocabulary});
    const ns=r.sections.at(-1)!.children as Statement[];
    for(const n of ns) for(const t of semanticTokens(n.tokens)) {
      assert.equal(input.slice(t.span.start,t.span.end),t.raw);
      const lines=input.slice(0,t.span.start).split(/\r\n|\r|\n/);
      assert.equal(t.span.line,lines.length);assert.equal(t.span.column,lines.at(-1)!.length+1);
      for(const param of t.parameterParts??[]) {
        assert.equal(input.slice(param.span.start,param.span.end),param.raw);
        assert.equal(param.tokens.map(t=>t.raw).join(''),param.raw);
      }
    }
  }
});

test('Code retains authored context and quantity/judgement attach to the enclosing action',()=>{
  assert.equal(renderCode(recipe),source);
  assert.equal(renderCode(parseRecipe(renderCode(recipe),{vocabulary})),source);
  assert.deepEqual(nodes[0].tokens.find(t=>t.kind==='judgement')!.judgement!.processSpan,process(nodes[0]).span);
  assert.equal(nodes[0].quantities!.length,1);
  assert.equal(nodes[0].quantities![0].raw,'1-2m');
  const q=nodes[0].quantities![0];assert.equal(source.slice(q.span.start,q.span.end),'1-2m');
  const masked=parseRecipe(prefix+'{x} <cook, ~12m, with (00 flour)>\n',{vocabulary});
  assert.deepEqual((masked.sections.at(-1)!.children[0] as Statement).quantities!.map(q=>q.raw),['~12m']);
});

test('Compact renders required context examples naturally and preserves hook token identity',()=>{
  const compact=renderCompact(recipe);
  for(const text of ['Cook the ravioli for 1–2 minutes in boiling water with salt, until they float to the top.','Cover the dough with plastic wrap.','Fry the onion in the pan with oil.'])assert.ok(compact.includes(text),text);
  const seen:Token[]=[];
  renderCompact(recipe,{formatTerm:t=>{seen.push(t);return t.name??t.raw;}});
  assert.ok(seen.includes(process(nodes[0]).parameterParts![1].tokens.find(t=>t.name==='water')!));
  assert.ok(renderCompact(recipe,{formatValue:value=>'CUSTOM '+value}).includes('CUSTOM in (water, boiling) + (salt)'));
});

for(const view of ['code','compact'] as const)test('HTML '+view+' keeps sibling links, safe escaping and optional syntax spans',()=>{
  const before=JSON.stringify(recipe),seen:Token[]=[];
  const render=(syntaxSpans:boolean)=>renderHtml(recipe,{view,syntaxSpans,referenceUrl:r=>{seen.push(r.token);return '/'+r.kind+'/'+r.canonicalId;}});
  const html=render(true),plain=render(false);
  const instructionHtml=html.slice(html.indexOf('data-section="instructions"'));
  for(const id of ['water','salt','pan','oil'])assert.ok(instructionHtml.includes('data-canonical-id="'+id+'"'));
  assert.ok(seen.includes(process(nodes[0])));
  let depth=0;for(const tag of html.matchAll(/<\/?a\b[^>]*>/g)){if(tag[0].startsWith('</'))depth--;else {assert.equal(depth,0);depth++;}}assert.equal(depth,0);
  assert.ok(!plain.includes('os-syntax-'));
  if(view==='code'){assert.ok(html.includes('os-syntax-ingredient'));assert.ok(html.includes('os-syntax-value'));}
  const visible=(s:string)=>s.replace(/<[^>]+>/g,'');assert.equal(visible(html),visible(plain));
  assert.equal(JSON.stringify(recipe),before);
  const hostile=parseRecipe('::instructions\n{x} <cook, with (oil & "bad")>\n');
  assert.ok(renderHtml(hostile,{view}).includes('&amp;'));
  const unsafe=renderHtml(recipe,{view,referenceUrl:()=> 'javascript:alert(1)'});assert.ok(!unsafe.includes('href="javascript:'));
});

test('unknown and ambiguous nested things retain normal vocabulary-independent semantics',()=>{
  const s='::recipe\nname: Unknown\n::ingredients\n(mystery)\n(salt, fine)\n(salt, coarse)\n::instructions\n{x} <cook, with (mystery) + (salt) + (unlisted)>\n';
  for(const v of [undefined,vocabulary]){
    const r=parseRecipe(s,{vocabulary:v}),p=process(r.sections.at(-1)!.children[0] as Statement);
    const things=p.parameterParts![0].tokens.filter(t=>t.kind==='thing');
    assert.deepEqual(things.map(t=>t.thingKind),['ingredient','ambiguous','unresolved']);
    assert.equal(things[0].canonicalId,undefined);assert.equal(things[2].canonicalId,undefined);
    assert.ok(!r.diagnostics.some(d=>d.severity==='error'));
    assert.equal(renderCode(r),s);
  }
});

test('nested things share variant/part grammar and canonical resolution',()=>{
  const v=new Vocabulary([{id:'lemon',kind:'ingredient',names:{en:'lemon'},parts:{zest:{names:{en:'zest'}}}}]);
  const r=parseRecipe('::ingredients\n(lemon)\n::instructions\n{x} <mix, with (lemon; fresh: zest, grated)>\n',{vocabulary:v});
  const t=process(r.sections.at(-1)!.children[0] as Statement).parameterParts![0].tokens.find(t=>t.kind==='thing')!;
  assert.equal(t.variant,'fresh');assert.deepEqual(t.parts,['zest']);assert.deepEqual(t.qualifiers,['grated']);assert.equal(t.canonicalId,'lemon');assert.equal(t.partResolution!.complete,true);
});

test('legacy parameters and incidental parenthetical prose stay opaque',()=>{
  for(const raw of ['<cook, medium heat, 12m>','<bake, 180c, ~25m>','<heat, packet instructions>','<roll, thinly (about 2 mm, if possible)>','<cook, with (e.g. a lid)>','<cook, in ((a bowl))>','<cook, with (12 minutes)>']){
    const r=parseRecipe('::instructions\n{x} '+raw+'\n'),p=process(r.sections[0].children[0] as Statement);
    assert.equal(p.parameterParts,undefined);assert.deepEqual(p.parameters,raw.slice(1,-1).split(',').slice(1).map(s=>s.trim()));
    assert.ok(!r.diagnostics.some(d=>d.severity==='error'));
  }
});

test('quality coverage counts nested declarations without duplicating authored source',()=>{
  const audit=auditConversion(recipe,vocabulary);
  assert.equal(audit.ingredients.referenced,4);assert.equal(audit.equipment.referenced,2);
  assert.equal(audit.metrics.processReferences,3);
});
