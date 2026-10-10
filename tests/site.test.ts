import { equipmentTrancheIds, equipmentTrancheEdges } from './helpers/equipment-tranche.ts';
import {repairedRecipeCount} from './helpers/corpus-quality-unattended.ts';
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
  assert.equal(generated.audit.distinctTags, new Set(generated.manifest.recipes.filter(r => r.conversionStage === 'reworked').flatMap(r => r.tags)).size);
  assert.equal(generated.audit.recipesWithTags, 216+repairedRecipeCount);
  assert.equal(generated.audit.recipesWithCategory, 216+repairedRecipeCount);
  assert.equal(generated.audit.recipesWithoutCategory.length, 0);
  assert.equal(generated.audit.tagSlugCollisions.length, 8); // Grostoli preserves authored Fry/Italian/Brazilian tags.
  assert.equal(generated.manifest.pages.filter(p => p.includes('/recipe/')).length, 410);
  assert.equal(generated.validation.status, 'passed');
  assert.equal(generated.validation.pages, 1139 + generated.audit.distinctTags); // Fixed pages plus published tag facets.
  assert.equal(generated.validation.references, 709);
  assert.equal(generated.validation.originalSourcePages, 391);
});
test('ordinary actions have no public pages, index entries or recipe links; techniques retain pages and backlinks', () => {
  const index = generated.files.get('processes/index.html')!.toString();
  for (const id of ['add', 'remove', 'place', 'put', 'transfer', 'pour', 'reserve', 'set-aside', 'serve', 'arrange', 'cover', 'uncover','adjust','assemble','bottle','brush','check','clean','combine','discard','distribute','divide','drizzle','dust','empty','fill','flip','garnish','grease','halve','keep','keep-warm','reduce-heat','rinse','sprinkle','taste','turn-off-heat']) {
    assert.ok(!generated.files.has('processes/' + id + '/index.html'));
    assert.ok(!index.includes('data-reference="' + id + '"'));
    assert.ok(!generated.manifest.references.some(r => r.kind === 'process' && r.id === id));
    for (const record of generated.manifest.recipes)
      assert.ok(!record.semanticLinks.includes(routes(config).reference('process', id)));
  }
  for (const id of ['roast', 'knead', 'ferment', 'caramelise', 'simmer', 'whisk','drain','line','preheat','rub','shape','spread','submerge','reduce']) {
    assert.ok(generated.files.has('processes/' + id + '/index.html'));
    assert.ok(index.includes('data-reference="' + id + '"'));
  }
  assert.equal(generated.manifest.references.filter(r => r.kind === 'process').length, 180);
  assert.equal(generated.validation.status, 'passed');
});
test('base path, origin and GitHub source routing can be changed together', async () => {
  const alternative = siteConfig({ basePath: '/rehearsal/food/', origin: 'https://preview.example', github: 'https://github.com/example/food', sourceBase: 'https://github.com/example/food/blob/review' });
  const result = await generateSite(root, alternative);
  const page = result.files.get(`recipe/${representative}/index.html`)!.toString();
  assert.ok(page.includes('https://preview.example/rehearsal/food/recipe/'));
  assert.ok(page.includes('https://github.com/example/food/blob/review/examples/'));
  assert.ok(!page.includes('/opensaucefood/'));
  assert.ok(page.includes('/rehearsal/food/ingredients/egg/'));
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
  assert.equal(generated.manifest.references.reduce((sum, ref) => sum + ref.usageCount + ref.partUsage.reduce((n, p) => n + p.recipes.length, 0), 0), generated.validation.usageBacklinks);
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
  assert.ok(!sample.includes('<script>')); assert.ok(sample.includes('&lt;<span class="os-syntax-process">whisk</span>&gt;'));
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

test('ingredient family and part pages retain independent routes and verified backlinks', () => {
  for (const [child, parent] of [['wheat-flour', 'flour'], ['olive-oil', 'oil']]) {
    const childHtml = generated.files.get(`ingredients/${child}/index.html`)!.toString();
    const parentHtml = generated.files.get(`ingredients/${parent}/index.html`)!.toString();
    assert.ok(childHtml.includes(`Type of: <a href="${routes(config).reference('ingredient', parent)}">`));
    assert.ok(parentHtml.split('<h2>Types</h2>')[1].split('</section>')[0].includes(`href="${routes(config).reference('ingredient', child)}"`));
  }
  for (const [id, part] of [['egg','yolk'], ['egg','white'], ['lemon','juice']]) {
    const entry = generated.manifest.references.find(r => r.kind === 'ingredient' && r.id === id)!;
    const usage = entry.partUsage.find(p => p.anchor === `part-${part}`)!;
    assert.ok(usage.recipes.length > 0);
    const html = generated.files.get(`ingredients/${id}/index.html`)!.toString();
    const section = html.split(`id="part-${part}"`)[1].split('</section>')[0];
    for (const slug of usage.recipes) assert.ok(section.includes(`href="${routes(config).recipe(slug)}"`));
  }
  const wrong = structuredClone(generated.manifest);
  wrong.references.find(r => r.id === 'egg' && r.kind === 'ingredient')!.partUsage[0].recipes.push('not-a-recipe');
  assert.throws(() => validateFiles(generated.files, wrong), /Part usage/);
});

test('migrated ingredient routes link to the part or independent family child', () => {
  const urls=routes(config), old=urls.reference('ingredient','lemon-juice'), target=urls.reference('ingredient','lemon')+'#part-juice';
  assert.ok(!generated.manifest.references.some(r=>r.kind==='ingredient'&&r.id==='lemon-juice'));
  const compat=generated.files.get(urls.output(old))!.toString();
  assert.ok(compat.includes(`href="${target}"`));
  assert.ok(compat.includes(`rel="canonical" href="${urls.canonical(target)}"`));
  for(const recipe of generated.manifest.recipes)assert.ok(!recipe.semanticLinks.includes(old));
  assert.ok(generated.manifest.recipes.find(r=>r.slug==='apple-pie')!.semanticLinks.includes(target));
  const child=urls.reference('ingredient','self-raising-flour');
  assert.ok(generated.files.has(urls.output(child)));
  assert.ok(generated.files.get('ingredients/flour/index.html')!.toString().includes(`href="${child}"`));
  assert.deepEqual(generated.manifest.references.find(r=>r.kind==='ingredient'&&r.id==='self-raising-flour')!.usageRecipes.sort(),['damper']);
});


test('static Code gives local heat seasoning ingredient colour without a reference link', () => {
  const page = generated.files.get('recipe/red-lentil-dahl/index.html')!.toString();
  const code = page.split('data-view-panel="code"')[1].split('data-view-panel="compact"')[0];
  assert.equal([...code.matchAll(/<span class="os-token os-choice"[^>]*>\(<span class="os-syntax-ingredient">heat seasoning<\/span>\)<\/span>/g)].length, 3);
  assert.doesNotMatch(code, /href="[^"]*heat-seasoning/);
  assert.match(code, /<a class="os-token os-ingredient"[^>]*href="\/opensaucefood\/ingredients\/cayenne-pepper\/">\(<span class="os-syntax-ingredient">cayenne pepper<\/span>/);
});


test('public discovery and noindex are governed by explicit conversion stage', () => {
  const index = generated.files.get('recipes/index.html')!.toString();
  for (const recipe of generated.manifest.recipes) {
    const visible = recipe.conversionStage === 'reworked';
    assert.equal(index.includes('data-recipe="' + recipe.slug + '"'), visible);
    const direct = generated.files.get('recipe/' + recipe.slug + '/index.html')!.toString();
    assert.equal(direct.includes('<meta name="robots" content="noindex">'), !visible);
    assert.equal(direct.includes('This recipe is part of the development corpus'), !visible);
    for (const facet of [...generated.manifest.tags, ...generated.manifest.categories])
      if (facet.recipes.includes(recipe.slug)) assert.ok(visible);
    for (const ref of generated.manifest.references) if (ref.usageRecipes.includes(recipe.slug)) assert.ok(visible);
  }
  assert.equal(generated.validation.publishedRecipes,216+repairedRecipeCount);
  const exposed = new Map(generated.files);
  exposed.set('index.html', exposed.get('index.html') + '<a href="/opensaucefood/recipe/orange-glorious/">Hidden example</a>');
  assert.throws(() => validateFiles(exposed,generated.manifest), /Public navigation exposes hidden/);
  const indexable = new Map(generated.files);
  indexable.set('recipe/orange-glorious/index.html',indexable.get('recipe/orange-glorious/index.html')!.toString().replace('<meta name="robots" content="noindex">',''));
  assert.throws(() => validateFiles(indexable,generated.manifest), /Incorrect publication indexing/);
});


test('category pages contain exactly the published members and hidden direct pages retain category', () => {
  assert.equal(generated.manifest.categories.length, 12);
  let total = 0;
  for (const facet of generated.manifest.categories) {
    const expected = generated.manifest.recipes.filter(r => r.conversionStage === 'reworked' && r.category === facet.value).map(r => r.slug).sort();
    assert.deepEqual([...facet.recipes].sort(), expected);
    assert.equal(facet.count, expected.length);
    const html = generated.files.get(routes(config).output(routes(config).facet('category', facet.slug)))!.toString();
    const linked = [...html.matchAll(/data-recipe="([^"]+)"/g)].map(m => m[1]).sort();
    assert.deepEqual(linked, expected);
    assert.ok(html.includes('Recipe category · ' + expected.length + ' recipe'));
    total += facet.count;
  }
  assert.equal(total, 216+repairedRecipeCount);
  for (const stage of ['initial', 'blocked']) {
    const recipe = generated.manifest.recipes.find(r => r.conversionStage === stage && r.category)!;
    const html = generated.files.get('recipe/' + recipe.slug + '/index.html')!.toString();
    assert.ok(html.includes('<dt>category</dt><dd>' + recipe.category + '</dd>'));
    assert.ok(html.includes('content="noindex"'));
  }
  const exposed = new Map(generated.files);
  const path = 'recipes/category/main/index.html';
  exposed.set(path, exposed.get(path) + '<a href="/opensaucefood/recipe/orange-glorious/">Hidden</a>');
  assert.throws(() => validateFiles(exposed, generated.manifest), /Public navigation exposes hidden/);
});

test('existing dietary labels display advisory policy in both site recipe views', () => {
  const html = generated.files.get('recipe/basic-waffles/index.html')!.toString();
  assert.equal((html.match(/class="os-dietary-notice"/g) ?? []).length, 3);
  assert.match(html, /Dietary labels are author-supplied and are not a guarantee of suitability/);
});


test('final component and residual categories use safe canonical routes without an old sauce page', () => {
  assert.ok(generated.files.has('recipes/category/sauce-seasoning-stock/index.html'));
  assert.ok(generated.files.has('recipes/category/miscellaneous/index.html'));
  assert.ok(!generated.files.has('recipes/category/sauce/index.html'));
  assert.ok(!generated.manifest.categories.some(c => c.value === 'sauce'));
  const index = generated.files.get('recipes/index.html')!.toString();
  assert.ok(index.includes('href="/opensaucefood/recipes/category/sauce-seasoning-stock/"'));
  assert.ok(!index.includes('href="/opensaucefood/recipes/category/sauce/"'));
  assert.ok(generated.manifest.categories.find(c => c.value === 'miscellaneous')!.recipes.includes('ricotta'));
});


test('new process techniques have pages and only published recipe backlinks', () => {
  const index = generated.files.get('processes/index.html')!.toString();
  const published = new Set(generated.manifest.recipes.filter(r => r.conversionStage === 'reworked').map(r => r.slug));
  for (const id of ['blanch','braise','julienne','confit','flambe','render','pan-fry','microwave','dry-roast','steam-dry','sun-dry','age','reduce']) {
    assert.ok(generated.files.has('processes/' + id + '/index.html'));
    assert.ok(index.includes('data-reference="' + id + '"'));
    const ref = generated.manifest.references.find(r => r.kind === 'process' && r.id === id)!;
    assert.ok(ref);
    const expected = generated.manifest.recipes.filter(r => published.has(r.slug) && r.semanticLinks.includes(routes(config).reference('process',id))).map(r => r.slug).sort();
    assert.deepEqual([...ref.usageRecipes].sort(),expected,id);
    assert.equal(ref.usageCount,expected.length,id);
  }
});


test('equipment proofs expose only eligible pages and direct parent/child links', () => {
  const index = generated.files.get('equipment/index.html')!.toString();
  assert.equal(generated.manifest.references.filter(r => r.kind === 'equipment').length, 143);
  assert.ok(!generated.files.has('equipment/bowl/index.html'));
  assert.ok(!index.includes('data-reference="bowl"'));
  assert.ok(!generated.manifest.references.some(r => r.kind === 'equipment' && r.id === 'bowl'));
  for (const r of generated.manifest.recipes) assert.ok(!r.semanticLinks.includes(routes(config).reference('equipment', 'bowl')));
  for (const [path, data] of generated.files) if (path.endsWith('.html'))
    assert.ok(!data.toString().includes('href="' + routes(config).reference('equipment', 'bowl') + '"'), path);
  for (const [child, parent] of [['paring-knife','knife'],['cast-iron-frying-pan','frying-pan'],['stand-mixer','mixer']]) {
    assert.ok(generated.files.get('equipment/' + child + '/index.html')!.toString().includes('Type of: <a href="' + routes(config).reference('equipment', parent) + '"'));
    assert.ok(generated.files.get('equipment/' + parent + '/index.html')!.toString().includes('href="' + routes(config).reference('equipment', child) + '"'));
  }
  const soup = generated.files.get('recipe/stracciatella-soup/index.html')!.toString();
  assert.match(soup, /<span class="os-token os-equipment"[^>]*data-canonical-id="bowl"[^>]*data-reference="false"/);
  assert.equal(generated.validation.status, 'passed');
});

test('equipment tranche pages, index membership and direct backlinks are generated', () => {
  const index = generated.files.get('equipment/index.html')!.toString();
  for (const id of equipmentTrancheIds) {
    assert.ok(index.includes('data-reference="' + id + '"'), id);
    const html = generated.files.get('equipment/' + id + '/index.html')!.toString();
    assert.ok(html.includes('Recorded vocabulary evidence'), id);
    const ref = generated.manifest.references.find(r => r.kind === 'equipment' && r.id === id)!;
    const expected = generated.manifest.recipes.filter(r => r.conversionStage === 'reworked' && r.semanticLinks.includes(routes(config).reference('equipment', id))).map(r => r.slug).sort();
    assert.deepEqual([...ref.usageRecipes].sort(), expected, id);
  }
  for (const [child, parent] of equipmentTrancheEdges) {
    assert.ok(generated.files.get('equipment/' + child + '/index.html')!.toString().includes('Type of: <a href="' + routes(config).reference('equipment', parent) + '"'));
    assert.ok(generated.files.get('equipment/' + parent + '/index.html')!.toString().includes('href="' + routes(config).reference('equipment', child) + '"'));
  }
});

test('recipe layout projects primary metadata and demotes source and raw metadata', () => {
  const html = generated.files.get('recipe/ravioli/index.html')!.toString();
  const header = html.split('<header class="recipe-header">')[1].split('</header>')[0];
  const sidebar = html.split('<aside class="recipe-sidebar"')[1];
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(header, /<h1>Ravioli<\/h1>/);
  for (const key of ['category', 'serves', 'tags']) assert.ok(header.includes('<dt>' + key + '</dt>'));
  for (const key of ['name','units','conversion stage','source']) assert.ok(!header.includes('<dt>' + key + '</dt>'));
  for (const label of ['Sauce Code', 'Compact', 'Original Source']) assert.ok(header.includes('<span>' + label + '</span>'));
  assert.match(header, /value="code"[^>]* checked/);
  assert.ok(!header.includes('>Code<'));
  for (const label of ['source author', 'source licence', 'github-source', 'Encoding curation', 'dark-mode-toggle', 'syntax-colour']) assert.ok(sidebar.includes(label));
  assert.ok(html.indexOf('data-view-panel="code"') < html.indexOf('<aside class="recipe-sidebar"'));
  assert.match(html, /<details class="os-section-details" data-section="recipe"><summary>Recipe metadata/);
  assert.match(html, /<details class="os-section-details" data-section="source"><summary>Source material/);
  const code = html.split('data-view-panel="code"')[1].split('data-view-panel="compact"')[0];
  for (const section of ['ingredients','equipment','instructions','notes']) {
    assert.ok(!code.includes('<details class="os-section-details" data-section="' + section + '"'));
  }
  assert.ok(code.indexOf('<img') < code.indexOf('<summary>Recipe metadata'));
  const bread = generated.files.get('recipe/bread/index.html')!.toString();
  assert.match(bread, /<details class="os-section-details" data-section="story"><summary>Story/);
  assert.ok(!bread.includes('data-section="story" open'));
});
