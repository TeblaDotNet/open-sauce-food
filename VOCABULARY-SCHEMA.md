# Open Sauce Food vocabulary schema — optional ingredient knowledge on Draft 8

Vocabulary enriches recipe meaning; it does not define legal recipe syntax. Sparse
canonical entries remain valid. This is tooling/data enrichment, not Draft 9.
The canonical index remains schema version `0.3`: its file-list structure has not
changed. New entry modules are optional, validated by the loader and portable
`Vocabulary` constructor, and preserved through JSON transport to the browser.

## Identity and names (existing)

```yaml
id: courgette
kind: ingredient
canonical_name: courgette
names:
  en-GB: courgette
  en-US: zucchini
aliases:
  - name: zucchini
    type: regional-name
```

Locale names and accepted aliases resolve to a canonical concept while recipe
spelling stays intact. Existing `status` and `evidence` are curation records, not
executable alias rules. The runtime loader selects supported fields; observations
never become inferred aliases. Parts, variants and substitutions are relationships,
not aliases: egg yolk is not an alias for a whole egg.

## Parts and culinary groups (implemented)

```yaml
id: egg
kind: ingredient
names:
  en: egg
plural_names:
  en: eggs
parts:
  yolk:
    names:
      en-GB: yolk
      en-US: yolk
    plural_names:
      en: yolks
  white:
    names:
      en-GB: white
      en-US: white
    plural_names:
      en: whites
  shell:
    names:
      en: shell
    plural_names:
      en: shells
part_groups:
  separated_contents:
    process: separate
    parts: [yolk, white]
    description: Useful separated contents; excludes shell, not exhaustive anatomy.
    sources:
      - citation: examples/public-domain-recipes/tiramisu/tiramisu.opensauce
```

Egg groups and reviewed citrus, garlic, onion, oregano and chicken parts are populated.
See [VOCABULARY-REVIEW.md](VOCABULARY-REVIEW.md) for the first full-corpus review. No numerical measurements were added.
`parts` maps local stable IDs to part objects. IDs start with a lowercase ASCII
letter and contain lowercase letters, digits, hyphens or underscores. A part
requires nonempty locale `names`; it may add `plural_names`, string `aliases`,
nested `parts`, local `part_groups`, and quantitative modules below. Nested parts
can express `chicken → thigh → skin` without adding global compound concepts.
Compound names are not automatically rewritten into part paths.

`part_groups` maps IDs to `{ process, parts, description?, sources? }`. Members
are distinct IDs of direct child parts in the same scope. At least two members
are required; dangling IDs are rejected. Groups are not exhaustive anatomical
partitions, reaction equations, yields or mass-balance assertions. Shell exists
but is deliberately absent from `separated_contents`.

`plural_names` stores lexical forms rather than guessing plurals. Current English
rendering selects `en`, then `en-GB`, then `en-US`; general locale selection remains
future work. Structural sources are optional; quantitative sources are mandatory.

## Resolution and annotation API

```ts
const path = vocabulary.resolvePartPath('egg', ['yolk']);
// { ids: ['yolk'], parts: [partMetadata], complete: true }
const groups = vocabulary.partGroups('egg');
// [{ id: 'separated_contents', group: ... }]
```

Paths resolve within their parent using IDs, names and explicit aliases. Competing
matches are never settled by insertion order. Unknown or ambiguous suffixes return
the known prefix with `complete: false`; nothing is discarded. `partGroups(baseId,
parentParts?)` supports nested scopes. Unknown bases/scopes return no groups.
Parts never join the global alias index.

With `parseRecipe(text, { vocabulary })`, a uniquely canonical ingredient token
with explicit parts receives `partResolution: { ids, complete }`. Existing `name`,
`variant`, `parts`, `qualifiers`, `raw`, `span` and `canonicalId` retain their meaning.
Without vocabulary there is no annotation. Unknown parts remain legal Draft 8;
legacy comma qualifiers are not silently treated as explicit parts.

Optional `variants` maps local IDs to `{ names, aliases? }`, for example
`variants: { whole: { names: { en: whole } } }` on milk. These are named types only;
there is no inheritance, quantitative variant knowledge or automatic compound-name
aliasing. They survive YAML/API transport and appear on reference pages. Lookup
describes base-ingredient knowledge, not evidence that every fact applies to every
cultivar, size or state. Explicit `plural_names` are also accepted lexical forms
for base and part lookup; no runtime plural stemming is performed.
The separation renderer declines variant-qualified references.

## Quantitative modules (schema/API only; no real values populated)

An ingredient or part may optionally carry:

```ts
interface SourcedQuantity {
  value: number;       // finite, nonnegative
  unit: string;        // explicit; not automatically converted
  approximate: boolean;
  source: {
    citation: string;  // mandatory, nonempty, auditable citation or repository path
    url?: string;
    accessed?: string;
    note?: string;
  };
  locale?: string;
  state?: string;
}
interface QuantitativeKnowledge {
  typical_mass?: SourcedQuantity[];
  reference_density?: SourcedQuantity[];
  nutrition?: { per_100g: Record<string, SourcedQuantity> };
}
```

These same keys are accepted in YAML. Numeric examples are deliberately omitted:
this establishes a contract, not a food dataset. Tests use explicitly synthetic
values and units in memory, never in canonical ingredient files.

Typical mass describes one item/part in its recorded locale/state (including size
class when relevant). Reference density uses an explicit unit such as `g/ml`, with
packing/preparation state where applicable. Arrays allow different contexts without
implying interchangeability. Nutrition uses a fixed **100 g of the stated ingredient,
part and state** basis; nutrient IDs have explicit units and individual sources.
Conflicting states/locales must not be silently combined to infer a serving. A
future API may need multiple nutrition panels; settle selection rules before
using these data for calculations.

No nutrition totals, count-to-mass calculation, density conversion, unit conversion
or serving scaling is implemented. Validation verifies the presence and shape of
provenance, not the truth of a citation. Data must be reviewed before population.
Quantitative metadata on non-ingredient concepts is rejected.

Future transformations must account for source-expression precision (`!`, `~`,
`~~`, unspecified) and uncertainty in knowledge data. `approximate: false` must
never upgrade an approximate recipe expression or imply perfect accuracy.
Ingredient-dependent conversions can weaken precision, never manufacture it.

## Conservative English presentation

Pass the vocabulary to both parsing and rendering:

```ts
const recipe = parseRecipe(text, { vocabulary });
const compact = renderCompact(recipe, { vocabulary });
const html = renderHtml(recipe, { vocabulary, view: 'compact' });
```

Adjacent `(egg: yolk) <separate>` / `(egg: white) <separate>` may read “Separate the
eggs into yolks and whites.” This requires the same uniquely resolved whole-egg
declaration with a bare positive integer count, known parts, exactly one matching
two-member `separate` group and explicit English singular/plural labels. It refuses
extra parameters, qualifiers, variants, comments, intervening blanks/groups/images,
nested actions, part-only declarations, ambiguous identities and unknown counts.
Custom formatting hooks disable the merge. No supplied knowledge means no merge.
Source and AST stay unchanged; HTML retains both instruction IDs and part metadata.
Code is unchanged.

## Future optional modules (not implemented)

Ingredient YAML is gradually becoming a reusable culinary knowledge object:
variants, preparation/state relationships, typical sizes, conversion metadata,
substitutions, dietary properties, nutrition and provenance remain optional modules.
Variant inheritance, locale/size standards, conflicting-source selection,
cross-scope groups and quantitative part/output provenance need explicit design.
None requires new recipe grammar here. The local reference-page prototype consumes
the current part/group API; production publishing remains future work.

## Human-facing reference projection

The loader also retains `status`, `evidence`, `observed_parameters` and
`observed_qualifiers`. These remain observation/editorial metadata, never aliases,
typed argument signatures or live corpus counts. The reference model keeps them
separate from its computed `usage` list. The renderer escapes evidence as text;
repository paths remain plain text. Only explicit safe provenance URLs are linked.

Nested parts keep local paths beneath their parent ingredient, e.g.
`/reference/ingredient/egg#part-yolk`; there are no new global part concepts.
Groups link only uniquely resolved processes. Unknown recipe parts link to their
base ingredient instead of an invented part page. Variant use can be shown from
recipe tokens, but no variant inheritance/relationship data is invented.

Existing sourced quantitative modules render only when populated, including at
part level. Approximation markers, units, states, locales and sources are retained;
no conversions, aggregation or new precision claims occur. Canonical YAML still
contains no populated numeric modules. Numeric rendering tests use in-memory data.

Process reference pages currently contain identity, names/aliases, observations
and corpus usage. Future optional definitions, related processes, typical equipment
and curated tutorial links can extend the vocabulary schema and reference
projection together. They are not populated or shown as empty sections today.

## Curation metadata

Optional curation records creation origin separately from deliberate human review.
Recipes use `curation origin` and `curation review` metadata; vocabulary entries use
a top-level `curation: { origin, review }` mapping. Missing means unknown/legacy.
See [CURATION.md](CURATION.md) for values, diagnostics, migration and contribution guidance.
