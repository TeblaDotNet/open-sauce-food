import assert from 'node:assert/strict';
import { restoreGeneratedReconversion } from './helpers/generated-reconversion.ts';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseRecipe, renderOriginalSource, renderCode, renderCompact, renderHtml } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { ingredient, method } from '../scripts/public-domain-conversion.ts';

const manifest = JSON.parse(readFileSync('public-domain-import.json', 'utf8'));
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const vocabulary = await loadVocabulary('.');

test('upstream inventory accounts for every document, including holds and near duplicates', () => {
  const records = manifest.records;
  assert.equal(records.length, 411);
  assert.equal(new Set(records.map((r: any) => r.upstreamPath)).size, records.length);
  assert.equal(manifest.summary.upstreamRecipes, 415);
  assert.equal(manifest.summary.alreadyRepresented + manifest.summary.newlyConverted + manifest.summary.skippedRecipes, 415);
  assert.equal(manifest.summary.finalPromoted, 410);
  assert.equal(manifest.summary.nearDuplicatePairs, 2);
  const exclusions = JSON.parse(readFileSync('release-exclusions.json', 'utf8')).records;
  assert.equal(exclusions.length, 5);
  for (const { slug } of exclusions) {
    assert.ok(!records.some((r: any) => r.slug === slug));
    assert.ok(!existsSync('source/public-domain-recipes/' + slug));
    assert.ok(!existsSync('examples/public-domain-recipes/' + slug));
  }
  assert.match(readFileSync('source/public-domain-recipes/upstream-2026-10-08/LICENSE.md', 'utf8'), /public domain/i);
});

test('the retained 117 promoted recipes restore their original imported hashes', () => {
  assert.equal(manifest.baseline.length, 117);
  for (const item of manifest.baseline) {
    const text = restoreGeneratedReconversion(readFileSync(item.path, 'utf8'), item.path);
    assert.ok(hash(text) === item.sha256 || hash(text.replaceAll('\r\n', '\n')) === item.lfSha256, item.path);
  }
});

test('all retained upstream originals and copied images match their recorded content hashes', () => {
  let copied = 0;
  for (const item of manifest.records) {
    const original = readFileSync(item.retainedPath);
    assert.ok(hash(original) === item.upstreamSha256 || hash(original.toString('utf8').replaceAll('\r\n', '\n')) === item.upstreamLFSha256, item.retainedPath);
    for (const image of item.images) if (image.status === 'copied-image') {
      assert.equal(hash(readFileSync(image.sourcePath)), image.sha256, image.sourcePath);
      assert.equal(hash(readFileSync(image.promotedPath)), image.sha256, image.promotedPath);
      copied++;
    }
  }
  assert.equal(copied, 82);
});

test('all 293 new recipes preserve embedded source and render in every view', () => {
  const newly = manifest.records.filter((r: any) => r.conversionStatus === 'converted');
  assert.equal(newly.length, 293);
  for (const item of newly) {
    const text = readFileSync(item.opensaucePath, 'utf8');
    const original = readFileSync(item.retainedPath, 'utf8').replaceAll('\r\n', '\n');
    const recipe = parseRecipe(text, { vocabulary });
    assert.deepEqual(recipe.diagnostics.filter(d => d.severity === 'error'), [], item.slug);
    assert.equal(renderOriginalSource(recipe).replaceAll('\r\n', '\n'), original + (item.sourceFramingNewline ? '\n' : ''), item.slug);
    assert.ok(renderCompact(recipe).length, item.slug);
    assert.deepEqual(parseRecipe(renderCode(recipe)).diagnostics.filter(d => d.severity === 'error'), [], item.slug);
    for (const view of ['compact', 'code', 'originalSource'] as const) assert.ok(renderHtml(recipe, { view }).length, item.slug);
  }
});

test('quantity conversion preserves packages, decimal quantities and worded historical measures', () => {
  const pack = ingredient('1 can (400g) tomatoes', vocabulary, '');
  assert.match(pack.line, /1 can （400g）/);
  assert.ok(!pack.line.includes('/'));
  assert.equal(ingredient('.5 tsp salt', vocabulary, '').amount, '.5 tsp');
  assert.equal(ingredient('1 ½ tablespoon sugar', vocabulary, '').amount, '1 ½ tablespoon');
  assert.equal(ingredient('2 lb. potatoes', vocabulary, '').amount, '2 lb.');
  assert.equal(ingredient('Eight eggs', vocabulary, '').amount, 'Eight');
});

test('method conversion links only an unambiguous direct object and retains conditionals as prose', () => {
  const flour = ingredient('100g flour', vocabulary, '');
  assert.equal(method('Mix the flour with water.', [flour]).line, '(flour) <mix, with water>');
  assert.equal(method('Mix the flour with water.', [flour, flour]).line, '<mix, the flour with water>');
  const conditional = method('If needed, add water (a little at a time).', [flour]);
  assert.equal(conditional.mode, 'literal');
  assert.match(conditional.line, /（a little at a time）/);
});
