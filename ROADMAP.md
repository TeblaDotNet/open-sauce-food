# Roadmap

These are planned directions, not implemented promises or scheduled commitments.
The current baseline is [Draft 8](SPEC.md), the local renderer/reference prototype,
and the [current corpus/knowledge review](VOCABULARY-REVIEW.md). The plan brings
existing language/knowledge questions together with the intended first public alpha.
It does not change the grammar.

## First: a readable public alpha

The planned `tebla.net/opensaucefood/` release should be a live demonstration of
recipes, syntax and knowledge, visibly labelled **“Open Sauce Food is in early
development”**, with a link back to the eventual GitHub repository.

It should provide a recipe index, browsing by existing category/tag metadata,
ingredient/process/equipment indexes, and Spec/About pages. The current local demo
has a recipe selector and individual reference pages, not this complete publishing
layer. Deployment beneath that path is still work to do.

Accounts, ratings and community/discovery infrastructure are not needed for the
first alpha. Complete [publication setup](RELEASE-CHECKLIST.md) first, and keep
human review of the generated corpus visible. The public subset's licence scopes
and provenance exclusions are recorded in [LICENSING.md](LICENSING.md).

## Recipe language and rendering

- Explore explicit recipe outputs / `produces` relationships, distinct from current
  `{result}` references. No `produces` grammar is implemented.
- Clarify process roles: material, destination, tool, duration, heat and condition.
  Current parameters remain human-readable text; conservative Compact phrasing
  does not constitute a typed process model.
- Improve renderer quality against concrete recipes, preserving original wording
  where roles or scope are uncertain.
- Add richer source-preserving editing, comparison and review tooling.

Design questions remain in [IMPLEMENTATION-ISSUES.md](IMPLEMENTATION-ISSUES.md) and
[DRAFT8-NOTES.md](DRAFT8-NOTES.md); specification changes require separate decisions.

## Culinary knowledge

- Locale/context-sensitive default variants, with explicit author choices winning.
- Richer local parts and culinary part groups, building on the existing schema and
  small set of populated examples.
- Sourced typical mass, density and per-100g nutrition. The schema exists; populated,
  reviewed datasets and calculation semantics do not.
- Defensible approximate knowledge for pinch, dash, handful, sprig and similar
  quantities, with context and uncertainty instead of universal invented constants.
- Substitutions with necessary process changes and conditions, not simple global
  ingredient swaps.
- Reviewed external IDs/provenance links to FoodOn, USDA FoodData Central and
  Wikidata. Any other dataset, including Open Food Facts, needs a separate licence
  and mapping review. No such enrichment is integrated now.

See [VOCABULARY-SCHEMA.md](VOCABULARY-SCHEMA.md) and
[DATA-SOURCES.md](DATA-SOURCES.md).

## Cooking features

- Exact unit conversion where mathematically appropriate, and separately identified
  ingredient-dependent approximate volume/mass conversion.
- Serving scaling without hiding source precision or uncertain knowledge.
- Localisation and regional terminology beyond the existing name/alias lookup.
- Richer dietary metadata and handling; author-declared dietary text exists today,
  but automatic suitability/allergen inference does not.
- Cooking mode with step-focused presentation.

Approximate inputs must stay approximate after conversion; a long decimal is not
additional knowledge. Existing renderer extension hooks do not imply these features
are implemented.

## Publishing and optional discovery

After the alpha, explore an **Open Sauce Food Index** for optional public discovery,
stable recipe IDs and lineage, and **My Recipes / linked repositories**. Possible
social signals include kept/saved, made-it and recommend counts. These are later
possibilities, not current features or prerequisites for reading a recipe.

**Future Open Sauce Food Index != source of truth.** Git repositories remain authoritative
for recipe source and version history. Discovery must not transfer ownership of a
recipe to the index. Personal repositories should eventually be able to use/extend
shared vocabulary without requiring an account in a central service.

## Interoperability

Consider Open Sauce Food → Cooklang export and optional RDF/ontology export, with explicit
loss/ambiguity reporting where the models differ. Neither exporter exists yet.
Keep Git-first, offline authoring and reading as the baseline; a website is an
additional view of the data.
