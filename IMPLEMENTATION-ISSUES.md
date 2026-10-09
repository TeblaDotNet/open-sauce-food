# Parser implementation notes and open questions

Draft 8 formally promotes structured things, quantity precision, notes and opaque
source (SPEC section 43). Historical Draft 7 notes below are retained as context.
The statements that precision is unimplemented describe the earlier milestone.
Current open questions include source fence collision escaping, fully nonnumeric
quantity annotation, process roles, choice scope and repeat cadence. No new
semantics for those unsettled proposals are implemented.

## Repository refresh

The first implementation pass used the Draft 6 checkout. After the Draft 7 extraction,
the TypeScript files and fixtures survived. Draft 7 has the same recipe grammar and
adds canonical vocabulary entries with typed alias objects. The canonical indexes
are authoritative; unindexed old YAML files remain on disk after extraction and
must not create duplicate concepts. Raw observations are evidence, not aliases.
The promoted corpus is `examples/public-domain-recipes`; `recipes/` still contains
the earlier expansion copies. Neither source collection is rewritten by this package.

## Clarifications proposed for the language

1. **Hash characters:** section 23 says `#` starts a comment, without an escaping
   rule for URL fragments or image paths. This implementation follows that rule
   outside recognized Markdown images and URL tokens, where a hash is retained.
   Propose explicitly documenting these literal contexts and a future escape rule.
2. **Slash characters:** numeric fractions (`1/3`, even the source's `1.25/4tsp`)
   stay literal; other slashes outside delimiters are equivalent-value operators.
   Propose specifying lexical precedence for fractions, paths, and equivalences.
   No quantity is evaluated, corrected, converted or scaled.
3. **Grouping layout:** documented multiline groups and simple inline groups work.
   Nested groups must currently occupy separate lines. Multiple groups on one line,
   `] -OR- [` on one line, and multiline individual `(thing)`/`<process>` tokens
   are not supported by this first implementation. Their text remains in the AST
   and source, with syntax diagnostics; they do not occur in the promoted corpus.
   A formal grammar should clarify which layouts are intended to be valid.
4. **Commas inside qualifiers/parameters:** commas separate values; quoting and
   escaping are unspecified. Original token text is retained, but the parser does
   not infer whether a comma was intended as prose punctuation.
5. **Implicit subjects/results:** inheritance links record the nearest indented
   subject, without proving state changes or control-flow validity. A new brace
   name is an implicit result, not an unresolved-reference error. Parts/derivatives
   can refer to a base ingredient; genuinely competing declarations produce warnings.
6. **Process aliases:** vocabulary aliases such as `remove from heat` resolve to
   `remove`, but contain additional meaning. Renderers keep original process wording;
   a future localizer must preserve phrase specialization rather than simply replace
   every alias with its canonical name.

## Deliberate rendering limits

Compact uses a small set of phrasing templates and otherwise keeps process
parameters in parentheses. It preserves ambiguous quantities and source mistakes.
It is a human reading view, not a cooking execution plan. Source-like rendering
normalizes whitespace and is not a byte-for-byte editor serializer; `recipe.source`
retains the exact original input. On malformed input, inspect diagnostics before
using normalized output, since recovery can supply a missing group closure.

No spec, recipe, vocabulary, or conversion data is changed by the implementation.

## Browser milestone notes

- HTML safety and URL validation are presentation concerns, not recipe-language
  restrictions. A blocked URL remains unchanged in the source/model.
- Free-text process parameters can mention equipment, but the model does not mark
  those substrings as equipment references. HTML keeps them as text; inferring
  links there would require a separate resolution proposal. Explicit tokens use
  existing canonical/local reference annotations.
- Nested lists retain explicit group/alternative labels. Their order is a reading
  aid, not a claim that Optional, Meanwhile, or alternative branches all execute.
- The precision design note is in `QUANTITY-PRECISION-PROPOSAL.md`. `!` and `~~`
  receive no new parser or formal grammar semantics in this milestone.

## Initial deep conversion phase stop: named equipment alternatives

The October 2026 deep corpus pass exposed a repeated choice-model question in nine
candidate recipes. At that point a named ingredient alternative received role `choice` and its
name resolved as a choice; the analogous declaration in `::equipment` received
role `assignment`, and its name resolved as ordinary equipment:

```text
::ingredients
(fat) = (butter) -OR- (olive oil)
::equipment
(cooking vessel) = (pan) -OR- (Dutch oven)
::instructions
(fat) <heat, in (cooking vessel)>
```

This was the implementation behaviour at the initial stop. Compact retained the
textual alternatives, but the resolved placeholder had no choice identity. The deep pass initially accepted several such candidates
on source/Compact checks, then withdrew them when model inspection exposed this
difference. Their complete candidate artifacts remain available.

An authoring/model decision was needed before resuming that conversion approach:
should named equipment alternatives have a choice identity, or which supported
form should retain a reusable reference to the selected tool without introducing
an ordinary placeholder equipment item? No parser or formal grammar change was
made at that initial stop, and no corpus-wide fallback convention was adopted.

The affected cases are Belgian Pear Syrup, Lemon Pudding, Mushroom Risotto, Ragù,
Roasted Chicken Breast, Spaghetti and Meatballs, Stoofvlees, Sugar-Free Brown Sugar
Peanut Butter Cookies, and Tajine. Their committed recipe bytes were retained
at the initial stop.
See `generated-reconversion-v2-deep.json` for the continuing deep-pass provenance;
local evidence and the full report are under `work/conversion-v2-deep/`.

Other observations retained for follow-up: a named ingredient choice can collide
with its own member name (Lasagna); process-parameter commas split decimal-comma
measurements (the discarded Bolo do Caco candidate); bare instruction URLs may
be rendered with spaces around slash tokens. These did not justify grammar
changes during this pass. Local source ambiguities in Rösti and Pozharskiye
Cutlets are recorded separately in the phase manifest rather than resolved by
invention.

### Resumption decision: named equipment choices supported

The subsequent language decision generalises named local choices to equipment.
Both declaration sections now assign choice identity; `choiceKind` records the
member category on the local name and later references. Members retain ordinary
equipment/ingredient resolution, while local choice names have no canonical ID
or public reference link. The historical stop above is retained as run history.

Use natural reusable local roles only; avoid vague placeholders and preserve
branch-local equipment in procedural alternatives. See SPEC section 15. The nine
withdrawn candidates were individually reviewed after the fix. Four use natural named roles (Ragù, Mushroom Risotto, Stoofvlees and Tajine); five use branch-local alternatives. All nine were repaired from retained artifacts.


### Resumed corpus pass: user-limited stopping point

The resumed pass stopped at the user-requested 50-recipe cap from the checkpoint
that had 228 pending. Nine already evaluated recipes counted toward that cap;
the remaining 41 were selected by ascending baseline quality score, descending
total CQ findings for ties, then slug. The selection produced 49 accepted
rewrites and one local source block, leaving 178 pending. This is a scope pause,
not completion of the full corpus and not a new systemic language blocker.
The same deep provenance records the selection and resume history.

Further authoring observations: quantities inside nested process context and
extra qualifiers on competing local declarations need care; current supported
forms preserve the meaning. Compact’s spoon-into template duplicated a preposition
in Colcannon Bake; a source-equivalent transfer-by-spoon form was used locally.
No new grammar or vocabulary curation was introduced for these observations.
