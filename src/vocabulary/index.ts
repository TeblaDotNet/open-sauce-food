import { validateIngredientKnowledge } from './knowledge.ts';
import { readCuration } from '../curation.ts';
import type { Curation } from '../curation.ts';
import type { IngredientKnowledge, IngredientPart, PartGroup } from './knowledge.ts';
export * from './knowledge.ts';
export interface IngredientState { names: Record<string, string>; aliases?: string[] }
export interface VocabularyEntry extends IngredientKnowledge {
  /** Explicit local states of this whole ingredient/type; never inherited. */
  states?: Record<string, IngredientState>;
  /** One direct same-domain ingredient/equipment parent; no inheritance or alias expansion. */
  type_of?: string;
  curation?: Curation;
  id: string; kind: 'ingredient' | 'equipment' | 'process';
  /** False for process/equipment concepts without a public reference page; identity is unchanged. */
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
export interface IngredientTarget {
  entry: VocabularyEntry;
  /** Effective structure for identity comparison; authored token fields stay untouched. */
  parts: string[];
  variant?: string;
  compatibility: boolean;
  partResolution?: { ids: string[]; complete: boolean };
}
/** Multiple matches are returned, never resolved by insertion order. */
export class Vocabulary {
  private readonly partLexemes = new Map<string, { entry: VocabularyEntry; parts: string[] }>();
  readonly diagnostics: { severity: 'warning'; code: 'INVALID_CURATION'; entryId: string; message: string }[] = [];
  readonly entries: readonly VocabularyEntry[];
  constructor(entries: readonly VocabularyEntry[]) {
    for (const entry of entries) {
      for (const message of readCuration(entry.curation).warnings)
        this.diagnostics.push({ severity: 'warning', code: 'INVALID_CURATION', entryId: entry.id, message });
      if (entry.reference !== undefined && (!['process', 'equipment'].includes(entry.kind) || typeof entry.reference !== 'boolean'))
        throw new Error('reference must be a boolean on a process or equipment entry: ' + entry.id);
      if (entry.type_of !== undefined && (!['ingredient', 'equipment'].includes(entry.kind) || typeof entry.type_of !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(entry.type_of)))
        throw new Error(`Invalid type_of on ${entry.id}: expected one canonical ingredient or equipment ID`);
      validateIngredientKnowledge(entry, entry.id);
      if (entry.kind !== 'ingredient' && ['states', 'variants', 'parts', 'part_groups', 'typical_mass', 'reference_density', 'nutrition'].some(k => Object.hasOwn(entry, k)))
        throw new Error(`Ingredient knowledge on non-ingredient: ${entry.id}`);
    }
    // Validate explicit family edges after every entry is available. No inferred edges.
    for (const entry of entries) {
      const seen = new Set([entry.id]);
      let current = entry;
      while (current.type_of !== undefined) {
        const matches = entries.filter(e => e.kind === entry.kind && e.id === current.type_of);
        if (matches.length !== 1) throw new Error('Invalid type_of target on ' + current.id);
        if (seen.has(matches[0].id)) throw new Error('Cyclic type_of on ' + entry.id);
        seen.add(matches[0].id);
        current = matches[0];
      }
    }
    this.entries = entries;
    for (const entry of entries) {
      if ('lexical_names' in entry) throw new Error('lexical_names belongs on an ingredient part');
      for (const variant of Object.values(entry.variants ?? {})) if (variant.canonical_id !== undefined) {
        const targets = entries.filter(e => e.kind === 'ingredient' && e.id === variant.canonical_id);
        if (entry.kind !== 'ingredient' || targets.length !== 1 || targets[0].type_of !== entry.id)
          throw new Error('Invalid variant canonical_id on ' + entry.id + ': expected a direct family child');
      }
      const visit = (parts: IngredientKnowledge['parts'], path: string[]) => {
        for (const [id, part] of Object.entries(parts ?? {})) {
          const next = [...path, id];
          for (const name of part.lexical_names ?? []) {
            const key = name.trim().toLowerCase();
            if (entry.kind !== 'ingredient' || this.resolve(name, 'ingredient').length || this.partLexemes.has(key))
              throw new Error('Ambiguous part lexical_names: ' + name);
            this.partLexemes.set(key, { entry, parts: next });
          }
          visit(part.parts, next);
        }
      };
      visit(entry.parts, []);
    }
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
  /** Resolve full compound names and explicitly promoted variants without rewriting source. */
  resolveIngredient(name: string, variant?: string, parts: readonly string[] = []): IngredientTarget[] {
    const norm = (s: string) => s.trim().toLowerCase();
    const lexical = this.partLexemes.get(norm(name));
    const bases = lexical ? [lexical.entry] : this.resolve(name, 'ingredient');
    return bases.flatMap(base => {
      const variants = variant && !lexical ? Object.entries(base.variants ?? {}).filter(([id, v]) =>
        [id, ...Object.values(v.names), ...(v.aliases ?? [])].some(n => norm(n) === norm(variant))) : [];
      const promoted = variants.filter(([, v]) => v.canonical_id);
      const targets = promoted.length ? variants.map(([, v]) => ({
        entry: v.canonical_id ? this.entries.find(e => e.kind === 'ingredient' && e.id === v.canonical_id)! : base,
        promoted: !!v.canonical_id
      })) : [{ entry: base, promoted: false }];
      return targets.map(({entry, promoted}) => {
        const effective = [...(lexical?.parts ?? []), ...parts];
        const resolved = effective.length ? this.resolvePartPath(entry.id, effective) : undefined;
        return { entry, parts: resolved?.complete ? resolved.ids : effective,
          variant: promoted ? undefined : variant, compatibility: !!lexical || promoted,
          partResolution: resolved ? { ids: resolved.ids, complete: resolved.complete } : undefined };
      });
    });
  }
  /** Exact local qualifier matching; no prose inference, transitions or inheritance. */
  resolveState(baseId: string, qualifier: string): string | undefined {
    const entries = this.entries.filter(e => e.kind === 'ingredient' && e.id === baseId);
    if (entries.length !== 1) return undefined;
    const key = qualifier.trim().toLowerCase();
    return Object.entries(entries[0].states ?? {}).find(([id, state]) =>
      [id, ...Object.values(state.names), ...(state.aliases ?? [])].some(n => n.trim().toLowerCase() === key))?.[0];
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
