/** Optional culinary knowledge, independent of recipe syntax and execution. */
export interface Provenance {
  citation: string;
  url?: string;
  accessed?: string;
  note?: string;
}
export interface SourcedQuantity {
  value: number;
  unit: string;
  approximate: boolean;
  source: Provenance;
  locale?: string;
  state?: string;
}
export interface QuantitativeKnowledge {
  typical_mass?: SourcedQuantity[];
  reference_density?: SourcedQuantity[];
  nutrition?: { per_100g: Record<string, SourcedQuantity> };
}
export interface PartGroup {
  /** A culinary operation, not a claim of exhaustive anatomy or mass balance. */
  process: string;
  parts: string[];
  description?: string;
  sources?: Provenance[];
}
export interface IngredientPart extends IngredientKnowledge {
  names: Record<string, string>;
  plural_names?: Record<string, string>;
  aliases?: string[];
}
export interface IngredientKnowledge extends QuantitativeKnowledge {
  /** Local named types only; no inheritance, conversions or implied aliases. */
  variants?: Record<string, { names: Record<string, string>; aliases?: string[] }>;
  parts?: Record<string, IngredientPart>;
  part_groups?: Record<string, PartGroup>;
}

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const string = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const names = (v: unknown) => record(v) && Object.keys(v).length > 0 && Object.values(v).every(string);
const id = (v: string) => /^[a-z][a-z0-9_-]*$/.test(v);

/** Fail at the data boundary, never while interpreting an unknown recipe part. */
export function validateIngredientKnowledge(value: unknown, path: string, ancestors = new Set<object>()): void {
  const fail = (field: string): never => { throw new Error(`Invalid ingredient knowledge: ${path}.${field}`); };
  if (!record(value)) fail('entry');
  const data = value as Record<string, unknown>;
  if (ancestors.has(data)) fail('cyclic_parts');
  ancestors.add(data);
  const source = (v: unknown) => record(v) && string(v.citation) &&
    ['url', 'accessed', 'note'].every(k => v[k] === undefined || string(v[k]));
  const quantity = (v: unknown) => record(v) && typeof v.value === 'number' && Number.isFinite(v.value) && v.value >= 0 &&
    string(v.unit) && typeof v.approximate === 'boolean' && source(v.source) &&
    ['locale', 'state'].every(k => v[k] === undefined || string(v[k]));
  if (data.plural_names !== undefined && !names(data.plural_names)) fail('plural_names');
  if (data.variants !== undefined) {
    if (!record(data.variants)) fail('variants');
    for (const [key, variant] of Object.entries(data.variants as Record<string, unknown>))
      if (!id(key) || !record(variant) || !names(variant.names) ||
        (variant.aliases !== undefined && (!Array.isArray(variant.aliases) || !variant.aliases.every(string)))) fail(`variants.${key}`);
  }
  for (const k of ['typical_mass', 'reference_density']) if (data[k] !== undefined &&
    (!Array.isArray(data[k]) || !(data[k] as unknown[]).every(quantity))) fail(k);
  if (data.nutrition !== undefined && (!record(data.nutrition) || !record(data.nutrition.per_100g) ||
    !Object.entries(data.nutrition.per_100g).every(([key, v]) => id(key) && quantity(v)))) fail('nutrition.per_100g');
  if (data.parts !== undefined) {
    if (!record(data.parts)) fail('parts');
    for (const [key, part] of Object.entries(data.parts as Record<string, unknown>)) {
      if (!id(key) || !record(part) || !names(part.names) ||
        (part.aliases !== undefined && (!Array.isArray(part.aliases) || !part.aliases.every(string)))) fail(`parts.${key}`);
      if (record(part) && part.type_of !== undefined) fail(`parts.${key}.type_of`);
      validateIngredientKnowledge(part, `${path}.parts.${key}`, ancestors);
    }
  }
  if (data.part_groups !== undefined) {
    if (!record(data.part_groups)) fail('part_groups');
    for (const [key, group] of Object.entries(data.part_groups as Record<string, unknown>)) {
      if (!id(key) || !record(group) || !string(group.process) || !Array.isArray(group.parts) || group.parts.length < 2 ||
        !group.parts.every(p => string(p) && record(data.parts) && Object.hasOwn(data.parts, p)) ||
        new Set(group.parts).size !== group.parts.length ||
        (group.description !== undefined && !string(group.description)) ||
        (group.sources !== undefined && (!Array.isArray(group.sources) || !group.sources.every(source)))) fail(`part_groups.${key}`);
    }
  }
  ancestors.delete(data);
}
