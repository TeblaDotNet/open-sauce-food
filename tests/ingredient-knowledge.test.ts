import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseRecipe, renderCompact, renderHtml, renderCode, Vocabulary } from '../src/index.ts';
import type { Statement, VocabularyEntry } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';

const vocabulary = await loadVocabulary('.');
const egg = vocabulary.resolve('egg', 'ingredient')[0];
const recipe = (instructions: string, ingredients = '(egg) 4') => parseRecipe(`::ingredients\n${ingredients}\n::instructions\n${instructions}`, { vocabulary });
const pair = '(egg: yolk) <separate>\n(egg: white) <separate>';
const instructionTokens = (r: ReturnType<typeof parseRecipe>) => (r.sections.at(-1)!.children as Statement[]).flatMap(n => n.tokens ?? []);

test('canonical loader retains sparse knowledge; egg groups do not claim exhaustive anatomy', () => {
  assert.equal(vocabulary.entries.length, 715);
  assert.deepEqual(Object.keys(egg.parts!), ['yolk', 'white', 'shell']);
  assert.equal(egg.parts!.yolk.names['en-GB'], 'yolk');
  const groups = vocabulary.partGroups('egg');
  assert.equal(groups[0].id, 'separated_contents');
  assert.deepEqual(groups[0].group.parts, ['yolk', 'white']);
  assert.ok(!groups[0].group.parts.includes('shell'));
  assert.equal(egg.typical_mass, undefined); assert.equal(egg.nutrition, undefined);
  assert.equal(egg.parts!.yolk.typical_mass, undefined);
  assert.deepEqual(vocabulary.partGroups('unknown'), []);
  assert.deepEqual(vocabulary.partGroups('egg', ['unknown']), []);
});
test('known, unknown and partially known explicit paths remain source-preserving annotations', () => {
  const r = recipe('(egg: yolk) <beat>\n(egg: mystery) <beat>\n(egg: yolk: membrane) <remove>');
  const things = instructionTokens(r).filter(t => t.kind === 'thing');
  assert.deepEqual(things.map(t => t.partResolution), [
    { ids: ['yolk'], complete: true }, { ids: [], complete: false }, { ids: ['yolk'], complete: false }
  ]);
  assert.deepEqual(things[2].parts, ['yolk', 'membrane']);
  for (const t of things) assert.equal(r.source.slice(t.span.start, t.span.end), t.raw);
  assert.equal(r.diagnostics.filter(d => d.severity === 'error').length, 0);
  const noKnowledge = parseRecipe(r.source);
  assert.ok(instructionTokens(noKnowledge).every(t => t.partResolution === undefined));
  assert.equal(renderCode(r), renderCode(noKnowledge));
});
test('nested parts and aliases resolve within the correct parent only; ambiguity is not guessed', () => {
  const v = new Vocabulary([{ id: 'chicken', kind: 'ingredient', names: { en: 'chicken' },
    parts: { thigh: { names: { en: 'thigh' }, parts: { skin: { names: { en: 'skin' }, aliases: ['outer covering'] } } },
      breast: { names: { en: 'breast' }, aliases: ['cut'] }, wing: { names: { en: 'wing' }, aliases: ['cut'] } } }]);
  assert.deepEqual(v.resolvePartPath('chicken', ['thigh', 'outer covering']).ids, ['thigh', 'skin']);
  assert.equal(v.resolvePartPath('chicken', ['skin']).complete, false);
  assert.equal(v.resolvePartPath('chicken', ['cut']).complete, false);
  assert.deepEqual(v.resolve('skin', 'ingredient'), []);
});
test('vocabulary and recipe annotations survive JSON round trips', () => {
  const copy = new Vocabulary(JSON.parse(JSON.stringify(vocabulary.entries)));
  assert.deepEqual(copy.partGroups('egg'), vocabulary.partGroups('egg'));
  const r = recipe(pair);
  assert.equal(renderCompact(JSON.parse(JSON.stringify(r)), { vocabulary: copy }), renderCompact(r, { vocabulary }));
});
test('sourced quantity modules accept synthetic test data without populating real datasets', () => {
  // Deliberately synthetic: exercises schema transport, not a nutritional claim.
  const q = { value: 123, unit: 'test-unit', approximate: true, source: { citation: 'Synthetic test fixture, not food data' }, locale: 'test', state: 'test-state' };
  const v = new Vocabulary([{ id: 'test-food', kind: 'ingredient', names: { en: 'test food' },
    typical_mass: [q], reference_density: [q], nutrition: { per_100g: { test_nutrient: q } },
    parts: { piece: { names: { en: 'piece' }, typical_mass: [q] } } }]);
  assert.deepEqual(v.resolvePartPath('test-food', ['piece']).parts[0].typical_mass, [q]);
  assert.deepEqual(JSON.parse(JSON.stringify(v.entries))[0].nutrition.per_100g.test_nutrient, q);
});
for (const [label, fields] of [
  ['missing provenance', { typical_mass: [{ value: 1, unit: 'g', approximate: true }] }],
  ['missing approximation', { reference_density: [{ value: 1, unit: 'g/ml', source: { citation: 'test' } }] }],
  ['invalid value', { typical_mass: [{ value: -1, unit: 'g', approximate: true, source: { citation: 'test' } }] }],
  ['dangling group', { part_groups: { broken: { process: 'separate', parts: ['yolk', 'unknown'] } } }],
  ['duplicate group member', { parts: egg.parts, part_groups: { broken: { process: 'separate', parts: ['yolk', 'yolk'] } } }],
  ['invalid part names', { parts: { yolk: { names: { en: 7 } } } }]
] as const) test(`knowledge validation rejects ${label}`, () => {
  assert.throws(() => new Vocabulary([{ id: 'test', kind: 'ingredient', names: { en: 'test' }, ...fields } as unknown as VocabularyEntry]), /Invalid ingredient knowledge/);
});
test('egg separation uses explicit grouping and preserves AST, code text and HTML anchors', async () => {
  const r = parseRecipe(await readFile('examples/public-domain-recipes/tiramisu/tiramisu.opensauce', 'utf8'), { vocabulary });
  const before = JSON.stringify(r), code = renderCode(r);
  assert.match(renderCompact(r, { vocabulary }), /Separate the eggs into yolks and whites\./);
  assert.match(renderCompact(r), /Separate the egg yolk\.\nSeparate the egg white\./);
  const html = renderHtml(r, { vocabulary, view: 'compact' });
  assert.match(html, /data-known-part-path="\[&quot;yolk&quot;\]" data-parts-complete="true"/);
  const separating = (r.sections.find(s => s.name === 'instructions')!.children as Statement[]).filter(n => n.kind === 'statement' && n.tokens.some(t => t.name === 'separate'));
  for (const n of separating) assert.ok(html.includes(`id="os-${n.id}"`));
  assert.ok(!html.includes('undefined'));
  assert.equal(JSON.stringify(r), before); assert.equal(renderCode(r), code);
  assert.match(renderCompact(recipe(pair, '(egg) 1'), { vocabulary }), /Separate the egg into yolk and white\./);
});
for (const [label, source, ingredients] of [
  ['duplicate parts', pair.replace('white', 'yolk'), '(egg) 4'],
  ['unknown part', pair.replace('white', 'unknown'), '(egg) 4'],
  ['shell outside group', pair.replace('white', 'shell'), '(egg) 4'],
  ['extra parameter', pair.replace('<separate>', '<separate, bowl>'), '(egg) 4'],
  ['inline comment', pair.replace('\n', ' # preserve\n'), '(egg) 4'],
  ['standalone comment', pair.replace('\n', '\n# preserve\n'), '(egg) 4'],
  ['blank boundary', pair.replace('\n', '\n\n'), '(egg) 4'],
  ['variant', pair.replaceAll('egg:', 'egg; large:'), '(egg; large) 4'],
  ['qualifier', pair.replace('yolk)', 'yolk, beaten)'), '(egg) 4'],
  ['legacy qualifier', pair.replaceAll('egg:', 'egg,'), '(egg) 4'],
  ['unknown count', pair, '(egg) as needed'],
  ['approximate count', pair, '(egg) ~4'],
  ['part-only declarations', pair, '(egg: yolk) 4\n(egg: white) 4'],
  ['different base', pair.replace('(egg: white)', '(chicken: white)'), '(egg) 4\n(chicken) 4'],
  ['nested action', pair.replace('\n', '\n    <beat>\n'), '(egg) 4'],
  ['group boundary', '(egg: yolk) <separate>\nOptional [\n(egg: white) <separate>\n]', '(egg) 4']
]) test(`separation does not merge ${label}`, () => {
  assert.doesNotMatch(renderCompact(recipe(source, ingredients), { vocabulary }), /Separate the eggs into/);
});
test('no inferred grouping without metadata or with custom display hooks', () => {
  const sparse = new Vocabulary([{ ...egg, part_groups: undefined }]);
  const r = recipe(pair);
  assert.doesNotMatch(renderCompact(r, { vocabulary: sparse }), /Separate the eggs into/);
  assert.doesNotMatch(renderCompact(r, { vocabulary, formatTerm: t => t.name! }), /Separate the eggs into/);
});
test('Apple Pie inherited addition places destination before purpose and keeps ice-cold state', async () => {
  const source = await readFile('examples/public-domain-recipes/apple-pie/apple-pie.opensauce', 'utf8');
  const r = parseRecipe(source, { vocabulary }), before = JSON.stringify(r);
  assert.match(renderCompact(r), /Add enough ice-cold water to the crust to make the dough hold together\./);
  assert.match(renderHtml(r, { view: 'compact' }).replace(/<[^>]+>/g, ''), /Add enough ice-cold water to the crust to make the dough hold together\./);
  assert.equal(JSON.stringify(r), before);
});
test('addition retains arbitrary suffixes, amounts and unresolved role text without guessing', () => {
  const r = recipe('{mix} <stir>\n    + (water) enigmatic & <strange>\n    + (water) 20ml\n    + (water) enough to coat everything', '(water) 50ml');
  assert.match(renderCompact(r), /Add water to the mix \(20ml\)/);
  assert.match(renderCompact(r), /Add enough water to the mix to coat everything/);
  assert.match(renderCompact(r), /enigmatic &/);
  const unknown = recipe('{crust} <stir>\n    + (water, for crust) enough to coat everything', '');
  assert.match(renderCompact(unknown), /water \(for crust\)/);
});
