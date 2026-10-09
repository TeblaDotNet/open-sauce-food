import { validateIngredientKnowledge } from './knowledge.ts';
import { readCuration } from '../curation.ts';
import type { Curation } from '../curation.ts';
import type { IngredientKnowledge, IngredientPart, PartGroup } from './knowledge.ts';
export * from './knowledge.ts';
export interface VocabularyEntry extends IngredientKnowledge {
  /** One direct ingredient family; no inheritance or alias expansion. */
  type_of?: string;
  curation?: Curation;
  id: string; kind: 'ingredient' | 'equipment' | 'process';
  /** False for ordinary actions that do not have public culinary reference pages. */
  reference?: boolean;
  canonical_name?: string;
  names: Record<string, string>;
  plural_names?: Record<string, string>;
  aliases?: (string | { name: string; type?: string; observed_count?: number })[];
  /** Recorded editorial/observation metadata, not live usage or resolution rules. */
  status?: string;
  evidence?: Record<string, unknown>;
  observed_parameters?: { value: string; count: number }[];
  observed_qualifiers?: { value: string; count: number }[];
}
/** Multiple matches are returned, never resolved by insertion order. */
export class Vocabulary {
  readonly diagnostics: { severity: 'warning'; code: 'INVALID_CURATION'; entryId: string; message: string }[] = [];
  readonly entries: readonly VocabularyEntry[];
  constructor(entries: readonly VocabularyEntry[]) {
    for (const entry of entries) {
      for (const message of readCuration(entry.curation).warnings)
        this.diagnostics.push({ severity: 'warning', code: 'INVALID_CURATION', entryId: entry.id, message });
      if (entry.reference !== undefined && (entry.kind !== 'process' || typeof entry.reference !== 'boolean'))
        throw new Error('reference must be a boolean on a process entry: ' + entry.id);
      if (entry.type_of !== undefined && (entry.kind !== 'ingredient' || typeof entry.type_of !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(entry.type_of)))
        throw new Error(`Invalid type_of on ${entry.id}: expected one canonical ingredient ID`);
      validateIngredientKnowledge(entry, entry.id);
      if (entry.kind !== 'ingredient' && ['variants', 'parts', 'part_groups', 'typical_mass', 'reference_density', 'nutrition'].some(k => Object.hasOwn(entry, k)))
        throw new Error(`Ingredient knowledge on non-ingredient: ${entry.id}`);
    }
    // Validate explicit family edges after every entry is available. No inferred edges.
    for (const entry of entries) {
      const seen = new Set([entry.id]);
      let current = entry;
      while (current.type_of !== undefined) {
        const matches = entries.filter(e => e.kind === 'ingredient' && e.id === current.type_of);
        if (matches.length !== 1) throw new Error('Invalid type_of target on ' + current.id);
        if (seen.has(matches[0].id)) throw new Error('Cyclic type_of on ' + entry.id);
        seen.add(matches[0].id);
        current = matches[0];
      }
    }
    this.entries = entries;
  }
  /** Parts are relative IDs at each level, never global ingredient aliases. */
  resolvePartPath(baseId: string, terms: readonly string[]): { ids: string[]; parts: IngredientPart[]; complete: boolean } {
    const entries = this.entries.filter(e => e.kind === 'ingredient' && e.id === baseId);
    const ids: string[] = [], parts: IngredientPart[] = [];
    let scope: IngredientKnowledge | undefined = entries.length === 1 ? entries[0] : undefined;
    for (const term of terms) {
      const key = term.trim().toLowerCase();
      const matches = Object.entries(scope?.parts ?? {}).filter(([id, p]) =>
        [id, ...Object.values(p.names), ...Object.values(p.plural_names ?? {}), ...(p.aliases ?? [])].some(n => n.toLowerCase() === key));
      if (matches.length !== 1) break;
      ids.push(matches[0][0]); parts.push(matches[0][1]); scope = matches[0][1];
    }
    return { ids, parts, complete: entries.length === 1 && ids.length === terms.length };
  }
  partGroups(baseId: string, parentParts: readonly string[] = []): { id: string; group: PartGroup }[] {
    const resolved = this.resolvePartPath(baseId, parentParts);
    if (!resolved.complete) return [];
    const scope = parentParts.length ? resolved.parts.at(-1) : this.entries.find(e => e.kind === 'ingredient' && e.id === baseId);
    return Object.entries(scope?.part_groups ?? {}).map(([id, group]) => ({ id, group }));
  }
  resolve(term: string, kind: VocabularyEntry['kind']): VocabularyEntry[] {
    const key = term.trim().toLowerCase();
    return this.entries.filter(e => e.kind === kind &&
      [e.id, e.canonical_name ?? '', ...Object.values(e.names), ...Object.values(e.plural_names ?? {}),
        ...(e.aliases ?? []).map(a => typeof a === 'string' ? a : a.name)].some(n => n.toLowerCase() === key));
  }
}
