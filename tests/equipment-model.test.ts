import assert from 'node:assert/strict';
import test from 'node:test';
import { Vocabulary, parseRecipe, semanticTokens, renderHtml, createReferencePage, renderReferenceHtml, buildUsageIndex, recipeReferenceUrl } from '../src/index.ts';
import type { VocabularyEntry, Node, Recipe } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
const equipment = (id: string, extra: object = {}): VocabularyEntry => ({ id, kind: 'equipment', names: { en: id }, ...extra });
const walk = (nodes: Node[]): ReturnType<typeof semanticTokens> => nodes.flatMap(n => [
  ...(n.kind === 'statement' ? semanticTokens(n.tokens) : []), ...('children' in n ? walk(n.children) : []),
  ...(n.kind === 'group' && n.condition ? walk([n.condition]) : [])]);
const tokens = (r: Recipe) => [...walk(r.preamble), ...r.sections.flatMap(s => walk(s.children))];
const vocabulary = await loadVocabulary('.');
for (const [label, entries] of [
  ['missing parent', [equipment('child', { type_of: 'missing' })]],
  ['ingredient parent', [equipment('child', { type_of: 'parent' }), { id: 'parent', kind: 'ingredient', names: { en: 'parent' } }]],
  ['process parent', [equipment('child', { type_of: 'parent' }), { id: 'parent', kind: 'process', names: { en: 'parent' } }]],
  ['self parent', [equipment('child', { type_of: 'child' })]],
  ['cycle', [equipment('one', { type_of: 'two' }), equipment('two', { type_of: 'three' }), equipment('three', { type_of: 'one' })]],
  ['alias parent', [equipment('child', { type_of: 'alias' }), equipment('parent', { aliases: ['alias'] })]],
  ['duplicate parent', [equipment('child', { type_of: 'parent' }), equipment('parent'), equipment('parent')]],
  ['multiple parents', [equipment('child', { type_of: ['one', 'two'] })]],
  ['empty parent', [equipment('child', { type_of: '' })]],
  ['non-string parent', [equipment('child', { type_of: 1 })]],
] as const) test('equipment type_of rejects ' + label, () => {
  assert.throws(() => new Vocabulary(entries as unknown as VocabularyEntry[]), /type_of/);
});
test('equipment reference requires a boolean; process eligibility and ingredient restrictions remain unchanged', () => {
  for (const value of [null, 'false', 0]) assert.throws(() => new Vocabulary([equipment('bowl', { reference: value })]), /reference/);
  assert.throws(() => new Vocabulary([{ id: 'food', kind: 'ingredient', names: { en: 'food' }, reference: false }]), /reference/);
  const v = new Vocabulary([equipment('one', { reference: true }), equipment('two'), equipment('three', { reference: false }),
    { id: 'serve', kind: 'process', names: { en: 'serve' }, reference: false }]);
  assert.ok(createReferencePage(v, 'equipment', 'one')); assert.ok(createReferencePage(v, 'equipment', 'two'));
  assert.equal(createReferencePage(v, 'equipment', 'three'), undefined);
  const r = parseRecipe('::instructions\n<serve>', { vocabulary: v });
  assert.equal(tokens(r)[0].canonicalId, 'serve'); assert.equal(tokens(r)[0].reference, false);
  assert.equal(createReferencePage(v, 'process', 'serve'), undefined);
  assert.deepEqual(Object.keys(buildUsageIndex([{ id: 'r', name: 'R', recipe: r }]).concepts), []);
});
test('equipment proof edges survive loading and JSON transport and link in both directions', () => {
  const v = new Vocabulary(JSON.parse(JSON.stringify(vocabulary.entries)));
  assert.equal(v.entries.filter(e => e.kind === 'equipment').length, 121);
  assert.equal(v.entries.filter(e => e.kind === 'equipment' && e.reference !== false).length, 120);
  for (const [child, parent] of [['paring-knife', 'knife'], ['cast-iron-frying-pan', 'frying-pan'], ['stand-mixer', 'mixer']]) {
    assert.equal(v.resolve(child, 'equipment')[0].type_of, parent);
    const page = createReferencePage(v, 'equipment', child)!;
    assert.equal(page.typeOf?.url, '/reference/equipment/' + parent);
    assert.ok(createReferencePage(v, 'equipment', parent)!.types!.some(t => t.id === child && t.url === '/reference/equipment/' + child));
    assert.match(renderReferenceHtml(page), /Type of: <a href="\/reference\/equipment\//);
  }
});
test('suppressed bowl remains canonical equipment, styled and counted without a link in Code or Compact', () => {
  const source = '::equipment\n(bowl)\n::instructions\n(bowl)\n(bowl)';
  const r = parseRecipe(source, { vocabulary });
  for (const t of tokens(r).filter(t => t.kind === 'thing')) {
    assert.equal(t.thingKind, 'equipment'); assert.equal(t.canonicalId, 'bowl'); assert.equal(t.reference, false);
    assert.equal(source.slice(t.span.start, t.span.end), t.raw);
  }
  for (const view of ['code', 'compact'] as const) {
    const html = renderHtml(r, { view, syntaxSpans: true, referenceUrl: () => { throw new Error('Suppressed reference URL requested'); } });
    assert.match(html, /<span class="os-token os-equipment"[^>]*data-canonical-id="bowl"[^>]*data-reference="false"/);
    if (view === 'code') assert.match(html, /os-syntax-equipment/);
    assert.doesNotMatch(html, /<a\b/);
  }
  const usage = buildUsageIndex([{ id: 'r', name: 'R', recipe: r }]);
  assert.equal(usage.concepts[JSON.stringify(['equipment', 'bowl'])].length, 1);
  assert.equal(createReferencePage(vocabulary, 'equipment', 'bowl', usage), undefined);
  const normal = renderHtml(parseRecipe('::equipment\n(knife)', { vocabulary }), { syntaxSpans: true, referenceUrl: recipeReferenceUrl });
  assert.match(normal, /<a class="os-token os-equipment"/); assert.match(normal, /os-syntax-equipment/);
});
test('suppressed parents and children render as plain text even with an eager URL callback', () => {
  const v = new Vocabulary([equipment('root'), equipment('hidden', { type_of: 'root', reference: false }), equipment('leaf', { type_of: 'hidden' })]);
  const options = { referenceUrl: (_kind: string, id: string) => '/equipment/' + id };
  const root = createReferencePage(v, 'equipment', 'root', undefined, options)!;
  const leaf = createReferencePage(v, 'equipment', 'leaf', undefined, options)!;
  assert.deepEqual(root.types, [{ id: 'hidden', name: 'hidden', url: undefined }]);
  assert.deepEqual(leaf.typeOf, { id: 'hidden', name: 'hidden', url: undefined });
  for (const p of [root, leaf]) { assert.match(renderReferenceHtml(p), /hidden/); assert.doesNotMatch(renderReferenceHtml(p), /href="[^\"]*hidden/); }
  assert.deepEqual(root.types?.map(t => t.id), ['hidden']); // Only direct children, not leaf.
});
test('equipment taxonomy neither inherits usage nor promotes authored qualifiers', () => {
  const recipe = (id: string) => ({ id, name: id, recipe: parseRecipe('::equipment\n(' + id + ')', { vocabulary }) });
  for (const [used, unused] of [['paring-knife', 'knife'], ['knife', 'paring-knife']]) {
    const usage = buildUsageIndex([recipe(used)]);
    assert.equal(createReferencePage(vocabulary, 'equipment', used, usage)!.usage!.length, 1);
    assert.deepEqual(createReferencePage(vocabulary, 'equipment', unused, usage)!.usage, []);
  }
  const source = '::equipment\n(knife, paring)\n(frying pan, cast iron)';
  const r = parseRecipe(source, { vocabulary });
  assert.deepEqual(tokens(r).filter(t => t.kind === 'thing').map(t => t.canonicalId), ['knife', 'frying-pan']);
  for (const t of tokens(r)) assert.equal(source.slice(t.span.start, t.span.end), t.raw);
});
