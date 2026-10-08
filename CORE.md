# Open Sauce Food TypeScript core

This package implements Draft 8, including Draft 7-compatible recipes. It is a
library, with no website dependency. See `DRAFT8-CHANGES.md` for current validation
and migration results; historical milestone records below describe earlier passes.

## Install, build, and verify

Requires Node.js 24 or later for running TypeScript source tests directly.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm corpus
```

The build produces ESM JavaScript, declarations, and source maps in `dist/`.
The package exports the browser-compatible core separately from the Node-only YAML
loader. A TypeScript source consumer can import `src/index.ts` directly; JavaScript
consumers use the built package exports after building.

```ts
import { parseRecipe, renderCode, renderCompact } from '@open-sauce/core';
import { loadVocabulary } from '@open-sauce/core/vocabulary/node';

const vocabulary = await loadVocabulary('/path/to/open-sauce'); // optional
const recipe = parseRecipe(sourceText, { filename: 'cake.opensauce', vocabulary });
const errors = recipe.diagnostics.filter(d => d.severity === 'error');
if (errors.length) console.error(errors); // parser recovers; caller decides policy

const code = renderCode(recipe, { comments: true, story: false, images: false });
const compact = renderCompact(recipe); // comments off, story/images on
```

The Code and Compact renderers return text. Images remain Markdown image references, with their
original relative paths; no network request or image loading occurs. These are not
HTML renderers. A future HTML integration must escape ordinary text and apply its
own link/image URL policy. The new `renderHtml` API supplies escaped semantic HTML
and URL validation; see [HTML-RENDERER.md](HTML-RENDERER.md) for usage and the local
demo (`pnpm demo`).

## Architecture and API

| Module | Responsibility |
|---|---|
| `src/model/index.ts` | Versioned, JSON-serializable AST and diagnostic types |
| `src/parser/index.ts` | Source tokenization, sections, groups, indentation, diagnostics, reference annotations |
| `src/renderer/index.ts` | Code and Compact views with independent visibility options |
| `src/renderer/compact.ts` | Shared token-aware Compact phrasing for text and HTML |
| `src/renderer/html.ts` | Semantic HTML, escaped text, validated URLs and reference hooks |
| `src/vocabulary/index.ts` | Pure in-memory lookup of explicit canonical names and aliases |
| `src/vocabulary/node.ts` | Indexed canonical YAML loader; separate raw-seed loading when requested |
| `src/index.ts` | Public portable core exports |
| `scripts/corpus.ts` | Recursive corpus discovery, parser/render checks, count and warning report |

`parseRecipe(source, { filename?, vocabulary? })` always returns the recoverable
recipe model for ordinary malformed input. Inspect `diagnostics` to distinguish
errors from warnings. Unknown ingredient quantities, historical measures, implicit
results, and arbitrary process parameters are not syntax failures. No vocabulary
is required for parsing. Unresolved local references and ambiguous declarations
produce warnings rather than rejection.

`renderCode(recipe, options?)` reconstructs a normalized source-like display
from AST tokens and groups. It preserves original token spelling and comment text,
normalizes indentation and newlines, and can hide comments, story, and images.
Use `recipe.source` when exact source bytes represented by the input string matter.

`renderCompact(recipe, options?)` uses conservative action phrasing, expands simple
durations, and retains free-text parameters in parentheses where their grammatical
role is unknown. Multiline assignments become combination instructions; alternatives
remain choices, and grouped relationships stay visible. It does not prove physical
state transitions. See `IMPLEMENTATION-ISSUES.md` for known limits.

Renderer options are an extensible object. Both views accept `comments`, `story`,
and `images`. The Compact renderer also accepts `formatTerm(token)` and
`formatValue(value, context)` hooks for custom display. The value context is currently
`parameter` or `metadata`; a term hook receives the source token and its canonical
ID where resolved. Hooks can close over locale or link settings. Code rendering
intentionally keeps source terms. Future quantity conversion/scaling should use a
separate, sourced transformation layer; there are no silently ignored locale,
unit-system, or serving-count options in this milestone.

`loadVocabulary(root)` reads the indexed concepts in the three canonical folders.
It accepts Draft 7 typed aliases and the older seed's string aliases. Canonical
indexes prevent stale files from an overlay extraction becoming duplicate concepts.
To inspect the older raw layer separately, pass `vocabulary-raw/draft6-seed` as the
root. The private `current-120` aggregate observation files are omitted from this
public subset. No aliases are inferred from raw observations or conversion data invented.

## Verification recorded on 2026-10-07

- 29 automated tests passed, including 10 representative recipe fixtures.
- Strict TypeScript checking and JavaScript/declaration build passed.
- 120/120 promoted recipes parsed without syntax errors; both renderers ran.
- All 220 non-fixture `.opensauce` files on disk parsed and rendered, including
  100 earlier expansion copies still in `recipes/` after the Draft 7 extraction.
- Promoted corpus: 43 warnings. Full disk scan: 84 warnings (44 ambiguous local
  references, 20 unresolved local references, and 20 retained free-text statements).
- 732 canonical concepts loaded: 415 ingredients, 116 equipment, 201 processes.

Tests cover token source spans, Code reparse stability, source wording and free
parameters, malformed delimiters and assignments, aliases, ingredient parts,
indentation, nested blocks and Repeat conditions, alternatives, comments, images,
view options, and raw/canonical vocabulary separation.

## Files added for this milestone

- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `tsconfig.build.json`, `.gitignore`
- The six `src/` files listed above
- `scripts/corpus.ts`, `tests/core.test.ts`
- Ten `.opensauce` copies and a coverage guide in `tests/fixtures/`
- `CORE.md`, `MODEL.md`, `IMPLEMENTATION-ISSUES.md`

`README.md` receives a link to this implementation guide. Existing language,
vocabulary, and recipe files are otherwise left unchanged. `node_modules/` and
`dist/` are generated and ignored.

## Draft 8 API additions

`parseRecipe` recognises structured thing references, notes, opaque original-source
blocks and quantity precision. See `MODEL.md` for the additive version-1 fields.
Canonical IDs continue to identify base vocabulary concepts.

```ts
import { renderOriginalSource, renderHtml } from '@open-sauce/core';
const original = renderOriginalSource(recipe); // literal upstream payload, not Recipe.source
const sourceHtml = renderHtml(recipe, { view: 'originalSource' }); // escaped <pre><code>
const cooking = renderHtml(recipe, { notes: true, story: false });
```

Code preserves source payloads even while normalising surrounding authored
notation. Compact omits source blocks. Images/comments/story/notes options never
filter an opaque payload. Original recipe source view returns an empty string when no payload
exists; the demo disables that view in this case. The checked-in migration ledger
is `draft8-migration.json`; do not rerun the one-time migration over migrated files.

## Ingredient knowledge enrichment (Draft 8 tooling)

`loadVocabulary` now retains optional nested ingredient `parts`, `part_groups`,
plural names and sourced quantitative modules. Sparse entries remain valid and
the canonical count stays 732. See [VOCABULARY-SCHEMA.md](VOCABULARY-SCHEMA.md) for
the data contract and future modules. Only egg has populated structural knowledge;
no real mass, nutrition or density values were added.

```ts
const yolk = vocabulary.resolvePartPath('egg', ['yolk']);
const groups = vocabulary.partGroups('egg');
const recipe = parseRecipe(sourceText, { vocabulary });
const compact = renderCompact(recipe, { vocabulary });
const html = renderHtml(recipe, { vocabulary });
```

Part metadata is looked up by base concept and local part path. Explicit unknown
parts remain valid; the optional `partResolution` annotation records only what is
known. Passing the vocabulary to rendering enables the conservative complementary
separation merge demonstrated by Tiramisù. Without it, instructions stay separate.
The demo passes its loaded vocabulary to both stages. Browser clients can serialize
`vocabulary.entries` and reconstruct `new Vocabulary(entries)` without losing parts
or groups. Treat these metadata objects as read-only; resolution never mutates them.

The shared Compact phrasing fixes inherited single-thing additions: destination
precedes trailing prose, and `enough to ...` becomes “Add enough … to the … to …”.
Apple Pie retains ice-cold state and omits only the already-resolved role repeated
by its destination. Unknown suffixes stay literal in parentheses. One bounded
grammar correction changes “make dough hold together” to “make the dough hold
together”; no general free-text interpretation is attempted.

The separation merge requires matching simple adjacent actions, one shared whole
ingredient declaration, a bare positive integer count, known group members and
explicit labels. It stops at ambiguity, extra parameters, qualifiers, variants,
comments, blanks, blocks, children and custom formatting hooks. Both text and HTML
share the check; HTML preserves the two instruction IDs. Code/source/AST are
unchanged. No recipes or grammar files were changed in this enrichment pass.

Validation for this pass: `pnpm check`, `pnpm test`, `pnpm build` and `pnpm corpus`
pass; 114 tests (31 new knowledge/addition cases), 120/120 promoted recipes without
syntax errors, and 38 unchanged warnings (18 ambiguous references, 10 unresolved
references, 10 free-text statements). Canonical concepts remain 732.

## Reference-page prototype

The browser-safe `src/reference/` layer is separate from parsing and the AST:
YAML → Vocabulary API → `createReferencePage` → `renderReferenceHtml` → demo.
Recipes, ingredients and processes now form connected human-facing content types;
equipment uses the same small projection. No grammar changes are involved.

```ts
const usage = buildUsageIndex([{ id: 'example', name: 'Example', recipe }]);
const page = createReferencePage(vocabulary, 'ingredient', 'egg', usage);
if (page) console.log(renderReferenceHtml(page, { colour: false }));
const linkedRecipe = renderHtml(recipe, { vocabulary, referenceUrl: recipeReferenceUrl });
```

`createReferencePage` returns an independent data snapshot, or `undefined` for an
unknown/non-unique canonical ID. It exposes existing names, aliases, nested parts,
groups, sourced quantities, recorded evidence and optional computed recipe usage.
No index means usage is unknown; an empty indexed result means no resolved uses.
Display name selection is a fixed English fallback, not a localisation system.

`buildUsageIndex` accepts parsed recipes and deduplicates per concept and recipe.
It retains authored variant/part forms, plus complete canonical part paths where
known. It visits nested statements and group conditions, excluding opaque original
source, prose, unresolved/ambiguous things and recipe-local choices. It does not
infer ingredients from process parameters or inherited subjects. A declaration
counts as a reference, including an optional ingredient or choice alternative;
usage is not proof that every recipe variation consumes that ingredient.

The Node adapter `scripts/reference-corpus.ts` scans the 410 promoted recipes at
demo startup. Restart the server after changing recipes or YAML. Recorded YAML
counts remain inspectable historical evidence and never determine live counts.
See [HTML-RENDERER.md](HTML-RENDERER.md) for routes and the demo flow.

Validation: type checking, build and all 124 tests pass. Corpus: 120/120 parse,
zero syntax errors, the same 38 warnings and 732 canonical concepts.

## Curation metadata

Optional curation records creation origin separately from deliberate human review.
Recipes use `curation origin` and `curation review` metadata; vocabulary entries use
a top-level `curation: { origin, review }` mapping. Missing means unknown/legacy.
See [CURATION.md](CURATION.md) for values, diagnostics, migration and contribution guidance.
