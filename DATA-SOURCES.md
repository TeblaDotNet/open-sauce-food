# Data sources and provenance

The public distribution contains **410 recipes**, comprising 117 earlier encodings
and 293 generated conversions. All 293 remain generated / unchecked; absent curation
metadata means unknown. Parser success is not culinary verification or rights clearance.

The source is [Public Domain Recipes](https://github.com/ronaldl29/public-domain-recipes),
pinned to commit `da84378b36bd5b2e3cb35f610d64630bf1bd899d`, retrieved 8 October 2026
(earlier snapshots record 7 October at the same revision). Upstream has 415 recipes
and one index document. Five recipes are excluded from this public distribution.

[Upstream README](source/public-domain-recipes/UPSTREAM-README.md) dedicates website
text and images to the public domain; [upstream licence](source/public-domain-recipes/UPSTREAM-LICENSE.md)
is the Unlicense. [Additional notice snapshots](source/public-domain-recipes/upstream-2026-10-08/)
are retained. A site-wide declaration does not itself establish a complete rights
chain for every third-party adaptation.

## Exclusions and preservation

[release-exclusions.json](release-exclusions.json) records five slugs, upstream URLs
and the reason “provenance review pending”. Their encodings, originals, metadata,
assets and report excerpts are not distributed. This is a conservative publication
decision, not a finding of infringement. Full evidence remains privately preserved.

Included originals, metadata and images remain under their upstream terms.
[Public inventory](public-domain-import.json) preserves source hashes, pin, paths,
conversion decisions and included-source caveats. [Import report](PUBLIC-DOMAIN-IMPORT.md)
and [manifest](MANIFEST.md) describe this public subset. The filtered
[migration ledger](draft8-migration.json) preserves framing-newline/hash evidence.
The 293 generated conversions preserve literal source payloads; no recipe was polished
for release. Original recipe source view is unavailable where an original was not embedded.

Public author records for kombucha, naan-bread and pretzels omit the email field;
names and other supplied attribution remain. Private originals are unchanged.
No replacement contact information is invented.

## Images and cooking claims

Image source/promoted hashes remain in the inventory. Imported images retain upstream
terms; linked external media is not covered merely by a recipe's licence label.
No photographer credit is invented. New images require a documented reuse basis.

Cooking, raw-food, preservation and temperature claims remain unverified source
material. Existing report flags are review queues, not corrected or endorsed guidance.
See [curation](CURATION.md) and [public report scope](PUBLIC-REPORTS.md).

## Licence boundaries and future enrichment

[LICENSING.md](LICENSING.md) separates MIT software, GPL presentation, CC0 project
data, CC BY authored documentation/encoding expression, imported material and OFL fonts.
Neither project licence grants nor curation metadata override third-party rights.

FoodOn, USDA FoodData Central, Wikidata and Open Food Facts are possible future
external sources, not integrated numerical datasets. Any future import needs its own
version, applicable terms, citations and state/unit/uncertainty handling. No external
database is automatically relicensed under the project's CC0 offer.
