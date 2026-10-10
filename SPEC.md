# Open Sauce Food Recipe Format

## Sauce Code — Draft 8

Open Sauce Food is a human-readable recipe language and shared culinary knowledge base, designed for personal recipe collection, versioning, remixing and collaboration.

Recipe files use the `.opensauce` extension.

The basic idea is simple:

A recipe should still make sense if you open it in a plain text editor, while containing enough structure for software to understand useful things about it.

That means Open Sauce Food sits somewhere between ordinary recipe prose and a programming language.

It is not an attempt to make dinner executable by a robot. Humans are still expected to know roughly what “golden brown” looks like.

## The three recipe views

Open Sauce Food recipes can be shown in three ways:

**Sauce Code**

The actual .opensauce recipe. This is the primary representation and source of truth.

**Compact**

A more conventional recipe view generated from the Sauce Code.

**Original Source**

Where an imported recipe retains its original source text, that can be viewed unchanged alongside the converted recipe.

The Original Source is provenance, not another interpretation of the Sauce Code.

## Core syntax

A small number of visual conventions carry most of the structure:

```text
::section             recipe section

(thing)               ingredient or equipment
{result}              something made during the recipe
<action>              action or cooking process
[ ... ]               grouped instructions

+                     add/combine
=                     define/assign
-OR-                  alternative
?=                    cook-judged completion condition

~                     approximate quantity
~~                    very approximate quantity
!                     measure accurately
/                     equivalent quantity or setting

# comment             maintainer/author comment
```

The aim is that most of these should be understandable before reading a manual.

## Sections

A recipe can contain:

```text
::recipe
::ingredients
::equipment
::instructions
::story
::notes
::source
```

`::ingredients` and `::instructions` contain the main recipe.

`::equipment` lists equipment worth stating explicitly.

`::story` contains history, context or personal narrative.

`::notes` contains practical cook-facing information such as storage, substitutions or serving suggestions.

`::source` can preserve the original imported recipe verbatim.

Comments beginning with # are for authoring, conversion and maintenance information rather than normal published prose.

## Ingredients and equipment

Ingredients and equipment both use parentheses:

```opensauce
::ingredients

(onion) 2
(olive oil) 1tbsp

::equipment

(frying pan)
(chef knife)
```

The section tells Open Sauce Food whether the thing is an ingredient or equipment.

Qualifiers can be added with commas:

```opensauce
::ingredients
(onion, finely chopped)
::equipment
(frying pan, large)
```

Not every obvious tool needs to be declared. A recipe usually does not need to tell you that chopping requires a knife.

Specific or important equipment should be declared when it materially helps someone follow the recipe.

## Types, parts and qualifiers

Sauce Code can distinguish between an ingredient itself, a type of it, a part of it, and loose descriptive qualifiers.

The full shape is:

```text
(base [; variant] [: part [: subpart ...]] [, qualifiers...])
```

For example:

```opensauce ingredients
(flour; plain)
(egg: yolk)
(lemon: juice)
(chicken: thigh: skin)
(chicken; free range: thigh: skin)
```

The punctuation has different meanings:

```text
;    type / variant
:    part or product
,    loose qualifier, preparation, state, role, size, etc.
```

So these are deliberately different ideas:

```opensauce ingredients
(egg: yolk)
(egg, beaten)
```

One says which part of the egg. The other says something about its current preparation.

The knowledge base can understand these relationships without requiring every combination to become its own separate ingredient.

Qualifiers stay authored text. Explicit recognised preparation states may be annotated by the knowledge base; no implicit state transition is inferred. See [the vocabulary schema](VOCABULARY-SCHEMA.md) for the implemented relationship model.

## Results

Curly braces name things created during the recipe:

```opensauce
{sauce}
{dough}
{batter}
{filling}
```

Results can be defined with =:

```opensauce
{dressing} = (olive oil) + (vinegar) + (mustard)
```

and then used later:

```opensauce
{dressing} <mix>
{salad} + {dressing}
```

Sauce Code does not require every obvious physical state change to be formally modelled.

If batter goes into the oven and the next line calls it {cake}, that is fine. People can cope.

## Actions and processes

Actions use angle brackets:

```opensauce
(onion) <chop>
(onion) <fry, medium heat, 5m>
{cake} <bake, 180C, 40m>
```

One important authoring rule is:

One `<...>` token should represent one action head.

So this:

```opensauce
{rice} <cook, 12m>
    <stir, occasionally>
```

is preferred to burying two separate actions inside one process token.

Angle brackets are used for both significant cooking techniques and ordinary verbs.

That does not mean every verb needs its own knowledge page. `<braise>` may deserve one; `<put>` probably does not.

The vocabulary can therefore recognise an action without publishing a separate reference page for it.

## Judgement conditions

Recipes often finish a cooking step using human judgement rather than a stopwatch.

Sauce Code represents that with `?=`:

```opensauce
<roast, 180C, 20m> ?= golden brown
```

or:

```opensauce
{sauce} <simmer, 15m> ?= thick enough to coat a spoon
```

Compact rendering can turn the first example into:

Roast at 180°C for 20 minutes, until golden brown.

The judgement remains human-readable rather than becoming another controlled vocabulary.

This is intentional: cooking contains quite a lot of “you'll know it when you see it.”

## Adding and combining

+ handles straightforward addition or combination:

```opensauce
{dressing} = (oil) + (vinegar) + (mustard)
```

or:

```opensauce
{pot} + (water) + (salt)
```

For simple additions, + is usually clearer than repeatedly writing `<add>`.

## Alternatives

-OR- represents a genuine choice:

```opensauce ingredients
(soured cream)
-OR-
(crème fraîche)
```

Multi-step alternative methods can use blocks:

```opensauce
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

For small local choices, the alternative should stay as local as possible rather than duplicating a whole method unnecessarily.

Intended authoring improvement, not a fully structured alternative in the current implementation:

```text
{ravioli} <cut, between seams, with (pasta cutter) -OR- (knife) -OR- (pizza cutter)>
```

Keeping the choice local is preferable to repeating the entire cutting procedure. Currently only the first tool in this example is recognised as a structured reference; the remaining alternatives are preserved as literal context. Use a named local equipment choice today, or branch-level `-OR-` when the method or sequence genuinely differs.

## Named choices

A local choice can also be given a name:

```opensauce ingredients
(seasoning) =
    (MSG)
    -OR-
    (chicken bouillon)
    -OR-
    (mushroom seasoning)
```

Later:

```opensauce
{sauce} + (seasoning)
```

This is useful when the recipe needs to refer repeatedly to whichever option was selected.

The same idea can be used for equipment.

## Indented continuation

Indentation can avoid repeating the same subject:

```opensauce
(noodles) <cover, boiling water>
    <soak, 5m>
    <drain>
```

The indented actions inherit (noodles).

Result definitions can also establish a continuation subject:

```opensauce
{batter} = (butter) + (sugar)
    <beat> ?= incorporated
    + (egg: yolk)
    <beat>
```

Indentation means continuation of the current subject, not “these things happen simultaneously.”

## Grouped instructions

Square brackets group related instructions:

```text
[
    ...
]
```

The thing outside the block explains why they are grouped.

For example:

```text
Meanwhile [
    ...
]
Repeat [
    ...
]
Optional [
    ...
]
```

or:

```text
[
    method A
]
-OR-
[
    method B
]
```

The brackets themselves deliberately have very little meaning.

## Structured references inside actions

Ingredients and equipment can appear inside action context:

The declarations below supply the local ingredient/equipment roles used by the action references.

```opensauce
::ingredients
(water)
(salt)
(onion)
(olive oil)
::equipment
(plastic wrap)
(frying pan)
::instructions
{dough} <cover, with (plastic wrap)>
{ravioli} <cook, in (water, boiling) + (salt)> ?= they float
(onion) <fry, in (frying pan) + (olive oil)>
```

Those references remain real ingredients/equipment rather than disappearing into an opaque sentence.

This lets the site link them to the shared knowledge base while leaving the surrounding cooking language readable.

## Quantity precision

Recipes often imply different levels of precision.

Sauce Code can make that explicit:

```opensauce ingredients
(flour) !500g
(water) ~325g
(spinach) ~~1 handful
```

Meaning:

```text
!     measure this carefully
~     approximately
~~    very approximately
```

No marker means the recipe has not specified a precision level.

These markers are deliberately descriptive rather than mathematical error bounds.

Nobody needs `~~1 handful` converted into 31.742g.

Precision belongs to the quantity expression, not the ingredient. Unit conversion and serving scaling are not implemented here; a future conversion must preserve the source precision rather than introduce falsely precise decimals.

## Equivalent quantities

/ can give equivalent forms of the same quantity:

```opensauce ingredients
(flour) 2 cups / ~240g
```

or equivalent appliance settings:

```opensauce
(oven) <heat, 200C / 180C fan>
```

It does not mean an ingredient choice. Choices use -OR-.

## Human-readable quantities

Sauce Code does not insist everything become a number:

```opensauce ingredients
(salt) to taste
(oil) as needed
(sesame seeds) extra for serving
```

A recipe language that could not express “salt to taste” would be solving the wrong problem.

## Recipe metadata

`::recipe` contains recipe-level metadata such as:

```opensauce recipe
name: Lentil Soup
serves: 4
category: soup/stew
tags: lentils, warming
dietary: vegetarian
cuisine: italian
region: sicily
```

Current metadata can also preserve:

- source
- source author
- source license
- ingredient locale
- units
- yield
- active time
- total time
- image
- conversion stage
- curation origin
- curation review

Most of this metadata is optional. A minimal recipe remains valid without category, dietary, cuisine or region metadata. No corpus-wide dietary, cuisine or region inference is performed by the parser.

Dietary labels are author-supplied guidance, not a guarantee of suitability. Ingredients and product labels still need checking.

## Original source preservation

Imported recipes can retain the original source text verbatim:

```opensauce
::source
<<<
Original source recipe here.
Nothing inside this block is interpreted as Sauce Code.
>>>
```

This makes conversion auditable.

The original recipe can remain available next to the structured version instead of being quietly replaced by it.

## Culinary knowledge

Sauce Code is only one part of Open Sauce Food.

Ingredients, equipment and processes can resolve against a shared version-controlled culinary knowledge base.

That knowledge can describe things such as:

- aliases and regional names
- ingredient families
- ingredient parts
- preparation states
- equipment subtypes
- cooking techniques
- links between recipes and the concepts they use

For example:

- self-raising flour  → type of flour
- paring knife        → type of knife
- cast-iron frying pan → type of frying pan

An identity can exist in the knowledge base without needing a public reference page.

Conversely, a useful reference page can exist even before the recipe corpus happens to use the concept much.

Recipe syntax remains legal independently of whether something is already known to the vocabulary.

## Reference pages

Reference pages are intended to become useful culinary resources in their own right.

For processes, a page may be useful because the term has:

- discovery value — finding recipes that use the technique
- explanation value — explaining what the technique means

Equipment also has a third possible reason:

recommendation value — helping people understand useful types or good examples of a tool

Eventually these pages can also link to carefully selected external articles and videos.

The aim is useful curation, not turning every verb and spoon into an encyclopedia entry.

## Publication and conversion status

Imported recipes are not automatically treated as finished recipes merely because the parser accepts them.

Conversion stage is currently one of:

- initial
- reworked
- blocked

reworked recipes are the normal public browsing set.

initial and blocked recipes may remain directly accessible for development/review but are kept out of normal discovery.

This is independent of parser validity and of any automated quality score.

## Git and openness

Open Sauce Food does not invent its own version-control system.

Recipes are plain text, so ordinary Git works rather well.

They can be:

- committed
- diffed
- forked
- reviewed
- remixed
- contributed through pull requests

The same principle applies to the shared culinary vocabularies.

If somebody knows that a tool, ingredient or technique has a different name where they live, that is exactly the sort of useful contribution the project should eventually make easy.

## Design principles

The language is still experimental, but a few principles have become fairly stable:

- Human-readable source comes first.
- Structure should be understandable by inspection where practical.
- Real recipe problems should justify new syntax.
- Natural cooking language is allowed where formalisation adds little.
- Parser legality must not depend on whether the vocabulary already knows a term.
- Ingredients, equipment and processes are shared knowledge, not rigid source-code enums.
- Regional differences should be represented rather than guessed away.
- Git handles versioning; Open Sauce Food does not need to reinvent Git badly.
- Sauce Code should encode useful structure without pretending cooking is a robot program.
- A recipe can still be badly written. The file extension is not magic.

## Status

Draft 8 is implemented and actively being tested against a growing recipe corpus.

The format is deliberately still allowed to change.

New syntax should be driven by real recipes, not by an attempt to predict every culinary edge case in advance.

That has already proved considerably more useful than designing an immaculate language for imaginary soup.
