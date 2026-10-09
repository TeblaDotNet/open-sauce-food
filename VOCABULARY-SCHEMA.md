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
Compound names are not automatically rewritten into part paths. Lemon juice is
conceptually Lemon → Juice whether fresh or bottled: these are qualifiers, not
automatically separate canonical identities. Explicit `(lemon: juice, fresh)`
and `(lemon: juice, bottled)` use the same part anchor. The retired standalone
`lemon-juice` identity now resolves through explicit part lexical names; its YAML
evidence is preserved in `ingredient-migration-decisions.json`. This decision is
not a rule for every processed product.

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
with explicit or configured lexical parts receives `partResolution: { ids, complete }`. Existing `name`,
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

## Ingredient type families (implemented)

A top-level ingredient entry may set one optional `type_of` canonical ingredient ID:

```yaml
id: wheat-flour
kind: ingredient
names:
  en: wheat flour
type_of: flour
```

The parent must resolve by exact ID to one existing ingredient, not an alias, part,
process or equipment entry. Empty/non-string values, multiple parents, missing or
duplicate parent IDs, self-links and cycles are rejected. Parts cannot carry
`type_of`. Acyclic chains are allowed, but pages list only direct children and
the immediate parent; there is no recursive inheritance, substitution, alias
expansion or usage aggregation. Browser JSON transport retains the field.

A type can be important enough to have its own ingredient page while still belonging
to a broader family. Self-raising flour is the intended example: it should have
its own page linked from Flour, rather than being collapsed into a Flour anchor.
It now has that independent identity and page. The focused family links are
wheat-flour, self-raising-flour to flour, and olive-oil to oil. Child pages
retain their own names, aliases, metadata and recipe usage.

`:` means part/product in Sauce Code; `(egg: yolk)` targets Egg's existing
`#part-yolk` anchor. `;` remains authored variant/type syntax, but does not create
a family edge or dictate page topology. Neither `(flour; wheat)` nor `(wheat flour)
is silently rewritten into the other. Recipe-local roles remain independent of
the shared ingredient vocabulary.

## Focused lexical and variant compatibility

Compound lexical names may resolve to a parent part without being standalone
concepts. Part-local aliases still mean local terms such as yolks. A separate
optional `lexical_names` list names complete authored ingredient expressions:

```yaml
# Inside lemon.yaml
parts:
  juice:
    names:
      en: juice
    lexical_names: [lemon juice, lemon-juice]
```

These exact, case-insensitive full names target the containing base and part path.
The constructor rejects empty/malformed lists and collisions with global ingredient
names or another lexical target. It does not guess morphology or strip preparation
words. Explicit added parts are resolved below the lexical target, not its base.
This is suitable for later egg-yolk migration, but no such migration is made here.

`resolveIngredient(name, variant?, parts?)` returns canonical entry, effective
part path, effective variant and optional part-resolution annotation. Existing
`resolve(name, kind)` remains a whole-concept lexical lookup; it deliberately does
not pretend that lemon juice is an alias for a whole lemon. Recipe tokens preserve
`raw`, `name`, `parts`, `variant`, qualifiers and spans; `canonicalId` and
`partResolution` carry the target annotation. For standalone `(lemon juice)`,
authored parts remain empty while resolved parts contain juice. Backlinks use the
resolved path. Without vocabulary, the parser still accepts all these expressions.

A local top-level variant can explicitly nominate an independent family child:

```yaml
# Inside flour.yaml
variants:
  self-raising:
    names: {en: self-raising}
    aliases: [self raising]
    canonical_id: self-raising-flour
```

The target must uniquely exist and have `type_of` pointing back to the base.
Nested part variants cannot redirect to global concepts. Only explicitly configured
variants are promoted; there is no automatic family matching. Self-raising Flour
has en-GB self-raising flour, en-US self-rising flour, and the accepted alias self
raising flour. It is a first-class child, not a presentation alias.

Local bindings compare effective structures when compatibility is involved. A
whole lemon declaration can supply its juice; a juice declaration cannot supply a
whole lemon or peel. Mixed spellings retain ambiguity when multiple declarations
match. A bare local flour reference can retain the identity of its uniquely matched
self-raising declaration. Other family children are not substitutes.

Comma qualifiers do not automatically become type metadata: Damper's two self-raising
references were explicitly changed from comma to semicolon syntax. Its ordinary
work-surface flour remains Flour. Fresh/bottled/freshly squeezed lemon juice remain
ordinary qualifiers on the same Lemon → Juice identity.

The old static `/opensaucefood/ingredients/lemon-juice/` URL remains a small
compatibility page with a canonical URL and visible link to Lemon's `#part-juice`.
It is not in the ingredient index or canonical reference count. No server redirect
configuration or JavaScript is required. The local demo can issue an HTTP 308
redirect on its old HTML/API routes. All new recipe links target Lemon directly.

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
variants, richer preparation/state relationships, typical sizes, conversion metadata,
substitutions, dietary properties, nutrition and provenance remain optional modules.
Variant inheritance, locale/size standards, conflicting-source selection,
cross-scope groups and quantitative part/output provenance need explicit design.
None requires new recipe grammar here. The local reference-page prototype consumes
the current part/group API; the static site uses the same projection.

## Human-facing reference projection

The loader also retains `status`, `evidence`, `observed_parameters` and
`observed_qualifiers`. These remain observation/editorial metadata, never aliases,
typed argument signatures or live corpus counts. The reference model keeps them
separate from its computed `usage` list. The renderer escapes evidence as text;
repository paths remain plain text. Only explicit safe provenance URLs are linked.

Nested parts keep local paths beneath their parent ingredient, e.g.
`/reference/ingredient/egg#part-yolk`; there are no new global part concepts.
The static site preserves its corresponding routes, such as
`/opensaucefood/ingredients/egg/#part-yolk`. Part identity is the base canonical
ID plus the complete local part path. Parts / Products subsections show distinct
recipe backlinks for that exact resolved path (including structured action-context
references); unknown suffixes and base-only uses do not count as part uses. Nested
parts have separate counts, not descendant roll-ups. Parent concept usage remains
a distinct-recipe union of its explicit base and part references.

`ReferencePage.typeOf` and `types` expose direct family links using the existing
reference URL callback; `ReferencePart.usage` exposes part-specific backlinks.
An omitted usage index leaves usage undefined; an indexed unused part has an empty
list. Family links never move child usage into the parent.

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

## Ordinary actions and public process references

A `kind: process` entry may set top-level `reference: false` for an ordinary
action. Omitted or true retains normal culinary reference eligibility. The field
is boolean and valid only for process entries. Names, aliases, canonical IDs and
red action syntax remain unchanged; the flag suppresses recipe hyperlinks,
reference usage/backlinks, public Process index entries and generated pages.

Reference-page eligibility is **discovery value OR explanation value**: a cook
might browse recipes using the technique, or need to understand the term/method.
Use editorial judgement for edge cases. `<...>` is action/process syntax regardless
of eligibility; unknown/local actions remain valid, red and unlinked. `<add>` is
legal and back-compatible, though `+` is preferred for simple combining.

The non-reference canonical actions are `add`, `remove`, `place`, `transfer`,
`pour`, `reserve`, `set-aside`, `serve`, `arrange`, `cover` and `uncover`, including
their existing aliases. `put` and `return` remain legal unregistered actions.
Colour expresses semantic role; links/underlining express a shared reference target.

`reduce` remains reference-worthy and may cover both liquid concentration and
lowering heat/temperature. No sense inference or split occurs. `reduce-heat` stays
separate and unchanged pending later action-only review; it is not an alias of
`reduce`. Grill/broil stay separate; barbecue/bbq are not added or aliased.

## Ingredient states / preparations (focused proof)

Identity, type/family, part/product, state/preparation and loose qualifiers are
separate axes. Brown Lentils retains its canonical identity and has
`type_of: lentils`; soaked is a state, whereas finely chopped remains loose.
Lemon juice remains a part/product, not a state of a whole lemon.

A top-level ingredient may declare a local map:

```yaml
states:
  dry:
    names: {en: dry}
  soaked:
    names: {en: soaked}
  cooked:
    names: {en: cooked}
  tinned:
    names: {en-GB: tinned, en-US: canned}
```

IDs follow the existing lowercase local-ID rules. Each state requires nonempty
locale names and permits string aliases. Competing normalized terms are rejected.
States are scoped to the canonical ingredient ID, never global aliases or pages.
They are currently allowed only on whole ingredient entries, not parts or other
kinds. Both lentils and brown-lentils explicitly carry these four entries; no
family inheritance occurs. No missing lentil types are invented.

`resolveState(ingredientId, qualifier)` matches the complete trimmed qualifier,
case-insensitively, against local IDs, names and explicit aliases. It returns a
local state ID or undefined. No compound-name stripping or prose inference occurs.
With vocabulary, `(brown lentils, soaked)` receives additive
`stateResolution: [{id, qualifierIndex, raw, span}]`. The zero-based qualifier
index refers to the unchanged qualifiers array; raw and absolute UTF-16 span
include surrounding whitespace between commas/closing parenthesis. Canonical
identity, raw token and all existing fields stay unchanged. Without vocabulary
there is no annotation. Parts and unpromoted local variants receive no state
annotation. Unqualified later references do not inherit a declaration's state.

These are recognized authored occurrences, not a computed current state: multiple
qualifiers may describe stages or alternatives. No exclusivity, compatibility,
transition, substitution, cooking-time or weight-equivalence inference is made.
The ingredient ID plus state ID supplies a future reasoning hook, not a conversion.
Existing sourced-quantity free-text state fields are not automatically linked.

Reference pages show a States / preparations section only for explicitly attached
states. Lentils and Brown Lentils each show it; their existing URLs and independent
usage counts remain intact. Recipe presentation continues to preserve qualifiers.

Frozen, dried and rehydrated remain candidates, not recognized states in this data.
Finely chopped, freshly squeezed, optional and well drained remain loose. Tomato
paste, raisins, toast, smoked pancetta and yoghurt are not automatically classified:
a processed product may have its own culinary identity, so state is not a universal
processed-form category. Review chickpeas next before considering mushrooms, beans,
rice or pasta; no additional ingredient is enriched here.
