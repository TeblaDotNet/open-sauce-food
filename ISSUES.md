# Open Sauce Food — Draft 7 Issues / Questions

This file is intentionally a scratchpad.

Current rule:

> **Do not add syntax just because we can imagine needing it. Prefer to wait until repeated real recipes demonstrate the need.**

## Resolved provisionally in Draft 2

### File extension

Use:

```text
.opensauce
```

rather than `.osr`.

---

### Section syntax

Use:

```text
::recipe
::ingredients
::equipment
::instructions
::story
```

---

### Physical things vs created results

Use `( )` for one declared physical thing/reference.

The section tells software whether it is an ingredient or equipment.

Use `{ }` for something created, combined or assembled during the recipe.

---

### Repetition

Current proposal:

```text
Repeat [
    ...
]
until {batter} used
```

This mirrors:

```text
Meanwhile [
    ...
]
```

and keeps `[ ]` consistently meaning a grouped block.

---

### Named ingredient alternatives

Current proposal:

```text
(seasoning) =
    (MSG) 1 pinch
    -OR-
    (chicken bouillon) 1 pinch
    -OR-
    (mushroom seasoning) 1 pinch
```

Later instructions may refer to `(seasoning)`.

---

## Still open

### Ingredient subgroups

Recipes often group ingredients as:

- For the sauce
- For the pastry
- For the filling
- Garnish

Current approach: ordinary comments.

```text
# Sauce
(tomato) 4

# Garnish
(coriander) 1 handful
```

Question: do groups eventually need structured meaning?

---

### Complex parallel instructions

Current proposal:

```text
(chicken) <poach, 10-12m>

Meanwhile [
    (noodles) <cover, boiling water>
        <soak>
        <drain>
]
```

Need to test recipes with multiple overlapping timed processes.

---

### Complex repeat conditions

Current proposal:

```text
Repeat [
    ...
]
until {batter} used
```

Need to test:

- repeat N times
- repeat for each item
- repeat until a state is reached
- nested repeats

Do not expand syntax until examples require it.

---

### Optional ingredients

Current style:

```text
(coriander, optional) 1tbsp
```

Question: is `optional` simply a qualifier, or should optionality eventually become dedicated syntax?

---

### State-based cooking

Examples:

```text
<fry, until golden>
<bake, until a skewer comes out clean>
<prove, until doubled in size>
```

Current view: free-text process parameters are valid.

Question: should frequently used states eventually gain structured vocabulary?

---

### Ingredient preparation

Both are valid:

```text
(onion, finely chopped) 2
```

and:

```text
(onion) 2

::instructions

(onion) <chop, fine>
```

The first implies mise en place. The second makes chopping part of the method.

Need to ensure renderers preserve the distinction.

---

### Repeated / partial ingredient use

Current proposal:

```text
::ingredients

(vegetable oil) 3tbsp

::instructions

(vegetable oil) 2tbsp
...
(vegetable oil) rest of
```

Also:

```text
(cheese) ~half of
(cheese) rest of
```

Need future validation rules for over-use or ambiguous references.

---

### Equivalent quantities

Current proposal:

```text
(courgette) 2-3 / ~440g
```

`/` means equivalent quantity, not choice.

Need to decide how equivalent quantities interact with localisation and scaling.

---

### Ingredient ambiguity by region

Examples:

- apple cider
- coriander / cilantro
- aubergine / eggplant
- plain flour / all-purpose flour

Current proposal:

```text
ingredients: UK
```

with local override:

```text
(apple cider, US)
```

Need a formal ingredient vocabulary schema.

---

### Process ambiguity by region

Example:

- UK `grill`
- US `broil`

Need process vocabulary and regional aliases.

---

### Ambiguous measurements

Example:

- UK pint vs US pint

Need validator behaviour when an ambiguous unit appears with no applicable locale declaration.

---

### Yield vs servings

`serves: 4` does not cover:

- makes 12 biscuits
- makes 1 loaf
- yields 500ml sauce

Possible future field:

```text
yield:
```

Do not add until test recipes require it.

---

### Equipment references

Draft 2 allows:

```text
::equipment

(pan, non-stick, 30cm)

::instructions

(pan) <heat, medium>
```

Need to test whether section-based type resolution remains unambiguous in larger recipes.

---

### Equipment quantities

Examples may eventually need:

```text
(bowl, large) 2
(baking tray) 3
```

Need real recipes before defining this formally.

---

### Structured substitutions

Ingredient pages may eventually describe substitutions, but substitution quality depends on context.

Need a vocabulary model that can represent:

- equivalent
- near-equivalent
- suitable-for
- works-best-in
- caveats / flavour changes
- texture changes

---

### Ingredient identity resolution

If the ingredient list says:

```text
(milk, skimmed) 500ml
```

should:

```text
(milk) <heat>
```

resolve automatically to the declared skimmed milk?

Likely yes if unambiguous.

Need explicit resolver rules later.

---

### Dietary status with alternatives

A recipe may be vegetarian only when a particular alternative is selected.

Example:

```text
(seasoning) =
    (chicken bouillon) 1 pinch
    -OR-
    (mushroom seasoning) 1 pinch
```

Need future semantics for:

- vegetarian as written
- vegetarian option available
- vegan with substitution
- conflicting dietary metadata

---

### Source provenance

`source:` currently accepts a URL or citation.

Possible later metadata:

```text
source author:
source license:
```

Do not add until needed.

---

### Comments vs story

Current distinction:

- `# comment` = hidden author/developer note
- `::story` = publishable prose

This remains useful.

---

## Things deliberately postponed

- formal parser grammar
- exact internal ingredient IDs
- exact internal process IDs
- formal ingredient vocabulary schema
- formal process vocabulary schema
- website
- IDE extension / language server
- automatic dietary inference
- automatic substitutions
- merge semantics
- Open Sauce Food-owned version control


---

## Resolved provisionally after recipes 6–10

### Yield

Use `yield:` where `serves:` is not the natural measure.

```text
yield: 10 scones
```

---

### Optional instruction blocks

Use:

```text
Optional [
    ...
]
```

---

### Role qualifiers

Repeated ingredients may be disambiguated by role:

```text
(sugar, caster, for cake) 100g
(sugar, caster, for icing) 50g
```

---

### Ingredient parts

A whole ingredient may later be referenced by part/state:

```text
(lemon, zest)
(lemon, juice)
```

without requiring `{lemon zest}` intermediates.

---

### Implicit result transitions

A new `{result}` name may appear after a process when its meaning is obvious.

Example:

```text
{cake mix} <bake, 50-55m>

{cake} <cool>
```

Open Sauce Food does not require every physical state transition to be explicitly modelled.

---

### Human-readable rather than robot-executable

The format only needs enough structure for useful parsing, rendering and localisation.

It is acceptable for recipes to remain qualitatively written and for culinary quality to vary between authors.


---

## Evidence from public-domain recipes (recipes 11–30)

### Provenance fields

Promoted provisionally:

```text
source:
source author:
source license:
```

### Units conventions

Draft 5 examples now use `metric`, `US`, `mixed` and `source`.

Question for later: should these values become a formal controlled vocabulary, or remain descriptive
metadata?

### Canonical vocabulary

The raw 30-recipe corpus now contains many obvious aliases, regional names, subtypes and near-synonyms.

Decision:

> minimise concepts, not accepted vocabulary.

Next work should classify raw terms conservatively into aliases, regional names, variants, parts and
subtypes instead of simply growing the canonical dictionary one term at a time.

### Source recipe errors

Imported recipes can contain missing ingredients, unused ingredients, conflicting quantities and
typos. Open Sauce Food should permit this. A validator may warn, but the language should not pretend that
structured syntax guarantees a correct recipe.


## Corpus licensing policy

Current distributed examples should use public-domain or otherwise suitably licensed recipe material. The earlier BBC-derived stress-test examples have been removed; extracted generic vocabulary observations may remain.


## Conversion metadata for ingredients

Future ingredient vocabulary entries should support optional conversion metadata where evidence exists:

- approximate bulk/reference density for mass↔volume conversion
- preparation-dependent density (for example packed vs loose brown sugar)
- count/size-to-mass estimates (for example small/medium/large carrot)
- locale-specific size classes (especially eggs)
- approximation/confidence/source metadata

These are vocabulary/data concerns, not new `.opensauce` grammar.
