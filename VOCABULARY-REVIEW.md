# Canonical vocabulary review — pass 1

This generated review is not deliberate human culinary checking. No entry is marked checked. Recipes and source payloads are unchanged.

## Measured results

| Kind | Before | After |
|---|---:|---:|
| ingredient | 415 | 433 |
| equipment | 116 | 119 |
| process | 201 | 204 |

Added 23 lexical aliases, 13 explicit plural forms, 8 local variants and 15 local parts. No new part groups or numerical knowledge.

Original report: **906** candidate term/category pairs from **293** recipes. Current report: **858** pairs from **410** recipes. These totals have different coverage and classification; their difference is not a resolved-item count.

The original baseline is reconciled individually below; none disappears merely because a heuristic relabelled it:

- left uncertain: **841**
- resolved by alias/plural: **22**
- resolved by new concept: **27**
- resolved by variant/part relationship: **14**
- already supported relationship: **2**

Current remaining counts retain preparation phrases, malformed amounts, compounds and cross-kind confusion as review work, not new canonical concepts. Known explicit parts/variants remain observations but leave the candidate queue.

## Accepted changes

- New ingredient concepts: allspice, beer, shallot, radish, arugula, buttermilk, liquid-smoke, fennel-seeds, peanut, pecan, ricotta, turkey, asparagus, buckwheat, brandy, bourbon, feta, clementine.
- New equipment concepts: thermos, steaming-basket, stand-mixer.
- New process concepts: shake, tear, wait.
- Existing aliases/plurals and every local relationship are listed in `vocabulary-review-decisions.json`, including Parmesan → parmesan-cheese, potatoes → potato, bay leaves → bay-leaf, and wisk → whisk.
- New files are generated/unchecked. Existing curation is retained; checked content would be reset if edited. Old evidence counts remain historical; indexes now identify the 410-recipe review scope.
- Local variants are names/aliases only, with no inheritance or automatic flattening of compound names. Existing standalone ingredient IDs remain valid. Parts do not become whole-ingredient aliases.

## Remaining human-review queue

Examples below are deliberately unresolved. The complete queue, recipes and source examples are in `vocabulary-review-results.json` and `public-domain-vocabulary-candidates.json`.

### ambiguous compound ingredient (147)

- + 1/2 tsp lime juice: fajitas.
- + 2 1/2 tbsp butter: smoked-salmon-quiche.
- and smashed ginger: yibin-burning-noodles.
- basil and grated parmesan: pesto-chicken-quinoa-bowls.
- beef or chicken stock — /chicken-stock-bone-broth: beef-stew.
- beef or turkey: taco-meat.

### equipment/process confusion (7)

- butter: cheesy-potatoe-bake, pork-based-chili-con-carne.
- cheesecloth: cheese, cream-cheese, ricotta.
- grease: maque-choux.
- jar: kvass, limoncello, sauerkraut.
- plate: chicken-paprikash, full-english-breakfast.
- sieve: garam-masala, quiche.

### likely new ingredient concepts (291)

- adobo goya all purpose: chicharrones.
- alkaline noodles: yibin-burning-noodles.
- almond meal: tarta-de-santiago.
- alum: spiced-cantaloupe.
- andouille: shrimp-and-chicken-jambalaya.
- anglerfish: fried-anglerfish-fillet.

### likely variants (269)

- + 2 tablespoons cold whole milk: cinnamon-biscuits.
- about 50 g grated parmigiano cheese: stuffed-vegetables.
- active dry - yeast: bolo-do-caco.
- adobo honey seasoning: nashville-chicken.
- ample amount of chopped parsley: tiroler-groestl.
- anchovies in oil: spaghetti-alla-puttanesca.

### malformed/source-specific phrase (27)

- ...really whatever you like: pan-pizza.
- 00 flour: ravioli.
- 00 or 0 flour: limoncini.
- any ingredients you want. ie: quesadilla.
- any other vegetables you want: chimichanga.
- bag coleslaw mix: eggroll-in-a-bowl.

### new process candidates (11)

- allow: chicken-soup, chorizo-and-chickpea-soup, okonomiyaki.
- bring: aussie-snags, baked-mostaccioli, bebek-mropol.
- enjoy: apple-chicken, ardei-umpluti, dou-sha-bao.
- hang: greek-yogurt.
- incorporate: banana-oatmeal-cookies.
- leave: greek-yogurt, scouse, yogurt.

### possible culinary part group (2)

- egg: yolk + white: butter-cake, omelet, tiramisu.
- lime: zest + juice: fall-vegetable-and-chickpea-curry.

### possible part (5)

- basil leaves: chipolata-in-balsamic-vinegar, ragu-napoletano, wholemeal-pizza.
- broccoli florets: tofu-and-cashew-chow-mein.
- garlic clove: fondue.
- garlic cloves: almeirim-stone-soup, asian-style-chicken-sticky-sauce, cheesy-meatballs.
- oregano leaves: tomato-flavored-hamburger-macaroni.

### recurring preparation/state phrase (67)

- black pepper freshly grounded: brown-sauce.
- boneless chicken breast: coriander-chicken.
- boneless skinless chicken: exotic-ginger-cumin-chicken.
- boneless skinless chicken breast: roasted-chicken-breast.
- boneless skinless chicken breasts: chicken-tikka-masala, simple-chicken-curry.
- caned adobo chilies chopped: loaded-mexican-rice.

### requires culinary judgement (15)

- boiled potatoes in there skin: sourdough-potato-bread.
- bunch collard greens chopped into ribbons: collard-greens-with-smoked-duck-and-parnips.
- condensed cream of chicken soup: chicken-biscuit-potpie.
- curry powder of your favourite variety: chicken-tomato-spinach-curry.
- envelope buttermilk ranch salad dressing mix: diannes-southwest-salad.
- green cabbage cut into ribbons: collard-greens-with-smoked-duck-and-parnips.

### strong part relationship (6)

- beef: kidney (review existing compound concept): beef-kidney.
- beef: liver (review existing compound concept): beef-liver-and-onions.
- chicken: breast (review existing compound concept): cheddar-crusted-chicken, chicken-parmesan, chicken-satay.
- chicken: fillet: pan-seared-chicken.
- chicken: thigh (review existing compound concept): chicken-satay, lemon-and-oregano-chicken-traybake, spicy-kung-pao-style-chicken.
- pork: shoulder (review existing compound concept): pork-carnitas.

### strong variant/type relationship (11)

- chocolate; dark: banana-muffins-with-chocolate.
- chocolate; milk: banana-muffins-with-chocolate.
- flour; bread: chocolate-chip-cookies, puff-pastry, sourdough-loaf.
- flour; rye: sourdough-loaf, sourdough-starter.
- flour; wheat: banana-muffins-with-chocolate, fall-vegetable-and-chickpea-curry, sourdough-starter.
- onion; red: ceviche, fish-curry.

## Deliberate limits and future questions

- Garlic cloves should refer to the garlic clove part, not a new ingredient or a whole-garlic synonym. The local part is recorded; compound-to-part alias resolution remains future model work. The same issue applies to broccoli florets and existing chicken-breast compound entries.
- Thermometer and cheesecloth remain equipment. Thermos is new equipment. References classified through equipment declarations no longer become ingredient candidates; genuinely misplaced/undeclared terms stay in the cross-kind queue.
- Feta is a distinct ingredient; feta cheese is its alias, never an alias for generic cheese. Chop, dice and mince remain distinct.
- “slowly add” retains manner; “sieve” may mean sift or strain; “let”, “bring”, “take” and “enjoy” are not blindly promoted or equated to cooking operations.
- “whatever you like”, package text, unspecified cheeses and compound alternatives are not concepts. Preparation adjectives are review hints, never automatic aliases.
- Variant versus standalone-concept migration and scope-aware compound-to-part references need a separate design; no grammar change is required or made here.

## Reproduction and verification

Run `node scripts/report-public-domain-import.ts` then `node scripts/report-vocabulary-review.ts`. These rebuild reports without editing YAML. The baseline and decision files preserve this pass independently of later reports.
Run `pnpm check`, `pnpm build`, `pnpm test` and `pnpm corpus`. Tests generate every canonical reference model/page, check aliases and local structures, reject malformed variants, and compare all 410 recipe hashes with the pre-review baseline.

This is a public-subset regeneration of the historical review; see RELEASE-VALIDATION.md for release checks.

## Ingredient relationship model v1

The later relationship pass adds `type_of` support and only two data edges:
`wheat-flour → flour` and `olive-oil → oil`. Both children keep independent pages
and usage counts. Existing egg yolk/white and lemon juice local parts demonstrate
part anchors and per-part backlinks without changing recipe bytes or removing
standalone entries. See [VOCABULARY-SCHEMA.md](VOCABULARY-SCHEMA.md) for semantics.

Self-raising flour has no standalone canonical entry yet; its current local
variant is retained, with an independent family-linked page the intended future
model. Egg-yolk/egg-white, lemon-juice/lemon-peel/lemon-wedge, chicken cuts and
other compound overlaps remain deferred. Fresh/bottled lemon juice belong to the
same conceptual Lemon → Juice product; this pass does not silently redirect the
standalone ID. No bulk enrichment or new checked curation claims are made.
