# Proposal: precision belongs to the quantity

**Notation promoted in Draft 8.** `!`, `~`, `~~` and unspecified precision are
implemented as quantity-expression annotations. SPEC section 43 is authoritative.
The original discussion below is retained; conversion, numerical tolerances,
rounding algorithms and fully nonnumeric quantity analysis remain future work.

Proposed notation:

```text
!100g  = accurate / measure closely
~100g  = approximate
~~100g = very approximate
```

The marker qualifies the complete quantity expression, not the ingredient:

```text
(flour) !500g
(salt) !10g
(water) ~325g
(olive oil) ~~1tbsp
```

`!` would express the author's instruction to measure closely. It would not
guarantee laboratory accuracy or establish a numerical error bound. `~~` would
express greater tolerance, without inventing a percentage. An unmarked quantity
would remain unspecified; absence of a marker must not be interpreted as exactness.

A future quantity model should keep the original expression, precision category,
and provenance of any conversion separate from its numeric representation. Keep
markers attached to amounts when ingredients are repeated or divided into roles.

Conversion and scaling must never imply greater precision than the source.
An approximate source amount must remain approximate after conversion; display
rounding should avoid a falsely precise decimal. Ingredient-dependent density or
count conversions can introduce more uncertainty, even for a source marked `!`.
The effective display precision must account for both source intent and conversion
data, retaining the original source expression for inspection. No density values,
tolerances, rounding algorithms, or conversion rules are added in this milestone.

Questions for a future language decision:

- Does a marker before a range apply to the entire range? Proposed answer: yes.
- How should precision interact with equivalent expressions separated by `/`?
  Each source expression may have its own precision; conversion must not upgrade it.
- How are mixed fractions, relative portions, and non-numeric amounts marked?
- What display rounding best expresses each category in each unit system?
- How should a conversion that weakens an author's `!` requirement be presented?
- Is `!` sufficiently distinct from the existing `![alt](path)` image syntax?

The existing `~` semantics remain unchanged. Current tokenization of literal
`!` or consecutive `~` characters does not constitute support for this proposal.
