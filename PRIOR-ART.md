# Prior art and related projects

Open Sauce Food is an early experiment in human-readable recipe structure and
shared culinary knowledge. These projects provide context, not a competition
ranking. External references were checked on 8 October 2026.

## Cooklang

[Cooklang](https://cooklang.org/docs/) is an established plain-text recipe language
and open-source ecosystem. Its tools cover recipe management as well as the markup
itself. It already shares the important goals of readable files and keeping recipes
under the author's control. Its [Federation](https://recipes.cooklang.org/about)
also explores decentralised discovery; optional discovery is not unique to Open Sauce Food.

Open Sauce Food's current emphasis is explicit `(thing)`, `<process>` and `{result}`
structure, named intermediates, local parts/variants and separately maintained
canonical culinary YAML. Its parser preserves authored source while producing
Code and Compact views; embedded originals have a literal Original recipe source view.
Normal Git history supplies recipe/version history, with a proposed future index
separated from ownership of recipe sources.

These are differences of emphasis and representation, not a claim that Cooklang
cannot model related ideas or that Open Sauce Food is better. Open Sauce Food's language,
knowledge base and tooling remain experimental. A possible Cooklang exporter is
[future work](ROADMAP.md), not an existing compatibility guarantee.

## Open Sauce at opensauce.com

The unrelated [Open Sauce](https://www.opensauce.com/) uses an overlapping name.
Open Sauce Food is unaffiliated with that project/site. Consistent use of the full
name **Open Sauce Food** is intentional to reduce confusion. This note records
the naming overlap and non-affiliation without making claims about ownership,
scope or current status.

## Open Sauce Recipes

The unrelated **Open Sauce Recipes** name has been used by a recipe site at
[open-sauce-recipes.co.uk](https://open-sauce-recipes.co.uk/), and an
[Open Sauce Recipes WordPress plugin listing](https://wordpress.org/plugins/opensaucerecipes/)
exists as a historical reference. Open Sauce Food is not affiliated with that
site/project and does not claim to be its successor or its language format.
This is a separate naming-overlap case from opensauce.com.

The site and primary plugin page could not be retrieved during this review, so
current maintenance, ownership, functionality and licence are not asserted here.
The name overlap should remain visible; the owner should verify these references
before a public announcement rather than treating this note as a naming clearance.

## Food and recipe semantic work

[FoodOn](https://foodon.org/) provides controlled terms and relationships for foods,
food sources and processing. It is relevant semantic prior art and a possible future
source of external identifiers, not a replacement for readable recipe instructions.
Open Sauce Food currently uses its own small canonical YAML model and does not integrate
FoodOn or perform ontology reasoning.

[Schema.org Recipe](https://schema.org/Recipe) describes recipe information for the
web, including ingredients and instructions. It addresses published structured
metadata rather than prescribing this project's authoring syntax. Possible ontology
or RDF export would be a separate view, with explicit mappings and provenance.

[DATA-SOURCES.md](DATA-SOURCES.md) separates possible enrichment datasets from the
actual imported corpus and records their different reuse considerations.
