# Recipe model, version 1 — Draft 8 additive extensions

The public TypeScript definitions are in `src/model/index.ts`. The model is a
source-preserving syntax tree with lightweight annotations, not an executable
culinary graph. It has no filesystem, browser, or vocabulary dependency.

## Root, locations, and identity

`Recipe` has `modelVersion: 1`, the exact input `source`, optional `filename`, ordered
`preamble` nodes, ordered `sections`, and `diagnostics`. Repeated metadata and
sections remain in source order rather than being overwritten in a dictionary.
Unrecognized sections are preserved as prose and produce a warning.

Every node has an ID unique within that parse (`n1`, `n2`, ...). IDs are reference
targets within the model, not stable identifiers across edits. No cyclic object
references are used, so the model can be serialized as JSON.

`Span` uses zero-based UTF-16 `start`/`end` offsets with an exclusive end, plus
one-based `line` and `column`. These index the original input string, including
CRLF and Unicode. Token spans cover exactly `token.raw`. Ordinary node spans cover
their source line; group spans extend through the closing bracket. A group's
condition has its own span after that closure. Section spans cover the header.
Indent counts spaces, with tabs treated as four spaces for nesting; source offsets
and columns still count actual characters.

## Node types

| Kind | Content |
|---|---|
| `metadata` | Original key/value, optional inline comment |
| `statement` | Ordered tokens, nested continuation nodes, optional role and inherited subject link |
| `group` | `group`, `Meanwhile`, `Repeat`, or `Optional` relationship, children, optional Repeat condition and comments |
| `prose` | Unstructured text, including story and unknown-section content |
| `comment` | Standalone comment text |
| `blank` | Blank line |

`Statement.role` distinguishes declarations, named choices, assignments,
instructions, standalone alternatives, and conditions. A statement's indented
children remain under that statement. A bare process or leading `+` continuation
can carry `inheritedSubjectId`, pointing to its nearest explicit subject owner.
For result-definition continuations, `inheritedSubjectId` points to the statement
whose first significant tokens are `{result}` and `=`; rendering uses only that
left-hand result as the subject. Dedent ends that scope.
Groups create a separate inheritance scope; a block does not acquire a subject
from an unrelated preceding line.

Group relationships describe broad human meaning, not scheduling. An `until ...`
statement following a Repeat is stored as its `condition`; its words are not
converted to a machine predicate. Alternatives are represented by ordered `-OR-`
tokens (within a line) or alternative statements between sibling branches/groups.
Consumers must retain that operator when presenting children as a list; children
are not invariably a sequential list of actions.

## Tokens and values

Tokens have `kind`, `raw`, and `span`, with fields applicable to their kind:

- `thing`: `name`, `qualifiers`, and an annotated `thingKind` of ingredient,
  equipment, choice, unresolved, or ambiguous. `declarationIds` points to the
  statement nodes containing candidate local declarations. Several candidate
  tokens may share a statement ID in a single-line alternative.
- `result`: a brace name, with `implicit` true on its first occurrence when that
  occurrence is not the left side of an explicit assignment. No state-transition
  or branch-availability claim is made.
- `process`: `name` and ordered string `parameters`.
- `judgement`: exact `raw` and `span`, plus `judgement: { text, processSpan? }`.
  `text` is the trimmed literal body after `?=`; `processSpan` identifies the
  immediately preceding process token without a cyclic object reference. Invalid
  unattached judgements retain their source and omit `processSpan`; diagnostics
  are `UNATTACHED_JUDGEMENT` and/or `EMPTY_JUDGEMENT`. The body is excluded from
  numeric quantity extraction and vocabulary resolution.
- `operator`: `+`, `=`, `~`, `/`, or `-OR-` in `raw`.
- `text`: exact intervening whitespace/free text, including quantities.
- `image`: original Markdown reference plus `alt` and `path`.

A quantity is deliberately not a floating-point number. The ordered tokens after
an ingredient hold its source amount, approximation and equivalence operators.
For example, `(flour) 1 1/2 cups / ~240g` has a thing token, literal `1 1/2 cups`,
an equivalence operator, an approximation operator, and literal `240g` (with
whitespace preserved). `1.25/4tsp`, `to taste`, `rest of`, and `1 bowl` remain
unevaluated text. Qualifiers and process parameters likewise retain fractions,
settings, ranges, alternatives expressed as prose, and approximation marks.

When a supplied vocabulary resolves a term uniquely, `canonicalId` annotates the
token without rewriting `name` or `raw`. A resolved ordinary action additionally
carries `reference: false`, preserving its canonical ID while suppressing public
reference links and usage-index entries. Local named choices take priority over
global concepts. Ingredient parts can match a base declaration; matching explicit
qualifiers narrow candidates. Unknowns and competing candidates remain visible.
Vocabulary aliases can also match differently spelled local declarations.

## Diagnostics and recovery

Diagnostics contain `severity`, stable `code`, a human message, and `span`.
Errors cover unclosed/stray delimiters, empty names, missing assignment values,
invalid assignment targets, and dangling alternatives. Warnings cover unknown
sections, non-metadata text, unstructured statements, missing names, unresolved or
ambiguous references, ambiguous vocabulary lookup, and unattached conditions.

Recovery keeps malformed text as text/prose tokens and retains the complete source.
The Code renderer is intended for valid source; it can normalize recovered
structures such as an unclosed block. Applications should surface errors before
presenting that output as corrected source. Free-text culinary oddities do not
cause an error just because the parser cannot interpret them.

## HTML presentation

The HTML renderer consumes this model without modifying it. Existing node IDs
become prefixed HTML IDs; reference annotations appear as `data-*` attributes.
Compact may render one unambiguous subordinate `<stir, occasionally>` or
`<turn, halfway through>` child of a cooking action as a participial phrase,
with the parent judgement last. Multiple children, explicit different subjects,
comments and unsupported forms retain separate sentences. This presentation
choice does not change the AST, Code, or add scheduling semantics.

Internal Compact phrase parts retain token identity alongside plain-text labels,
so semantic spans/links can survive rearrangement into English sentences. Phrase
parts are a renderer detail, not a new AST or a change to the model version.

## Draft 8 additive fields (current contract)

The version remains 1 because existing kinds and fields are retained. Consumers
must tolerate additional fields, the `judgement` token kind, and the new `!`/`~~` operator values. The preceding
Draft 7 token examples remain valid; the following additions supersede statements
that quantities have no annotations.

- `Token.name` remains the base spelling. A thing adds optional `variant` and an
  ordered `parts` array (empty for legacy references); `qualifiers` contains only
  comma qualifiers. Raw text and spans are unchanged. `canonicalId` annotates the
  base concept; `data-variant` and `data-parts` expose structure in HTML.
- `Statement.quantities` contains numeric-starting expression annotations:
  `{ raw, value, precision, span }`. `value` is the unevaluated expression without
  its marker, not a floating-point number. `precision` is `unspecified`, `high`,
  `approximate` or `very-approximate`. Spans slice the original source exactly,
  including process-parameter values. These annotations add no unit conversion,
  culinary interpretation or expression evaluation. Nonnumeric prose remains text.
- A source `Section` has optional `originalSource: { text, span, closed }`. Its payload
  is not tokenised and is not stored as prose children. `span` covers exactly the
  payload (excluding fences); `closed` records whether a closing fence was found.
  `Recipe.source` still means the entire original Open Sauce Food document.
- `renderOriginalSource(recipe)` returns source payloads in order without trimming or
  filtering. `renderHtml(recipe, { view: 'originalSource' })` escapes each payload in a
  preformatted block; an absent payload produces an empty string. The Notes toggle
  is `notes?: boolean`, independent from `story`.

New error codes: `INVALID_THING_STRUCTURE`, `MISSING_SOURCE_FENCE`, `UNCLOSED_SOURCE`.
Draft 7 parse shapes remain source-preserving; consumers doing exact serialized
AST comparisons must allow the additive fields. Literal `;` and `:` in a thing's
base now have structural meaning; commas remain legacy qualifiers.

## Optional ingredient knowledge annotation

`Token.partResolution?: { ids: string[]; complete: boolean }` is an additive
vocabulary annotation for an ingredient's explicit part path. IDs are local to each
parent and ordered from the base outward. An unknown suffix retains the known
prefix with `complete: false`; original `parts` and token text are never replaced.
Unknown paths are not syntax errors. No vocabulary means no annotation.

`Vocabulary.resolvePartPath(baseId, terms)` returns the IDs plus corresponding
metadata objects; `partGroups(baseId, parentParts?)` returns useful culinary groups
at the requested scope. Metadata stays in the vocabulary instead of being copied
into every AST token. JSON recipes retain the small annotation without introducing
cycles or a runtime vocabulary dependency. Part lookup currently concerns the base
concept, not variant-specific facts.

HTML exposes `data-known-part-path` and `data-parts-complete` alongside authored
`data-parts`; reference hooks receive the original annotated token. A vocabulary-
backed Compact merge is a display-only phrase operation, not a combined AST action
or a statement about anatomy, yield or quantity conservation.
