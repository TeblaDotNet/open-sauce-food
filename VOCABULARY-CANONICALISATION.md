# Vocabulary Canonicalisation

## Principle

**Minimise concepts, not vocabulary.**

Open Sauce Food should aim for one canonical concept when multiple terms genuinely refer to the same
ingredient, equipment item or process. Natural synonyms, spelling variants and regional names remain
accepted input and are listed in the canonical YAML entry.

For example, a future canonical ingredient might look conceptually like:

```yaml
id: courgette
kind: ingredient
names:
  en-GB: courgette
  en-US: zucchini
  en-AU: zucchini
aliases: []
```

Both of these source forms remain valid:

```text
(courgette)
(zucchini)
```

and resolve to the same concept.

## Do not minimise away meaning

The objective is not the smallest possible dictionary.

Terms should remain distinct when substitution changes culinary meaning. Examples likely to remain
distinct include:

- `bake`, `grill`, `fry`, `roast`
- `chop`, `dice`, `mince`
- `blender`, `food processor`, `immersion blender`
- `plain flour`, `self-raising flour`

A useful merge test is:

> If the renderer replaced one term with the other in the same locale and context, would the recipe
> still mean the same thing?

If not, they should not be aliases.

## Relationship types we are likely to need

Not every relationship is a synonym. Vocabulary entries may eventually need:

- `names` — preferred regional display names
- `aliases` — accepted equivalent spellings/phrases
- `variants` — materially different forms within a family
- `parts` — yolk/white, zest/juice, leaves/stems
- `parent` / `subtype` — spaghetti is pasta; paella pan is a pan
- `related` — useful association without equivalence
- `substitutions` — possible replacement, with caveats

## Obvious corpus candidates for review

### Ingredient regional-name candidates
- courgette ↔ zucchini
- coriander leaves ↔ cilantro
- cornflour ↔ cornstarch

### Ingredient likely-alias candidates
- garam masala ↔ garam masala powder

### Ingredient relationships, not simple aliases
- spaghetti → pasta
- vermicelli noodles → noodles/pasta family
- chicken breast → chicken
- extra virgin olive oil → olive oil
- red pepper / capsicum / pepper need regional and variety modelling rather than blind merging
- tomato paste / tomato puree require locale-aware definitions; they are not universally interchangeable

### Equipment candidates
- baking sheet ↔ baking tray
- muffin tin ↔ cupcake tin (probably near-equivalent)
- saucepan / pot need review rather than automatic merging
- frying pan / pan / paella pan should probably form a hierarchy

### Process likely-alias/phrase candidates
- bring to boil → boil
- bring to simmer → simmer
- drizzle in → drizzle
- stir in → stir
- brush tops → brush
- serve with / serve alongside → serve
- remove from heat / remove from soup / remove pulp → remove with contextual parameters

### Process distinctions to preserve
- chop / dice / mince
- beat / whisk / whip
- blend / pulse / process
- bake / roast / grill / air-fry / fry
- simmer / stew / slow cook

## Next pass

Canonicalisation should be manual and conservative. The raw YAML files remain useful evidence even
after aliases are merged, because they show which forms actually occurred in real recipes.
