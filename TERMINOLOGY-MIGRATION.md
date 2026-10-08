# Representation terminology migration

Completed before the first public commit. No Git initialisation or publication occurred.

## Canonical contract

| Representation | Canonical API / identifier |
|---|---|
| Code — authored .opensauce representation, primary/default | renderCode; view code; os-view-code |
| Compact — condensed generated human-readable rendering | renderCompact; view compact; os-view-compact |
| Original recipe source — literal upstream provenance where available | renderOriginalSource; view originalSource; os-original-source |

HtmlRenderOptions uses the exported RecipeView type. Section.originalSource holds
an OriginalSourcePayload; Recipe.source still holds exact authored Code. The
phrasing module is now src/renderer/compact.ts (compactPhrasing and humanList).
Old renderEnglish/renderSource exports and old view aliases are not retained.
The previous renderCompact implementation is now renderCode; the current
renderCompact is the former human-readable renderer.

UI: **View as: Code · Compact · Original recipe source**. Code is selected by
default. Missing provenance disables Original recipe source and falls back to Code,
including the URL. The authored file link reads “View Code file (.opensauce)”.
Syntax colour is active for Code and reference pages; it is disabled for Compact
and Original recipe source. Original payloads remain safely escaped and uninterpreted.

## Deliberate retained terminology

- Historical milestone reports keep their original words and API examples, preceded
  by a terminology note. Historical visual captures retain their original labels;
  the current README uses new captures and labels the older reference preview historical.
- TERMINOLOGY.md and this migration record explain the old-to-new mapping.
- English as a language, locale fallback or grammatical word order remains valid.
- Recipe.source, the ::source marker, source metadata, provenance fields, source
  spans and existing SOURCE diagnostic codes retain their distinct technical meanings.
- Regression tests name the removed API exports only to assert they are absent.
- Private pre-terminology export/tools are preserved as recovery/history evidence;
  the active public export and frozen reproduction plan use canonical terminology.

No stale representation labels remain in current guides/runtime. No recipe, fixture,
canonical vocabulary meaning or grammar change was needed. Corpus traversal now skips
ignored work/build/history directories so private export copies are not counted again.

## Validation

- Private: typecheck, build, 155 tests; 413/413 recipes, zero errors.
- Public: frozen install, typecheck, build, 155 tests; 410/410 recipes, zero errors.
- Both: 756 canonical entries; unchanged 653 corpus warnings.
- Private current guides: 132 relative links across 15 documents; no missing paths.
- Public authored documentation: 566 relative paths; no missing paths.
- README Code parses without diagnostics and generated Compact matches the example.
- Browser: Code, Compact, literal original available, original unavailable/fallback,
  syntax colour on/off and light/dark checked. Current captures are in docs/visual-review/.
- All five public exclusions, licence scopes, Codex attribution, GitHub templates and
  CI remain. No existing Git history is copied; dependencies/build output are removed
  after export validation and the pristine export checker passes.

## Files changed

The private implementation/documentation paths changed or added are listed below.
The renderer module deletion/addition is a rename. The pre-existing private release
audit also received only a historical terminology note. Public-only licences,
release summaries and report scripts were reconciled in the export; its private
allowlist/overlays and reproduction plan were refreshed.

- CONVERSION-ISSUES.md
- CORE.md
- CURATION.md
- DATA-SOURCES.md
- DEMO-DESIGN.md
- DRAFT8-CHANGES.md
- DRAFT8-NOTES.md
- HTML-RENDERER.md
- IMPLEMENTATION-ISSUES.md
- MODEL.md
- PRIOR-ART.md
- PUBLIC-DOMAIN-IMPORT.md
- README.md
- RENDERER-QUALITY-AUDIT.md
- ROADMAP.md
- SPEC.md
- TERMINOLOGY-MIGRATION.md
- TERMINOLOGY.md
- TRANSLATION-REPORT.md
- VALIDATION-DRAFT7.md
- VOCABULARY-REVIEW.md
- VOCABULARY-SCHEMA.md
- demo/app.js
- demo/index.html
- demo/style.css
- docs/README.md
- docs/visual-review/README.md
- docs/visual-review/code-dark-current.jpg
- docs/visual-review/code-light-current.jpg
- docs/visual-review/compact-current.jpg
- docs/visual-review/original-source-current.jpg
- scripts/check-docs.ts
- scripts/corpus.ts
- scripts/demo-server.ts
- scripts/import-public-domain.ts
- scripts/renderer-quality-audit.ts
- scripts/report-public-domain-import.ts
- src/model/index.ts
- src/parser/index.ts
- src/reference/index.ts
- src/renderer/compact.ts
- src/renderer/english.ts
- src/renderer/html.ts
- src/renderer/index.ts
- tests/core.test.ts
- tests/curation.test.ts
- tests/draft8.test.ts
- tests/html.test.ts
- tests/ingredient-knowledge.test.ts
- tests/public-domain-import.test.ts
- tests/renderer-quality.test.ts
- tests/representations.test.ts
- tests/visual-system.test.ts

## Publication handoff

Public export: work/public-release-export/ in the private workspace. It has no .git.
Only the owner's public Git name/email and repository name/URL remain to be chosen
before initialising fresh history and making the first public commit. Creation/push
still requires explicit authorisation. No Tebla deployment is part of this work.
