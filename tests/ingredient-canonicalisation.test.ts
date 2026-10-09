import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { parse as yaml } from 'yaml';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { parseRecipe, renderCode, createReferencePage, buildUsageIndex, renderReferenceHtml } from '../src/index.ts';
import { recipeFiles } from '../scripts/corpus.ts';

const vocabulary = await loadVocabulary('.');
const localRoles = JSON.parse(await readFile('ingredient-local-role-decisions.json', 'utf8'));
const decisions = JSON.parse(await readFile('ingredient-knowledge-decisions.json', 'utf8'));

test('ingredient singular/plural merges preserve every absorbed lexical form and evidence', () => {
  for (const change of decisions.changes) {
    const entry = vocabulary.entries.find(e => e.kind === 'ingredient' && e.id === change.to)!;
    assert.equal(vocabulary.entries.some(e => e.kind === 'ingredient' && e.id === change.from), false);
    const evidence = entry.evidence!.canonicalisation as { absorbed_entries: any[]; review: string };
    assert.equal(evidence.review, 'unchecked');
    const old = evidence.absorbed_entries.find(e => e.id === change.from);
    assert.ok(old.evidence.seen_in.length);
    for (const name of [old.id, old.canonical_name, ...Object.values(old.names)])
      assert.deepEqual(vocabulary.resolve(String(name), 'ingredient').map(e => e.id), [change.to]);
  }
  for (const name of ['red chilli', 'red chillies', 'red chilies', 'red-chillies'])
    assert.deepEqual(vocabulary.resolve(name, 'ingredient').map(e => e.id), ['red-chilli']);
  for (const name of ['oat', 'oats'])
    assert.deepEqual(vocabulary.resolve(name, 'ingredient').map(e => e.id), ['oats']);
});

test('merged ingredient references combine real corpus backlinks without rewriting source', async () => {
  const corpus = [];
  for (const file of await recipeFiles('examples/public-domain-recipes')) {
    const source = await readFile(file, 'utf8');
    const recipe = parseRecipe(source, { vocabulary });
    assert.equal(recipe.source, source);
    corpus.push({ id: file.replaceAll('\\', '/').split('/').at(-2)!, name: file, recipe });
  }
  const usage = buildUsageIndex(corpus);
  for (const [id, expected] of [
    ['oats', ['granola', 'oat-milk', 'oatmeal-cookies', 'oats']],
    ['red-chilli', ['bebek-mropol', 'chicken-tomato-spinach-curry', 'japanese-noodle-soup', 'red-lentil-dahl', 'spicy-sausage-pasta']],
  ] as const) {
    const page = createReferencePage(vocabulary, 'ingredient', id, usage)!;
    assert.deepEqual(page.usage!.map(r => r.id).sort(), [...expected].sort());
    const html = renderReferenceHtml(page);
    for (const slug of expected) assert.ok(html.includes(`?recipe=${slug}`));
  }
  const text = '::ingredients\n(red chillies, dried) 2\n(oat) 1 cup\n';
  const parsed = parseRecipe(text, { vocabulary });
  assert.equal(parsed.source, text);
  assert.match(renderCode(parsed), /\(red chillies, dried\)/);
  assert.match(renderCode(parsed), /\(oat\)/);
});

test('ingredient canonical index is complete and merged IDs do not leave duplicate public pages', async () => {
  const index = yaml(await readFile('ingredients/index.yaml', 'utf8'));
  const files = (await readdir('ingredients')).filter(f => f.endsWith('.yaml') && f !== 'index.yaml').sort();
  for (const entry of index.entries) assert.ok(files.includes(entry.file));
  // Historical seed files are intentionally excluded by the schema 0.3 index.
  for (const c of decisions.changes) assert.equal(files.includes(c.from + '.yaml'), false);
  assert.equal(index.entries.length, decisions.afterCount - localRoles.entries.length);
  assert.equal(new Set(index.entries.map((e: {id: string}) => e.id)).size, decisions.afterCount - localRoles.entries.length);
  for (const c of decisions.changes) assert.equal(createReferencePage(vocabulary, 'ingredient', c.from), undefined);
  assert.equal(vocabulary.resolvePartPath('egg', ['yolk']).complete, true);
  assert.ok(renderReferenceHtml(createReferencePage(vocabulary, 'ingredient', 'egg')!).includes('id="part-yolk"'));
  assert.ok(renderReferenceHtml(createReferencePage(vocabulary, 'ingredient', 'flour')!).includes('Variants'));
  for (const [a,b] of [['courgette','zucchini'],['aubergine','eggplant']])
    assert.deepEqual(vocabulary.resolve(a,'ingredient').map(e=>e.id),vocabulary.resolve(b,'ingredient').map(e=>e.id));
  assert.notEqual(vocabulary.resolve('tomato','ingredient')[0].id,vocabulary.resolve('tomato paste','ingredient')[0].id);
});
