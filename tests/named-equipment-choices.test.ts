import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecipe,renderCompact,renderHtml,semanticTokens} from '../src/index.ts';
import type {Node,Token} from '../src/model/index.ts';
import {Vocabulary} from '../src/vocabulary/index.ts';
import {buildUsageIndex} from '../src/reference/index.ts';
const vocabulary=new Vocabulary([
 ...['butter','olive oil'].map(name=>({id:name,kind:'ingredient' as const,names:{en:name}})),
 ...['mixing tool','balloon whisk','electric mixer','pan','Dutch oven','blender','hand whisk'].map(name=>({id:name,kind:'equipment' as const,names:{en:name}}))
]);
function tokens(nodes:Node[]):Token[]{return nodes.flatMap(n=>n.kind==='statement'?[...semanticTokens(n.tokens),...tokens(n.children)]:n.kind==='group'?tokens(n.children):[]);}
const source='::recipe\nname: Choices\n::ingredients\n(fat) = (butter) -OR- (olive oil)\n::equipment\n(mixing tool) = (balloon whisk) -OR- (electric mixer)\n::instructions\n(fat) <heat>\n{mixture} <mix, using (mixing tool)>\n';
test('named choices share identity semantics while retaining their member category and exact source spans',()=>{
 for(const vocab of [undefined,vocabulary]){
  const p=parseRecipe(source,{vocabulary:vocab}),all=p.sections.flatMap(s=>tokens(s.children));
  assert.equal(p.source,source);assert.deepEqual(p.diagnostics,[]);
  for(const [name,category] of [['fat','ingredient'],['mixing tool','equipment']]){
   const uses=all.filter(t=>t.name===name);assert.equal(uses.length,2);
   for(const t of uses){assert.equal(t.thingKind,'choice');assert.equal(t.choiceKind,category);assert.equal(t.canonicalId,undefined);}
   assert.equal(uses[1].declarationIds?.length,1);
  }
  for(const name of ['balloon whisk','electric mixer']){const t=all.find(t=>t.name===name)!;assert.equal(t.thingKind,'equipment');if(vocab)assert.equal(t.canonicalId,name);}
  for(const name of ['butter','olive oil'])assert.equal(all.find(t=>t.name===name)!.thingKind,'ingredient');
  for(const t of all)assert.equal(source.slice(t.span.start,t.span.end),t.raw);
  assert.match(renderCompact(p),/Choose mixing tool from: balloon whisk or electric mixer/);
  assert.match(renderCompact(p),/Mix the mixture using mixing tool/);
 }
});
test('local equipment choices shadow canonical names without creating public reference links or usage',()=>{
 const p=parseRecipe(source,{vocabulary}),targets:string[]=[];
 for(const view of ['code','compact'] as const){renderHtml(p,{view,referenceUrl:t=>{targets.push(t.canonicalId);return '/reference/'+t.kind+'/'+encodeURIComponent(t.canonicalId);}});}
 assert.ok(!targets.includes('mixing tool'));assert.ok(targets.includes('balloon whisk'));assert.ok(targets.includes('electric mixer'));
 const usage=buildUsageIndex([{id:'choices',name:'Choices',recipe:p}]);
 assert.equal(usage.concepts[JSON.stringify(['equipment','mixing tool'])],undefined);
 assert.ok(usage.concepts[JSON.stringify(['equipment','balloon whisk'])]);
});
test('multiline equipment choices and stopped-pass minimal reproducer use the existing choice model',()=>{
 for(const declaration of ['(cooking vessel) = (pan) -OR- (Dutch oven)','(cooking vessel) =\n    (pan)\n    -OR-\n    (Dutch oven)']){
  const p=parseRecipe('::recipe\nname: Reproducer\n::ingredients\n(fat) = (butter) -OR- (olive oil)\n::equipment\n'+declaration+'\n::instructions\n(fat) <heat, in (cooking vessel)>',{vocabulary});
  assert.deepEqual(p.diagnostics,[]);
  const local=p.sections.flatMap(s=>tokens(s.children)).filter(t=>t.name==='cooking vessel');
  assert.equal(local.length,2);assert.ok(local.every(t=>t.thingKind==='choice'&&t.choiceKind==='equipment'&&!t.canonicalId));
 }
});
test('separate equipment branches need no named placeholder and result assignments stay assignments',()=>{
 const p=parseRecipe('::recipe\nname: Branches\n::equipment\n(blender)\n(hand whisk)\n::instructions\n[\n    {mixture} <blend, using (blender)>\n]\n-OR-\n[\n    {mixture} <whisk, using (hand whisk)>\n]\n{finished} = {mixture}\n',{vocabulary});
 assert.deepEqual(p.diagnostics,[]);assert.ok(!p.sections.flatMap(s=>tokens(s.children)).some(t=>t.thingKind==='choice'));
 assert.match(renderCompact(p),/OR\./);assert.match(renderCompact(p),/using blender/);assert.match(renderCompact(p),/using hand whisk/);
 const instructions=p.sections.find(s=>s.name==='instructions')!;assert.ok(instructions.children.some(n=>n.kind==='statement'&&n.role==='assignment'));
});
