# Ingredient Vocabulary

This folder is the raw corpus-derived ingredient vocabulary from **30 recipe-derived observations**.

Current raw counts:

- 155 observed ingredient base terms
- 237 distinct ingredient forms
- 102 distinct qualifier strings
- 13 recipe-local named ingredient choices excluded from the global vocabulary

## Canonicalisation principle

The goal is to **minimise concepts, not accepted vocabulary**.

Where two names genuinely mean the same culinary thing, Open Sauce Food should eventually keep one
canonical concept and list synonyms, regional names and accepted aliases in that concept's YAML.

Do not merge terms merely because they are similar. A merge is appropriate only when replacing one
with the other preserves the recipe's meaning in the relevant context.

Draft 6 is deliberately still a raw evidence layer: one file per observed base term. The next manual
pass will merge only well-supported synonyms/locale names.

Likely canonicalisation cases now visible in the corpus include:

- `courgette` / `zucchini` — regional names for the same ingredient
- `coriander` / `cilantro` — regional naming, with care around leaves vs seeds
- `cornflour` / `cornstarch` — UK/US regional naming for the starch
- `garam masala` / `garam masala powder` — likely one ingredient concept
- subtype relationships such as `spaghetti` under `pasta`, which are not simple synonyms

Recipe-local names such as `(seasoning)`, `(glaze)` and `(cooking liquid)` remain local aliases and
should not become global ingredient entries.


## Corpus policy

The current recipe corpus contains 20 public-domain examples. Vocabulary observations from the earlier 10-recipe BBC Food stress test are retained with `legacy-corpus:bbc-food-10` provenance markers, but those recipe files are not distributed.
