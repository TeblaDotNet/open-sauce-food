# Open Sauce Food Recipe Format
## Draft 8 — experimental, implemented

Open Sauce Food is a human-readable plain-text recipe format intended to work well both for people and software.

The design goal is:

> A recipe should still make sense when opened in a basic text editor, while remaining structured enough for software to validate, transform, localise, version and render it.

This is an experimental draft. Real recipes should drive changes to the language.

---

## 1. File extension

Open Sauce Food recipe files use:

```text
.opensauce
```

Example:

```text
apple-cake.opensauce
```

The `.opensauce` extension was chosen to be distinctive and descriptive.

---

## 2. Core visual grammar

Open Sauce Food currently uses a small set of visual conventions:

```text
::section        structural section

(thing)          one declared physical thing/reference
{result}         something created, combined or assembled during the recipe
<process>        action/process
[ ... ]          grouped instruction block

# comment        comment to end of line
~                approximately
/                equivalent quantity
-OR-             alternative
+                add/combine
=                define/assign
```

The section in which a `(thing)` is declared gives it its type.

For example:

```text
::ingredients

(onion, finely chopped) 2

::equipment

(pan, non-stick, 30cm)
```

Both are single physical things, but one is an ingredient and one is equipment.

---

## 3. Sections

Sections begin with `::`.

Current standard sections are:

```text
::recipe
::ingredients
::equipment
::instructions
::story
```

`::equipment`, `::story`, `::notes` and `::source` are optional. Draft 8 section
semantics and source fences are specified in section 43 below.

Example:

```text
::recipe

name: Apple Cake
serves: 8

::ingredients

(apple) 500g

::equipment

(cake tin, round, 20cm)

::instructions

(apple) <chop>

::story

This recipe came from my grandmother.
```

`::story` contains narrative/editorial prose such as history, origin, context or
personal stories. Practical cook-facing advice belongs in `::notes`; import,
conversion and debug commentary belongs in `#` comments.

---

## 4. Recipe metadata

Recipe metadata uses:

```text
key: value
```

Example:

```text
::recipe

name: Simple veggie fajitas
source: https://example.com/original-recipe
ingredients: UK
units: metric
category: main
tags: fajitas, quick, Mexican-inspired
dietary: vegetarian
serves: 4
active time: <30m
total time: ~30m
image: images/fajitas.jpg
```

### Current metadata fields

- `name`
- `source`
- `source author`
- `source license`
- `ingredients`
- `units`
- `category`
- `tags`
- `dietary`
- `serves`
- `yield`
- `active time`
- `total time`
- `image`

All fields except `name` are currently considered optional.

### Source / provenance

`source:` records where an imported or adapted recipe came from.

Example:

```text
source: https://www.bbc.co.uk/food/recipes/birria_beef_76829
```

The source is provenance. It does not imply ownership or licensing.

When known, imported recipes may also record:

```text
source author: Example Author
source license: Public domain (Unlicense)
```

These fields preserve useful attribution/licensing information without requiring it for recipes that
do not have an external source.

A recipe may later be changed through ordinary Git commits while retaining its original source reference.

---

## 5. Locale defaults

A recipe may declare ingredient naming and unit conventions:

```text
ingredients: UK
units: metric
```

These are defaults, not restrictions.

`units:` may describe the dominant convention rather than forbidding other units. Draft 7 examples
use values such as:

```text
units: metric
units: US
units: mixed
units: source
```

`mixed` means the file intentionally contains more than one measurement convention. `source` means
the imported source does not justify a stronger convention declaration.

Examples of other valid combinations might include:

```text
ingredients: US
units: US
```

or:

```text
ingredients: US
units: metric
```

Explicit information overrides defaults.

For example:

```text
ingredients: UK

::ingredients

(apple cider, US) 500ml
```

The local `US` qualifier disambiguates that specific ingredient.

Tooling should be permissive where meaning is clear and warn where regional ambiguity matters.

---

## 6. Ingredients

Ingredients are declared in `::ingredients` using parentheses:

```text
(ingredient) quantity
```

Qualifiers are comma-separated:

```text
(sugar, brown)
(egg, large)
(milk, skimmed)
(onion, finely chopped)
(chilli, red, dried)
```

Example:

```text
::ingredients

(flour, plain) 200g
(butter, unsalted) 100g
(egg, large) 2
(sugar, brown) ~150g
```

The first term normally names the ingredient. Additional terms refine identity, state, preparation, region or variety.

### Mise en place vs explicit preparation

Preparation state may be declared directly in the ingredient list:

```text
(onion, finely chopped) 2
```

or performed in the method:

```text
::ingredients

(onion) 2

::instructions

(onion) <chop, fine>
```

Both are valid.

The first implies mise en place. The second makes preparation an explicit recipe step.

---

## 7. Equipment

Equipment is optionally declared in `::equipment`.

Equipment uses the same `(thing, qualifier)` syntax as ingredients:

```text
::equipment

(pan, non-stick, 30cm)
(bowl, large)
(whisk)
```

The declaration section tells software that these are equipment rather than ingredients.

Equipment may then be referenced naturally in instructions:

```text
(pan) <heat, medium>
(butter) <melt, pan>
{batter} <ladle, pan>
```

Draft 7 deliberately does not introduce a separate equipment delimiter.

Equipment may carry quantities where useful:

```text
(bowl) 2
(baking sheet) 3
```

Optionality and qualifiers work the same way as for other `(thing)` declarations:

```text
(food processor, optional)
```

---

## 8. Processes and actions

Angle-bracket syntax expresses both culinary processes and ordinary actions.
Vocabulary entries may mark generic actions with `reference: false`: they retain
normal syntax and action semantics but have no public Process reference page or
link. This classification never determines parser legality.

Processes use angle brackets:

```text
<process>
```

Parameters are comma-separated:

```text
<bake, 180c, ~25m>
<boil, 10m>
<chop, fine>
<fry, medium heat, 5m>
<heat, packet instructions>
<simmer, until tender>
```

Parameters may contain structured values or ordinary human-readable phrases.

Examples:

```text
(tortilla wrap) <heat, packet instructions>
(onion) <fry, medium heat, until golden>
```

Open Sauce Food should not require every cooking phrase to become rigid machine vocabulary.

### Postfix judgement conditions

`<process, parameters> ?= qualitative target` attaches a cook-judged completion
condition to the immediately preceding process/action on the same instruction line.
Only whitespace may intervene. The nonempty body is literal human-readable text
through the end of the line, before an ordinary `#` comment. It is not tokenised
as references, quantities, assignment, or further actions. Start another instruction
line to continue after a judgement.

`<roast, 180C, 20 mins> ?= golden brown` renders in Compact as
“Roast at 180°C for 20 mins, until golden brown.” Do not author the leading word
“until”. Code retains `?= golden brown` as one orange value-family syntax unit.
This qualitative condition is distinct from numeric quantities, process parameters
and result identity. It has no controlled vocabulary.

---

## 9. Created / combined results

Braces name something produced, combined, assembled or otherwise created during the recipe:

```text
{mix a}
{batter}
{sauce}
{dough}
{bowl}
```

Assignment uses `=`:

```text
{mix a} = (milk) + (vanilla)
{mix b} = (egg) + (sugar)
{batter} = {mix a} + {mix b} + (flour)
```

Processes can operate on results:

```text
{batter} <mix>
{batter} <bake, 180c, ~25m>
```

### Important distinction

Parentheses represent one declared physical thing or one ingredient choice:

```text
(milk)
(pan)
(seasoning)
```

Braces represent a result created during the recipe:

```text
{dressing}
{batter}
{cooked vegetables}
```

---

## 10. Combining things

`+` means add/combine in context.

Examples:

```text
{mix a} = (milk) + (vanilla)
{batter} = {mix a} + (flour)
{vegetables} + (vegetable oil) 2tbsp + (black pepper)
```

A process may clarify the nature of the combination:

```text
{vegetables} + (vegetable oil) 2tbsp + (black pepper)
    <coat>
```

---

## 11. Quantity precision

`~` means approximately; `~~` means very approximately; `!` requests high intended
precision (measure closely), not mathematical exactness. No marker means
unspecified precision. These markers belong to the following quantity expression,
including a range or mixed fraction, never to the ingredient. Each equivalent
expression separated by `/` has its own marker. See section 43 for model scope.

It may apply to amounts, times, temperatures or other numeric values.

Examples:

```text
(salt) ~5g
(milk) ~200ml
<knead, ~10m>
<bake, 180c, ~25m>
```

---

## 12. Quantity ranges

Ranges use `-`.

Examples:

```text
(courgette) 2-3
(red curry paste) 3-4tbsp
<simmer, 2-3h>
```

---

## 13. Equivalent quantities

`/` separates equivalent ways of expressing the same quantity for the same ingredient.

Examples:

```text
(courgette) 2-3 / ~440g
(flour) 2 cups / ~240g
(butter) 1 stick / ~113g
```

`/` is not a choice between ingredients.

It means:

> the same quantity expressed another way

---

## 14. Ingredient alternatives

`-OR-` indicates a genuine alternative.

Simple alternatives may stay on one line:

```text
(chipotle paste) 2tbsp -OR- (chilli flakes, dried, red) 2tsp
(soured cream) 150ml -OR- (crème fraîche) 150ml
(chicken breast, large) 1 -OR- (chicken breast, small) 2
```

Three or more alternatives may span lines:

```text
(MSG) 1 pinch
-OR-
(chicken bouillon) 1 pinch
-OR-
(mushroom seasoning) 1 pinch
```

---

## 15. Named ingredient choices

A choice between ingredients may itself be given an ingredient name.

Example:

```text
(seasoning) =
    (MSG) 1 pinch
    -OR-
    (chicken bouillon) 1 pinch
    -OR-
    (mushroom seasoning) 1 pinch
```

Later instructions refer simply to:

```text
(seasoning)
```

This still represents one ingredient slot, not a combined result, so it uses parentheses rather than braces.

Example:

```text
{dressing} =
    (garlic) +
    (rice vinegar) +
    (sugar) +
    (seasoning) +
    (sesame oil)
```

---

## 16. Instruction blocks

Square brackets group instructions:

```text
[
    ...
]
```

Square brackets mean only:

> these instructions belong together

The word or operator associated with the block explains why they are grouped.

---

## 17. Alternative instruction blocks

Multi-step alternatives may be expressed as blocks joined by `-OR-`.

Example:

```text
[
    {birria} <simmer, very gentle, 2-3h>
]
-OR-
[
    {birria} <slow cook, low, 4-5h>
]
```

Another example:

```text
[
    {dough} <knead, 10m>
    {dough} <prove, 1h>
]
-OR-
[
    {dough} <mix, stand mixer, 6m>
    {dough} <prove, 45m>
]
```

---

## 18. Meanwhile blocks

`Meanwhile` introduces a group of instructions that may be carried out during the preceding process:

```text
(chicken breast) <poach, medium heat, covered, 10-12m, until cooked through>

Meanwhile [
    (vermicelli noodles) <cover, boiling water>
        <soak>
        <drain>
]
```

The exact scheduling semantics remain intentionally lightweight.

---

## 19. Repeat blocks

`Repeat` groups instructions which are repeated.

Example:

```text
Repeat [
    {batter} <ladle, pan>
        <cook, ~3m, until bubbles appear and edges set>
        <turn>
        <cook, ~2m>
]
until {batter} used
```

This is deliberately readable as ordinary English.

More complex loop conditions should be driven by real recipes before the syntax is expanded.

---

## 20. Indented continuation

Indented process lines may inherit the nearest explicit subject.

Example:

```text
(noodles) <cover, boiling water>
    <soak>
    <drain>
```

is equivalent to:

```text
(noodles) <cover, boiling water>
(noodles) <soak>
(noodles) <drain>
```

A result definition also establishes the subject for its indented continuation block:

```text
{batter} = (butter) + (sugar)
    <beat> ?= incorporated
    + (egg: yolk) <beat, one at a time>
    + (milk) <beat>
```

The subject is the left-hand `{batter}`, not an ingredient on the right. Each bare
action inherits it; leading `+` adds to that result before the action. Dedenting
ends the scope. The same rule works inside an Optional group; groups and sections
remain separate scopes. Code keeps the concise form; Compact uses the inherited
result as if explicitly authored. This result-definition rule does not give
`(thing) = ...` assignments a new inheritance scope or extend the existing
Draft 8 explicit-subject continuation rules above.

Recommended indentation: 4 spaces.

Indentation means continuation/inherited subject. It does not by itself mean concurrency.

---

## 21. Using part of an ingredient

An ingredient may be declared once and used in portions during the method.

Example:

```text
::ingredients

(vegetable oil) 3tbsp

::instructions

(vegetable oil) 2tbsp
...
(vegetable oil) rest of
```

Relative amounts may be used:

```text
(cheese) half of
(cheese) 1/3 of
(cheese) ~half of
(cheese) ~1/3 of
(cheese) rest of
```

`of` means a fraction of the amount declared in `::ingredients`.

Other human-readable relative quantities may be allowed when clear:

```text
(sesame seeds) extra for serving
(butter) extra for cooking
```

---

## 22. Human-readable quantities

Not every useful cooking quantity is numeric.

Draft 2 permits readable quantities such as:

```text
(salt) to taste
(oil) as needed
(maple syrup) as desired
(sesame seeds) extra for serving
(butter) extra for cooking
```

Tooling may understand some of these phrases, but a parser must at minimum preserve them.

---

## 23. Comments

`#` begins a comment and continues to the end of the line.

Comments are author/developer notes and are hidden by default in normal rendered recipes.

Example:

```text
# Grandma used 200g, but I prefer it less sweet
(sugar, brown) ~150g
```

Inline comments are valid:

```text
(courgette) 2-3 / ~440g  # use smaller ones if possible
```

Comments are different from `::story`.

- `# comment` = normally hidden author/developer note
- `::story` = publishable prose

---

## 24. Images

Images use Markdown-style syntax:

```text
![description](relative/path.jpg)
```

Example:

```text
{dough} <knead, ~10m>

![dough after kneading](images/kneaded-dough.jpg)
```

Image position may imply which stage it illustrates.

A recipe-level hero image may be declared in metadata:

```text
image: images/finished-dish.jpg
```

Relative paths are recommended so a recipe and its media remain portable.

---

## 25. Dietary metadata

Dietary classification belongs in `::recipe`.

Examples:

```text
dietary: vegetarian
```

or:

```text
dietary: vegan, nut-free
```

In Draft 7, dietary classification is author-declared metadata.

Future tooling may detect obvious conflicts against the ingredient vocabulary.

Alternatives or optional ingredients may mean that a recipe supports additional diets only under some choices.

A recipe may therefore declare both its normal classification and optional classifications:

```text
dietary: vegetarian
dietary options: vegan
```

The renderer may present this as:

> Vegetarian as written  
> Vegan option available

Future tooling may infer or validate why an option is possible from optional ingredients and named alternatives.

---

## 26. Yield

Use `yield:` when the natural output is not best described as servings.

Examples:

```text
yield: 10 scones
yield: 1 loaf
yield: 12 biscuits
yield: ~500ml sauce
```

`serves:` and `yield:` may both exist if useful, but neither should be forced where it does not fit the recipe.

---

## 27. Optional instruction blocks

`Optional` introduces a grouped instruction that may be omitted:

```text
Optional [
    (honey) <add, final 5m>
]
```

This keeps `[ ... ]` consistent as a grouped block while the leading keyword provides the relationship.

---

## 28. Role qualifiers for repeated ingredients

The same underlying ingredient may appear more than once with different roles.

Examples:

```text
(sugar, caster, for cake) 100g
(sugar, caster, for icing) 50g
```

or:

```text
(sugar, golden caster, for coating) 2tsp
(sugar, golden caster, for sauce) 1 1/2tbsp
```

Role qualifiers are ordinary qualifiers used to make references unambiguous within the recipe.

---

## 29. Ingredient parts and derived references

A declared ingredient may later be referenced by a part, state or derivative qualifier without requiring a new intermediate result.

Example:

```text
::ingredients

(lemon, unwaxed, large) 1

::instructions

(lemon, zest)
(lemon, juice)
```

Likewise:

```text
(egg, yolk)
(egg, white)
(coriander, leaves)
(coriander, stems)
```

Authors may instead declare the parts directly in `::ingredients` if that is more natural:

```text
(lemon, zest) 1 large
(lemon, juice) 1 large
```

Both approaches are valid.

---

## 30. Optional explicitness and author style

Open Sauce Food permits more than one writing style where the meaning remains clear.

For example, an author may explicitly repeat the current result:

```text
{dry} + (butter)
    <rub in>

{dry} + (sugar)
    <stir>
```

or rely on indentation:

```text
{dry} + (butter)
    <rub in>
    + (sugar)
    <stir>
```

or avoid naming the intermediate entirely:

```text
(flour) + (salt) + (butter)
    <rub in>
    + (sugar)
    <stir>
```

All may be valid if the intended subject is clear.

The format should favour readability rather than forcing one canonical authoring style.

---

## 31. Implicit result names

A result name in braces may be introduced without an explicit `=` definition when its meaning is obvious to a human reader from the immediately preceding recipe state.

Example:

```text
{cake mix} <spoon, loaf tin>
    <level surface>
    <bake, 50-55m>

{cake} <cool, slightly>
    <pierce, top>
```

The author is not required to write:

```text
{cake} = {cake mix} <bake>
```

when the transition is obvious.

This is intentionally permissive. If a new result name is genuinely ambiguous, an author should define it explicitly.

---

## 32. Human recipe, not robot program

Open Sauce Food is not intended to make recipes fully machine-executable.

Its parser needs enough structure to render a `.opensauce` file into a readable human-facing recipe, localise terms and units, and preserve broad relationships between ingredients, equipment, processes and results.

It is not required to:

- model every physical state transition
- prove that a baked batter is now a cake
- make every qualitative cooking instruction measurable
- remove all ambiguity a human cook could easily understand
- make a recipe executable by a robot

For example:

```text
{cake mix} <spoon, loaf tin>
    <level surface>
    <bake, 50-55m>

{cake} <cool, slightly>
    <pierce, top>
```

is sufficient for a renderer to produce a sensible instruction set.

The format can contain well-written recipes and badly written recipes. Structure does not guarantee culinary quality.

---

## 33. Equipment and temperature alternatives

Equivalent appliance settings may use `/` when the meaning is obvious in context:

```text
(oven) <heat, 200c / 180c fan>
```

Here `/` still communicates equivalent settings rather than a choice between different ingredients.

---

## 34. Process and ingredient choice blocks remain lightweight

A single-line choice may use:

```text
A -OR- B
```

while multi-step alternatives may use grouped blocks:

```text
[
    ...
]
-OR-
[
    ...
]
```

The syntax is intentionally readable rather than formally exhaustive.

---

## 35. Ingredient, equipment and process vocabularies


Open Sauce Food intends to maintain open, version-controlled vocabularies for ingredients, equipment and processes.

These may eventually define:

- regional names
- regional meanings
- aliases
- ambiguity warnings
- substitutions
- approximate substitutions
- dietary properties
- common process definitions
- regional process terminology
- conversion data where meaningful

Examples include:

- UK `aubergine` / US `eggplant`
- UK `plain flour` / US `all-purpose flour`
- UK `grill` / US `broil`
- regionally different meanings of `apple cider`
- UK vs US `pint`

The vocabulary itself should be open to community pull requests, such as:

> "In Australia we call this..."

The exact vocabulary file schema is not defined in Draft 2.

---

## 36. Vocabulary canonicalisation

Open Sauce Food aims to **minimise concepts, not accepted vocabulary**.

When several names genuinely refer to the same culinary concept, the vocabulary should eventually
store one canonical concept and list regional names, synonyms and accepted aliases within it.

For example, conceptually:

```yaml
id: courgette
names:
  en-GB: courgette
  en-US: zucchini
  en-AU: zucchini
```

Both source forms remain valid:

```text
(courgette)
(zucchini)
```

Canonicalisation must be conservative. Similar words should not be merged merely to make the
dictionary smaller.

A useful test is:

> If replacing one term with the other in the same locale and context changes the recipe's meaning,
> they are not simple aliases.

The vocabulary may therefore need several relationship types:

- preferred regional names
- aliases / synonyms
- variants
- parts
- parent / subtype relationships
- related concepts
- substitutions

This principle applies to ingredients, equipment and processes.

The evolving YAML data model is documented separately in `VOCABULARY-SCHEMA.md`; vocabulary schema changes do not require new recipe-language syntax.

---

## 37. Substitutions

Ingredient vocabulary entries may eventually describe substitutions.

Example concept:

```text
milk

vegan substitutions:
- oat milk
- soy milk
- almond milk
```

Substitution is not assumed to mean perfect equivalence.

Future entries may carry information such as:

- suitable for
- works best in
- flavour impact
- texture impact
- equivalent / near-equivalent
- warnings or caveats

---

## 38. Compact rendering of Code

A `.opensauce` file is authored **Code**, the primary recipe representation.
**Compact** is a condensed human-readable rendering generated from Code.
**Original recipe source**, where preserved, is upstream provenance rather than
another rendering of Code. Its literal text is never interpreted as recipe syntax.

A website or renderer may offer:

- Code (primary/default)
- Compact recipe
- Original recipe source (where available)
- images on/off
- comments on/off
- story on/off
- original / localised units
- ingredient localisation
- process localisation
- serving scaling
- cooking-focused view

The source file remains authoritative.

---

## 39. Version control

Open Sauce Food does not define its own version-control system.

The intended initial model is ordinary Git hosting, such as GitHub.

Recipes can be stored, committed, diffed and forked using existing Git tooling.

An Open Sauce Food website may index public repositories and render their `.opensauce` files without becoming their source of truth.

---

## 40. Design principles

Draft 8 follows these principles:

1. Human-readable source comes first.
2. Structure should have obvious visual meaning.
3. Do not add syntax until real recipes demonstrate the need.
4. Allow natural cooking language where strict formalisation adds little value.
5. Explicit information overrides defaults.
6. Regional ambiguity should be surfaced, not guessed.
7. The format should remain useful without a website or special editor.
8. Ingredient and process vocabularies should be open and community-maintained.
9. Git should provide versioning rather than Open Sauce Food reinventing it.
10. Real recipes should drive language evolution.
11. A section may provide type context for otherwise shared syntax.
12. Grouping syntax should remain consistent: `[ ... ]` means a block, while `Meanwhile`, `Repeat` or `-OR-` explains the relationship.
13. Open Sauce Food is a human recipe format, not a robot-execution language.
14. Multiple authoring styles may be valid when they render to the same clear human meaning.
15. Implicit state/result transitions are acceptable where a human reader would understand them.
16. Minimise vocabulary concepts without minimising the natural words authors are allowed to use.
17. Canonicalisation must preserve culinary meaning; regional names and synonyms belong in vocabulary data, not in rigid source syntax.

---

## 41. Syntax summary (Draft 7-compatible core; Draft 8 additions in section 43)

```text
::recipe
::ingredients
::equipment
::instructions
::story

(thing, qualifier)           one declared physical thing/reference
{result}                     created/combined/assembled result
<process, parameter>         action
[ ... ]                      grouped instruction block

+                            add/combine
=                            define/assign
~                            approximately
/                            equivalent quantity
-OR-                         alternative
#                            comment to end of line

Meanwhile [ ... ]            parallel/overlapping block
Repeat [ ... ]               repeated block
Optional [ ... ]             optional block

yield: 10 scones             non-serving output
dietary options: vegan       additional suitability under choices

![alt](path)                 image

(ingredient) half of         relative quantity
(ingredient) ~1/3 of         approximate relative quantity
(ingredient) rest of         remaining declared quantity
```

---

## 42. Draft status

This specification is deliberately incomplete.

At the Draft 8 milestone, the development corpus contained 120 public-domain recipes. The current public subset contains 410; see DATA-SOURCES.md. The earlier 10-recipe BBC Food stress-test corpus has been removed, while its extracted generic ingredient, equipment and process observations remain as legacy vocabulary evidence.

Draft 7 therefore separates the publishable recipe corpus from the broader vocabulary-evidence set.

The next stage is a conservative canonicalisation pass: merge genuine aliases/regional names while
preserving meaningful variants, subtypes and culinary distinctions.

Repeated real problems should justify new syntax.

## 43. Draft 8 additions (implemented baseline)

### Structured physical things

```text
(base [; variant] [: part [: subpart ...]] [, qualifiers...])
```

Square brackets in this grammar description mean optional fields; they are not
literal characters inside a thing. `;` introduces one type/variant of the base.
Each `:` selects a part of the preceding thing, in order. Commas introduce loose
qualifiers such as preparation, state, role or size. Base, variant and each part
must be nonempty. Variant precedes parts, which precede comma qualifiers. There
is no delimiter-escaping syntax in names in this version. Malformed explicit
structure receives a diagnostic while original source remains available.

```text
(flour; plain)
(egg: yolk)
(orange: peel, finely grated)
(chicken: thigh: skin)
(chicken; free range: thigh: skin)
```

The last example means skin of a thigh of a free-range chicken. English word order
is a rendering decision, not syntax. Existing `(egg, yolk)` and `(flour, plain)`
remain valid **ordinary comma qualifiers**, with no implicit structural migration.
Existing small display dictionaries may naturalise their labels but must not add
part/type semantics to the model.

Local references may derive a part from a declared base or part-chain prefix.
Explicit incompatible variants and sibling part chains must not match. Prefer
an exact structure if one is declared; retain ambiguity when several declarations
remain. Canonical vocabulary resolution annotates the base, not a fabricated
compound concept. This establishes no output yield, mass balance or cooking state.

### Quantity precision

```text
(flour) !500g
(salt) !10g
(water) ~325g
(olive oil) ~~1tbsp
(spinach) ~~1 handful
```

`!` expresses high intended precision / measure accurately; `~` approximate;
`~~` very approximate. An unmarked expression has unspecified precision. None
specifies a numeric error bound. Precision belongs to the expression, including
a fraction, mixed fraction or range. `/` between equivalent expressions starts a
separate expression with its own precision; a numeric fraction slash is internal.
`![alt](path)` remains an image and takes lexical precedence over `!`.

The implemented model annotates numeric-starting quantities in statements and
process parameters as source strings with spans and precision. Units and values
are not evaluated. Fully nonnumeric amounts such as `to taste` remain valid free
text; this milestone does not interpret their precision or unit semantics.
No conversion, serving scaling or density model is introduced. A future sourced
transformation must preserve or weaken source precision, never manufacture greater
precision. `~~1 handful` must not become a falsely precise `31.742g`.

### Story, notes and comments

`::story` is optional narrative/editorial material: personal stories, history,
origin or context. `::notes` is optional practical information for the cook:
storage, reheating, freezing, substitutions, serving and make-ahead advice.
They are independent prose sections and have independent visibility controls.
Maintainer, import, conversion and debug commentary uses existing `#` comments.
Machine-readable provenance remains recipe/source metadata. There is no
`::provenance` section.

### Verbatim original source

```text
::source
<<<
Original recipe text, including Markdown if present.
::ingredients
# These lines are literal source, not Open Sauce syntax.
(something) {something} <something> [something]
>>>
::notes
Ordinary parsing has resumed.
```

Opening and closing fences are lines containing **exactly** `<<<` and `>>>`,
respectively, with no leading/trailing spaces or comments. LF, CRLF and CR line
terminators are supported. Blank lines before the opening fence are allowed.
The body begins immediately after the opener's line terminator and ends immediately
before the closing fence. Every character in that interval is preserved, including
blank lines, indentation, hashes, URLs, markup and line-ending spelling. A body
therefore includes its final line terminator when nonempty. An original document
without a terminal newline needs a documented framing newline when embedded.

Only the first exact closing-fence line ends the body. There is no fence escaping
in this milestone: a payload containing an exact `>>>` line cannot be embedded
unchanged; retain it externally and record the collision. Indented or suffixed
fence-like lines are literal payload. A missing opener or closer is an error;
an unclosed body's contents remain opaque through EOF. Subsequent section headers
are parsed normally after closure. Repeated source sections retain source order.

Code displays authored notation (including source fences); Compact
generates instructions and omits the original-source section. Original recipe source displays only
the stored payload, escaped as literal text in HTML. It is available only when
source text exists. Image/comment/story/notes toggles must never alter the source
payload. This original-source payload is distinct from the exact entire authored
`.opensauce` document retained as `Recipe.source`.

Typed process argument roles, choice-scope redesign, repeat count/cadence,
part/output quantity provenance, conversion/density data, localisation and serving
scaling remain unimplemented proposals.
