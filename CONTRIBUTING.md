# Contributing to Open Sauce Food

## Current contribution focus

Open Sauce Food is in an early design phase. Sauce Code, the knowledge model and data structures are still changing quickly, so small recipe fixes, isolated YAML additions and bulk data curation are not the priority yet.

Design discussion is especially welcome: the overall shape of the project, syntax and semantics, ingredient/process/equipment modelling, recipe representation and provenance, reference knowledge, substitutions, dietary adaptation, rendering and planned features. Concrete edge cases help.

Please open an issue or discussion before doing substantial data work. Once the foundations settle, individual recipe fixes, vocabulary additions and knowledge-data contributions will become much more useful.

The workflows below are here for later data contributions and work already discussed and agreed. They are not a list of current data-curation priorities.

The [README](README.md) describes what currently works; [licence scopes](LICENSING.md) describe the terms for each kind of contribution. Contribute only material you can offer under the relevant scope, retaining third-party notices.

## When working on an agreed change

- **Recipe fixes:** identify the recipe and explain the correction against its
  source. Distinguish a transcription repair from your own culinary adaptation.
- **Recipe review:** deliberately compare the current encoding with the source;
  describe what you checked and what remains uncertain. Cooking a recipe is useful
  evidence, but does not alone review every encoded relationship.
- **Aliases or concepts:** supply evidence that two terms mean the same thing, or
  explain the culinary distinction that needs a new concept.
- **Variants and parts:** preserve parent context, such as egg/yolk; do not turn
  parts into synonyms for the whole ingredient.
- **Parser or renderer work:** include a small reproducible input and expected
  output. Keep parser source preservation and vocabulary independence intact.
- **Documentation and provenance:** correct confusing instructions, attribution,
  source links, image credits or uncertain redistribution claims.

## Change workflow

1. Start with an issue or discussion for design questions or substantial data work.
   Agree the scope before preparing a focused branch/PR. Show the current behaviour
   and intended result.
2. Preserve original source payloads and provenance. Do not edit a retained original
   to make it agree with a conversion. Record corrections in the authored encoding
   or review notes, with evidence.
3. Update relevant documentation and curation status. For behaviour changes, add a
   meaningful regression test; avoid unrelated corpus or generated-report churn.
4. Run the checks below and summarise their results in the PR. Say whether content
   was deliberately reviewed, automatically generated, or merely reformatted.

Use Node.js 24+ and pnpm from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm test
pnpm corpus
```

For UI changes, run `pnpm demo` and inspect light/dark, syntax colour on/off and a
narrow viewport. For knowledge changes, check the relevant reference page too.
Known corpus warnings are not proof of a failed contribution, but explain new ones.

## Origin and review are independent

Recipes use `curation origin` and `curation review` metadata; YAML entries use a
`curation` mapping. See [CURATION.md](CURATION.md) for exact forms and allowed values.

- Origin describes how the current artifact was made: `human`, `generated`,
  `imported` or `mixed`.
- Review is `unchecked` or `checked`. Missing metadata means unknown, not checked.
- `checked` means deliberate human review of the current substantive content.
  It does **not** mean scientifically verified, guaranteed safe or professionally
  certified. Parser tests and automated review do not establish this status.
- Substantive edits to checked content should reset it to `unchecked` until reviewed
  again. Keep origin unchanged unless its meaning actually changed or was incorrect.
- Explain a review in the PR; Git history is the audit trail. Review does not
  substitute for source/licence evidence.

## Canonical knowledge

**Minimise concepts, not vocabulary.** Natural source words should remain usable.
Regional names and demonstrated synonyms can share an ID; similar words with
meaningful culinary differences should not be merged. Unresolved is preferable to
incorrectly canonicalised.

Follow [VOCABULARY-SCHEMA.md](VOCABULARY-SCHEMA.md), preserve stable IDs, and update
canonical indexes when adding an entry. Historical observations and candidate
reports are evidence, not automatic alias rules. Explain locale/state ambiguities
and cite support for a new relationship. Do not fill numerical modules with guesses.

Language proposals need a concrete recipe case. Record a question in
[IMPLEMENTATION-ISSUES.md](IMPLEMENTATION-ISSUES.md) and discuss the model/grammar
before changing [SPEC.md](SPEC.md). This public preparation does not introduce Draft 9.

## Sources and rights

Bring material you have a documented basis to contribute. Keep source URLs, stated
authors, licence notices and image provenance. Do not import a linked third-party
recipe or photo solely because another site links to it. For uncertain cases,
record the question rather than silently promoting the material.
[DATA-SOURCES.md](DATA-SOURCES.md) lists existing holds and the distinction between
upstream terms and this project's distinct licence scopes.

Recipe rewrite contributions should update `conversion stage` deliberately when
the representation is ready for public browsing. This does not change
`curation review`; never equate restructuring with human checking. See
[RECIPE-PUBLICATION.md](RECIPE-PUBLICATION.md).

### Optional recipe classification

Classification adds optional capabilities: a minimal recipe remains valid without
`category`, `dietary`, `cuisine` or `region`. These fields are independent of
`conversion stage`, `curation origin` and `curation review`.

```text
category: main
dietary: vegan, nut-free
cuisine: italian
region: sicily
```

- `category` is one broad culinary role: `drink`, `bread/baking`,
  `preserve/ferment`, `soup/stew`, `main`, `dessert`, `side`, `starter`, `sauce/seasoning/stock`,
  `snack`, `breakfast`, or `miscellaneous`. Multiple values are not supported. Invalid, empty or duplicate
  declarations produce a warning and no resolved category; raw text is retained.
  Soups, chowders, broths-as-dishes and stews use `soup/stew`, regardless of
  portion size. Reserve `starter` for clearly appetiser/first-course dishes that
  are not primarily soup or stew.
  `sauce/seasoning/stock` covers sauces, dressings, dips, spreads, relishes,
  condiments, spice mixtures, dry rubs, seasoning blends, stocks, cooking-base
  broths and similar prepared components used with or in another dish.
  `miscellaneous` is a deliberately small residual category for preparations
  without a defensible fit elsewhere. Prefer a meaningful specific category;
  substantial growth of miscellaneous would suggest another real category is needed.
- `dietary` is an extensible comma-separated list of author-supplied labels, such
  as `vegan`, `vegetarian`, `nut-free`, `gluten-free` or `dairy-free`. Values are
  trimmed, exact duplicates removed in first-seen order, and repeated lines
  combined in source order. Empty entries produce a warning and no resolved list.
  There is no controlled dietary vocabulary or inference in this version.
- `cuisine` and `region` are optional single plain-text values with no controlled
  vocabulary. Non-empty arbitrary strings are accepted. Empty or duplicate
  declarations warn and leave the resolved field absent.

Dietary labels are author-supplied and are not a guarantee of suitability. Check
ingredients, substitutions and product labels for your own dietary requirements.
They are advisory, not certification. HTML dietary displays include this advice.

Corpus categories are provisional best-effort guesses of a primary role and can
be corrected. Some preparations do not fit these broad roles and may remain
uncategorised. Category discovery includes only `reworked` recipes; hidden direct
pages retain their own metadata. These labels do not change publication or review
status. No corpus-wide dietary, cuisine or region inference has been performed.
