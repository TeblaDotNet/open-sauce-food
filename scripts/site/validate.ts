import { isPublished, isConversionStage } from '../../src/publication.ts';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { routes, siteConfig } from './routes.ts';
import type { RecipeRecord, Facet } from './corpus.ts';
import type { ReferenceKind } from '../../src/reference/index.ts';
import type { SiteConfig } from './routes.ts';
export interface Manifest {
  compatibilityPages?: { from: string; to: string }[];
  config: Omit<SiteConfig, 'outDir'>; representative: string; recipes: RecipeRecord[]; pages: string[];
  references: { kind: ReferenceKind; id: string; usageCount: number; usageRecipes: string[]; partUsage?: { anchor: string; recipes: string[] }[] }[]; tags: Facet[]; categories: Facet[];
}
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
export function validateFiles(files: Map<string, string | Buffer>, manifest: Manifest) {
  const config = siteConfig(manifest.config), urls = routes(config);
  const html = new Map([...files].filter(([path]) => path.endsWith('.html')).map(([path, data]) => [path, data.toString()]));
  assert.equal(new Set([...files.keys()].map(p => p.toLowerCase())).size, files.size, 'Output paths collide');
  assert.equal(new Set(manifest.pages).size, manifest.pages.length, 'Duplicate routes');
  assert.equal(html.size, manifest.pages.length, 'Unlisted generated page');
  assert.equal(manifest.recipes.length, 410, 'Corpus recipe count changed');
  for (const recipe of manifest.recipes) assert.ok(isConversionStage(recipe.conversionStage), 'Missing or invalid conversion stage');
  const published = manifest.recipes.filter(isPublished);
  const hiddenPaths = new Set(manifest.recipes.filter(r => !isPublished(r)).map(r => urls.recipe(r.slug)));
  assert.ok(published.some(r => r.slug === manifest.representative), 'Representative must be published');
  const referenceCounts = { ingredient: 386, process: 180, equipment: 143 };
  for (const kind of ['ingredient', 'process', 'equipment'] as const) {
    const entries = manifest.references.filter(r => r.kind === kind);
    assert.equal(entries.length, referenceCounts[kind], `Public ${kind} reference-page count changed`);
    const index = html.get(urls.output(urls.index(kind)))!;
    const ids = [...index.matchAll(/data-reference="([^"]+)"/g)].map(m => decode(m[1])).sort();
    assert.deepEqual(ids, entries.map(r => r.id).sort(), `Incomplete ${kind} index`);
    for (const entry of entries) assert.ok(index.includes(`href="${urls.reference(kind, entry.id)}"`), `Wrong ${kind} index destination`);
  }
  const ids = new Map<string, Set<string>>();
  for (const [path, text] of html) {
    const list = [...text.matchAll(/\sid="([^"]*)"/g)].map(m => decode(m[1]));
    assert.equal(new Set(list).size, list.length, `Duplicate HTML ID: ${path}`);
    ids.set(path, new Set(list));
    assert.match(text, /<main\b/); assert.match(text, /<h1\b/); assert.match(text, /<nav\b/);
    assert.ok(!/<base\b/i.test(text), 'Do not use <base>');
    assert.ok(!/<style\b/i.test(text), `Inline stylesheet: ${path}`);
    for (const script of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      assert.match(script[1], /\bsrc="/); assert.equal(script[2].trim(), '', `Inline script: ${path}`);
    }
    assert.ok(!text.includes('website page forthcoming'), `Milestone 1 fallback: ${path}`);
  }
  let internalLinks = 0, fragments = 0, assets = 0, images = 0;
  const check = (raw: string, from: string, asset = false) => {
    const value = decode(raw);
    assert.ok(!/^(?:javascript|data):/i.test(value), `Unsafe URL: ${value}`);
    assert.ok(!/^\/(?:api|demo|dist)(?:\/|$)/.test(value), `Demo dependency: ${value}`);
    const base = new URL(config.basePath + from, config.origin), url = new URL(value, base);
    if (asset) assert.equal(url.origin, config.origin, `Remote runtime asset: ${from}: ${value}`);
    if (url.origin !== config.origin) return;
    if (!asset && value === 'https://tebla.net/' && config.origin === 'https://tebla.net') return;
    assert.ok(url.pathname.startsWith(config.basePath), `URL escapes base: ${from}: ${value}`);
    const target = urls.output(url.pathname);
    if (!asset && hiddenPaths.has(url.pathname)) {
      const sourceRecipe = manifest.recipes.find(r => urls.output(urls.recipe(r.slug)) === from);
      assert.ok(sourceRecipe && !isPublished(sourceRecipe), 'Public navigation exposes hidden recipe: ' + from + ': ' + value);
    }
    assert.ok(files.has(target), `Missing target: ${from}: ${value} -> ${target}`);
    internalLinks++;
    if (!target.endsWith('.html')) assets++;
    if (url.hash) {
      const fragment = url.hash.slice(1);
      assert.ok(ids.get(target)?.has(fragment) || ids.get(target)?.has(decodeURIComponent(fragment)), `Missing fragment: ${from}: ${value}`);
      fragments++;
    }
  };
  for (const [path, text] of html) {
    for (const m of text.matchAll(/\b(href|src)="([^"]*)"/g)) check(m[2], path, m[1] === 'src');
    for (const m of text.matchAll(/<img\b([^>]*)>/g)) { if (/class="wordmark wordmark-(light|dark)"/.test(m[1])) {
      assert.match(m[1], /alt="" aria-hidden="true"/);
      assert.match(text, /class="brand"[^>]*aria-label="Open Sauce Food"/);
    } else assert.match(m[1], /alt="[^"]+"/, `Missing image alt: ${path}`); images++; }
  }
  for (const [path, data] of files) if (path.endsWith('.css')) for (const m of data.toString().matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) check(m[1], path, true);
  for (const [path, data] of files) if (/\.(js|css)$/.test(path)) {
    assert.ok(!/['"`]\/(?:api|demo|dist)(?:\/|['"`])/.test(data.toString()), `Demo dependency in ${path}`);
    if (path.endsWith('.js')) assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(data.toString()), `Runtime fetching in ${path}`);
  }
  for (const route of manifest.pages) {
    const text = html.get(urls.output(route)); assert.ok(text, `Missing route: ${route}`);
    assert.ok(text.includes(`rel="canonical" href="${urls.canonical(manifest.compatibilityPages?.find(p => p.from === route)?.to ?? route)}"`), `Incorrect canonical: ${route}`);
  }
  const localBrowse = (text: string, expected: string[]) => {
    const matches = [...text.matchAll(/<li data-recipe="([^"]*)"><a href="([^"]*)">/g)];
    assert.deepEqual(matches.map(m => decode(m[1])).sort(), [...expected].sort(), 'Wrong emitted recipe membership');
    for (const m of matches) assert.equal(decode(m[2]), urls.recipe(decode(m[1])), 'Browse link must resolve locally');
  };
  localBrowse(html.get(urls.output(urls.recipes()))!, published.map(r => r.slug));
  for (const [kind, entries, key] of [['tag', manifest.tags, 'tags'], ['category', manifest.categories, 'categories']] as const) for (const facet of entries) {
    const expected = published.filter(r => r[key].includes(facet.value)).map(r => r.slug).sort();
    assert.deepEqual([...facet.recipes].sort(), expected, `Wrong membership: ${kind} ${facet.value}`);
    assert.equal(facet.count, expected.length);
    const text = html.get(urls.output(urls.facet(kind, facet.slug)))!;
    assert.ok(text.includes('Provisional / uncurated')); localBrowse(text, expected);
  }
  const semanticLinks = { code: { ingredient: 0, process: 0, equipment: 0 }, compact: { ingredient: 0, process: 0, equipment: 0 } };
  let unlinkedTokens = 0, originals = 0, usageBacklinks = 0;
  for (const selected of manifest.recipes) {
    const text = html.get(urls.output(urls.recipe(selected.slug)))!;
    assert.equal(/<meta name="robots" content="noindex">/.test(text), !isPublished(selected), 'Incorrect publication indexing: ' + selected.slug);
    if (!isPublished(selected)) assert.ok(text.includes('This recipe is part of the development corpus'), 'Missing development notice');
    assert.ok(selected.generated, 'Recipe not generated');
    assert.ok(text.includes(`id="github-source" href="${selected.githubUrl}"`), `Incorrect GitHub source link: ${selected.slug}`);
    assert.equal(selected.githubUrl, urls.source(selected.repositoryPath));
    assert.match(text, /value="code"[^>]* checked/);
    assert.match(text, /data-view-panel="code">/);
    assert.match(text, /data-view-panel="compact" hidden/);
    const compactStart = text.indexOf('data-view-panel="compact"'), originalStart = text.indexOf('data-view-panel="originalSource"');
    const code = text.slice(text.indexOf('data-view-panel="code"'), compactStart);
    const compact = text.slice(compactStart, originalStart < 0 ? text.indexOf('<aside class="recipe-sidebar"') : originalStart);
    for (const [name, view] of [['code', code], ['compact', compact]] as const) {
      for (const token of view.matchAll(/<(a|span) class="os-token os-(ingredient|process|equipment|unresolved|ambiguous)"([^>]*)>/g)) {
        const canonical = /data-canonical-id="([^"]+)"/.exec(token[3]);
        if (/data-reference="false"/.test(token[3])) {
          assert.ok(['process', 'equipment'].includes(token[2]), 'Only processes/equipment may opt out of reference pages');
          assert.ok(canonical, 'Suppressed concept has no canonical ID');
          assert.ok(!manifest.references.some(r => r.kind === token[2] && r.id === decode(canonical[1])), 'Suppressed concept has a public page');
          assert.equal(token[1], 'span', 'Suppressed concept has a reference link');
          assert.ok(!/href=/.test(token[3])); unlinkedTokens++; continue;
        }
        if (!canonical || ['unresolved','ambiguous'].includes(token[2])) {
          assert.equal(token[1], 'span', 'Unresolved concept has a guessed link');
          assert.ok(!/href=/.test(token[3])); unlinkedTokens++; continue;
        }
        assert.equal(token[1], 'a', 'Resolved concept lost its semantic link');
        const href = /href="([^"]+)"/.exec(token[3]); assert.ok(href, 'Resolved concept has no destination');
        const kind = token[2] as ReferenceKind;
        assert.equal(decode(href[1]).split('#')[0], urls.reference(kind, decode(canonical[1])), 'Semantic link goes to wrong concept');
        semanticLinks[name][kind]++;
      }
    }
    for (const expected of selected.semanticLinks) {
      assert.ok(code.includes(`href="${expected}"`), `Authored semantic target missing from Code: ${selected.slug}: ${expected}`);
      assert.ok(compact.includes(`href="${expected}"`), `Authored semantic target missing from Compact: ${selected.slug}: ${expected}`);
    }
    assert.equal(originalStart >= 0, selected.originalSource, `Wrong original availability: ${selected.slug}`);
    if (selected.originalSource) {
      const original = text.slice(originalStart, text.indexOf('<aside class="recipe-sidebar"', originalStart));
      assert.ok(!/<a\b/.test(original), 'Original source must be literal text');
      const hashes = [...original.matchAll(/<pre class="os-original-source"[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)]
        .map(m => createHash('sha256').update(decode(m[1])).digest('hex'));
      assert.deepEqual(hashes, selected.originalSourceHashes, `Original source changed: ${selected.slug}`); originals++;
    }
    assert.ok(text.indexOf('class="provenance"') > text.indexOf('<aside class="recipe-sidebar"'), 'Provenance belongs in the recipe sidebar');
    for (const media of selected.media) assert.ok(files.has(urls.output(urls.asset(`recipes/${selected.slug}/${media}`))), `Missing recipe media: ${selected.slug}`);
  }
  for (const ref of manifest.references) {
    const reference = html.get(urls.output(urls.reference(ref.kind, ref.id)))!;
    assert.ok(!reference.includes('Nutrition per 100 g'), 'Nutrition is out of scope');
    assert.equal(new Set(ref.usageRecipes).size, ref.usageCount, 'Usage must count distinct recipes');
    const expected = [...ref.usageRecipes, ...(ref.partUsage ?? []).flatMap(p => p.recipes)].map(slug => urls.recipe(slug)).sort();
    for (const part of ref.partUsage ?? []) {
      assert.ok(ids.get(urls.output(urls.reference(ref.kind, ref.id)))?.has(part.anchor), 'Missing part usage anchor');
      assert.equal(new Set(part.recipes).size, part.recipes.length, 'Duplicate recipe in part usage');
      for (const slug of part.recipes) {
        assert.ok(ref.usageRecipes.includes(slug), 'Part usage missing from concept usage');
        assert.ok(manifest.recipes.find(r => r.slug === slug)?.semanticLinks.includes(urls.reference(ref.kind, ref.id) + '#' + part.anchor), 'Part usage disagrees with authored tokens');
      }
    }
    const actual = [...reference.matchAll(/href="([^"]*)"/g)].map(m => decode(m[1])).filter(href => href.startsWith(urls.page('recipe'))).sort();
    assert.deepEqual(actual, expected, `Wrong usage backlinks: ${ref.kind}/${ref.id}`); usageBacklinks += actual.length;
    const expectedUsage = published.filter(r => r.semanticLinks.some(url => url.split('#')[0] === urls.reference(ref.kind, ref.id))).map(r => r.slug).sort();
    assert.deepEqual([...ref.usageRecipes].sort(), expectedUsage, 'Public usage membership disagrees with published tokens');
    assert.ok(reference.includes('Used in ' + ref.usageCount + ' recipe'), 'Displayed public usage count mismatch');
    for (const slug of ref.usageRecipes) {
      const recipe = manifest.recipes.find(r => r.slug === slug)!;
      assert.ok(recipe.semanticLinks.some(url => url.split('#')[0] === urls.reference(ref.kind, ref.id)), `Usage disagrees with authored tokens: ${slug}`);
    }
  }
  assert.ok(html.get(urls.output(urls.page('spec')))!.includes(urls.source('SPEC.md')));
  assert.ok(html.get(urls.output(urls.page('about')))!.includes(urls.page('spec')));
  return { status: 'passed', pages: html.size, files: [...files.keys()].filter(p => p !== 'validation.json').length, internalLinks, fragments, assets, images,
    recipePages: manifest.recipes.length, publishedRecipes: published.length, hiddenRecipes: manifest.recipes.length - published.length, references: manifest.references.length, facetPages: manifest.tags.length + manifest.categories.length,
    semanticLinks, unlinkedTokens, originalSourcePages: originals, usageBacklinks };
}
