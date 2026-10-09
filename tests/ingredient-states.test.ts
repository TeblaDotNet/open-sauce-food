import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { Vocabulary, parseRecipe, semanticTokens, createReferencePage, renderReferenceHtml } from '../src/index.ts';
import type { VocabularyEntry, Node, Recipe, Token } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { recipeFiles } from '../scripts/corpus.ts';
const vocabulary = await loadVocabulary('.');
const tokens = (r: Recipe): Token[] => {
  const visit = (nodes: Node[]): Token[] => nodes.flatMap(n => [
    ...(n.kind === 'statement' ? semanticTokens(n.tokens) : []),
    ...('children' in n ? visit(n.children) : []),
    ...(n.kind === 'group' && n.condition ? visit([n.condition]) : [])]);
  return [...visit(r.preamble), ...r.sections.flatMap(s => visit(s.children))].filter(t => t.kind === 'thing');
};
const ingredient = (id: string, extra: object = {}): VocabularyEntry => ({id, kind: 'ingredient', names: {en: id}, ...extra});
const states = {dry: {names: {en: 'dry'}}, tinned: {names: {'en-GB': 'tinned', 'en-US': 'canned'}}};

test('lentil identity/type and exact states remain independent with raw UTF-16 spans', () => {
  const source = '::ingredients\r\n  (brown lentils,  Soaked \t, optional)\r\n(lentils, canned)\r\n(brown lentils, dry)';
  const ts = tokens(parseRecipe(source, {vocabulary}));
  assert.deepEqual(ts.map(t => t.canonicalId), ['brown-lentils', 'lentils', 'brown-lentils']);
  assert.deepEqual(ts.map(t => t.stateResolution?.map(s => s.id)), [['soaked'], ['tinned'], ['dry']]);
  assert.deepEqual(ts[0].qualifiers, ['Soaked', 'optional']);
  assert.equal(ts[0].stateResolution![0].raw, '  Soaked \t');
  for (const t of ts) for (const s of t.stateResolution!) {
    assert.equal(source.slice(s.span.start, s.span.end), s.raw);
    assert.equal(source.split('\n')[s.span.line - 1].slice(s.span.column - 1, s.span.column - 1 + s.raw.length), s.raw);
  }
  assert.equal(vocabulary.resolve('brown lentils', 'ingredient')[0].type_of, 'lentils');
  assert.ok(tokens(parseRecipe(source)).every(t => !t.stateResolution));
});

test('only explicit whole-ingredient state occurrences resolve, including action context', () => {
  const v = new Vocabulary([ingredient('family', {states}), ingredient('child', {type_of: 'family'}),
    ingredient('fruit', {states, parts: {juice: {names: {en: 'juice'}, lexical_names: ['fruit juice']}}})]);
  assert.equal(v.resolveState('child', 'dry'), undefined);
  assert.equal(createReferencePage(v, 'ingredient', 'child')!.states, undefined);
  const source = '::ingredients\n(family, dry)\n(child, dry)\n(fruit: juice, dry)\n(fruit juice, dry)\n(family; unknown, dry)\n::instructions\n(family)\n{mix} <stir, with (family, canned)>';
  const ts = tokens(parseRecipe(source, {vocabulary: v}));
  assert.deepEqual(ts.map(t => t.stateResolution?.map(s => s.id)), [['dry'], undefined, undefined, undefined, undefined, undefined, ['tinned']]);
  const occurrence = ts.at(-1)!.stateResolution![0];
  assert.equal(source.slice(occurrence.span.start, occurrence.span.end), ' canned');
});

test('boundaries remain loose; state metadata does not classify transformed identities or local roles', () => {
  for (const q of ['frozen', 'dried', 'rehydrated', 'finely chopped', 'freshly squeezed', 'optional', 'well drained', 'soaked overnight and drained']) {
    const t = tokens(parseRecipe('::ingredients\n(lentils, ' + q + ')', {vocabulary}))[0];
    assert.equal(t.stateResolution, undefined); assert.deepEqual(t.qualifiers, [q]);
  }
  for (const name of ['tomato paste', 'raisins', 'toast', 'smoked pancetta', 'yoghurt', 'frying fat', 'heat seasoning', 'sweetener', 'seasoning', 'chickpeas']) {
    const source = '::ingredients\n(' + name + ', cooked)';
    const t = tokens(parseRecipe(source, {vocabulary}))[0];
    assert.equal(t.stateResolution, undefined);
    assert.equal(t.canonicalId, vocabulary.resolveIngredient(name)[0]?.entry.id);
  }
  const r = parseRecipe('::ingredients\n(lentils, dry)\n(lentils, cooked)\n::instructions\n(lentils)', {vocabulary});
  assert.ok(r.diagnostics.some(d => d.code === 'AMBIGUOUS_REFERENCE'));
});

for (const bad of [null, [], {Dry: {names: {en: 'dry'}}}, {dry: {names: {}}}, {dry: {names: {en: 'dry'}, aliases: [1]}},
  {dry: {names: {en: 'dry'}}, other: {names: {en: ' DRY '}}}]) test('reject malformed or competing states ' + JSON.stringify(bad), () => {
  assert.throws(() => new Vocabulary([ingredient('lentils', {states: bad})]), /states/);
});
test('states are restricted to ingredient roots and survive JSON transport', () => {
  assert.throws(() => new Vocabulary([{...ingredient('pan', {states}), kind: 'equipment'}]), /non-ingredient/);
  assert.throws(() => new Vocabulary([ingredient('fruit', {parts: {juice: {names: {en: 'juice'}, states}}})]), /states/);
  const copy = new Vocabulary(JSON.parse(JSON.stringify(vocabulary.entries)));
  assert.equal(copy.resolveState('lentils', 'CANNED'), 'tinned');
  for (const id of ['lentils', 'brown-lentils']) {
    const p = createReferencePage(copy, 'ingredient', id)!;
    assert.deepEqual(Object.keys(p.states!), ['dry','soaked','cooked','tinned']);
    assert.match(renderReferenceHtml(p), /States \/ preparations/);
    assert.match(renderReferenceHtml(p), /tinned \/ canned/);
  }
  const escaped = new Vocabulary([ingredient('food', {states: {dry: {names: {en: '<dry>'}, aliases: ['<alias>']}}})]);
  const html = renderReferenceHtml(createReferencePage(escaped, 'ingredient', 'food')!);
  assert.match(html, /&lt;dry&gt;/); assert.match(html, /&lt;alias&gt;/); assert.doesNotMatch(html, /<dry>|<alias>/);
});

test('all 410 corpus ASTs differ only by deliberate source-preserving lentil state annotations', async () => {
  const before = new Vocabulary(vocabulary.entries.map(e => {
    const copy = {...e}; delete copy.states;
    if (copy.id === 'brown-lentils') delete copy.type_of;
    return copy;
  }));
  const files = await recipeFiles('examples/public-domain-recipes'); assert.equal(files.length, 410);
  let annotated = 0;
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const r = parseRecipe(source, {vocabulary});
    for (const t of tokens(r)) if (t.stateResolution) {
      assert.ok(['lentils','brown-lentils'].includes(t.canonicalId!));
      for (const s of t.stateResolution) assert.equal(source.slice(s.span.start,s.span.end), s.raw);
      annotated++; delete t.stateResolution;
    }
    assert.deepEqual(r, parseRecipe(source, {vocabulary: before}), file);
  }
  assert.equal(annotated, 1);
});
