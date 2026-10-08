# Process Vocabulary

This folder is the raw corpus-derived process vocabulary from **30 recipe-derived observations**.

Current raw counts:

- 106 observed process names
- 271 distinct process calls
- 246 distinct parameter strings

## Canonicalisation principle

The goal is to **minimise concepts, not accepted vocabulary**.

Where two names genuinely mean the same culinary thing, Open Sauce Food should eventually keep one
canonical concept and list synonyms, regional names and accepted aliases in that concept's YAML.

Do not merge terms merely because they are similar. A merge is appropriate only when replacing one
with the other preserves the recipe's meaning in the relevant context.

Draft 6 is deliberately still a raw evidence layer: one file per observed base term. The next manual
pass will merge only well-supported synonyms/locale names.

Likely canonicalisation candidates include:

- `bring to boil` → canonical `boil` with an accepted phrase/phase
- `bring to simmer` → canonical `simmer` with an accepted phrase/phase
- `drizzle in` → likely canonical `drizzle`
- `stir in` → likely canonical `stir`
- `serve with` / `serve alongside` → likely canonical `serve` plus relation text
- `remove from heat` / `remove from soup` / `remove pulp` → likely canonical `remove` plus context
- `brush tops` → likely canonical `brush` plus target

But distinctions such as `chop`, `dice`, `mince`, `slice`, `fry`, `roast`, `bake`, `grill`,
`blend`, `pulse` and `process` should not be collapsed merely to reduce the list.


## Corpus policy

The current recipe corpus contains 20 public-domain examples. Vocabulary observations from the earlier 10-recipe BBC Food stress test are retained with `legacy-corpus:bbc-food-10` provenance markers, but those recipe files are not distributed.
