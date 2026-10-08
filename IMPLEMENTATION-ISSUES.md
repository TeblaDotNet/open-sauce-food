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
