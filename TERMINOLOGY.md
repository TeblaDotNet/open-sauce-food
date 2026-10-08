# Recipe representations

The authored .opensauce recipe is **Code**. It is the primary/default representation.
**Compact** is a condensed human-readable rendering generated from Code.
**Original recipe source** is retained upstream/original provenance where available;
it is not a rendering of the .opensauce recipe and is never parsed as its syntax.

| Public name | HTML view / URL value | Text API |
|---|---|---|
| Code | code (default) | renderCode(recipe, options) |
| Compact | compact | renderCompact(recipe, options) |
| Original recipe source | originalSource | renderOriginalSource(recipe) |

The view control reads **View as: Code · Compact · Original recipe source**.
When no original is embedded, its control is disabled and navigation falls back to
Code. Syntax colour applies to Code; Compact and Original recipe source remain
neutral. Reference-page semantic colours remain independently useful.

Recipe.source retains the exact authored .opensauce text. renderCode reconstructs
normalised Code from the AST, subject to visibility options; it is not a byte-exact
editor serializer. Section.originalSource stores an opaque original payload, with
text/span/closed fields. The ::source grammar marker, source metadata, diagnostic
codes and general source-provenance vocabulary are unchanged.

Before this migration, Code was called Compact, Compact was called Plain English,
and Original recipe source was called Source. There are no deprecated API or URL
aliases. Current code, documentation and release tooling use the new meanings.
English remains a legitimate language/locale name (en, en-GB, en-US), not a view ID.
Historical milestone reports and screenshots retain their original evidence with
explicit historical labels; current README screenshots use the current controls.
