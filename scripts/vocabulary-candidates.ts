import type { Vocabulary, VocabularyEntry } from '../src/vocabulary/index.ts';

/** Queue hints only: never turn a heuristic into a runtime alias. */
export function classifyCandidate(term: string, kind: VocabularyEntry['kind'], vocabulary: Vocabulary) {
  const name = term.toLowerCase();
  const exact = vocabulary.resolve(name, kind);
  if (exact.length === 1) return { category: 'observed aliases/regional names', matches: exact.map(e => e.id) };
  if (exact.length > 1) return { category: 'requires culinary judgement', matches: exact.map(e => e.id) };
  const other = (['ingredient','equipment','process'] as const).filter(k => k !== kind)
    .flatMap(k => vocabulary.resolve(name, k).map(e => `${k}:${e.id}`));
  if (other.length) return { category: 'equipment/process confusion', matches: other };
  if (/^\d|^[~!¼½¾]|\b(?:whatever|of choice|you want|described in source|sized|recipient)\b|^(?:bag|bottle|can|packet|package|heaping|level)\s/i.test(name))
    return { category: 'malformed/source-specific phrase', matches: [] };
  if (/\b(?:or|and)\b|\//.test(name)) return { category: 'ambiguous compound ingredient', matches: [] };
  const singulars = [name.replace(/ies$/, 'y'), name.replace(/es$/, ''), name.replace(/s$/, '')].filter(s => s !== name);
  const plurals = [...new Set(singulars.flatMap(s => vocabulary.resolve(s, kind).map(e => e.id)))];
  if (plurals.length) return { category: 'likely aliases/regional names', matches: plurals };
  const preparation = /^(raw|cooked|dry|fresh|frozen|dried|chopped|finely|minced|whole|large|small|medium|optional|warm|cold|roasted|grated|shredded|sliced|peeled|ground|boneless|skinless|cleaned)\b/;
  if (preparation.test(name) || /\b(?:to taste|minced|chopped|grounded)$/.test(name)) return { category: 'recurring preparation/state phrase', matches: [] };
  const part = name.match(/^(garlic) (cloves?)$|^(broccoli) (florets?)$|^(basil|oregano) (leaves)$/);
  if (part) return { category: 'possible part', matches: [part[1] ?? part[3] ?? part[5]] };
  const bases = vocabulary.entries.filter(e => e.kind === kind && [e.canonical_name, ...Object.values(e.names)]
    .some(n => n && name.endsWith(' ' + n.toLowerCase()))).map(e => e.id);
  if (bases.length) return { category: 'likely variants', matches: bases };
  if (kind === 'process') return { category: 'new process candidates', matches: [] };
  if (kind === 'equipment') return { category: 'new equipment candidates', matches: [] };
  return { category: name.split(' ').length > 4 ? 'requires culinary judgement' : 'likely new ingredient concepts', matches: [] };
}

export function knownVariant(vocabulary: Vocabulary, base: string, variant: string): boolean {
  const matches = vocabulary.resolve(base, 'ingredient');
  return matches.length === 1 && Object.entries(matches[0].variants ?? {}).filter(([id,v]) =>
    [id, ...Object.values(v.names), ...(v.aliases ?? [])].some(s => s.toLowerCase() === variant.toLowerCase())).length === 1;
}
export const candidateCategories = ['likely new ingredient concepts', 'likely aliases/regional names', 'likely variants',
  'new equipment candidates', 'new process candidates', 'strong part relationship', 'strong variant/type relationship',
  'ambiguous qualifier', 'possible culinary part group', 'equipment/process confusion', 'malformed/source-specific phrase',
  'ambiguous compound ingredient', 'recurring preparation/state phrase', 'possible part', 'requires culinary judgement'];
