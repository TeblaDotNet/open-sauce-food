# Curation status

Curation describes two independent properties of the current Open Sauce Food artifact:

| Property | Values | Meaning |
|---|---|---|
| origin | generated | Mostly produced by AI or an automatic conversion tool. |
| origin | human | Written directly by a person. |
| origin | imported | Imported substantially as-is from another structured source. |
| origin | mixed | Meaningful combination of human and generated/imported work. |
| review | unchecked | No deliberate human correctness/quality review yet. |
| review | checked | A human deliberately reviewed the current substantive content and considers it reasonable/correct. |

`generated + checked` and `human + unchecked` are both valid. Checked is not
independent scientific verification, safety certification, or a guarantee of
correctness. Passing tests, parser validity, AI review and incidental manual edits
do not establish human review. Substantive edits to a checked artifact should
reset its review to `unchecked`.

Git history remains the authoritative audit trail for who changed or reviewed an
artifact. Detecting changes since review may be future tooling; no Git-aware
stale-review detection is implemented here.

## Recipe encoding metadata

```text
::recipe
curation origin: generated
curation review: unchecked
name: Example
```

These existing metadata fields describe the `.opensauce` encoding, not authorship
of the underlying recipe. A generated transcription of a historical recipe does
not mean that the historical recipe was AI-authored. `::source`, source author,
licensing and provenance remain independent and unchanged.

## Vocabulary entries

Ingredients, equipment and processes may carry this optional top-level mapping:

```yaml
curation:
  origin: generated
  review: unchecked
```

When present, both properties are required. Absence means unknown/legacy; it
does not imply human authorship or checked status. Existing `status` and evidence
fields have different meanings and are not converted into review claims.

`Recipe.curation`, `VocabularyEntry.curation` and `ReferencePage.curation` expose
the model. `readCuration` validates it. Invalid or incomplete values generate
`INVALID_CURATION` warnings through recipe diagnostics or `Vocabulary.diagnostics`;
they do not crash loading. Original recipe metadata and raw YAML-loaded values
remain available, but malformed values do not become validated reference badges.
Reference pages show a restrained curation label; recipe HTML labels it explicitly
as encoding curation. Code/source representations preserve metadata.

## Contributing a review

Design discussion is the [current contribution focus](CONTRIBUTING.md). Individual
entry reviews and bulk data curation are not the priority while the model is still
changing; discuss substantial review work in an issue or discussion first.

For an agreed review, or once the foundations settle, a PR can change
`review: unchecked` to `review: checked` after deliberately reviewing the entry's
substantive content. Explain what was reviewed and keep its origin unchanged unless
correcting the origin itself.

## Initial migration

293 recipes identified as generated conversions in `public-domain-import.json`
received `generated / unchecked`. Removing exactly those two metadata lines
reproduces their recorded pre-migration hashes; source payloads are untouched.
The historical import manifest remains an audit of that import, not a current
content-hash registry. The importer emits the same metadata on future generation.

At that historical migration, the older 120 recipe encodings and all 732 canonical vocabulary entries remained
without curation metadata: their current artifacts do not establish an individual
origin confidently enough to label them here. A bulk commit, canonical status,
source authorship or past tooling work alone is insufficient evidence. No entries
were marked checked, no candidate terms were processed, and no grammar changed.


The public subset retains 117 of those older encodings and all 293 generated conversions.
At the later [vocabulary review checkpoint](VOCABULARY-REVIEW.md), it had 756 canonical entries.
That is a historical count; see the [README current status](README.md#current-status) for current totals.

## Conversion maturity is separate

Recipe `conversion stage: initial | reworked | blocked` records restructuring
maturity, not human review. Only reworked recipes enter normal static-site browsing.
Generated/unchecked recipes may be reworked; checked recipes may remain initial.
See [RECIPE-PUBLICATION.md](RECIPE-PUBLICATION.md).
