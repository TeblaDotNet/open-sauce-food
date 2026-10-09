import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipe, renderCompact, renderCode, renderHtml, Vocabulary } from '../src/index.ts';
import { auditConversion } from '../src/conversion-quality.ts';
import { method, ingredient } from '../scripts/public-domain-conversion.ts';
const vocabulary = new Vocabulary([
  ...['water','salt','garlic','onion','rice','oil','chicken','chicken breast'].map(id => ({id,kind:'ingredient' as const,names:{en:id}})),
  ...['pot','pan','bowl','plate'].map(id => ({id,kind:'equipment' as const,names:{en:id}})),
  ...['preheat','add','cover','bring to boil','cut','fry','cook','knead','roast','stir','turn','season','taste'].map(id => ({id,kind:'process' as const,names:{en:id}}))
]);
const source = (body: string, declarations = '') => '::recipe\nname: Test\n::ingredients\n'+declarations+'\n::instructions\n'+body+'\n';
const audit = (body: string, declarations = '') => auditConversion(parseRecipe(source(body,declarations), {vocabulary}),vocabulary);
for (const body of ['<preheat, oven to 450F. Add water. Cover. Bring to boil.>', '<cut, onion, then fry it and add garlic>', '<cook, 12m, stirring occasionally>']) test('CQ005 action boundaries: '+body, () => {
  const result = audit(body); assert.equal(result.ruleCounts.CQ005,1);
  assert.ok((result.diagnostics.find(d=>d.rule==='CQ005')!.evidence.boundaries as unknown[]).length);
  assert.equal(result.parser.errors,0);
});
for (const body of ['<cook, medium-low heat, covered, 12 minutes>', '<knead, firmly, 8-10 minutes>', '<roast, 180C, 25 minutes> ?= golden brown', '<season, with salt and pepper to taste>']) test('CQ005 descriptive parameters stay legal and unflagged: '+body, () => assert.equal(audit(body).ruleCounts.CQ005,0));
test('CQ008 measured ingredients and vessel context have exact evidence spans', () => {
  const text=source('<add, 1 1/4 cup water and 1/4 tsp salt to a medium pot>');
  const result=auditConversion(parseRecipe(text,{vocabulary}),vocabulary);
  assert.deepEqual(result.undeclared.map(f=>f.canonicalId),['water','salt','pot']);
  assert.deepEqual(result.undeclared.map(f=>f.kind),['ingredient','ingredient','equipment']);
  for(const f of result.undeclared) {
    assert.equal(text.slice(f.span.start,f.span.end),f.matchedText);assert.equal(f.confidence,'high');
    assert.ok(f.reason); if(f.quantity)assert.equal(text.slice(f.quantity.span.start,f.quantity.span.end),f.quantity.raw);
  }
  assert.deepEqual(result.undeclared.slice(0,2).map(f=>f.quantity!.raw),['1 1/4 cup','1/4 tsp']);
  assert.equal(result.undeclared[2].explicitQuantity,false);
});
test('CQ008 explicit undeclared things carry authored quantity and exact CRLF locations', () => {
  const text=source('(water) ~100ml\n(pot) <heat>').replaceAll('\n','\r\n');
  const r=auditConversion(parseRecipe(text,{vocabulary}),vocabulary);
  assert.deepEqual(r.undeclared.map(f=>f.canonicalId),['water','pot']);
  assert.equal(r.undeclared[0].quantity!.raw,'~100ml');
  for(const f of r.undeclared)assert.equal(text.slice(f.span.start,f.span.end),f.matchedText);
});
test('CQ008 does not propose duplicate generic/specific, aliased or local-choice declarations', () => {
  assert.equal(audit('Add chicken.','(chicken breast)').ruleCounts.CQ008,0);
  assert.equal(audit('Add chicken breast.','(chicken)').ruleCounts.CQ008,0);
  assert.equal(audit('(water) <add>','(water) = (rice)').ruleCounts.CQ008,0);
  const v=new Vocabulary([{id:'water',kind:'ingredient',names:{en:'water'},aliases:['aqua']}]);
  const r=auditConversion(parseRecipe(source('Add aqua.','(water)'),{vocabulary:v}),v);assert.equal(r.ruleCounts.CQ008,0);
});
test('CQ008 excludes narrative sections, comments, judgements, negation and incidental nouns', () => {
  const body='<cook> ?= looks like salt\n# Add water to pot\nDo not add 1 cup salt.\nImagine 1 cup water.\nRemember the rice.\nServe onto a plate.\n::story\nAdd water to a pot.\n::notes\nAdd salt.\n::source\n<<<\nAdd 1 cup water.\n>>>';
  assert.equal(audit(body).ruleCounts.CQ008,0);
});
test('CQ008 rejects ambiguous identities, raw action homographs and nested shorter-name guesses', () => {
  const v=new Vocabulary([{id:'a',kind:'ingredient',names:{en:'mint'}},{id:'b',kind:'equipment',names:{en:'mint'}},{id:'cream',kind:'ingredient',names:{en:'cream'}},{id:'cream',kind:'process',names:{en:'cream'}},{id:'oil',kind:'ingredient',names:{en:'oil'}},{id:'one',kind:'ingredient',names:{en:'olive oil'}},{id:'two',kind:'ingredient',names:{en:'olive oil'}}]);
  assert.equal(auditConversion(parseRecipe(source('Add mint. Add cream. Add 1 cup olive oil.'),{vocabulary:v}),v).ruleCounts.CQ008,0);
});
test('CQ008 is score-neutral, deterministic and does not mutate AST', () => {
  const r=parseRecipe(source('(water) 1 cup'),{vocabulary}),before=JSON.stringify(r);
  const a=auditConversion(r,vocabulary);assert.equal(a.ruleCounts.CQ008,1);assert.equal(JSON.stringify(r),before);
  assert.deepEqual(a,auditConversion(r,vocabulary));assert.equal(a.score,auditConversion(r,new Vocabulary([])).score);
});
test('existing import helper refuses multi-action packing and prefers + only for exact declared operands', () => {
  const water=ingredient('1 cup water',vocabulary),rice=ingredient('1 cup rice',vocabulary);
  assert.equal(method('Add water to rice.',[water,rice]).line,'(rice) + (water)');
  assert.match(method('Add water to it.',[water,rice]).line,/<add/);
  assert.match(method('Add water to rice.',[water,rice,rice]).line,/<add/);
  const multiple=method('Preheat oven. Add water. Cover. Bring to boil.');
  assert.equal(multiple.mode,'literal');assert.ok(!multiple.line.includes('<'));assert.match(multiple.flags.join(' '),/Multiple action heads/);
  assert.equal(method('Cook rice, stirring occasionally.',[rice]).mode,'literal');
});
for(const [body,expected]of [
  ['{veggies} <cook, 2-3m> ?= slightly softened\n    <stir, occasionally>', 'Cook the veggies for 2–3 minutes, stirring occasionally, until slightly softened.'],
  ['<roast, 20m>\n    <turn, halfway through>', 'Roast for 20 minutes, turning halfway through.']
])test('Compact subordinate action: '+expected,()=>{
  const r=parseRecipe(source(body)),before=JSON.stringify(r),code=renderCode(r);
  assert.ok(renderCompact(r).includes(expected));assert.equal(renderCode(r),code);assert.equal(JSON.stringify(r),before);
  const html=renderHtml(r,{view:'compact'});assert.ok(html.replace(/<[^>]+>/g,'').includes(expected));assert.match(html,/<span id="[^"]+">|data-inherited-subject=/);
});
test('multiple subordinate children, comments, differing subjects and unsupported modifiers remain separate',()=>{
  for(const suffix of ['    <stir, occasionally>\n    <turn, halfway through>', '    <stir, occasionally> # retain', '    {other} <stir, occasionally>', '    <stir, constantly>']) {
    const text=renderCompact(parseRecipe(source('{veggies} <cook, 2m> ?= softened\n'+suffix)),{comments:true});
    assert.ok(text.includes('Cook the veggies for 2 minutes, until softened.'));
    assert.ok(!text.includes(', stirring'));
  }
});

test('CQ008 wrong-section declarations do not hide a known equipment identity', () => {
  const r=audit('(pot) <cover>','(pot)');
  assert.equal(r.undeclared.length,1);assert.equal(r.undeclared[0].kind,'equipment');
});
