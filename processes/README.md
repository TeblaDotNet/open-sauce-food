# Open Sauce Food processes

216 canonical entries; current public corpus: 410 recipes.
Use [index.yaml](index.yaml) for lookup, [schema](../VOCABULARY-SCHEMA.md) for fields
and [licensing](../LICENSING.md) for data/evidence boundaries. Evidence is historical;
excluded recipe citations are removed. Counts within historical evidence are not live
usage metrics. Reference pages compute usage from the distributed recipes.

## Reference eligibility

`<...>` marks an action/process token. A public reference page is justified by
**discovery value OR explanation value**: a cook may want to browse recipes using
the technique, or understand the term and how to perform it. Use editorial
judgement for edge cases; frequency alone is not the rule.

`reference: false` preserves canonical IDs, aliases and red/action semantic colour,
but suppresses links, public pages, index entries and reference backlinks.
Unknown/local actions remain valid, coloured and unlinked. `<add>` remains legal
and compatible; prefer `+` for simple combining. No second action syntax is needed.

Tranche 1 adds transfer, pour, reserve, set-aside, serve, arrange, cover and uncover
to the existing non-reference actions add, place and remove. It adds air fry,
hard boil and defrost as lexical aliases, and blanch, braise, julienne, confit,
flambé and render as reference techniques. No recipe text changes are required.

Tranche 2 additionally marks these human-approved actions reference:false:
adjust, assemble, bottle, brush, check, clean, combine, discard, distribute,
divide, drizzle, dust, empty, fill, flip, garnish, grease, halve, keep, keep-warm,
reduce-heat, rinse, sprinkle, taste and turn-off-heat. Drain, line, preheat, rub,
shape, spread and submerge retain reference eligibility.

Reduce means culinary reduction/concentration and remains reference-worthy.
Reduce heat means lowering a burner/oven setting and resolves to the separate
reference:false reduce-heat entry. Three unambiguous authored heat-control heads
were corrected; no context-sensitive runtime resolver was added.

The new reference techniques are pan-fry, microwave, dry-roast, steam-dry,
sun-dry and age. Authored dry roast, steam dry and sun dry resolve through their
English names; no unsupported synonym aliases were added. Age refers to culinary
maturation, evidenced by cheese. Pages remain identity/evidence/usage scaffolds.
Grill and broil remain separate; no barbecue/bbq mapping is added.
