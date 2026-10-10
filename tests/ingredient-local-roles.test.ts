import { restoreCorpusRepairs } from './helpers/corpus-quality-unattended.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseRecipe, renderHtml, Vocabulary, createReferencePage, semanticTokens } from '../src/index.ts';
import type { VocabularyEntry, Node, Token } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { recipeFiles } from '../scripts/corpus.ts';

const decisions = JSON.parse(await readFile('ingredient-local-role-decisions.json', 'utf8'));
const retired = new Set<string>(decisions.entries.map((e: {id: string}) => e.id));
const vocabulary = await loadVocabulary('.');
const previous = new Vocabulary([...vocabulary.entries, ...decisions.entries.map((e: {entry: VocabularyEntry}) => e.entry)]);

function tokens(nodes: readonly Node[]): Token[] {
  return nodes.flatMap(n => n.kind === 'statement' ? [...semanticTokens(n.tokens), ...tokens(n.children)] :
    n.kind === 'group' ? [...(n.condition ? tokens([n.condition]) : []), ...tokens(n.children)] : []);
}

test('reviewed local identities have no canonical ingredient entries or reference pages', () => {
  assert.equal(retired.size, 45);
  assert.equal(decisions.beforeCount - retired.size, decisions.afterCount);
  for (const id of retired) {
    assert.deepEqual(vocabulary.resolve(id, 'ingredient'), [], id);
    assert.equal(createReferencePage(vocabulary, 'ingredient', id), undefined, id);
  }
  // A same-spelled culinary process remains independently canonical.
  assert.equal(vocabulary.resolve('garnish', 'process')[0].id, 'garnish');
});

test('all corpus ASTs preserve local bindings, diagnostics and other canonical identities', async () => {
  let removedTokens = 0;
  for (const file of await recipeFiles('examples/public-domain-recipes')) {
    const current = await readFile(file, 'utf8');
    const baseline = restoreCorpusRepairs(current, file);
    for (const source of new Set([current, baseline])) {
    const before = parseRecipe(source, { vocabulary: previous });
    const after = parseRecipe(source, { vocabulary });
    const expected = JSON.parse(JSON.stringify(before), (_key, value) => {
      if (value?.kind === 'thing' && value.thingKind === 'ingredient' && retired.has(value.canonicalId)) {
        delete value.canonicalId;
        if (source === baseline) removedTokens++;
      }
      return value;
    });
    assert.deepEqual(JSON.parse(JSON.stringify(after)), expected, file);
    for (const view of ['code', 'compact'] as const) {
      renderHtml(after, { view, referenceUrl: ref => {
        assert.ok(ref.kind !== 'ingredient' || !retired.has(ref.canonicalId), file);
        return `/references/${ref.kind}/${ref.canonicalId}`;
      } });
    }
  }
  }
  assert.equal(removedTokens, 38); // Historical count; current repaired ASTs are also checked above.
});

test('broad roles and named choices work and render without any vocabulary', () => {
  const source = '::recipe\nname: Local roles\n::ingredients\n(seasoning) to taste\n(sweetener) 1tsp\n(frying fat) = (butter) -OR- (oil)\n::instructions\n(seasoning) + (sweetener) + (frying fat)\n';
  const recipe = parseRecipe(source);
  assert.deepEqual(recipe.diagnostics, []);
  const refs = tokens(recipe.sections.find(s => s.name === 'instructions')!.children).filter(t => t.kind === 'thing');
  assert.equal(refs.length, 3);
  for (const ref of refs) {
    assert.equal(ref.canonicalId, undefined);
    assert.ok(ref.declarationIds?.length);
  }
  for (const view of ['code', 'compact'] as const) {
    const html = renderHtml(recipe, {view, referenceUrl: () => { throw Error('Local role linked globally'); }});
    assert.match(html, /seasoning/); assert.match(html, /sweetener/); assert.match(html, /frying fat/);
    assert.match(html, /data-declaration-ids=/);
  }
});

test('Red Lentil Dahl retains its exact heat-seasoning alternatives and local choice references', async () => {
  const source = await readFile('examples/public-domain-recipes/red-lentil-dahl/red-lentil-dahl.opensauce', 'utf8');
  assert.ok(source.includes('(heat seasoning) = (red chillies, dried) to taste -OR- (cayenne pepper) to taste'));
  const recipe = parseRecipe(source, {vocabulary});
  const all = recipe.sections.filter(s => !s.originalSource).flatMap(s => tokens(s.children));
  const heat = all.filter(t => t.kind === 'thing' && t.name === 'heat seasoning');
  assert.equal(heat.length, 3);
  for (const t of heat) {
    assert.equal(t.kind === 'thing' && t.thingKind, 'choice');
    assert.equal(t.canonicalId, undefined);
  }
  assert.deepEqual(all.filter(t => t.kind === 'process' && t.name === 'heat').map(t => t.raw), ['<heat, soup pot>']);
  assert.ok(all.some(t => t.kind === 'thing' && t.canonicalId === 'red-chilli'));
  assert.ok(all.some(t => t.kind === 'thing' && t.canonicalId === 'cayenne-pepper'));
});
