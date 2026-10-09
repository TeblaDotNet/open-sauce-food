import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { parseRecipe, renderHtml } from '../src/index.ts';
import { isStructuredValue } from '../src/renderer/syntax.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { demoRecipes } from '../scripts/demo-server.ts';

const fixture = `::ingredients
(butter; unsalted, room temperature) ~250g
(egg: yolk) 4
::equipment
(cake tin)
::instructions
{batter} = (butter) + (egg: yolk)
{batter} <beat, 2 min>
(cake tin) <heat, !72°C, gas mark 4>
(mystery, 42 wishes) <wait, until 3 people arrive>
Optional [
    {batter} <cool>
]
::notes
Wait for 2 people; ~100g is just prose here.`;
const plain = (html: string) => html.replace(/<[^>]+>/g, '');
for (const view of ['code', 'compact'] as const) test(`semantic spans preserve ${view} text and split roles`, () => {
  const recipe = parseRecipe(fixture);
  const before = JSON.stringify(recipe);
  const html = renderHtml(recipe, {view, syntaxSpans: true});
  assert.equal(plain(html), plain(renderHtml(recipe, {view})));
  if (view === 'compact') { assert.doesNotMatch(html, /os-syntax-/); return; }
  for (const [role, word] of [['ingredient','butter'],['equipment','cake tin'],['specificity','unsalted'],['specificity','yolk'],['process','beat'],['result','batter'],['value','gas mark 4']])
    assert.match(html, new RegExp(`class="os-syntax-${role}">[^<]*${word}`, 'i'));
  for (const word of ['room temperature','mystery','42 wishes','until 3 people arrive','Optional','Wait for 2 people'])
    assert.doesNotMatch(html, new RegExp(`class="os-syntax-[^"]+">[^<]*${word}`));
  assert.equal(JSON.stringify(recipe), before);
});
test('value slots accept bounded amounts and settings, not incidental prose', () => {
  for (const value of ['~100g','~~2 tbsp','!72°C','180°C','2 min','250g / 9oz','gas mark 4','high speed','3','1 1/2 cups']) assert.ok(isStructuredValue(value), value);
  for (const value of ['wait 2 minutes','200g; as little as 180g','until 3 people arrive','room temperature','3 mystery units']) assert.equal(isStructuredValue(value),false,value);
});
test('span content and formatter hooks remain escaped; original source is neutral', () => {
  const r = parseRecipe('::ingredients\n(<script>; <img>) 2\n::source\n<<<\n(butter) ~100g\n>>>');
  const html = renderHtml(r,{syntaxSpans:true,view:'code'});
  assert.doesNotMatch(html, /<script>|<img>/);
  assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(renderHtml(r,{syntaxSpans:true,view:'originalSource'}),/os-syntax-/);
  assert.doesNotMatch(renderHtml(r,{syntaxSpans:true,formatTerm:()=>'<script>bad</script>'}),/<script>/);
});
test('representative recipes retain identical visible text with semantic spans', async () => {
  for (const recipe of demoRecipes) {
    const r = parseRecipe(await readFile(`examples/public-domain-recipes/${recipe.id}/${recipe.id}.opensauce`,'utf8'));
    for (const view of ['code','compact'] as const) assert.equal(plain(renderHtml(r,{view,syntaxSpans:true})),plain(renderHtml(r,{view})),`${recipe.id} ${view}`);
  }
});
test('Tebla theme defaults dark, persists explicit choice, tolerates denied storage and leaves syntax independent', async () => {
  const init = await readFile('demo/theme-init.js','utf8'), toggle = await readFile('demo/dark-mode.js','utf8');
  for (const saved of [null,'true','false','denied']) {
    const classes = new Set<string>(), buttonClasses = new Set<string>();
    const classList = (set: Set<string>) => ({contains:(key:string)=>set.has(key),add:(key:string)=>set.add(key),toggle:(key:string,force?:boolean)=>{const on=force ?? !set.has(key); if(on)set.add(key);else set.delete(key);return on;}});
    const handlers: Record<string,()=>void> = {}, attrs: Record<string,string> = {}, writes: unknown[][] = [];
    const button = {textContent:'',classList:classList(buttonClasses),setAttribute:(k:string,v:string)=>attrs[k]=v,addEventListener:(k:string,v:()=>void)=>handlers[k]=v};
    const context = {document:{documentElement:{classList:classList(classes)},getElementById:(id:string)=>{assert.equal(id,'dark-mode-toggle');return button;},addEventListener:(_k:string,fn:()=>void)=>fn()},localStorage:{getItem:(key:string)=>{assert.equal(key,'dark-mode');if(saved==='denied')throw Error();return saved;},setItem:(...args:unknown[])=>{if(saved==='denied')throw Error();writes.push(args);}}};
    runInNewContext(init,context); runInNewContext(toggle,context);
    const dark = saved !== 'false';
    assert.equal(classes.has('dark-mode'),dark); assert.ok(classes.has('tebla-theme-ready'));
    assert.equal(button.textContent,dark?'Light':'Dark');
    handlers.click(); assert.equal(classes.has('dark-mode'),!dark);
    assert.equal(attrs['aria-label'],dark?'Switch to dark mode':'Switch to light mode');
    if(saved!=='denied')assert.deepEqual(writes,[['dark-mode',!dark]]);
  }
});


test('local ingredient roles and choices keep semantic colour without reference affordances', async () => {
  const vocabulary = await loadVocabulary('.');
  const source = await readFile('examples/public-domain-recipes/red-lentil-dahl/red-lentil-dahl.opensauce', 'utf8');
  const recipe = parseRecipe(source, {vocabulary});
  const before = JSON.stringify(recipe);
  const linked: string[] = [];
  const html = renderHtml(recipe, {view: 'code', syntaxSpans: true, referenceUrl: t => {
    linked.push(t.token.name!); return '/reference/' + t.kind + '/' + t.canonicalId;
  }});
  const locals = [...html.matchAll(/<span class="os-token os-choice"[^>]*>\(<span class="os-syntax-ingredient">heat seasoning<\/span>\)<\/span>/g)];
  assert.equal(locals.length, 3);
  for (const [local] of locals) assert.doesNotMatch(local, /<a\b|href=|data-canonical-id=|class="[^"]*(?:link|underline)/);
  assert.ok(!linked.includes('heat seasoning'));
  assert.match(html, /<a class="os-token os-ingredient"[^>]*href="\/reference\/ingredient\/cayenne-pepper">\(<span class="os-syntax-ingredient">cayenne pepper<\/span>/);
  assert.equal(JSON.stringify(recipe), before);

  const other = parseRecipe('::ingredients\n(seasoning) 1g\n::equipment\n(tool choice) = (spoon) -OR- (fork)\n(pan)\n::instructions\n{mixture} = (seasoning)\n{mixture} <stir, 2 min>\n(tool choice)', {vocabulary});
  const rendered = renderHtml(other, {syntaxSpans: true});
  for (const [role, word] of [['ingredient','seasoning'], ['equipment','tool choice'], ['equipment','pan'], ['process','stir'], ['result','{mixture}'], ['value','2 min']])
    assert.ok(rendered.includes('<span class="os-syntax-' + role + '">' + word + '</span>'), role + ': ' + word);
  assert.doesNotMatch(rendered, /<a\b/);
});
