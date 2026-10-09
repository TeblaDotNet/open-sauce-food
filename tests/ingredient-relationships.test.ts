import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { Vocabulary, parseRecipe, buildUsageIndex, createReferencePage, renderReferenceHtml, renderHtml, recipeReferenceUrl, partAnchor } from '../src/index.ts';
import type { VocabularyEntry } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { recipeFiles } from '../scripts/corpus.ts';

const vocabulary = await loadVocabulary('.');
const ingredient = (id: string, extra: object = {}): VocabularyEntry => ({id, kind: 'ingredient', names: {en: id}, ...extra});

for (const [label, entries] of [
  ['empty parent', [ingredient('child', {type_of: ''})]],
  ['multiple parents', [ingredient('child', {type_of: ['one', 'two']})]],
  ['null parent', [ingredient('child', {type_of: null})]],
  ['missing parent', [ingredient('child', {type_of: 'missing'})]],
  ['parent alias', [ingredient('parent', {aliases: ['family']}), ingredient('child', {type_of: 'family'})]],
  ['ambiguous parent ID', [ingredient('parent'), ingredient('parent'), ingredient('child', {type_of: 'parent'})]],
  ['wrong parent kind', [{id: 'parent', kind: 'process', names: {en: 'parent'}}, ingredient('child', {type_of: 'parent'})]],
  ['wrong child kind', [ingredient('parent'), {id: 'child', kind: 'equipment', names: {en: 'child'}, type_of: 'parent'}]],
  ['self-cycle', [ingredient('self', {type_of: 'self'})]],
  ['long cycle', [ingredient('one', {type_of: 'two'}), ingredient('two', {type_of: 'three'}), ingredient('three', {type_of: 'one'})]],
  ['part family edge', [ingredient('parent', {parts: {piece: {names: {en: 'piece'}, type_of: 'parent'}}})]],
] as const) test(`type_of validation rejects ${label}`, () => {
  assert.throws(() => new Vocabulary(entries as unknown as VocabularyEntry[]), /type_of/);
});

test('family edges survive loader and JSON transport while child pages remain independent', () => {
  const copy = new Vocabulary(JSON.parse(JSON.stringify(vocabulary.entries)));
  for (const [child, parent] of [['wheat-flour', 'flour'], ['olive-oil', 'oil']]) {
    assert.equal(copy.resolve(child, 'ingredient')[0].type_of, parent);
    const urls = {referenceUrl: (_kind: string, id: string) => `/food/ingredients/${id}/`};
    const page = createReferencePage(copy, 'ingredient', child, undefined, urls)!;
    const family = createReferencePage(copy, 'ingredient', parent, undefined, urls)!;
    assert.equal(page.id, child);
    assert.equal(page.typeOf?.id, parent);
    assert.ok(family.types?.some(t => t.id === child));
    assert.ok(renderReferenceHtml(page).includes(`Type of: <a href="/food/ingredients/${parent}/">`));
    assert.ok(renderReferenceHtml(family).includes(`href="/food/ingredients/${child}/"`));
    assert.deepEqual(copy.resolve(child, 'ingredient').map(e => e.id), [child]);
  }
});

test('family links neither inherit metadata nor fold child usage into parent or ancestors', () => {
  const v = new Vocabulary([ingredient('child', {type_of: 'family', aliases: ['child name']}),
    ingredient('family', {type_of: 'ancestor', variants: {plain: {names: {en: 'plain'}}}}), ingredient('ancestor')]);
  const r = parseRecipe('::ingredients\n(child name) 1\n::instructions\n(child name)', {vocabulary: v});
  const usage = buildUsageIndex([{id: 'child-recipe', name: 'Child recipe', recipe: r}]);
  const child = createReferencePage(v, 'ingredient', 'child', usage)!;
  assert.equal(child.usage?.length, 1);
  assert.equal(child.variants, undefined);
  assert.deepEqual(child.aliases, [{name: 'child name'}]);
  assert.deepEqual(createReferencePage(v, 'ingredient', 'family', usage)?.usage, []);
  const ancestor = createReferencePage(v, 'ingredient', 'ancestor', usage)!;
  assert.deepEqual(ancestor.usage, []);
  assert.deepEqual(ancestor.types?.map(t => t.id), ['family']);
});

test('egg and lemon parts have stable anchors and exact distinct-recipe backlinks including action context', () => {
  const corpus = [
    ['yolk', '::ingredients\n(egg) 2\n::instructions\n(egg: yolks) <separate>\n(egg: yolk) <beat>'],
    ['context', '::ingredients\n(egg)\n(lemon)\n::instructions\n{mix} <stir, with (egg: white)>\n{mix} <stir, with (lemon: juice, bottled)>'],
    ['fresh', '::ingredients\n(lemon: juice, fresh) 1tsp'],
    ['unknown', '::ingredients\n(egg: mystery)'],
  ].map(([id, source]) => ({id, name: id, recipe: parseRecipe(source, {vocabulary})}));
  const usage = buildUsageIndex(corpus);
  const egg = createReferencePage(vocabulary, 'ingredient', 'egg', usage)!;
  assert.deepEqual(egg.parts.find(p => p.id === 'yolk')!.usage!.map(r => r.id), ['yolk']);
  assert.deepEqual(egg.parts.find(p => p.id === 'white')!.usage!.map(r => r.id), ['context']);
  assert.deepEqual(egg.parts.find(p => p.id === 'shell')!.usage, []);
  const juice = createReferencePage(vocabulary, 'ingredient', 'lemon', usage)!.parts.find(p => p.id === 'juice')!;
  assert.equal(juice.anchor, 'part-juice');
  assert.deepEqual(juice.usage!.map(r => r.id), ['context', 'fresh']);
  assert.equal(partAnchor(['yolk']), 'part-yolk');
  assert.equal(partAnchor(['thigh', 'skin']), 'part-thigh/skin');
  assert.match(renderHtml(corpus[1].recipe, {referenceUrl: recipeReferenceUrl}), /href="\/reference\/ingredient\/lemon#part-juice"/);
  const html = renderReferenceHtml(egg, {recipeUrl: id => `/recipes/${id}/`});
  assert.match(html, /Parts \/ Products/);
  const yolkSection = html.split('id="part-yolk"')[1].split('</section>')[0];
  assert.match(yolkSection, /href="\/recipes\/yolk\/"/);
  assert.doesNotMatch(yolkSection, /href="\/recipes\/context\/"/);
});

test('nested part backlinks require the complete exact path and local aliases', () => {
  const v = new Vocabulary([ingredient('fruit', {parts: {peel: {names: {en: 'peel'}, aliases: ['rind'], parts: {outer: {names: {en: 'outer'}}}}}})]);
  const r = parseRecipe('::ingredients\n(fruit: rind: outer)\n(fruit: peel: unknown)', {vocabulary: v});
  const page = createReferencePage(v, 'ingredient', 'fruit', buildUsageIndex([{id: 'nested', name: 'Nested', recipe: r}]))!;
  assert.deepEqual(page.parts[0].usage, []);
  assert.equal(page.parts[0].parts[0].usage?.length, 1);
  assert.equal(page.parts[0].parts[0].anchor, 'part-peel/outer');
});

test('relationship labels and custom URLs retain HTML escaping and URL safety', () => {
  const v = new Vocabulary([ingredient('family', {names: {en: '<family>'}}), ingredient('child', {type_of: 'family', names: {en: '<child>'}})]);
  for (const id of ['family','child']) {
    const page = createReferencePage(v, 'ingredient', id, undefined, {referenceUrl: () => 'javascript:alert(1)'})!;
    const html = renderReferenceHtml(page);
    assert.doesNotMatch(html, /<family>|<child>|href="javascript:/);
    assert.match(html, /&lt;family&gt;/); assert.match(html, /&lt;child&gt;/);
  }
});

test('family metadata changes no corpus ASTs, local roles, or standalone compound resolution', async () => {
  const before = new Vocabulary(vocabulary.entries.map(({type_of: _omitted, ...entry}) => entry));
  for (const file of await recipeFiles('examples/public-domain-recipes')) {
    const source = await readFile(file, 'utf8');
    assert.deepEqual(parseRecipe(source, {vocabulary}), parseRecipe(source, {vocabulary: before}), file);
  }
  for (const id of ['egg-yolk', 'egg-white', 'lemon-juice', 'chicken-breast'])
    assert.equal(vocabulary.resolve(id, 'ingredient')[0].id, id);
  for (const term of ['heat seasoning', 'frying fat', 'seasoning', 'sweetener', 'sauce choice'])
    assert.deepEqual(vocabulary.resolve(term, 'ingredient'), []);
});
