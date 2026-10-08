import { classifyCandidate, knownVariant, candidateCategories } from './vocabulary-candidates.ts';
/** Read-only analysis of the promoted import; writes audit reports, never YAML. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { parseRecipe, renderCompact, renderHtml } from '../src/index.ts';
import type { Node } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';

const manifest = JSON.parse(readFileSync('public-domain-import.json', 'utf8'));
const vocabulary = await loadVocabulary('.');
const observations = new Map<string, { category: string; term: string; canonicalMatches: string[]; recipes: Set<string>; examples: string[] }>();
function observe(category: string, term: string, slug: string, example: string, matches: string[] = []) {
  const key = JSON.stringify([category, term.toLowerCase()]);
  const value = observations.get(key) ?? { category, term, canonicalMatches: matches, recipes: new Set(), examples: [] };
  value.recipes.add(slug); if (!value.examples.includes(example) && value.examples.length < 5) value.examples.push(example);
  observations.set(key, value);
}
const validation: Record<string, any>[] = [];
const newly = manifest.records.filter((r: any) => r.conversionStatus === 'converted');
const allPromoted = manifest.records.filter((r: any) => r.opensaucePath);
for (const item of allPromoted) {
  const text = readFileSync(item.opensaucePath, 'utf8'), recipe = parseRecipe(text, { vocabulary });
  const compact = renderCompact(recipe); const html = renderHtml(recipe);
  renderHtml(recipe, { view: 'compact' }); renderHtml(recipe, { view: 'originalSource' });
  const partUses = new Map<string, Set<string>>();
  const visit = (nodes: Node[], section: string) => {
    for (const node of nodes) {
      if (node.kind === 'statement') for (const token of node.tokens) {
        if (token.kind === 'thing') {
          if (token.thingKind === 'choice') continue;
          const kind = section === 'equipment' || token.thingKind === 'equipment' ? 'equipment' : 'ingredient';
          const matches = vocabulary.resolve(token.name!, kind);
          if (!matches.length) {
            const hint = classifyCandidate(token.name!, kind, vocabulary);
            observe(hint.category, token.name!, item.slug, token.raw, hint.matches);
          } else if (!matches.some(e => e.canonical_name === token.name)) observe('observed aliases/regional names', token.name!, item.slug, token.raw, matches.map(e => e.id));
          if (token.parts?.length) {
            observe(matches.length === 1 && vocabulary.resolvePartPath(matches[0].id, token.parts).complete ? 'known part relationship' : 'strong part relationship', `${token.name}: ${token.parts.join(': ')}`, item.slug, token.raw, matches.map(e => e.id));
            const parts = partUses.get(token.name!) ?? new Set(); token.parts.forEach(p => parts.add(p)); partUses.set(token.name!, parts);
          }
          if (token.variant) observe(knownVariant(vocabulary, token.name!, token.variant) ? 'known variant/type relationship' : 'strong variant/type relationship', `${token.name}; ${token.variant}`, item.slug, token.raw, matches.map(e => e.id));
          const cut = token.name!.match(/^(chicken|pork|beef|lamb|duck|turkey) (breasts?|thighs?|legs?|wings?|loin|shoulder|liver|kidneys?)$/i);
          if (cut) observe('strong part relationship', `${cut[1]}: ${cut[2]} (review existing compound concept)`, item.slug, token.raw, matches.map(e => e.id));
          for (const q of token.qualifiers ?? []) observe('recurring qualifiers', q, item.slug, token.raw);
        }
        if (token.kind === 'process') {
          const matches = vocabulary.resolve(token.name!, 'process');
          if (!matches.length) { const hint = classifyCandidate(token.name!, 'process', vocabulary); observe(hint.category, token.name!, item.slug, token.raw, hint.matches); }
          for (const p of token.parameters ?? []) observe('process parameters', `${token.name}: ${p}`, item.slug, token.raw);
        }
      }
      if (node.kind === 'statement' || node.kind === 'group') visit(node.children, section);
      if (node.kind === 'group' && node.condition) visit([node.condition], section);
    }
  };
  recipe.sections.filter(s => !s.originalSource).forEach(s => visit(s.children, s.name));
  for (const [base, parts] of partUses) if (parts.size > 1) observe('possible culinary part group', `${base}: ${[...parts].join(' + ')}`, item.slug, 'Co-occurrence only; inspect original for shared origin/process and quantities.');
  validation.push({ slug: item.slug, path: item.opensaucePath, errors: recipe.diagnostics.filter(d => d.severity === 'error'), warnings: recipe.diagnostics.filter(d => d.severity === 'warning'), compactCharacters: compact.length, htmlCharacters: html.length });
}
const candidates = [...observations.values()].map(o => ({ ...o, recipes: [...o.recipes].sort() })).sort((a, b) => a.category.localeCompare(b.category) || a.term.localeCompare(b.term));
const counts = Object.fromEntries([...new Set(candidates.map(c => c.category))].map(category => [category, candidates.filter(c => c.category === category).length]));
const candidateCount = candidates.filter(c => candidateCategories.includes(c.category)).length;
writeFileSync('public-domain-vocabulary-candidates.json', JSON.stringify({ revision: manifest.revision, recipeCount: allPromoted.length, policy: 'Full-corpus observations and remaining review candidates after vocabulary pass 1. Heuristics do not create aliases or concepts.', candidateCount, counts, candidates }, null, 2) + '\n');
writeFileSync('public-domain-import-validation.json', JSON.stringify({ revision: manifest.revision, recipesChecked: allPromoted.length, newRecipes: newly.length, errors: validation.reduce((n, r) => n + r.errors.length, 0), warnings: validation.reduce((n, r) => n + r.warnings.length, 0), recipes: validation }, null, 2) + '\n');
const md = (s: string) => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ').replaceAll('[', '&#91;').replaceAll(']', '&#93;');
const s = manifest.summary;
const report = [
 '# Public corpus import and review', '',
 'Public-release subset, 8 October 2026. This replaces the private full-import report; it does not rewrite that historical evidence.', '',
 `Pinned upstream: ${manifest.repository}, revision \`${manifest.revision}\`.`, '',
 `Public corpus: **${allPromoted.length}** recipes: ${s.alreadyRepresented} earlier encodings and ${s.newlyConverted} generated/unchecked conversions. Upstream has ${s.upstreamRecipes} recipes; five are excluded from this distribution.`, '',
 'See [exclusion record](release-exclusions.json), [licensing](LICENSING.md) and [data sources](DATA-SOURCES.md). Neither parsing nor curation establishes culinary safety or rights clearance.', '',
 'The public inventory retains hashes and paths for included sources. Migration and vocabulary baselines are filtered historical evidence; live reports describe only this public subset.', '',
 'Regenerate with: node scripts/report-public-domain-import.ts, then node scripts/report-vocabulary-review.ts. The historical importer is intentionally not distributed: it retains provenance-held material. Do not re-import excluded sources.', '',
 `Vocabulary review queue: ${candidateCount} term/category pairs; classification hints are not canonical aliases.`, '',
 ...['source ambiguity','syntax/representation question','provenance/licensing','quantity/unit oddity','culinary interpretation','safety','cross-recipe dependency'].flatMap(category => {
  const found=manifest.issues.filter((i:any)=>i.category===category);
  return ['## '+category,'',...found.map((i:any)=>`- **${i.slug}**: ${md(i.evidence)} — ${i.decision}`),''];
 }), ''
];
writeFileSync('PUBLIC-DOMAIN-IMPORT.md', report.join('\n'));
const all = manifest.records.filter((r: any) => r.opensaucePath && r.conversionStatus !== 'skipped').sort((a: any,b: any) => a.title.localeCompare(b.title));
writeFileSync('MANIFEST.md', ['# Open Sauce Food Public-Domain Corpus — Draft 8', '', `Current corpus: **${all.length} .opensauce recipes** (${s.alreadyRepresented} earlier + ${s.newlyConverted} new).`, '',
  'See [PUBLIC-DOMAIN-IMPORT.md](PUBLIC-DOMAIN-IMPORT.md) and [public-domain-import.json](public-domain-import.json) for the complete upstream inventory, provenance holds, source mapping, images and review caveats. Image counts below are local promoted assets, not a licensing reassessment of earlier files.', '',
  '| # | Recipe | File | Images |', '|---:|---|---|---:|',
  ...all.map((r: any, i: number) => `| ${i+1} | ${md(r.title)} | [${r.slug}](${r.opensaucePath}) | ${readdirSync(r.opensaucePath.slice(0,r.opensaucePath.lastIndexOf('/'))).filter(f => /\.(webp|png|jpe?g)$/i.test(f)).length} |`), ''
].join('\n'));
console.log(JSON.stringify({ candidateCount, counts, newValidationErrors: validation.reduce((n,r)=>n+r.errors.length,0) }, null, 2));
