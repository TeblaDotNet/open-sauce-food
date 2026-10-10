import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRecipe, renderHtml, buildUsageIndex, createReferencePage, recipeReferenceUrl } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
const vocabulary = await loadVocabulary('.');
const names = [
  ['fridge', 'refrigerator'], ['sheet pan', 'baking-tray'], ['oven tray', 'baking-tray'],
  ['kitchen twine', 'butchers-twine'], ['hand blender', 'immersion-blender'], ['stick blender', 'immersion-blender'],
  ['loaf pan', 'loaf-tin'], ['loaf form', 'loaf-tin'], ['steamer basket', 'steaming-basket'],
  ['stockpot', 'stock-pot'], ['waffle iron', 'waffle-maker'], ['fry pan', 'frying-pan'],
  ['tinfoil', 'aluminium-foil'], ['parchment', 'baking-paper'], ["chef's knife", 'chef-knife'],
] as const;
for (const [name, id] of names) test('equipment name preserves wording and canonical linkage: ' + name, () => {
  assert.deepEqual(vocabulary.resolve(name, 'equipment').map(e => e.id), [id]);
  const source = '::equipment\n(' + name + ')\n::instructions\n(' + name + ')';
  const recipe = parseRecipe(source, { vocabulary });
  for (const view of ['code', 'compact'] as const) {
    const html = renderHtml(recipe, { view, syntaxSpans: true, referenceUrl: recipeReferenceUrl });
    assert.ok(html.includes('href="/reference/equipment/' + id + '"'));
    assert.ok(html.includes('class="os-token os-equipment"'));
    if (view === 'code') assert.ok(html.includes('os-syntax-equipment'));
    const text = html.replace(/<[^>]+>/g, '').replace(/&#(?:39|x27);|&apos;/g, "'");
    assert.ok(text.includes(view === 'code' ? name : name[0].toUpperCase() + name.slice(1)), text);
  }
  const usage = buildUsageIndex([{ id: 'proof', name: 'Proof', recipe }]);
  assert.equal(createReferencePage(vocabulary, 'equipment', id, usage)!.usage!.length, 1);
  assert.deepEqual(Object.keys(usage.concepts), [JSON.stringify(['equipment', id])]);
});

test('regional and pre-existing names remain resolvable without new identities', () => {
  assert.equal(vocabulary.entries.filter(e => e.kind === 'equipment').length, 144);
  assert.equal(vocabulary.entries.filter(e => e.kind === 'equipment' && e.reference !== false).length, 143);
  for (const [name, id] of [['baking sheet','baking-tray'],['baking tray','baking-tray'],['loaf tin','loaf-tin'],['skillet','frying-pan'],['parchment paper','baking-paper'],['aluminum foil','aluminium-foil'],['tin foil','aluminium-foil'],['foil','aluminium-foil']])
    assert.deepEqual(vocabulary.resolve(name, 'equipment').map(e => e.id), [id]);
  assert.equal(vocabulary.resolve('loaf-tin', 'equipment')[0].names['en-US'], 'loaf pan');
  assert.equal(vocabulary.resolve('baking-tray', 'equipment')[0].names['en-US'], 'baking sheet');
  assert.deepEqual(vocabulary.resolve('electric beaters', 'equipment'), []);
  assert.equal(vocabulary.resolve('bowl', 'equipment')[0].reference, false);
  assert.equal(createReferencePage(vocabulary, 'equipment', 'bowl'), undefined);
});

test('aliases deduplicate recipe backlinks without inheriting frying-pan subtype usage', () => {
  const recipe = parseRecipe('::equipment\n(fry pan)\n(frying pan)\n(skillet)\n::instructions\n(fry pan)', { vocabulary });
  const usage = buildUsageIndex([{ id: 'proof', name: 'Proof', recipe }]);
  assert.equal(createReferencePage(vocabulary, 'equipment', 'frying-pan', usage)!.usage!.length, 1);
  for (const id of ['cast-iron-frying-pan','carbon-steel-frying-pan','stainless-steel-frying-pan','non-stick-frying-pan']) {
    assert.equal(vocabulary.resolve(id, 'equipment')[0].type_of, 'frying-pan');
    assert.deepEqual(createReferencePage(vocabulary, 'equipment', id, usage)!.usage, []);
  }
  for (const [name] of names) assert.deepEqual(vocabulary.resolve(name, 'ingredient'), []);
  assert.equal(vocabulary.resolve('ladle', 'process')[0].kind, 'process');
});
