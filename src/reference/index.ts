import { readCuration } from '../curation.ts';
import type { Node, Recipe, Token } from '../model/index.ts';
import type { Vocabulary, VocabularyEntry, IngredientKnowledge, PartGroup, QuantitativeKnowledge } from '../vocabulary/index.ts';

export type ReferenceKind = VocabularyEntry['kind'];
export interface CorpusRecipe { id: string; name: string; recipe: Recipe }
export interface UsageForm {
  /** Authored parts remain visible even when the vocabulary knows only a prefix. */
  parts: string[];
  canonicalParts?: string[];
  variant?: string;
}
export interface RecipeUsage { id: string; name: string; forms: UsageForm[] }
export interface UsageIndex { recipeCount: number; concepts: Record<string, RecipeUsage[]> }
const key = (kind: ReferenceKind, id: string) => JSON.stringify([kind, id]);

/** Counts distinct recipes with explicit resolved tokens, not text mentions or inherited subjects. */
export function buildUsageIndex(recipes: readonly CorpusRecipe[]): UsageIndex {
  const concepts: Record<string, RecipeUsage[]> = Object.create(null);
  const seen = new Set<string>();
  for (const item of recipes) {
    if (seen.has(item.id)) throw new Error(`Duplicate corpus recipe: ${item.id}`);
    seen.add(item.id);
    const uses = new Map<string, Map<string, UsageForm>>();
    const visit = (nodes: readonly Node[]) => {
      for (const node of nodes) {
        if (node.kind === 'statement') for (const token of node.tokens) {
          const kind = token.kind === 'process' ? 'process' : token.kind === 'thing' ? token.thingKind : undefined;
          if (!token.canonicalId || !kind || !['ingredient', 'equipment', 'process'].includes(kind)) continue;
          const id = key(kind as ReferenceKind, token.canonicalId);
          const forms = uses.get(id) ?? new Map<string, UsageForm>();
          const form: UsageForm = { parts: [...(token.parts ?? [])] };
          if (token.variant) form.variant = token.variant;
          if (token.partResolution?.complete && token.parts?.length) form.canonicalParts = [...token.partResolution.ids];
          forms.set(JSON.stringify(form), form); uses.set(id, forms);
        }
        if (node.kind === 'statement' || node.kind === 'group') visit(node.children);
        if (node.kind === 'group' && node.condition) visit([node.condition]);
      }
    };
    visit(item.recipe.preamble);
    for (const section of item.recipe.sections) if (!section.originalSource) visit(section.children);
    for (const [id, forms] of uses) (concepts[id] ??= []).push({ id: item.id, name: item.name, forms: [...forms.values()] });
  }
  for (const recipes of Object.values(concepts)) recipes.sort((a, b) => a.name.localeCompare(b.name));
  return { recipeCount: seen.size, concepts };
}

export function referencePath(kind: ReferenceKind, id: string): string {
  return `/reference/${kind}/${encodeURIComponent(id)}`;
}
/** Each segment is local to its parent. Slashes make nested paths unambiguous. */
export function partAnchor(path: readonly string[]): string { return `part-${path.map(encodeURIComponent).join('/')}`; }
export function recipePath(id: string): string { return `/?recipe=${encodeURIComponent(id)}`; }
export function recipeReferenceUrl(target: { kind: ReferenceKind; canonicalId: string; token: Token }): string {
  const part = target.kind === 'ingredient' && target.token.partResolution?.complete && target.token.partResolution.ids.length
    ? `#${partAnchor(target.token.partResolution.ids)}` : '';
  return referencePath(target.kind, target.canonicalId) + part;
}
export interface ReferenceGroup extends PartGroup { id: string; processUrl?: string; members: { id: string; anchor: string }[] }
export interface ReferencePart extends ReferenceKnowledge {
  id: string; path: string[]; anchor: string; name: string;
  names: Record<string, string>; pluralNames?: Record<string, string>; aliases: string[];
}
export interface ReferenceKnowledge extends QuantitativeKnowledge { parts: ReferencePart[]; groups: ReferenceGroup[] }
export interface ReferencePage extends ReferenceKnowledge {
  variants?: IngredientKnowledge['variants'];
  curation?: import('../curation.ts').Curation;
  id: string; kind: ReferenceKind; name: string; canonicalName?: string;
  names: Record<string, string>; pluralNames?: Record<string, string>;
  aliases: { name: string; type?: string; observed_count?: number }[];
  status?: string; evidence?: Record<string, unknown>;
  observations: { parameters?: VocabularyEntry['observed_parameters']; qualifiers?: VocabularyEntry['observed_qualifiers'] };
  /** Undefined means no index was supplied; an empty array means indexed, with no resolved uses. */
  usage?: RecipeUsage[]; corpusSize?: number;
}
const displayName = (names: Record<string, string>, fallback: string) => names.en ?? names['en-GB'] ?? Object.values(names)[0] ?? fallback;

/** Browser-safe data projection. No filesystem, HTML, parser changes or invented definitions. */
export function createReferencePage(vocabulary: Vocabulary, kind: ReferenceKind, id: string, usage?: UsageIndex, options: { referenceUrl?: (kind: ReferenceKind, id: string) => string | undefined } = {}): ReferencePage | undefined {
  const matches = vocabulary.entries.filter(e => e.kind === kind && e.id === id);
  if (matches.length !== 1) return undefined;
  const entry = matches[0];
  const knowledge = (data: IngredientKnowledge, path: string[]): ReferenceKnowledge => ({
    typical_mass: data.typical_mass, reference_density: data.reference_density, nutrition: data.nutrition,
    parts: Object.entries(data.parts ?? {}).map(([id, part]) => {
      const next = [...path, id];
      return { ...knowledge(part, next), id, path: next, anchor: partAnchor(next), name: displayName(part.names, id),
        names: part.names, pluralNames: part.plural_names, aliases: part.aliases ?? [] };
    }),
    groups: Object.entries(data.part_groups ?? {}).map(([id, group]) => {
      const processes = vocabulary.resolve(group.process, 'process');
      return { ...group, id, processUrl: processes.length === 1 ? (options.referenceUrl ?? referencePath)('process', processes[0].id) : undefined,
        members: group.parts.map(id => ({ id, anchor: partAnchor([...path, id]) })) };
    })
  });
  return structuredClone({ ...knowledge(entry, []), id, kind, name: displayName(entry.names, entry.canonical_name ?? id),
    canonicalName: entry.canonical_name, names: entry.names, pluralNames: entry.plural_names,
    aliases: (entry.aliases ?? []).map(a => typeof a === 'string' ? { name: a } : a),
    status: entry.status, evidence: entry.evidence, curation: readCuration(entry.curation).curation, variants: entry.variants,
    observations: { parameters: entry.observed_parameters, qualifiers: entry.observed_qualifiers },
    usage: usage ? usage.concepts[key(kind, id)] ?? [] : undefined, corpusSize: usage?.recipeCount });
}
