import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { generateSite, writeSite, representative } from '../scripts/site/build.ts';
import { routes, siteConfig } from '../scripts/site/routes.ts';
import { facets } from '../scripts/site/corpus.ts';
import type { RecipeRecord } from '../scripts/site/corpus.ts';
import { validateFiles } from '../scripts/site/validate.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { parseRecipe, renderHtml, createReferencePage, renderReferenceHtml } from '../src/index.ts';

const root = resolve('.');
const config = siteConfig();
const generated = await generateSite(root, config);
test('complete corpus browse memberships and canonical references are generated without unpublished recipe links', () => {
  assert.equal(generated.manifest.recipes.length, 410);
  assert.equal(generated.audit.distinctTags, 198);
  assert.equal(generated.audit.recipesWithTags, 410);
  assert.equal(generated.audit.recipesWithCategory, 19);
  assert.equal(generated.audit.recipesWithoutCategory.length, 391);
  assert.equal(generated.audit.tagSlugCollisions.length, 8);
  assert.equal(generated.manifest.pages.filter(p => p.includes('/recipe/')).length, 410);
  assert.equal(generated.validation.status, 'passed');
  assert.equal(generated.validation.pages, 1327);
  assert.equal(generated.validation.references, 706);
  assert.equal(generated.validation.originalSourcePages, 391);
});
test('ordinary actions have no public pages, index entries or recipe links; techniques retain pages and backlinks', () => {
  const index = generated.files.get('processes/index.html')!.toString();
  for (const id of ['add', 'remove', 'place', 'put']) {
    assert.ok(!generated.files.has('processes/' + id + '/index.html'));
    assert.ok(!index.includes('data-reference="' + id + '"'));
    assert.ok(!generated.manifest.references.some(r => r.kind === 'process' && r.id === id));
    for (const record of generated.manifest.recipes)
      assert.ok(!record.semanticLinks.includes(routes(config).reference('process', id)));
  }
  for (const id of ['roast', 'knead', 'ferment', 'caramelise', 'simmer', 'whisk']) {
    assert.ok(generated.files.has('processes/' + id + '/index.html'));
    assert.ok(index.includes('data-reference="' + id + '"'));
  }
  assert.equal(generated.manifest.references.filter(r => r.kind === 'process').length, 201);
  assert.equal(generated.validation.status, 'passed');
});
test('base path, origin and GitHub source routing can be changed together', async () => {
  const alternative = siteConfig({ basePath: '/rehearsal/food/', origin: 'https://preview.example', github: 'https://github.com/example/food', sourceBase: 'https://github.com/example/food/blob/review' });
  const result = await generateSite(root, alternative);
  const page = result.files.get(`recipe/${representative}/index.html`)!.toString();
  assert.ok(page.includes('https://preview.example/rehearsal/food/recipe/'));
  assert.ok(page.includes('https://github.com/example/food/blob/review/examples/'));
  assert.ok(!page.includes('/opensaucefood/'));
  assert.ok(page.includes('/rehearsal/food/ingredients/egg/#part-yolk'));
  assert.equal(validateFiles(result.files, result.manifest).status, 'passed');
  assert.throws(() => siteConfig({ basePath: '/food/../' }));
  assert.throws(() => routes(config).recipe('../escape'));
});
test('facet slug collisions preserve authored labels and distinct membership, independently of input order', () => {
  const records = [{ slug: 'one', tags: ['Fruit'] }, { slug: 'two', tags: ['fruit', 'fruit'] }, { slug: 'three', tags: ['!!!', '???'] }] as RecipeRecord[];
  const a = facets(records, 'tags'), b = facets([...records].reverse(), 'tags');
  assert.deepEqual(a.entries, b.entries);
  assert.equal(a.entries.length, 4);
  assert.equal(new Set(a.entries.map(e => e.slug)).size, 4);
  assert.deepEqual(a.entries.find(e => e.value === 'Fruit')!.recipes, ['one']);
  assert.equal(a.entries.find(e => e.value === 'fruit')!.count, 1);
});
test('validation rejects broken assets, escaped URLs, missing part anchors and incorrect facet membership', () => {
  const missing = new Map(generated.files); missing.delete('assets/fonts/manrope.woff2');
  assert.throws(() => validateFiles(missing, generated.manifest), /Missing target/);
  const escaped = new Map(generated.files); escaped.set('index.html', escaped.get('index.html')!.toString().replace('href="#content"', 'href="/outside/"'));
  assert.throws(() => validateFiles(escaped, generated.manifest), /escapes base/);
  const fragment = new Map(generated.files); fragment.set('ingredients/egg/index.html', fragment.get('ingredients/egg/index.html')!.toString().replace('id="part-yolk"', 'id="removed"'));
  assert.throws(() => validateFiles(fragment, generated.manifest), /Missing fragment/);
  const wrong = structuredClone(generated.manifest); wrong.tags[0].recipes.push('not-a-recipe');
  assert.throws(() => validateFiles(generated.files, wrong), /Wrong membership/);
});
test('representative original remains literal; unknown terms never acquire guessed links', async () => {
  const vocabulary = await loadVocabulary(root);
  const record = generated.manifest.recipes.find(r => r.slug === representative)!;
  const recipe = parseRecipe(await readFile(record.repositoryPath, 'utf8'), { vocabulary });
  const literal = renderHtml(recipe, { view: 'originalSource' });
  assert.ok(!literal.includes('<a '));
  assert.ok(generated.files.get(`recipe/${representative}/index.html`)!.toString().includes(literal));
  const unknown = parseRecipe('::recipe\nname: Test\n::ingredients\n(unfindable-example-ingredient) 1\n', { vocabulary });
  const html = renderHtml(unknown, { referenceUrl: () => { throw new Error('Unresolved term linked'); } });
  assert.match(html, /unfindable-example-ingredient/);
  const ref = createReferencePage(vocabulary, 'ingredient', 'egg', undefined, { referenceUrl: (kind, id) => routes(config).reference(kind, id) })!;
  assert.equal(ref.groups[0].processUrl, '/opensaucefood/processes/separate/');
  assert.ok(!renderReferenceHtml(ref, { nutrition: false }).includes('Nutrition per 100 g'));
});
test('output writer refuses source locations and unowned directories; repeat builds remove stale owned files only', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'open-sauce-site-test-'));
  try {
    await assert.rejects(writeSite(root, { ...config, outDir: root }, new Map()), /Output must/);
    await assert.rejects(writeSite(root, { ...config, outDir: join(root, 'src') }, new Map()), /Output must/);
    const unowned = join(temporary, 'unowned'); await mkdir(unowned); await writeFile(join(unowned, 'keep.txt'), 'keep');
    await assert.rejects(writeSite(root, { ...config, outDir: unowned }, new Map([['index.html', 'bad']])), /ownership manifest/);
    assert.equal(await readFile(join(unowned, 'keep.txt'), 'utf8'), 'keep');
    const owned = join(temporary, 'generated');
    await writeSite(root, { ...config, outDir: owned }, new Map([['index.html', 'first'], ['old.txt', 'old']]));
    await writeSite(root, { ...config, outDir: owned }, new Map([['index.html', 'second']]));
    assert.equal(await readFile(join(owned, 'index.html'), 'utf8'), 'second');
    await assert.rejects(readFile(join(owned, 'old.txt')), /ENOENT/);
  } finally {
    assert.ok(basename(temporary).startsWith('open-sauce-site-test-') && resolve(temporary).startsWith(resolve(tmpdir())));
    await rm(temporary, { recursive: true, force: true });
  }
});

test('full-site source hashes, reference usage and media coverage match the corpus', async () => {
  const { createHash } = await import('node:crypto');
  for (const record of generated.manifest.recipes) {
    assert.equal(createHash('sha256').update(await readFile(record.repositoryPath)).digest('hex'), record.sourceSha256);
    assert.equal(record.generated, true);
    for (const media of record.media) assert.ok(generated.files.has(`assets/recipes/${record.slug}/${media}`));
  }
  const exclusions = JSON.parse(await readFile('release-exclusions.json', 'utf8')).records.map((r: { slug: string }) => r.slug);
  assert.ok(!generated.manifest.recipes.some(r => exclusions.includes(r.slug)));
  assert.equal(generated.manifest.recipes.filter(r => r.media.length).length, 138);
  assert.equal(generated.manifest.references.reduce((sum, ref) => sum + ref.usageCount, 0), generated.validation.usageBacklinks);
  const wrong = structuredClone(generated.manifest); wrong.references[0].usageCount++;
  assert.throws(() => validateFiles(generated.files, wrong), /Usage must count distinct/);
});
test('full-site validation rejects nonrepresentative original corruption and nonlocal browse links', () => {
  const corrupted = new Map(generated.files);
  const path = 'recipe/butter-cake/index.html', content = corrupted.get(path)!.toString();
  const start = content.indexOf('data-view-panel="originalSource"');
  corrupted.set(path, content.slice(0, start) + content.slice(start).replace('Butter', 'Changed'));
  assert.throws(() => validateFiles(corrupted, generated.manifest), /Original source changed/);
  const remote = new Map(generated.files);
  remote.set('recipes/index.html', remote.get('recipes/index.html')!.toString().replace(/(<li data-recipe="[^"]*"><a href=")[^"]+/, '$1https://github.com/example/recipe'));
  assert.throws(() => validateFiles(remote, generated.manifest), /Browse link must resolve locally/);
});
test('Spec is rendered from authoritative Markdown with escaped examples and safe document links', async () => {
  const { renderSpec } = await import('../scripts/site/documents.ts');
  const spec = await readFile('SPEC.md', 'utf8');
  assert.ok(generated.files.get('spec/index.html')!.toString().includes(renderSpec(spec, routes(config))));
  const sample = renderSpec('# Example\n\n<script>alert(1)</script>\n\n```opensauce\n(egg) <whisk>\n```\n\n[Guide](README.md)', routes(config));
  assert.ok(!sample.includes('<script>')); assert.ok(sample.includes('&lt;whisk&gt;'));
  assert.ok(sample.includes(routes(config).source('README.md')));
});

test('reviewed local ingredient roles have no generated pages, index identities or recipe links', async () => {
  const decisions = JSON.parse(await readFile('ingredient-local-role-decisions.json', 'utf8'));
  const index = generated.files.get('ingredients/index.html')!.toString();
  for (const {id} of decisions.entries) {
    assert.ok(!generated.files.has(`ingredients/${id}/index.html`), id);
    assert.ok(!index.includes(`data-reference="${id}"`), id);
    assert.ok(!generated.manifest.references.some(r => r.kind === 'ingredient' && r.id === id), id);
    for (const record of generated.manifest.recipes)
      assert.ok(!record.semanticLinks.includes(routes(config).reference('ingredient', id)), `${record.slug}: ${id}`);
  }
});
