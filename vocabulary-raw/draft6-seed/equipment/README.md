# Equipment Vocabulary

This folder is the first raw corpus-derived Open Sauce Food equipment vocabulary.

Current raw counts:

- 40 observed equipment base terms
- 48 distinct equipment forms
- 12 distinct equipment qualifier strings

## Canonicalisation principle

The goal is to **minimise concepts, not accepted vocabulary**.

Where two names genuinely mean the same culinary thing, Open Sauce Food should eventually keep one
canonical concept and list synonyms, regional names and accepted aliases in that concept's YAML.

Do not merge terms merely because they are similar. A merge is appropriate only when replacing one
with the other preserves the recipe's meaning in the relevant context.

Draft 6 is deliberately still a raw evidence layer: one file per observed base term. The next manual
pass will merge only well-supported synonyms/locale names.

Likely canonicalisation questions include:

- `baking sheet` / `baking tray` — often regional synonyms
- `muffin tin` / `cupcake tin` — near-synonymous or variant terms
- `pot` / `saucepan` — overlapping but not always interchangeable
- `pan`, `frying pan`, `paella pan` — probably a hierarchy rather than simple aliases
- `blender`, `immersion blender`, `food processor` — distinct equipment despite overlapping uses


## Corpus policy

The current recipe corpus contains 20 public-domain examples. Vocabulary observations from the earlier 10-recipe BBC Food stress test are retained with `legacy-corpus:bbc-food-10` provenance markers, but those recipe files are not distributed.
