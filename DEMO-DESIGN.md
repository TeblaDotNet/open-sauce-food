> Historical terminology: this report predates the view-name migration. Its old
> “Compact” means today’s Code; “Plain English” means today’s Compact; “Source”
> means Original recipe source. See [current terminology](TERMINOLOGY.md).

> Historical visual-development notes. Validation counts below describe those earlier passes;
> current public-export checks are in [RELEASE-VALIDATION.md](RELEASE-VALIDATION.md).
> Presentation licensing and provenance limits are in [LICENSING.md](LICENSING.md).

# Open Sauce Food — local visual system

Open Sauce Food keeps its own header/navigation and quiet tebla.net return link.
This pass adds the actual Tebla theme behaviour and the six semantic syntax colours.
The Tebla repository was consulted read-only; no runtime dependency was introduced.

## Tebla sources and behaviour

Reference: the Tebla site theme, `site-code/themes/tebla/assets` in its separate source repository.

- `js/theme-init.js` and `js/dark-mode.js` are copied unchanged into `demo/`.
  The synchronous head initializer defaults to dark, reads `dark-mode` from local
  storage, and applies the root `dark-mode` class before CSS. No system preference
  detection exists in Tebla, so none is added here. Explicit choice persists;
  denied storage still permits a current-page toggle. Light/Dark button labels,
  accessible action labels, classes and ready-state transition follow Tebla.
- `css/site.css`: light background #f3f3f3, surface #f5f5f5, text #202020,
  border #dddddd; dark background #3e3e3e, surface #1e1e1e, text #e6e6e6,
  border #444444. Toggle uses Tebla's dark/light button tokens, 8px/16px padding
  and 10px radius. Neutral links inherit text. Muted text follows the 85% treatment
  in `feeds.css`, expressed as a background-aware mix.
- `section-colours.css`: light uses 45% accent marker fills with normal #202020 text; dark ink mixes
  85% accent with white. Lowest syntax contrast is 10.29:1 against light fills
  and 4.90:1 dark. Dark token backgrounds remain transparent.
- `navigation.css` and `scope.css`: 24px top spacing, responsive 20–50px gutters,
  900px outer width, 760px document measure, 1.7 line height, flat rules,
  .25em underline offset, weighted active navigation and 2px focus rings.
- The child has no font override. Its Twenty Twenty-Five parent supplies the
  bundled Manrope and Fira Code variable fonts (with OFL notices). Manrope serves
  the shell, English and references; Fira Code serves Compact and original Source.

Syntax colour is an independent checkbox, retained across in-page navigation and
view changes. Like the previous prototype, it resets to on after a full reload.
Theme choice persists separately. Reduced-motion removes transitions.

## Locked semantic mapping

| Role | Token | Accent |
|---|---|---|
| Ingredient | `--os-ingredient` | green #b5e1b8 |
| Equipment | `--os-equipment` | blue #9bb9da |
| Explicit variant/type or part | `--os-specificity` | yellow #ddd78c |
| Process | `--os-process` | red #da8e8e |
| Intermediate/result | `--os-result` | purple #b8a4d5 |
| Structured value and precision | `--os-value` | orange #d4b07b |

The renderer's optional `syntaxSpans` flag emits escaped, modest-weight spans
within existing semantic tokens. It changes no source characters or AST data.
The demo enables it; default library HTML remains compatible. Reference titles,
part headings, variants and sourced quantities use the same roles.

Ingredient/equipment classification comes from existing AST `thingKind`: declaration
section context and matched local references, including existing canonical alias
resolution. A declaration can establish a role without a canonical vocabulary ID.
Unresolved, ambiguous and recipe-local choice things remain neutral; no inferred
culinary classification is introduced.

Within `(butter; unsalted, room temperature)`, butter is green, unsalted yellow,
and the comma qualifier neutral. English labels retain that split after reordering.
Only explicit semicolon/colon fields are specificity; loose qualifiers are not.

Values are bounded presentation recognition in existing value slots: a complete
amount immediately following a thing/result, or a complete process parameter.
Recognised forms include quantities, fractions, equivalents, precision, durations,
temperatures, numeric settings, gas marks and low/medium/high settings. Unknown
units and compound clauses stay neutral. For example `200g; as little as 180g for
moister texture` and `175c / 350f conventional non-fan-forced` are retained as neutral
compound text. This conservative classifier is not a grammar or quantity-model change.

Ordinary prose, metadata numbers, opaque formatter text, Original Source, loose
qualifiers, unknown things, section headings and control words remain neutral.
Syntax colour off removes fills and maps all six roles to normal text; weight, punctuation, links,
layout and rules remain. Colour never provides the only distinction.

## Verification

- Manually inspected Butter Cake Compact in light/colour, light/monochrome,
  dark/colour and dark/monochrome; English and literal Source.
- Inspected egg (including split part headings), sparse courgette, bowl equipment
  and separate process references. Verified green/blue distinction, yellow parts,
  red processes, purple results, orange values and neutral control/section words.
- Desktop and 390 × 844 mobile checks; no horizontal overflow in mobile Compact,
  English or reference views. Theme persists across reload; toggling it does not
  change syntax state. Native keyboard controls/focus and reduced-motion CSS remain.
- Automated tests cover escaping, structural value boundaries, unresolved terms,
  qualifier neutrality, unchanged text/AST, representative recipe views, denied
  storage, persistence, default theme and script serving.
- Typecheck, build and all 153 tests pass. Corpus: 413/413 recipes, zero errors,
  653 existing warnings (625 FREE_TEXT, 18 AMBIGUOUS_REFERENCE, 10 UNRESOLVED_REFERENCE).

Current screenshots in `docs/visual-review/`: `compact-light-colour.jpg`,
`compact-light-monochrome.jpg`, `compact-dark-colour.jpg`,
`compact-dark-monochrome.jpg`, `english-dark.jpg`, `source-dark.jpg`, `egg-dark.jpg`,
and `mobile-dark.jpg`. Other images in that folder document the preceding pass.

## Files and local preview

This pass changes `demo/index.html`, `demo/app.js`, `demo/style.css`,
`scripts/demo-server.ts`, `src/renderer/html.ts`, `src/renderer/english.ts`,
`src/reference/html.ts`, `tests/reference.test.ts`, and this note. It adds
`demo/theme-init.js`, `demo/dark-mode.js`, `src/renderer/syntax.ts`,
`tests/visual-system.test.ts` and the screenshots above. Earlier
README and bundled-font work is retained. No parser, formal specification, recipe,
vocabulary, curation or Tebla-repository changes are part of this pass.

Run `pnpm demo` from this repository (default port 4173). A local review can use an alternate port.
To select that port in PowerShell: `$env:PORT='4177'` then `pnpm demo`.

## Theme-specific marker refinement

This refinement changes only `demo/style.css`, this note, and adds screenshots
`docs/visual-review/light-marker.jpg` and `light-marker-mobile.jpg`.
The six `--os-*` variables retain the same palette mapping. Shared theme controls
choose foreground mixing and fill opacity without changing semantic classification.
Light mode uses square, padding-free 45% marker fills with normal dark text;
dark mode uses the existing 85%-accent foreground and transparent backgrounds.
Syntax colour off sets both semantic effects to zero independently of theme.
No token needed semantic special casing. Reference h1 headings use `fit-content`
width so the fill follows the title rather than the full document column.

Inspected Compact colour on/off in both themes; light egg, bowl and separate
references; egg/yolk, flour/self-raising, equipment and result spans; and No-knead
Bread's duration and temperature slots. At 390px, every recipe line has identical
height with highlights on/off and there is no horizontal overflow. Existing focus
outlines remain independent of token backgrounds. Typecheck, build, all 153 tests
and corpus checks pass (413/413, zero errors, unchanged 653 warnings).

## Current terminology and presentation

The control is now **View as: Code · Compact · Original recipe source**. Code is
the default; syntax spans and colour apply to Code. Compact is condensed generated
prose. Original recipe source is literal provenance and is disabled when absent.
The separate file link says “View Code file (.opensauce)”. Reference-page semantic
colours remain available. Earlier visual descriptions above document historical
behaviour; current captures are indexed in [visual-review](docs/visual-review/README.md).
