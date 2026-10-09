import { semanticTokens } from '../../src/model/index.ts';
import { readFile, mkdir, writeFile, readdir, lstat, realpath, unlink } from 'node:fs/promises';
import { resolve, join, dirname, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { loadVocabulary } from '../../src/vocabulary/node.ts';
import { buildUsageIndex, createReferencePage, partAnchor } from '../../src/reference/index.ts';
import type { ReferenceKind, ReferencePage } from '../../src/reference/index.ts';
import { renderReferenceHtml } from '../../src/reference/html.ts';
import { renderHtml, escapeHtml as e, safeUrl } from '../../src/renderer/html.ts';
import { curationLabel } from '../../src/curation.ts';
import { loadCorpus, visitNodes } from './corpus.ts';
import type { RecipeRecord, Facet } from './corpus.ts';
import { routes, siteConfig } from './routes.ts';
import type { SiteConfig } from './routes.ts';
import { shell, provisional } from './shell.ts';
import { renderSpec, aboutPage } from './documents.ts';
import { validateFiles } from './validate.ts';

export const representative = 'mayonnaise-or-aioli';
export function cliConfig(args = process.argv.slice(2)): SiteConfig {
  const names: Record<string, keyof SiteConfig> = { '--out-dir': 'outDir', '--base-path': 'basePath', '--origin': 'origin', '--github': 'github', '--source-base': 'sourceBase' };
  const values: Partial<SiteConfig> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!names[args[i]] || !args[i + 1]) throw new Error(`Expected --out-dir, --base-path, --origin, --github or --source-base followed by a value: ${args[i]}`);
    values[names[args[i]]] = args[i + 1];
  }
  return siteConfig(values);
}
export async function generateSite(root: string, config: SiteConfig) {
  const urls = routes(config), vocabulary = await loadVocabulary(root);
  const corpus = await loadCorpus(root, vocabulary, urls);
  const chosen = corpus.records.find(r => r.slug === representative);
  if (!chosen) throw new Error('Representative recipe missing');
  const usage = buildUsageIndex(corpus.records.map(r => ({ id: r.slug, name: r.name, recipe: corpus.parsed.get(r.slug)! })));
  const references = new Map<string, ReferencePage>();
  for (const { kind, id } of vocabulary.entries.filter(e => e.reference !== false)) {
    const key = kind + ':' + id;
    if (references.has(key)) throw new Error('Duplicate canonical reference: ' + key);
    const page = createReferencePage(vocabulary, kind, id, usage, { referenceUrl: urls.reference });
    if (!page) throw new Error('Missing canonical reference: ' + key);
    references.set(key, page);
  }
  const files = new Map<string, string | Buffer>(), pages: string[] = [];
  const add = (path: string, contents: string | Buffer) => {
    if ([...files.keys()].some(p => p.toLowerCase() === path.toLowerCase())) throw new Error(`Duplicate output: ${path}`);
    if (isAbsolute(path) || path.split(/[\\/]/).some(p => p === '..') || path.includes('\\')) throw new Error(`Unsafe output: ${path}`);
    files.set(path, contents);
  };
  const page = (url: string, title: string, body: string) => { pages.push(url); add(urls.output(url), shell(config, urls, title, url, body)); };
  const recipeLink = (r: RecipeRecord) => `<a href="${e(urls.recipe(r.slug))}">${e(r.name)}</a>`;
  const recipeList = (records: RecipeRecord[]) => `<ul class="browse-list">${records.map(r => `<li data-recipe="${e(r.slug)}">${recipeLink(r)}</li>`).join('')}</ul>`;
  const facetList = (kind: 'tag' | 'category', entries: Facet[]) => `<ul>${entries.map(f => `<li><a href="${urls.facet(kind, f.slug)}">${e(f.value)}</a> <small>(${f.count})</small></li>`).join('')}</ul>`;
  const coverage = `${corpus.audit.recipesWithCategory} / ${corpus.records.length} recipes have category metadata; ${corpus.audit.recipesWithoutCategory.length} have none.`;
  page(urls.home(), 'Open Sauce Food', `<h1>Open Sauce Food</h1><p>A human-readable recipe language and shared culinary knowledge base for collecting, versioning, remixing and collaborating on recipes.</p><p><a href="${urls.recipes()}">All ${corpus.records.length} recipes</a></p><p class="browse-links"><a href="${urls.recipes()}#tags">Browse by tag</a><a href="${urls.recipes()}#categories">Categories</a></p><p class="coverage">${coverage}</p><h2>Try the recipe reader</h2><p>${recipeLink(chosen)} · Code, Compact and Original recipe source.</p><h2>Explore culinary references</h2><p>${references.size} canonical entries connect recipes to shared culinary knowledge. Usage counts are distinct recipes.</p><p class="browse-links">${(['ingredient','process','equipment'] as const).map(k => `<a href="${urls.index(k)}">${k === 'ingredient' ? 'Ingredients' : k === 'process' ? 'Processes' : 'Equipment'}</a>`).join('')}</p><p class="browse-links"><a href="${urls.page('spec')}">Spec</a><a href="${urls.page('about')}">About</a></p>`);
  page(urls.recipes(), 'Recipes', `<h1>Recipes</h1><nav class="browse-links" aria-label="Recipe browsing"><a href="#all-recipes">All recipes</a><a href="#tags">Browse by tag</a><a href="#categories">Categories</a></nav><p>Browse all recipes, or explore the tags and categories currently recorded in their metadata.</p><section id="all-recipes"><h2>All recipes (${corpus.records.length})</h2>${recipeList(corpus.records)}</section><section id="tags"><h2>Browse by tag</h2>${provisional}<p>${corpus.audit.recipesWithTags} / ${corpus.records.length} recipes have at least one tag; ${corpus.audit.recipesWithoutTags.length} have none. Recipes may appear under several tags.</p>${facetList('tag', corpus.tags)}</section><section id="categories"><h2>Categories</h2>${provisional}<p>${coverage}</p>${facetList('category', corpus.categories)}</section>`);
  for (const [kind, entries] of [['tag', corpus.tags], ['category', corpus.categories]] as const) for (const facet of entries) {
    page(urls.facet(kind, facet.slug), `${facet.value} · ${kind}`, `<h1>${e(facet.value)}</h1><p>Recipe ${kind} · ${facet.count} recipe${facet.count === 1 ? '' : 's'}</p>${provisional}${kind === 'category' ? `<p>${coverage}</p>` : ''}<p><a href="${urls.recipes()}#${kind === 'tag' ? 'tags' : 'categories'}">All ${kind === 'tag' ? 'tags' : 'categories'}</a></p>${recipeList(corpus.records.filter(r => facet.recipes.includes(r.slug)))}`);
  }
  for (const chosen of corpus.records) {
    const recipe = corpus.parsed.get(chosen.slug)!;
    const recipeOptions = {
      vocabulary, syntaxSpans: true, header: false, comments: true, imageAlt: chosen.name, assetBaseUrl: urls.asset(`recipes/${chosen.slug}/image`).replace(/image$/, ''),
      referenceUrl: (target: { kind: ReferenceKind; canonicalId: string; token: import('../../src/model/index.ts').Token }) => {
        if (!references.has(`${target.kind}:${target.canonicalId}`)) return undefined;
        return urls.reference(target.kind, target.canonicalId) + (target.kind === 'ingredient' && target.token.partResolution?.complete && target.token.partResolution.ids.length ? '#' + partAnchor(target.token.partResolution.ids) : '');
      }
    };
    const views = ['code', 'compact', ...(chosen.originalSource ? ['originalSource'] : [])] as ('code' | 'compact' | 'originalSource')[];
    const labels = { code: 'Code', compact: 'Compact', originalSource: 'Original recipe source' };
    const provenance = Object.entries(chosen.provenance).map(([key, value]) => `<dt>${e(key)}</dt><dd>${key === 'source' && safeUrl(value) ? `<a href="${e(value)}">${e(value)}</a>` : e(value)}</dd>`).join('');
    const controls = `<fieldset class="controls" data-enhancement hidden><legend>View as</legend>${views.map(view => `<label><input type="radio" name="view" value="${view}" data-label="${labels[view]}"${view === 'code' ? ' checked' : ''}> ${labels[view]}</label>`).join('')}<div>${['story','notes'].filter(name => recipe.sections.some(s => s.name === name)).map(name => `<label><input type="checkbox" data-section-toggle="${name}" checked> ${name === 'story' ? 'Story' : 'Notes'}</label>`).join('')}</div></fieldset><p id="view-status" class="sr-only" role="status" aria-live="polite"></p>`;
    page(urls.recipe(chosen.slug), chosen.name, `<h1>${e(chosen.name)}</h1><div class="provenance"><p>Encoding curation: ${chosen.curation ? e(curationLabel(chosen.curation)) : 'not recorded (legacy / unknown)'}</p><dl class="os-metadata">${provenance}</dl><p><a id="github-source" href="${e(chosen.githubUrl)}">View .opensauce on GitHub</a></p></div>${controls}<noscript><p>Code is shown below. Display controls are available when JavaScript is enabled.</p></noscript>${views.map(view => `<div class="view-panel" data-view-panel="${view}"${view === 'code' ? '' : ' hidden'}><h2 class="sr-only" id="${view}-title">${labels[view]}</h2>${renderHtml(recipe, { ...recipeOptions, view, idPrefix: view })}</div>`).join('')}`);
  }
  const lookup = new Map(corpus.records.map(r => [r.slug, r]));
  for (const ref of references.values()) page(urls.reference(ref.kind, ref.id), ref.name, `<p><a href="${urls.index(ref.kind)}">${ref.kind === 'ingredient' ? 'Ingredients' : ref.kind === 'process' ? 'Processes' : 'Equipment'}</a></p>${renderReferenceHtml(ref, {
    nutrition: false,
    recipeUrl: id => { const r = lookup.get(id); return r ? urls.recipe(id) : undefined; },

  })}<p><a href="${urls.source(`${ref.kind === 'ingredient' ? 'ingredients' : ref.kind === 'process' ? 'processes' : 'equipment'}/${ref.id}.yaml`)}">View reference on GitHub</a></p>`);
  for (const kind of ['ingredient','process','equipment'] as const) {
    const subset = [...references.values()].filter(r => r.kind === kind).sort((a, b) => a.name.localeCompare(b.name, 'en'));
    const total = subset.length;
    const title = kind === 'ingredient' ? 'Ingredients' : kind === 'process' ? 'Processes' : 'Equipment';
    page(urls.index(kind), title, `<h1>${title}</h1><p>${total} canonical entries. Counts show distinct recipes with resolved uses; sparse entries retain only currently recorded knowledge.</p><ul class="reference-index">${subset.map(r => `<li data-reference="${e(r.id)}"><a href="${urls.reference(kind, r.id)}">${e(r.name)}</a> · ${r.usage?.length ?? 0} recipe${r.usage?.length === 1 ? '' : 's'}</li>`).join('')}</ul>`);
  }
  page(urls.page('spec'), 'Specification', renderSpec(await readFile(join(root, 'SPEC.md'), 'utf8'), urls));
  page(urls.page('about'), 'About', aboutPage(config, urls));
  const css = (await readFile(join(root, 'demo/style.css'), 'utf8')).replaceAll("/demo/fonts/", urls.asset('fonts/file').replace(/file$/, '')) + '\n' + await readFile(join(root, 'site/assets/site.css'), 'utf8');
  add('assets/style.css', css);
  for (const file of ['theme-init.js','dark-mode.js']) add('assets/' + file, await readFile(join(root, 'demo', file)));
  add('assets/enhance.js', await readFile(join(root, 'site/assets/enhance.js')));
  for (const font of ['manrope.woff2', 'fira-code.woff2']) add('assets/fonts/' + font, await readFile(join(root, 'demo/fonts', font)));
  const noticePaths = ['LICENSE','LICENSING.md','LICENSES/MIT.txt','LICENSES/GPL-2.0-or-later.txt','LICENSES/CC-BY-4.0.txt','LICENSES/CC0-1.0.txt','demo/fonts/Manrope-OFL.txt','demo/fonts/Fira-Code-OFL.txt','source/public-domain-recipes/UPSTREAM-LICENSE.md'];
  const notices = await Promise.all(noticePaths.map(async path => `${path}\n\n${await readFile(join(root, path), 'utf8')}`));
  add('assets/notices.txt', `Open Sauce Food — Tebla and Open Sauce Food contributors.\nSource: ${config.github}\nStatic presentation adapted from the existing Tebla-derived demo; generated recipe views do not alter authored recipes.\nNew site presentation assets: GPL-2.0-or-later; generator and test tooling: MIT.\n\n` + notices.join('\n\n--------------------------------\n\n'));
  for (const chosen of corpus.records) for (const media of chosen.media) {
    if (/^[a-z]+:/i.test(media)) throw new Error('Recipe media must be local: ' + media);
    if (media.startsWith('/') || media.includes('\\') || media.split('/').some(p => p === '..' || p === '.')) throw new Error(`Unsafe recipe media: ${media}`);
    add(`assets/recipes/${chosen.slug}/${media}`, await readFile(join(root, dirname(chosen.repositoryPath), media)));
  }
  const { outDir: omitted, ...publicConfig } = config;
  const manifest = { schemaVersion: 2, config: publicConfig, representative, recipes: corpus.records, pages,
    references: [...references.values()].map(r => ({ kind: r.kind, id: r.id, usageCount: r.usage?.length ?? 0, usageRecipes: r.usage?.map(u => u.id) ?? [] })),
    tags: corpus.tags, categories: corpus.categories,
    representativeDiagnostics: corpus.parsed.get(representative)!.diagnostics, generatedRecipeCount: corpus.records.length };
  add('site-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  add('metadata-audit.json', JSON.stringify(corpus.audit, null, 2) + '\n');
  add('metadata-audit.txt', [
    'Open Sauce Food metadata inventory — generated from authored recipe metadata',
    'No source labels have been merged, renamed or curated.',
    'Recipes: ' + corpus.records.length,
    'Distinct tags: ' + corpus.audit.distinctTags + '; recipe/tag memberships: ' + corpus.audit.tagAssignments,
    'Recipes with tags: ' + corpus.audit.recipesWithTags + '; without tags: ' + corpus.audit.recipesWithoutTags.length,
    'Recipes with category: ' + corpus.audit.recipesWithCategory + '; without category: ' + corpus.audit.recipesWithoutCategory.length,
    '\nEvery authored tag (recipe count; URL slug):',
    ...corpus.tags.map(f => f.value + '\t' + f.count + '\t' + f.slug),
    '\nEvery authored category (recipe count):', ...corpus.categories.map(f => f.value + '\t' + f.count),
    '\nCasing variants / slug collision groups:', ...corpus.audit.casingVariants.map(v => v.join(' / ')),
    '\nReview observations:', ...corpus.audit.reviewObservations,
    '\nRecipes without category:', ...corpus.audit.recipesWithoutCategory
  ].join('\n') + '\n');
  const diagnostics = corpus.records.flatMap(r => corpus.parsed.get(r.slug)!.diagnostics.map(d => ({ recipe: r.slug, ...d })));
  const unlinkedConcepts: { recipe: string; kind: string; raw: string; line: number }[] = [];
  for (const record of corpus.records) visitNodes(corpus.parsed.get(record.slug)!, node => {
    if (node.kind !== 'statement') return;
    for (const token of semanticTokens(node.tokens)) if ((token.kind === 'process' && !token.canonicalId) || (token.kind === 'thing' && !token.canonicalId && token.thingKind !== 'choice')) {
      unlinkedConcepts.push({ recipe: record.slug, kind: token.kind === 'process' ? 'process (no canonical reference)' : (token.thingKind === 'ingredient' || token.thingKind === 'equipment') ? token.thingKind + ' (no canonical reference)' : token.thingKind!, raw: token.raw, line: token.span.line });
    }
  });
  add('corpus-diagnostics.json', JSON.stringify({ warnings: diagnostics, unlinkedConcepts, sourceMutation: 'checked by source hashes during generation and tests' }, null, 2) + '\n');
  for (const record of corpus.records) {
    if (createHash('sha256').update(await readFile(join(root, record.repositoryPath))).digest('hex') !== record.sourceSha256) throw new Error('Recipe source changed during generation: ' + record.slug);
  }
  const validation = validateFiles(files, manifest);
  add('validation.json', JSON.stringify(validation, null, 2) + '\n');
  return { files, manifest, audit: corpus.audit, validation };
}

async function checkNoSymlinks(path: string) {
  let current = resolve(path);
  while (true) {
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error(`Output cannot use a symlink: ${current}`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const parent = dirname(current); if (parent === current) return; current = parent;
  }
}
export async function writeSite(root: string, config: SiteConfig, files: Map<string, string | Buffer>) {
  const output = resolve(root, config.outDir), canonicalRoot = await realpath(root);
  await checkNoSymlinks(output);
  // An in-repository output is isolated to site-dist; custom outputs may be external.
  const rel = relative(canonicalRoot, output);
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel) && rel !== 'site-dist') || relative(output, canonicalRoot).split(/[\\/]/)[0] !== '..' && !isAbsolute(relative(output, canonicalRoot))) throw new Error('Output must be site-dist or a separate directory outside the source repository.');
  let previous: string[] = [];
  try {
    const contents = await readdir(output);
    if (contents.length) {
      const owned = JSON.parse(await readFile(join(output, '.site-output.json'), 'utf8'));
      if (owned.generator !== 'open-sauce-food-static-v1' || !Array.isArray(owned.files)) throw new Error('Output is not owned by this generator');
      previous = owned.files;
      const actual: string[] = [];
      const walk = async (dir: string) => { for (const entry of await readdir(dir, { withFileTypes: true })) { const full = join(dir, entry.name); if (entry.isSymbolicLink()) throw new Error('Symlink in output'); if (entry.isDirectory()) await walk(full); else actual.push(relative(output, full).replaceAll('\\', '/')); } };
      await walk(output);
      if (actual.some(path => path !== '.site-output.json' && !previous.includes(path))) throw new Error('Unowned files in output; use a fresh directory.');
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; else { try { if ((await readdir(output)).length) throw new Error('Refusing to overwrite an existing directory without an ownership manifest'); } catch (inner) { if ((inner as NodeJS.ErrnoException).code !== 'ENOENT') throw inner; } } }
  const safePath = (path: string) => {
    const full = resolve(output, path), sub = relative(output, full);
    if (!sub || sub.startsWith('..') || isAbsolute(sub)) throw new Error('Unsafe output manifest path');
    return full;
  };
  for (const path of previous) safePath(path);
  for (const path of files.keys()) safePath(path);
  for (const [path, data] of files) { const full = safePath(path); await mkdir(dirname(full), { recursive: true }); await writeFile(full, data); }
  for (const path of previous) if (!files.has(path)) await unlink(safePath(path)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await writeFile(join(output, '.site-output.json'), JSON.stringify({ generator: 'open-sauce-food-static-v1', files: [...files.keys()], hashes: Object.fromEntries([...files].map(([path, data]) => [path, createHash('sha256').update(data).digest('hex')])) }, null, 2) + '\n');
  return output;
}
