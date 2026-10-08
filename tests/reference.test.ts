import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const corpusSize = JSON.parse(readFileSync('public-domain-import.json', 'utf8')).summary.finalPromoted;
import { resolve } from 'node:path';
import { Vocabulary, parseRecipe, createReferencePage, buildUsageIndex, renderReferenceHtml, renderHtml, recipeReferenceUrl } from '../src/index.ts';
import type { SourcedQuantity, Statement } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { loadReferenceCorpus } from '../scripts/reference-corpus.ts';
import { createDemoServer } from '../scripts/demo-server.ts';

const vocabulary = await loadVocabulary('.');
test('reference model projects rich egg knowledge, provenance and groups without mutating vocabulary', () => {
  const before = JSON.stringify(vocabulary.entries);
  const page = createReferencePage(vocabulary, 'ingredient', 'egg')!;
  assert.equal(page.name, 'egg'); assert.equal(page.pluralNames?.en, 'eggs');
  assert.deepEqual(page.parts.map(p => p.path), [['yolk'], ['white'], ['shell']]);
  assert.equal(page.groups[0].id, 'separated_contents');
  assert.equal(page.groups[0].processUrl, '/reference/process/separate');
  assert.deepEqual(page.groups[0].members.map(p => p.anchor), ['part-yolk', 'part-white']);
  assert.match(page.groups[0].sources![0].citation, /tiramisu/);
  assert.ok(page.evidence?.seen_in); assert.ok(page.observations.qualifiers?.length);
  assert.equal(page.usage, undefined); assert.equal(page.typical_mass, undefined);
  page.parts[0].names['en-GB'] = 'edited projection';
  assert.equal(JSON.stringify(vocabulary.entries), before);
  assert.equal(createReferencePage(vocabulary, 'ingredient', 'missing'), undefined);
});

test('sparse courgette and flour retain names and aliases without empty knowledge modules', () => {
  const courgette = createReferencePage(vocabulary, 'ingredient', 'courgette')!;
  assert.equal(courgette.names['en-US'], 'zucchini');
  assert.equal(courgette.aliases[0].name, 'zucchini');
  for (const id of ['courgette', 'flour']) {
    const html = renderReferenceHtml(createReferencePage(vocabulary, 'ingredient', id)!);
    assert.match(html, /<h2>Names<\/h2>/);
    assert.doesNotMatch(html, /<h2>(Parts|Culinary groups|Typical mass|Reference density|Nutrition per 100 g)<\/h2>|<table|<ul><\/ul>/);
  }
});

const nested = new Vocabulary([{ id: 'chicken', kind: 'ingredient', names: { en: 'chicken' }, parts: {
  thigh: { names: { en: 'thigh' }, parts: { skin: { names: { en: 'skin' } }, meat: { names: { en: 'meat' } } },
    part_groups: { deboned: { process: 'remove', parts: ['skin', 'meat'] } } }
} }]);
test('nested part paths and group anchors preserve parent context; unknown processes stay plain text', () => {
  const page = createReferencePage(nested, 'ingredient', 'chicken')!;
  const skin = page.parts[0].parts[0];
  assert.deepEqual(skin.path, ['thigh', 'skin']); assert.equal(skin.anchor, 'part-thigh/skin');
  assert.equal(page.parts[0].groups[0].members[0].anchor, skin.anchor);
  const html = renderReferenceHtml(page);
  assert.match(html.replace(/<[^>]+>/g, ''), /chicken › thigh › skin/);
  assert.match(html, /id="part-thigh\/skin"/);
  assert.match(html, /href="#part-thigh\/skin"/);
  assert.doesNotMatch(html, /href="\/reference\/process\/remove"/);
});

test('recipe reference URLs target known nested parts and fall back to base for unknown suffixes', () => {
  for (const [part, anchor] of [['thigh: skin', '#part-thigh/skin'], ['thigh: unknown', '']]) {
    const recipe = parseRecipe(`::ingredients\n(chicken: ${part})`, { vocabulary: nested });
    assert.match(renderHtml(recipe, { referenceUrl: recipeReferenceUrl }), new RegExp(`href="/reference/ingredient/chicken${anchor}"`));
  }
  const recipe = parseRecipe('::ingredients\n(egg)\n::equipment\n(bowl)\n::instructions\n(egg: yolk) <separate>', { vocabulary });
  const html = renderHtml(recipe, { referenceUrl: recipeReferenceUrl });
  for (const href of ['/reference/ingredient/egg#part-yolk', '/reference/process/separate', '/reference/equipment/bowl']) assert.ok(html.includes(`href="${href}"`));
});

test('usage counts recipes once, keeps base/part/variant forms, and ignores opaque source and prose', () => {
  const source = '::ingredients\n(egg) 2\n(egg; free range: yolk) 1\n::instructions\n(egg: white) <separate>\n(egg: white) <separate>\n::story\nA story about flour and baking\n::source\n<<<\n::ingredients\n(flour)\n::instructions\n<magic>\n>>>';
  const recipe = parseRecipe(source, { vocabulary });
  const before = JSON.stringify(recipe);
  const index = buildUsageIndex([{ id: 'one', name: 'One', recipe }, { id: 'two', name: 'Two', recipe: parseRecipe('::instructions\n<separate>', { vocabulary }) }]);
  const egg = createReferencePage(vocabulary, 'ingredient', 'egg', index)!;
  assert.equal(index.recipeCount, 2); assert.equal(egg.usage?.length, 1);
  assert.deepEqual(egg.usage![0].forms, [
    { parts: [] }, { parts: ['yolk'], variant: 'free range', canonicalParts: ['yolk'] }, { parts: ['white'], canonicalParts: ['white'] }
  ]);
  assert.equal(createReferencePage(vocabulary, 'process', 'separate', index)!.usage!.length, 2);
  assert.equal(createReferencePage(vocabulary, 'ingredient', 'flour', index)!.usage!.length, 0);
  assert.equal(JSON.stringify(recipe), before);
  assert.throws(() => buildUsageIndex([{ id: 'one', name: '', recipe }, { id: 'one', name: '', recipe }]), /Duplicate/);
});

test('usage visits nested actions and group conditions; unresolved, ambiguous and choice tokens are not global concepts', () => {
  const recipe = parseRecipe('::ingredients\n(egg)\n::instructions\nRepeat [\n  (egg) <beat>\n    <stir>\n]\nuntil <bake>\n(mystery) <magic>', { vocabulary });
  const index = buildUsageIndex([{ id: 'nested', name: 'Nested', recipe }]);
  for (const id of ['beat', 'stir', 'bake']) assert.equal(createReferencePage(vocabulary, 'process', id, index)!.usage!.length, 1);
  const artificial = parseRecipe('::ingredients\n(egg)', { vocabulary });
  (artificial.sections[0].children[0] as Statement).tokens[0].thingKind = 'ambiguous';
  assert.equal(Object.keys(buildUsageIndex([{ id: 'ambiguous', name: '', recipe: artificial }]).concepts).length, 0);
});

test('reference HTML escapes names, evidence, aliases, URLs and sourced quantitative metadata', () => {
  const q: SourcedQuantity = { value: 17, unit: 'g<script>', approximate: true,
    source: { citation: '<script>citation</script>', url: 'javascript:alert(1)', note: '" & <note>', accessed: '2026-01-01' }, state: '<raw>', locale: 'en-GB' };
  const synthetic = new Vocabulary([{ id: 'test"<bad>', kind: 'ingredient', names: { en: '<img src=x onerror=bad>' }, aliases: ['<svg>'],
    evidence: { seen_in: ['</pre><script>bad</script>'] }, typical_mass: [q], reference_density: [{ ...q, unit: 'g/ml', approximate: false }],
    nutrition: { per_100g: { protein: { ...q, unit: 'g' } } }, parts: { sample: { names: { en: '<part>' }, typical_mass: [q] } } }]);
  const html = renderReferenceHtml(createReferencePage(synthetic, 'ingredient', 'test"<bad>')!);
  assert.doesNotMatch(html, /<script|<img|<svg|<part>|href="javascript:/);
  assert.match(html, /&lt;script&gt;/); assert.match(html, /~17 g&lt;script&gt;/);
  assert.match(html, /<h2>Typical mass<\/h2>/); assert.match(html, /<h2>Reference density<\/h2>/);
  assert.match(html, /<h2>Nutrition per 100 g<\/h2>/); assert.match(html, /protein:/);
  assert.match(html, /state: &lt;raw&gt;/); assert.match(html, /accessed 2026-01-01/);
});

test('provenance paths stay text, explicit safe URLs link, and colour off preserves semantic content', () => {
  const page = createReferencePage(vocabulary, 'ingredient', 'egg')!;
  const on = renderReferenceHtml(page), off = renderReferenceHtml(page, { colour: false });
  assert.equal(off, on.replace('data-colour="on"', 'data-colour="off"'));
  assert.match(off, /Source: examples\/public-domain-recipes\/tiramisu/);
  assert.doesNotMatch(off, /href="examples\//);
  page.groups[0].sources = [{ citation: 'A & B', url: 'https://example.test/?x=1&y=2' }];
  assert.match(renderReferenceHtml(page), /href="https:\/\/example.test\/\?x=1&amp;y=2">A &amp; B/);
});

test('all promoted recipes feed live usage; sparse process pages expose evidence without invented modules', async () => {
  const corpus = await loadReferenceCorpus(resolve('.'), vocabulary);
  assert.equal(corpus.catalog.length, corpusSize); assert.equal(corpus.usage.recipeCount, corpusSize);
  for (const [kind, id] of [['ingredient', 'egg'], ['ingredient', 'courgette'], ['ingredient', 'flour'], ['process', 'separate'], ['process', 'bake']] as const) {
    const page = createReferencePage(vocabulary, kind, id, corpus.usage)!;
    assert.ok(page.usage!.length > 0); assert.equal(new Set(page.usage!.map(r => r.id)).size, page.usage!.length);
    for (const r of page.usage!) assert.ok(corpus.catalog.some(c => c.id === r.id));
    const html = renderReferenceHtml(page);
    assert.ok(html.includes(`Used in ${page.usage!.length} recipes`));
    assert.doesNotMatch(html, /<h2>(Definition|Tutorials|Typical equipment|Nutrition per 100 g)<\/h2>/);
  }
  const egg = createReferencePage(vocabulary, 'ingredient', 'egg', corpus.usage)!;
  assert.ok(egg.usage!.find(r => r.id === 'tiramisu')?.forms.some(f => f.parts[0] === 'yolk'));
  const separate = createReferencePage(vocabulary, 'process', 'separate', corpus.usage)!;
  assert.ok(separate.usage!.length >= 4);
  assert.ok(separate.observations.parameters?.length);
  // The renderer displays the computed count even if historical evidence is stale.
  separate.evidence = { current_recipe_count: 999 };
  assert.ok(renderReferenceHtml(separate).includes(`Used in ${separate.usage!.length} recipes`));
});

test('reference routes support direct loads, JSON models, all promoted usage links and unknown-page 404s', async () => {
  const server = await createDemoServer();
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const path of ['/reference/ingredient/egg', '/reference/ingredient/courgette', '/reference/process/separate', '/reference/equipment/bowl']) {
      const response = await fetch(base + path); assert.equal(response.status, 200);
      assert.match(await response.text(), /Syntax colour/);
    }
    const page = await (await fetch(base + '/api/reference/ingredient/egg')).json();
    assert.equal(page.corpusSize, corpusSize); assert.equal(page.parts[0].anchor, 'part-yolk');
    const catalog = await (await fetch(base + '/api/corpus')).json(); assert.equal(catalog.length, corpusSize);
    for (const font of ['manrope', 'fira-code']) {
      const response = await fetch(base + `/demo/fonts/${font}.woff2`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'font/woff2');
      assert.ok((await response.arrayBuffer()).byteLength > 1000);
    }
    const spec = await fetch(base + '/SPEC.md');
    for (const name of ['theme-init', 'dark-mode']) {
      const script = await fetch(base + `/demo/${name}.js`);
      assert.equal(script.status, 200); assert.match(await script.text(), /dark-mode/);
    }
    assert.equal(spec.status, 200); assert.match(spec.headers.get('content-type')!, /text\/plain/);
    assert.equal((await fetch(base + '/package.json')).status, 404);
    const ratatouille = catalog.find((r: { id: string }) => r.id === 'ratatouille');
    assert.equal((await fetch(base + ratatouille.path)).status, 200);
    for (const path of ['/reference/ingredient/unknown', '/api/reference/process/unknown', '/reference/ingredient/egg/extra', '/api/reference/ingredient/%3Cscript%3E'])
      assert.equal((await fetch(base + path)).status, 404);
    assert.equal((await fetch(base + '/api/reference/ingredient/egg', { method: 'POST' })).status, 405);
    assert.equal(await (await fetch(base + '/reference/process/bake', { method: 'HEAD' })).text(), '');
  } finally { await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done())); }
});
