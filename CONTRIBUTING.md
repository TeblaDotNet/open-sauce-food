# Contributing to Open Sauce Food

Open Sauce Food is in early development. Small, well-explained contributions help
more than sweeping rewrites. The [README](README.md) describes what currently works;
[licence scopes](LICENSING.md) describe the terms for each kind of contribution.
Contribute only material you can offer under the relevant scope, retaining third-party notices.

## Useful contributions

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

## A small change, end to end

1. Open an issue for a design question, or prepare a focused branch/PR for a clear
   fix. Show the current behaviour and intended result.
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
