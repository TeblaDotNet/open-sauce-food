# Validation results

Validated on 2026-10-07.

- 100 distinct `.opensauce` recipes; none duplicate the existing 20 example slugs.
- 100 unchanged source Markdown documents, verified against the retrieved upstream snapshot by SHA-256.
- 100 presentation-free text views and 100 structured metadata files.
- 38 images decoded successfully; source and recipe copies have identical SHA-256 hashes.
- 61 recipes have no source image reference; the Tzatziki image is unavailable (live URL returned HTML).
- Exact titles, source URLs, stated authors/licence and supplied timing/serving lines checked across all 100 conversions.
- Draft 6 section names, metadata keys, balanced delimiters, block spellings and four-space indentation checked.
- 378 pre-existing project files remain byte-for-byte unchanged, including specification, vocabulary and examples.
- 98 recipe-specific issue entries across 83 recipes.

Status: PASS

These are structural and provenance checks, not an official parser conformance result. Draft 6 is experimental and this project supplies no canonical parser. Ingredient/direction conversions were reviewed against source text, but the recipes have not been cooked or independently safety-validated. Ambiguous source material is documented in [CONVERSION-ISSUES.md](../../CONVERSION-ISSUES.md).
