# Public export validation

Validated 8 October 2026 from this public export, using Node.js 24.19.0 and
pnpm 11.25.0 (pinned in package.json). GitHub-hosted CI has not yet run.

| Check | Result |
|---|---|
| pnpm install --frozen-lockfile | Passed; lockfile unchanged, four packages installed |
| pnpm check | Passed |
| pnpm build | Passed |
| pnpm test | 155 passed, zero failed/skipped |
| pnpm corpus | 410/410 recipes, zero errors |
| Corpus warnings | 653 existing warnings: 625 FREE_TEXT, 18 AMBIGUOUS_REFERENCE, 10 UNRESOLVED_REFERENCE |
| Canonical vocabulary | 756 entries: 433 ingredients, 119 equipment, 204 processes |
| Authored documentation relative paths | 566 checked, none missing; upstream source Markdown preserved verbatim |
| README example | Parses without diagnostics; quoted Compact matches renderer |
| Licence texts, links and third-party notices | Present; font and imported-source notices retained |
| Exclusions | No excluded recipe/source/asset paths; excluded identifiers only in compact ledger |
| Privacy / text patterns | No email addresses, machine-specific paths or scanned credential patterns in distribution text |
| Excluded source expression | No matching normalized 14-word sequences from the five retained source Markdown files in export text |

Included recipe bytes and their embedded originals are unchanged. Tests verify the
117 retained earlier recipes, all 293 generated conversions and all 410 recipe hashes.
The public manifest/baselines and report queues reflect the exclusions. Three public
upstream author records omit email fields while retaining names; private copies remain.

Dependency/build directories used for these checks are removed before handoff.
The final pristine tree contains no .git, node_modules, dist, archives, private work
folders or Codex snapshots. A final `node scripts/check-public-release.ts --pristine`
check verifies the source export. After installing dependencies locally, omit
`--pristine` for normal contributor/CI checks.

Pattern and passage matching are bounded checks, not a guarantee about arbitrary
unknown secret formats. They supplement the file allowlist, provenance exclusions
and private history audit. Parser success is not culinary verification.

Largest assets are the two retained baked-rice.webp copies at 4,340,300 bytes each
(source and promoted asset). Total source export is approximately 40.9 MiB. No image
recompression or unrelated corpus edits were made for this release.

Remaining publication setup: choose the public Git author/display name, public email
or GitHub noreply address, and repository name/URL. Then initialise fresh history
and publish only with explicit owner authorisation. No Git initialisation, GitHub
creation/push, or Tebla deployment was performed.

Terminology migration: Code is the default authored representation; Compact is
generated human-readable text; Original recipe source is literal provenance.
Private development validation passed 155 tests and 413 recipes. This public
subset retains 410 recipes and its five exclusions. UI checks covered all three
views, missing-original fallback, syntax colour on/off and light/dark. Current
screenshots replace the README previews; older captures are explicitly historical.
