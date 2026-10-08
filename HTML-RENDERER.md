# HTML renderer and local recipes/references

The browser milestone adds `renderHtml(recipe, options?)`, a pure function returning
an HTML fragment. It uses the existing AST, with no DOM, Node, parser, or language
changes. The plain-text and HTML views share an internal phrasing module, so Compact
formatting retains token identity without interpolating markup into recipe text.

## Run the demonstration

From the repository root, with Node.js 24+ and installed dependencies:

```sh
pnpm install --frozen-lockfile
pnpm demo
```

Or, without a package-manager command on PATH:

```sh
node node_modules/typescript/bin/tsc -p tsconfig.build.json
node scripts/demo-server.ts
```

Open **http://127.0.0.1:4173/**. Stop with Ctrl+C. Set `PORT` to another port if
4173 is already occupied. The command builds first; after changing TypeScript,
rebuild and reload the browser. The demo uses native ES modules and no bundler.
Opening the HTML through `file://` is not supported because modules and recipe data
are fetched from the localhost server.

Eight featured promoted recipes demonstrate baking, named choices, alternatives, ingredient
parts, Repeat, Meanwhile, Optional, historical measures, and implicit results.
The reader switches between Code, Compact and Original recipe source and independently
toggles images, comments, story and notes. Original recipe source shows escaped literal upstream
text, enabled only when embedded text exists (e.g. Butter Cake and Bread).
Display toggles are disabled in Original recipe source view. The separate file link opens the
authored `.opensauce` file, not the upstream original.
All 410 promoted recipes are selectable and reachable from reference usage lists.
All recipe sources and images come from `examples/public-domain-recipes/`; images
are resolved against the selected recipe's directory. No fixture copy is served.

The read-only server binds to `127.0.0.1` and exposes only demo assets, built JS
modules, promoted recipes/media, and read-only JSON endpoints. It does not expose the
whole checkout or accept writes. Vocabulary is loaded from canonical indexes on
startup and sent as JSON; recipe rendering parses in the browser, while the usage
index parses the promoted corpus once on server startup. Loading errors are shown,
and rapidly changing recipes cannot let a stale response replace the latest choice.

## Library API

```ts
import { parseRecipe, renderHtml } from '@open-sauce/core';

const recipe = parseRecipe(source, { vocabulary }); // vocabulary is optional
const html = renderHtml(recipe, {
  view: 'code',                // default; or 'compact' / 'originalSource'
  images: true,               // default true
  comments: false,            // default false
  story: true,                // default true
  idPrefix: 'recipe-card-1',   // distinct for each embedded recipe
  assetBaseUrl: '/examples/public-domain-recipes/apple-pie/',
  referenceUrl: ({ kind, canonicalId }) =>
    `/reference/${kind}/${encodeURIComponent(canonicalId)}`
});
```

The demo wires this hook to local reference routes. Use the exported
`recipeReferenceUrl` helper to include complete known part paths as fragments.
When the callback is omitted, terms are spans.
Only resolved ingredients, equipment, and processes are passed to the callback.
Unknowns, ambiguous things, named ingredient choices, and results retain their own
identity; the renderer does not infer global vocabulary concepts for them.

HTML uses an `article`, labelled sections and headings, metadata definition lists,
ingredient/equipment lists, instruction lists with nested continuations and groups,
author-comment asides, and images with alt text. Classes are prefixed `os-`.
`data-kind` distinguishes tokens, `data-canonical-id` carries resolved identities,
`data-declaration-ids` links to declaration node IDs, and
`data-inherited-subject` records the existing subject relationship. Group labels and
alternative operators remain visible rather than being flattened into prose.
When placing multiple fragments in a page, supply unique `idPrefix` values.

`formatTerm(token)` and `formatValue(value, context)` are **plain-text** hooks, not
HTML hooks. The Compact view uses term formatting; Code preserves raw token
spelling. Metadata formatting applies to both views. `referenceUrl` returns a URL,
never markup. `assetBaseUrl` is a directory URL and should end in `/`.

Future locale selection can supply display hooks while preserving the source.
Unit conversion and serving scaling should be an explicit, provenance-aware
quantity transformation layer before rendering. No ineffective `locale`,
`unitSystem`, or `servings` knobs are accepted yet. Draft 8 precision semantics
constrain future transformations; `!`, `~` and `~~` are already parsed without
evaluating quantities.

## HTML and URL safety

All recipe text, names, parameters, metadata, comments, IDs, and formatter results
are escaped. The renderer does not interpret ordinary text as HTML or generic
Markdown. Only the documented Markdown image notation is recognized in prose.
Reference URLs, source links, and image paths accept HTTP(S) or relative references.
Active schemes (including `javascript:`, `data:`, and `file:`), protocol-relative
URLs, backslashes, embedded whitespace/control characters, and malformed absolute
URLs are rejected. Encode spaces in asset paths as `%20`. Blocked links become
plain token spans; blocked images become escaped alt-text placeholders. Image
visibility is applied before URL resolution so hiding images creates no image tags.

Remote HTTP(S) images are allowed by the library; an embedding application's CSP
can restrict their origins. The local demo supplies a CSP and `nosniff`. The
renderer never fetches URLs itself or mutates the recipe model.

## Checks

```sh
pnpm check
pnpm test
pnpm build
pnpm corpus
```

The 124 tests include escaping across display contexts, URL policy, canonical/local
references, independent visibility options, groups and conditions, shared Compact
phrasing, promoted recipes, reference projections, sparse and nested knowledge,
synthetic quantitative modules, corpus usage and the server's allowlisted routes.
The corpus command exercises Code text, Compact text, and both HTML views.

## Reference pages and navigation

The text-first, single-column demo uses monospace type, restrained semantic colours
and a global **Syntax colour** checkbox. Switching it off gives both recipe and
reference content monochrome styling. Meaning also remains in text and links.
Display settings persist during in-page navigation; a full reload resets toggles.
Recipe identity and view are retained in URL query parameters when following links.

Try Butter Cake → **Egg yolk** → egg's yolk section → **Back to recipe**.
Or choose Tiramisù → **Separate** → process page → a recipe in its usage list.
The top navigation also exposes egg, courgette, flour, separate and bake. Other
resolved concepts, including equipment, use the same generic reference renderer.

- `/reference/ingredient/egg` opens a reference directly, including on reload.
- `#part-yolk` addresses a part within egg; nested paths use `#part-thigh/skin`.
- Unknown/partially resolved parts link to the base concept, with no invented anchor.
- `/?recipe=tiramisu&view=english` opens a promoted recipe. Browser back/forward
  and the explicit return link work without a routing framework.
- `/api/reference/{kind}/{id}` returns the reference model with computed usage;
  unknown concepts return 404. `/api/corpus` lists all promoted recipe paths.
  `/api/recipes` retains the eight featured examples; `/api/vocabulary` supplies
  the canonical vocabulary to browser parsing.

The reusable model/index lives in `src/reference/index.ts`, with safe HTML in
`src/reference/html.ts` and filesystem scanning in `scripts/reference-corpus.ts`.
Egg shows real names, local parts, a culinary group and provenance. Sparse pages
show only available names/aliases, evidence and usage. Absent quantity, nutrition,
part and group modules produce no empty sections. Quantitative support is exercised
with synthetic test data only. No definitions, tutorials, nutrition values or
variant relationships are invented. Recorded YAML observations are expandable
and explicitly distinct from current corpus counts.

Usage counts explicit resolved tokens once per recipe, preserving ingredient base,
part and variant forms. It is not a search over source text and does not interpret
free-text parameters or opaque upstream originals. Restart the server after data
changes to refresh its snapshot. No production routing, search index, conversion,
scaling, localisation or process signatures are implemented.

## Files in the original HTML milestone

- New: `src/renderer/html.ts`, `src/renderer/compact.ts`, `tests/html.test.ts`,
  `scripts/demo-server.ts`, `demo/index.html`, `demo/app.js`, `demo/style.css`,
  `HTML-RENDERER.md`, `QUANTITY-PRECISION-PROPOSAL.md`.
- Updated: `src/renderer/index.ts` (shared Compact phrasing), `src/index.ts`,
  `scripts/corpus.ts`, `package.json`, `README.md`, `CORE.md`, `MODEL.md`,
  `IMPLEMENTATION-ISSUES.md`.
- Parser, formal spec, recipe sources, vocabulary data, and dependency set unchanged.
