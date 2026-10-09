import { restoreReviewedInstructions } from './helpers/reviewed-instructions.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Vocabulary, createReferencePage, renderReferenceHtml } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { classifyCandidate, knownVariant } from '../scripts/vocabulary-candidates.ts';

const vocabulary = await loadVocabulary('.');
const decisions = JSON.parse(await readFile('vocabulary-review-decisions.json', 'utf8'));
const baseline = JSON.parse(await readFile('vocabulary-review-baseline.json', 'utf8'));

test('reviewed aliases and explicit plurals resolve uniquely without guessed morphology', () => {
  for (const change of decisions.changes.filter((c: any) => ['alias','plural'].includes(c.action)))
    assert.deepEqual(vocabulary.resolve(change.term, change.kind).map(e => e.id), [change.id], change.term);
  for (const [term,id] of [['feta cheese','feta'],['rocket','arugula'],['shallots','shallot']])
    assert.equal(vocabulary.resolve(term, 'ingredient')[0].id,id);
  assert.deepEqual(vocabulary.resolve('potatos','ingredient'),[]);
  assert.notEqual(vocabulary.resolve('feta','ingredient')[0].id,vocabulary.resolve('cheese','ingredient')[0].id);
  assert.deepEqual(['chop','dice','mince'].map(s=>vocabulary.resolve(s,'process')[0].id),['chop','dice','mince']);
});

test('new concepts are generated and unchecked; all reference pages render', () => {
  assert.equal(vocabulary.entries.length, baseline.entries.length + 24);
  for (const change of decisions.changes.filter((c: any) => c.action === 'new-concept')) {
    const entry = vocabulary.entries.find(e=>e.id===change.id&&e.kind===change.kind)!;
    assert.deepEqual(entry.curation,{origin:'generated',review:'unchecked'});
    assert.equal(entry.typical_mass,undefined); assert.equal(entry.reference_density,undefined); assert.equal(entry.nutrition,undefined);
  }
  for (const entry of vocabulary.entries.filter(e => e.reference !== false)) {
    const page = createReferencePage(vocabulary,entry.kind,entry.id)!;
    assert.ok(page);
    assert.ok(renderReferenceHtml(page).includes('canonical ID:'),entry.id);
  }
  assert.deepEqual(vocabulary.resolve('thermos','ingredient'),[]);
  assert.deepEqual(vocabulary.resolve('thermometer','ingredient'),[]);
  assert.deepEqual(vocabulary.resolve('cheesecloth','ingredient'),[]);
});

test('local parts and variants preserve distinctions without becoming global aliases', () => {
  assert.equal(vocabulary.resolvePartPath('garlic',['cloves']).complete,true);
  assert.equal(vocabulary.resolvePartPath('lemon',['zest']).complete,true);
  assert.equal(vocabulary.resolvePartPath('oregano',['leaves']).complete,true);
  assert.deepEqual(vocabulary.resolve('garlic cloves','ingredient'),[]);
  assert.ok(knownVariant(vocabulary,'flour','all purpose'));
  assert.ok(knownVariant(vocabulary,'butter','unsalted'));
  assert.equal(knownVariant(vocabulary,'flour','whole'),false);
  assert.ok(renderReferenceHtml(createReferencePage(vocabulary,'ingredient','flour')!).includes('Variants'));
  const copy = new Vocabulary(JSON.parse(JSON.stringify(vocabulary.entries)));
  assert.deepEqual(copy.resolve('flour','ingredient')[0].variants,vocabulary.resolve('flour','ingredient')[0].variants);
  assert.throws(()=>new Vocabulary([{id:'x',kind:'ingredient',names:{en:'X'},variants:{bad:{names:{}}}}]),/variants/);
  assert.throws(()=>new Vocabulary([{id:'x',kind:'equipment',names:{en:'X'},variants:{whole:{names:{en:'whole'}}}}]),/non-ingredient/);
});

test('candidate hints retain uncertainty and classify cross-kind and malformed phrases', () => {
  for (const [term,expected] of [['potatoes','observed aliases/regional names'],['thermometer','equipment/process confusion'],['fresh ricotta','recurring preparation/state phrase'],['1 can tomatoes','malformed/source-specific phrase'],['whatever you like','malformed/source-specific phrase'],['salt or pepper','ambiguous compound ingredient'],['garlic cloves','possible part']])
    assert.equal(classifyCandidate(term,'ingredient',vocabulary).category,expected,term);
  assert.equal(classifyCandidate('wisk','process',vocabulary).category,'observed aliases/regional names');
});

test('all 410 recipes preserve historical bytes outside explicitly reviewed instruction replacements', async () => {
  assert.equal(baseline.recipes.length,410);
  for (const item of baseline.recipes) {
    const text = restoreReviewedInstructions(await readFile(item.path,'utf8'), item.path).replaceAll('\r\n','\n');
    assert.equal(createHash('sha256').update(text).digest('hex'),item.sha256,item.path);
  }
});

test('candidate reconciliation accounts for all 906 original records', async () => {
  const results = JSON.parse(await readFile('vocabulary-review-results.json','utf8'));
  assert.equal(results.baselineOutcomes.length,906);
  assert.equal(Object.values(results.summary.outcomes).reduce((n: number,v)=>n+Number(v),0),906);
  assert.equal(results.remaining.length,results.summary.currentCandidateCount);
  assert.equal(results.summary.currentRecipeCount,410);
});
