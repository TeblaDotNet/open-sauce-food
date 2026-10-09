# Recipe conversion stage and public visibility

Corpus membership, conversion maturity, human review and public visibility are
separate. All 410 recipes remain in the repository and generated direct pages.
The public site normally lists 216 reworked recipes; 184 initial and 10 blocked
recipes remain available by direct URL with noindex and a development notice.
This is representation maturity, not a culinary safety or quality verdict.

## Metadata and API

In the existing recipe metadata section:

```opensauce
::recipe
conversion stage: reworked
curation origin: generated
curation review: unchecked
```

- initial: earlier or incomplete restructuring, including historical examples
  that do not yet meet current publication expectations.
- reworked: a later substantive Sauce Code restructuring accepted for normal
  public browsing.
- blocked: a later rewrite was deferred because source ambiguity prevented safe
  completion; the earlier representation is retained.

The parser exposes optional Recipe.conversionStage. Missing means unknown, never
implicitly reworked. Unknown or duplicate values remain in the source and receive
INVALID_CONVERSION_STAGE warnings, consistent with curation metadata. The static
site requires one valid stage on every corpus recipe and fails closed otherwise.
No recipe grammar or culinary interpretation changes. Curation origin/review is
independent; reworked does not mean human checked. Publication uses isPublished,
which requires reworked, never a numeric audit threshold.

## Classification evidence

The initial classification uses generated-reconversion-v2-deep.json: 182 accepted
deep rewrites and 34 protected earlier accepted rewrites become reworked, 178
pending recipes remain initial and 10 source-blocked recipes remain blocked.
The six historical protected examples were independently examined in Code,
Original source, Compact and the current quality audit. They are not grandfathered:

| Historical example | Current stage | Main reasons / deferred work |
| --- | --- | --- |
| Orange Glorious | initial | Package-shaped identities and loose glasses destination; modernise ingredient/context and smoothness expression despite a clean numeric audit. |
| Bloody Mary Mix | initial | Generic fruit identity, undeclared pitcher and source's unused steak sauce; reconcile declarations and explicit actions without inventing a use. |
| Chicken Tikka Masala | initial | First-13-ingredients placeholder, prose actions, implicit intermediates and bundled timing/end conditions. |
| Smoked Salmon Pasta Primavera | initial | Unstructured edamame/peas alternative, raw edamame use, combined cook/stir token and prose assembly. |
| Hakka-Style Meatballs | initial | Useful later structure exists, but measured water/salt and pan remain undeclared, and several contexts/results remain raw. |
| Ravioli | initial | Useful alternatives and judgements exist, but commentary/serving advice, redundant narration and assembly choices need current prose/structure treatment. |

These are conversion decisions, not human-review promotions. None is repaired in
this pass. Bloody Mary's source discrepancy is recorded for review; it does not
by itself establish that a complete rewrite was attempted and blocked. Historical
reports retain their historical gold labels solely as provenance.

recipe-publication-decisions.json records this migration's decisions and baseline
content hashes for audit. It is not a runtime publication allowlist. The recipe's
current metadata is authoritative; later work may change initial to reworked after
substantive review/restructuring, independently of curation review.

## Site behavior

Only reworked recipes enter indexes, tag/category discovery and public reference
backlinks/counts. Facets with no published recipes are omitted. All canonical
reference pages remain; zero public uses is valid. Part backlinks use the same
published subset. Public counts exactly match visible links.

All 410 direct recipe pages still build. Initial/blocked pages have a robots
noindex meta tag and a modest notice describing their development status. Noindex
is not authentication: these files and source are public. No parent server routing
or robots blocking rules are added. The manifest retains all generated recipes and
their stages for validation/tooling; it is not a user-facing discovery list.

The local development demo and buildUsageIndex remain capable of examining the
whole corpus. Public filtering happens at static-site generation, not in the
shared reference or parser API. The homepage representative is Stracciatella Soup,
a reworked recipe; the old Mayonnaise or aioli direct page still works but is initial.

## Verification and scope

Metadata-only recipe changes preserve all other bytes, including Original source.
Historical checksum tests explicitly undo this one header field before validating
older provenance; the historical ledgers themselves are unchanged. The full suite
also checks valid/invalid/duplicate stages, independent curation, public discovery,
noindex, all three reference kinds and no accidental public links to hidden pages.

Future scores can guide repair priorities but cannot publish or hide recipes.
There is no gold tier, admin system, new repair pass or deployment in this change.
