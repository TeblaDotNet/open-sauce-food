# Public report and evidence scope

Prepared 8 October 2026. Current public counts: 410 recipes and 756 canonical entries.
This export is a reviewed subset, not the complete private development archive.
Original reports remain privately preserved. Excluded recipe files and assets are
listed only in [the compact exclusion record](release-exclusions.json).

| Root document/report | Public treatment |
|---|---|
| `CONTRIBUTING.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `CONVERSION-ISSUES.md` | Omit: private historical report, source excerpts or superseded validation |
| `CORE.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `CORPUS.md` | Replace/update: public-subset summary and current policy |
| `CURATION.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `DATA-SOURCES.md` | Replace/update: public-subset summary and current policy |
| `DEMO-DESIGN.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `DRAFT8-CHANGES.md` | Replace/update: public-subset summary and current policy |
| `draft8-migration.json` | Filter: retain included records and historical hashes only |
| `DRAFT8-NOTES.md` | Replace/update: public-subset summary and current policy |
| `EXPANSION-MANIFEST-100.md` | Omit: private historical report, source excerpts or superseded validation |
| `HTML-RENDERER.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `IMPLEMENTATION-ISSUES.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `ISSUES.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `LEGACY-VOCABULARY-EVIDENCE.md` | Omit: private historical report, source excerpts or superseded validation |
| `MANIFEST.md` | Regenerate: current public subset |
| `MODEL.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `package.json` | Update: pinned toolchain and licence scope pointer |
| `pnpm-lock.yaml` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `PRIOR-ART.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `public-domain-conversion-mapping.json` | Include: conversion mappings for the 293 included generated encodings |
| `public-domain-import-checks.json` | Omit: private historical report, source excerpts or superseded validation |
| `PUBLIC-DOMAIN-IMPORT-FILES.txt` | Omit: private historical report, source excerpts or superseded validation |
| `public-domain-import-validation.json` | Regenerate: current public subset |
| `public-domain-import.json` | Filter: retain included records and historical hashes only |
| `PUBLIC-DOMAIN-IMPORT.md` | Regenerate: current public subset |
| `public-domain-vocabulary-candidates.json` | Regenerate: current public subset |
| `PUBLIC-RELEASE-AUDIT.md` | Omit: private historical report, source excerpts or superseded validation |
| `QUANTITY-PRECISION-PROPOSAL.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `README.md` | Replace/update: public-subset summary and current policy |
| `RELEASE-CHECKLIST.md` | Replace/update: public-subset summary and current policy |
| `renderer-quality-audit.json` | Regenerate: current public subset |
| `RENDERER-QUALITY-AUDIT.md` | Replace/update: public-subset summary and current policy |
| `ROADMAP.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `SOURCE-NOTES.md` | Omit: private historical report, source excerpts or superseded validation |
| `SPEC.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `TRANSLATION-REPORT.md` | Omit: private historical report, source excerpts or superseded validation |
| `tsconfig.build.json` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `tsconfig.json` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `VALIDATION-DRAFT7.md` | Omit: private historical report, source excerpts or superseded validation |
| `VOCABULARY-CANONICALISATION-REPORT.md` | Omit: private historical report, source excerpts or superseded validation |
| `VOCABULARY-CANONICALISATION-RULES.yaml` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `VOCABULARY-CANONICALISATION.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |
| `VOCABULARY-DELTA.md` | Omit: private historical report, source excerpts or superseded validation |
| `VOCABULARY-INVENTORY.md` | Omit: private historical report, source excerpts or superseded validation |
| `vocabulary-review-baseline.json` | Filter: retain included records and historical hashes only |
| `vocabulary-review-decisions.json` | Include: historical canonical decisions; no excluded recipe expression |
| `vocabulary-review-results.json` | Regenerate: current public subset |
| `vocabulary-review-validation.json` | Omit: private historical report, source excerpts or superseded validation |
| `VOCABULARY-REVIEW.md` | Regenerate: current public subset |
| `VOCABULARY-SCHEMA.md` | Include: useful guide/configuration or historical evidence; dated counts are historical |

The filtered migration ledger covers 117 earlier encodings (98 embedded originals).
The vocabulary baseline retains 410 included-recipe hashes and the original 906
candidate observations from 293 generated recipes. Those 293 recipes are unchanged.
The regenerated candidate queue has 858 entries across the public corpus; comparing
that with the 906-item historical queue does not measure resolved items.

Canonical entries are unchanged in identity/meaning. Excluded recipe citations are
removed from evidence; affected historical occurrence counts are omitted instead of
pretending they are current counts. Live reference usage is computed from the public
recipes. The raw draft6 seed is retained for independent observation loading/testing;
its excluded citations are filtered. The three current-120 aggregate files are omitted
because they mix private historical recipe evidence. No BBC stress-test recipes,
images or archives are included; generic legacy observations remain labelled historical.

Additional intentional omissions:

- Historical scripts/import-public-domain.ts and scripts/migrate-draft8.ts:
  these operate on the full private evidence set. Conversion helpers and report
  generators remain available. Validation and demo use require no upstream checkout.
- vocabulary-raw/current-120/ingredient.yaml, equipment.yaml and process.yaml:
  superseded private aggregates.
- The private release audit, old check snapshots and changed-file lists are omitted;
  [RELEASE-VALIDATION.md](RELEASE-VALIDATION.md) records checks of this export.
- Git history, internal refs, dependency/build folders, scratch imports, archives
  and private Work/Codex material are never copied.

Source notice snapshots and included retained originals remain. Three public author
records omit email fields; attribution names remain. No private original was changed.
Imported source Markdown is intentionally verbatim, including upstream-relative links.
Authored public documentation links are checked separately.

Reports can be reproduced using the included report scripts and retained public
manifests. The private export builder uses a reviewed file allowlist, per-file hashes
and public-only overlays, refuses a nonempty destination, and never copies a whole
checkout. The builder and its private inventory are not distribution content.
