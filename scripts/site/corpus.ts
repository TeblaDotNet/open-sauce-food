import { semanticTokens as nestedTokens } from '../../src/model/index.ts';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { isPublished } from '../../src/publication.ts';
import type { ConversionStage } from '../../src/publication.ts';
import { parseRecipe } from '../../src/parser/index.ts';
import type { Recipe, Node, Token } from '../../src/model/index.ts';
import type { Vocabulary } from '../../src/vocabulary/index.ts';
import { recipeFiles } from '../corpus.ts';
import { partAnchor } from '../../src/reference/index.ts';
import type { ReferenceKind } from '../../src/reference/index.ts';
import type { Routes } from './routes.ts';

export interface RecipeRecord {
  conversionStage: ConversionStage;
  slug: string; name: string; tags: string[]; categories: string[]; category?: string;
  originalSource: boolean; media: string[]; curation?: Recipe['curation']; repositoryPath: string; githubUrl: string;
  provenance: Record<string, string>; generated: boolean;
  sourceSha256: string; originalSourceHashes: string[];
  semanticLinks: string[];
}
export interface Facet { value: string; slug: string; recipes: string[]; count: number }
export const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function visitNodes(recipe: Recipe, visit: (node: Node) => void) {
  const walk = (nodes: Node[]) => { for (const n of nodes) { visit(n); if (n.kind === 'group' || n.kind === 'statement') walk(n.children); if (n.kind === 'group' && n.condition) walk([n.condition]); } };
  walk(recipe.preamble);
  for (const section of recipe.sections) if (!section.originalSource) walk(section.children);
}
export function semanticTokens(recipe: Recipe): Token[] {
  const tokens: Token[] = [];
  visitNodes(recipe, n => { if (n.kind === 'statement') tokens.push(...nestedTokens(n.tokens).filter(t => t.reference !== false && t.canonicalId && (t.kind === 'process' || t.thingKind === 'ingredient' || t.thingKind === 'equipment'))); });
  return tokens;
}
export function facetSlug(value: string) { return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'label'; }
export function facets(records: RecipeRecord[], key: 'tags' | 'categories') {
  const groups = new Map<string, string[]>();
  for (const r of records) for (const value of new Set(r[key])) groups.set(value, [...(groups.get(value) ?? []), r.slug]);
  const baseGroups = new Map<string, string[]>();
  for (const value of groups.keys()) { const slug = facetSlug(value); baseGroups.set(slug, [...(baseGroups.get(slug) ?? []), value]); }
  const used = new Set<string>();
  const entries: Facet[] = [...groups].sort(([a], [b]) => compare(a.toLowerCase(), b.toLowerCase()) || compare(a, b)).map(([value, recipes]) => {
    const base = facetSlug(value);
    // Colliding authored labels each get an identity suffix; never merge their memberships.
    let slug = baseGroups.get(base)!.length > 1 ? base + '--' + createHash('sha256').update(value).digest('hex').slice(0, 12) : base;
    if (used.has(slug)) throw new Error(`Facet slug collision: ${value}`);
    used.add(slug);
    return { value, slug, recipes: recipes.sort(compare), count: recipes.length };
  });
  return { entries, collisions: [...baseGroups].filter(([, v]) => v.length > 1).map(([slug, values]) => ({ slug, values })) };
}
export async function loadCorpus(root: string, vocabulary: Vocabulary, urls: Routes) {
  const excluded = new Set((JSON.parse(await readFile(join(root, 'release-exclusions.json'), 'utf8')).records as { slug: string }[]).map(r => r.slug));
  const records: RecipeRecord[] = [], parsed = new Map<string, Recipe>();
  for (const file of await recipeFiles(join(root, 'examples/public-domain-recipes'))) {
    const source = await readFile(file);
    const recipe = parseRecipe(source.toString('utf8'), { filename: file, vocabulary });
    if (recipe.diagnostics.some(d => d.severity === 'error')) throw new Error(`Recipe parse error: ${file}`);
    if (!recipe.conversionStage) throw new Error(`Missing or invalid conversion stage: ${file}`);
    const slug = basename(dirname(file));
    if (excluded.has(slug)) throw new Error('Excluded release recipe in corpus');
    if (parsed.has(slug)) throw new Error(`Duplicate recipe slug: ${slug}`);
    parsed.set(slug, recipe);
    const metadata = recipe.sections.find(s => s.name === 'recipe')?.children.filter(n => n.kind === 'metadata') ?? [];
    const values = (key: string) => metadata.filter(n => n.key === key).map(n => n.value);
    const tags = values('tags').flatMap(v => v.split(',').map(t => t.trim()).filter(Boolean));
    const categories = recipe.category ? [recipe.category] : [];
    const media = new Set<string>();
    visitNodes(recipe, n => {
      if (n.kind === 'metadata' && n.key === 'image') media.add(n.value);
      if (n.kind === 'statement') for (const token of n.tokens) if (token.kind === 'image' && token.path) media.add(token.path);
      if (n.kind === 'prose') for (const m of n.text.matchAll(/!\[[^\]]*\]\(([^)]*)\)/g)) media.add(m[1]);
    });
    const repositoryPath = relative(root, file).replaceAll('\\', '/');
    records.push({ conversionStage: recipe.conversionStage, slug, name: values('name')[0] ?? slug, tags, categories, category: categories[0],
      originalSource: recipe.sections.some(s => !!s.originalSource?.text.length), media: [...media],
      curation: recipe.curation, repositoryPath, githubUrl: urls.source(repositoryPath),
      provenance: Object.fromEntries(metadata.filter(n => ['source', 'source author', 'source license'].includes(n.key)).map(n => [n.key, n.value])),
      generated: true, sourceSha256: createHash('sha256').update(source).digest('hex'),
      originalSourceHashes: recipe.sections.filter(s => s.originalSource?.text.length).map(s => createHash('sha256').update(s.originalSource!.text).digest('hex')),
      semanticLinks: [...new Set(semanticTokens(recipe).map(t => urls.reference(t.kind === 'process' ? 'process' : t.thingKind as ReferenceKind, t.canonicalId!) +
        (t.thingKind === 'ingredient' && t.partResolution?.complete && t.partResolution.ids.length ? '#' + partAnchor(t.partResolution.ids) : '')))] });
  }
  records.sort((a, b) => compare(a.name.toLowerCase(), b.name.toLowerCase()) || compare(a.slug, b.slug));
  const published = records.filter(isPublished);
  const tags = facets(published, 'tags'), categories = facets(published, 'categories');
  const lowerGroups = new Map<string, string[]>();
  for (const f of tags.entries) lowerGroups.set(f.value.toLowerCase(), [...(lowerGroups.get(f.value.toLowerCase()) ?? []), f.value]);
  const tagValues = tags.entries.map(f => f.value);
  const singularPlural = tagValues.flatMap(v => [v + 's', v + 'es', ...(v.endsWith('y') ? [v.slice(0, -1) + 'ies'] : [])].filter(p => tagValues.includes(p)).map(p => [v, p]));
  const audit = {
    corpusRecipeCount: records.length, recipeCount: published.length, distinctTags: tags.entries.length, tagAssignments: tags.entries.reduce((n, t) => n + t.count, 0),
    recipesWithTags: published.filter(r => r.tags.length).length, recipesWithoutTags: published.filter(r => !r.tags.length).map(r => r.slug),
    recipesWithCategory: published.filter(r => r.categories.length).length, recipesWithoutCategory: published.filter(r => !r.categories.length).map(r => r.slug),
    tags: tags.entries, categories: categories.entries, tagSlugCollisions: tags.collisions, categorySlugCollisions: categories.collisions,
    casingVariants: [...lowerGroups.values()].filter(v => v.length > 1), possibleSingularPluralPairs: singularPlural,
    noisyCandidates: tagValues.filter(v => /[^\p{L}\p{N} '&-]/u.test(v)),
    categoryCasingVariants: categories.entries.flatMap((a, i) => categories.entries.slice(i + 1).filter(b => a.value.toLowerCase() === b.value.toLowerCase()).map(b => [a.value, b.value])),
    reviewObservations: [
      'Authored casing variants remain separate labels and separate URL pages.',
      'No obvious singular/plural duplicate pairs or spelling-variant pairs were found in the current tag inventory.',
      'Compound spellings such as icecream and slowcooked are retained; they have no matching spaced label in this corpus.',
      'Tags mix cuisine, ingredients, dish types, occasions, dietary/religious labels and subjective labels such as basic, easy and quick. This is provisional metadata, not a controlled taxonomy.',
      'Categories are optional single broad culinary roles. Corpus assignments are provisional best guesses and can be corrected.'
    ],
    note: 'Authored labels and recipe memberships are preserved. Candidate duplicates are observations, not merges.'
  };
  return { records, published, parsed, tags: tags.entries, categories: categories.entries, audit };
}
