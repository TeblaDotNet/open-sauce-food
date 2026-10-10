import {restoreCorpusRepairs, repairedRecipeCount} from './helpers/corpus-quality-unattended.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseRecipe, isPublished, conversionStages, renderCode, buildUsageIndex, createReferencePage } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { recipeFiles } from '../scripts/corpus.ts';
import { restoreRecipePublication } from './helpers/recipe-publication.ts';
import { loadCorpus } from '../scripts/site/corpus.ts';
import { routes, siteConfig } from '../scripts/site/routes.ts';
const vocabulary = await loadVocabulary('.');
for (const stage of conversionStages) test('conversion stage ' + stage + ' is independent of curation', () => {
  for (const review of ['checked', 'unchecked']) {
    const source = '::recipe\nname: Test\nconversion stage: ' + stage + '\ncuration origin: generated\ncuration review: ' + review;
    const r = parseRecipe(source);
    assert.equal(r.conversionStage, stage); assert.equal(r.curation?.review, review);
    assert.equal(isPublished(r), stage === 'reworked'); assert.equal(r.source, source); assert.equal(parseRecipe(renderCode(r)).conversionStage, stage);
  }
});
for (const field of ['conversion stage: gold', 'conversion stage: second-pass', 'conversion stage: v2', 'conversion stage:', 'conversion stage: reworked\nconversion stage: reworked', 'conversion stage: reworked\nconversion stage: invalid']) test('invalid conversion metadata stays literal and fails closed: ' + field, () => {
  const source = '::recipe\nname: Test\n' + field;
  const r = parseRecipe(source); assert.equal(r.conversionStage, undefined);
  assert.ok(r.diagnostics.some(d => d.code === 'INVALID_CONVERSION_STAGE' && d.severity === 'warning'));
  assert.equal(r.source, source); assert.equal(isPublished(r), false);
});
test('missing stage is unknown and hidden; explicit metadata alone can promote or demote', () => {
  assert.equal(isPublished(parseRecipe('::recipe\nname: Test')), false);
  for (const name of ['Orange Glorious', 'New recipe']) for (const stage of conversionStages)
    assert.equal(isPublished(parseRecipe('::recipe\nname: ' + name + '\nconversion stage: ' + stage)), stage === 'reworked');
});
test('all 410 recipes have one explicit stage and only header metadata changed', async () => {
  const counts = {initial: 0, reworked: 0, blocked: 0};
  const files = await recipeFiles('examples/public-domain-recipes'); assert.equal(files.length, 410);
  for (const file of files) {
    const source = restoreCorpusRepairs(await readFile(file, 'utf8'),file), before = restoreRecipePublication(source, file);
    assert.notEqual(source, before); // helper verifies the complete baseline SHA-256
    const r = parseRecipe(source, {vocabulary}), b = parseRecipe(before, {vocabulary});
    assert.ok(r.conversionStage); counts[r.conversionStage]++;
    assert.deepEqual(r.curation, b.curation);
    assert.deepEqual(r.sections.filter(s => s.originalSource).map(s => s.originalSource!.text), b.sections.filter(s => s.originalSource).map(s => s.originalSource!.text));
    assert.deepEqual(r.diagnostics.map(d => [d.code,d.message]), b.diagnostics.filter(d => d.code !== 'INVALID_CATEGORY').map(d => [d.code,d.message]));
    assert.equal(r.diagnostics.filter(d => d.severity === 'error').length, 0);
    assert.equal(r.sections.filter(s => s.name === 'recipe').flatMap(s => s.children).filter(n => n.kind === 'metadata' && n.key === 'conversion stage').length, 1);
  }
  assert.deepEqual(counts, {initial: 184, reworked: 216, blocked: 10});
});
test('six historical examples had explicit baseline decisions rather than a privileged quality class', async () => {
  const ledger = JSON.parse(await readFile('recipe-publication-decisions.json','utf8'));
  const ids = ['orange-glorious','bloody-mary-mix','chicken-tikka-masala','smoked-salmon-pasta-primavera','hakka-style-meatballs','ravioli'];
  for (const id of ids) {
    assert.ok(ledger.records[id].reason);
    const source = restoreCorpusRepairs(await readFile('examples/public-domain-recipes/' + id + '/' + id + '.opensauce', 'utf8'), id);
    assert.equal(parseRecipe(source).conversionStage, 'initial');
    assert.equal(isPublished(parseRecipe(source.replace('conversion stage: initial','conversion stage: reworked'))), true);
  }
});
test('whole-corpus usage remains available independently of filtered public usage for all kinds', async () => {
  const corpus = await loadCorpus('.', vocabulary, routes(siteConfig()));
  const items = corpus.records.map(r => ({id:r.slug,name:r.name,recipe:corpus.parsed.get(r.slug)!}));
  const all = buildUsageIndex(items), published = buildUsageIndex(items.filter(r => isPublished(r.recipe)));
  const bowlKey = JSON.stringify(['equipment', 'bowl']);
  assert.ok(all.concepts[bowlKey].length > published.concepts[bowlKey].length);
  assert.equal(createReferencePage(vocabulary, 'equipment', 'bowl', all), undefined);
  assert.equal(all.recipeCount,410); assert.equal(published.recipeCount,216+repairedRecipeCount);
  for (const [kind,id] of [['ingredient','egg'],['equipment','knife'],['process','stir']] as const) {
    const a = createReferencePage(vocabulary,kind,id,all)!, p = createReferencePage(vocabulary,kind,id,published)!;
    assert.ok(a.usage!.length > p.usage!.length);
    assert.ok(p.usage!.every(r => isPublished(corpus.parsed.get(r.id)!)));
    assert.equal(p.usage!.length, a.usage!.filter(r => isPublished(corpus.parsed.get(r.id)!)).length);
  }
});
