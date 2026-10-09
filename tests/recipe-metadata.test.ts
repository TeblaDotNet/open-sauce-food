import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseRecipe, renderCode, renderHtml, recipeCategories, dietaryDisclaimer } from '../src/index.ts';
import { recipeFiles } from '../scripts/corpus.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { restoreRecipeClassification } from './helpers/recipe-classification.ts';
import { restoreRecipePublication } from './helpers/recipe-publication.ts';

for (const category of recipeCategories) test('optional category: ' + category, () => {
  const source = '::recipe\nname: Example\ncategory: ' + category + '\n';
  const recipe = parseRecipe(source);
  assert.equal(recipe.category, category);
  assert.deepEqual(recipe.diagnostics, []);
  assert.equal(recipe.source, source);
  assert.equal(parseRecipe(renderCode(recipe)).category, category);
});
for (const value of ['sauce', 'baking', 'soup', 'dip', 'Main', 'main, side', '', 'main\ncategory: main', 'main\ncategory: side']) test('invalid category stays literal: ' + value, () => {
  const source = '::recipe\nname: Example\ncategory: ' + value + '\n';
  const recipe = parseRecipe(source);
  assert.equal(recipe.category, undefined);
  assert.deepEqual(recipe.diagnostics.map(d => [d.severity, d.code]), [['warning', 'INVALID_CATEGORY']]);
  assert.equal(recipe.source, source);
});
test('minimal recipes need no classification metadata', () => {
  const recipe = parseRecipe('::recipe\nname: Minimal\n::ingredients\n(water) 1 cup');
  for (const key of ['category', 'dietary', 'cuisine', 'region'] as const) assert.equal(recipe[key], undefined);
  assert.deepEqual(recipe.diagnostics, []);
});
test('dietary lists are extensible, ordered, trimmed and exact-deduplicated', () => {
  const recipe = parseRecipe('::recipe\nname: Example\ndietary: vegan, nut-free, gluten-free\ndietary: vegan, dairy-free, family-specific\n');
  assert.deepEqual(recipe.dietary, ['vegan', 'nut-free', 'gluten-free', 'dairy-free', 'family-specific']);
  assert.deepEqual(recipe.diagnostics, []);
  for (const value of ['', 'vegan,', ',vegan', 'vegan,,nut-free']) {
    const invalid = parseRecipe('::recipe\nname: Example\ndietary: ' + value);
    assert.equal(invalid.dietary, undefined);
    assert.ok(invalid.diagnostics.some(d => d.code === 'INVALID_DIETARY'));
  }
});
test('plain-text cuisine/region preserve arbitrary values; duplicates warn', () => {
  const recipe = parseRecipe('::recipe\nname: Example\ncuisine: Family <fusion> & friends\nregion: Somewhere / anywhere\n');
  assert.equal(recipe.cuisine, 'Family <fusion> & friends');
  assert.equal(recipe.region, 'Somewhere / anywhere');
  assert.deepEqual(recipe.diagnostics, []);
  const html = renderHtml(recipe);
  assert.ok(html.includes('Family &lt;fusion&gt; &amp; friends'));
  for (const key of ['cuisine', 'region'] as const) for (const fields of [key + ':', key + ': one\n' + key + ': two']) {
    const invalid = parseRecipe('::recipe\nname: Example\n' + fields);
    assert.equal(invalid[key], undefined);
    assert.ok(invalid.diagnostics.some(d => d.code === 'INVALID_' + key.toUpperCase()));
  }
});
test('classification is independent of conversion and curation and ignores original payload metadata', () => {
  const source = '::recipe\nname: Example\ncategory: main\nconversion stage: blocked\ncuration origin: generated\ncuration review: checked\n::source\n<<<\ncategory: dessert\ndietary: vegan\ncuisine: historic\n>>>\n';
  const recipe = parseRecipe(source);
  assert.equal(recipe.category, 'main');
  assert.equal(recipe.dietary, undefined);
  assert.equal(recipe.cuisine, undefined);
  assert.equal(recipe.conversionStage, 'blocked');
  assert.deepEqual(recipe.curation, {origin: 'generated', review: 'checked'});
  assert.equal(recipe.source, source);
  assert.deepEqual(recipe.diagnostics, []);
});
test('dietary HTML carries advisory wording in Code and Compact; values stay escaped', () => {
  const recipe = parseRecipe('::recipe\nname: Example\ndietary: nut-free, <script>alert(1)</script>');
  for (const view of ['code', 'compact'] as const) {
    const html = renderHtml(recipe, {view});
    assert.ok(html.includes(dietaryDisclaimer));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
    assert.match(html, /Check ingredients, substitutions and product labels/);
  }
  assert.ok(!renderHtml(parseRecipe('::recipe\nname: Example')).includes('os-dietary-notice'));
});
test('classification docs explain optionality and dietary limitations', async () => {
  for (const path of ['README.md', 'SPEC.md', 'CONTRIBUTING.md']) {
    const doc = await readFile(path, 'utf8');
    assert.match(doc, /minimal recipe remains valid without/);
    assert.match(doc, /not a guarantee of suitability/);
    assert.match(doc, /No corpus-wide dietary, cuisine or region inference/);
  }
});
test('corpus classification changes only category metadata; culinary/source bytes stay protected', async () => {
  const vocabulary = await loadVocabulary('.');
  const files = await recipeFiles('examples/public-domain-recipes');
  assert.equal(files.length, 410);
  let categories = 0, changed = 0, dietary = 0, cuisine = 0, region = 0;
  const counts = {initial: 0, reworked: 0, blocked: 0};
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const before = restoreRecipeClassification(source, file);
    if (before !== source) changed++;
    // This existing adapter verifies the full pre-publication SHA256 from its committed ledger.
    restoreRecipePublication(source, file);
    const r = parseRecipe(source, {vocabulary}), b = parseRecipe(before, {vocabulary});
    assert.equal(r.diagnostics.filter(d => d.severity === 'error' || d.code === 'INVALID_CATEGORY').length, 0, file);
    assert.equal(r.conversionStage, b.conversionStage);
    counts[r.conversionStage!]++;
    assert.deepEqual(r.curation, b.curation);
    assert.deepEqual(r.dietary, b.dietary);
    assert.equal(r.cuisine, b.cuisine); assert.equal(r.region, b.region);
    assert.deepEqual(r.sections.filter(s => s.originalSource).map(s => s.originalSource!.text), b.sections.filter(s => s.originalSource).map(s => s.originalSource!.text));
    const fields = r.sections.filter(s => s.name === 'recipe').flatMap(s => s.children).filter(n => n.kind === 'metadata' && n.key === 'category');
    assert.equal(fields.length, r.category ? 1 : 0);
    if (r.category) categories++;
    if (r.dietary) dietary++;
    if (r.cuisine) cuisine++;
    if (r.region) region++;
  }
  assert.deepEqual({categories, changed, dietary, cuisine, region}, {categories:410, changed:399, dietary:11, cuisine:0, region:0});
  assert.deepEqual(counts, {initial:184, reworked:216, blocked:10});
});


test('soups and stews retain dish identity rather than a serving-course category', async () => {
  for (const slug of ['stracciatella-soup', 'miso-soup', 'clam-chowder', 'beef-stew', 'beef-goulash', 'ratatouille', 'tuhu']) {
    const recipe = parseRecipe(await readFile(`examples/public-domain-recipes/${slug}/${slug}.opensauce`, 'utf8'));
    assert.equal(recipe.category, 'soup/stew', slug);
  }
  for (const [slug, expected] of [['chicken-stock-bone-broth', 'sauce/seasoning/stock'], ['grilled-mackerel-with-miso-soup-and-squash', 'main'], ['sardine-cakes', 'starter'], ['gooseberry-pudding', 'dessert']]) {
    const recipe = parseRecipe(await readFile(`examples/public-domain-recipes/${slug}/${slug}.opensauce`, 'utf8'));
    assert.equal(recipe.category, expected, slug);
  }
});


test('final taxonomy distinguishes components from residual fresh cheese preparations', async () => {
  assert.equal(recipeCategories.length, 12);
  for (const slug of ['garam-masala', 'fajita-seasoning', 'zaatar', 'chicken-stock-bone-broth', 'guacamole', 'hummus', 'peanut-butter', 'dulce-de-leche', 'ragu-napoletano', 'cream-cheese', 'ricotta-lasagna-filling']) {
    assert.equal(parseRecipe(await readFile(`examples/public-domain-recipes/${slug}/${slug}.opensauce`, 'utf8')).category, 'sauce/seasoning/stock', slug);
  }
  for (const slug of ['ricotta', 'cheese']) {
    assert.equal(parseRecipe(await readFile(`examples/public-domain-recipes/${slug}/${slug}.opensauce`, 'utf8')).category, 'miscellaneous', slug);
  }
});
