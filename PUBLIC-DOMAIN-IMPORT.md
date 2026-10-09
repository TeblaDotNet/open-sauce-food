# Public corpus import and review

Current conversion guidance: prefer one action head per `<...>`, `+` for simple
addition in a clear context, and declared structured references for confidently
recognised culinary things. The reusable `method()` helper now retains detected
multi-action sentences as reviewable literal text rather than packing them into
one token. It emits `+` only for exact, unique declared source/destination names;
ambiguous additions retain their legal explicit action form. CQ005/CQ008 provide
advisory review evidence; neither rewrites recipes or invents declarations.
Prose review now distinguishes core instructions, practical side advice (`::notes`),
non-instruction commentary (`#`), and narration made redundant by structure.
Keep useful procedural prose and cook-facing warnings visible. Keywords such as
serve/store/freeze/optional alone never justify relocation.

`method()` adds optional `proseEvidence` for explicit source-line framing; its
existing line/mode/flags and Original text are unchanged. Evidence spans are
UTF-16 offsets within the original argument, including a stripped list prefix.
`proseEvidence(recipe)` in `src/prose-classification.ts` additionally reviews
adjacent groups in parsed instructions. CQ009 suggests notes/comments from explicit
framing; CQ010 identifies matching structural narration and navigation fragments.
Both are score-neutral warnings with text, span, confidence, reason and suggested
destination. A remove suggestion still requires fidelity review. Navigation retains
`instructions` as its destination until equivalent target meaning is verified.
No automatic movement/deletion, branch construction or corpus rewrite is performed.

Detection is intentionally narrow and English-language: personal rule-of-thumb,
version-specific serving, explicit variation/substitution, leftover/long-term storage,
and make-ahead framing. Redundancy requires matching populated alternatives, a
matching preceding action for a Meanwhile introduction, or the identical simple
addition in an immediately following Optional group. Process parameters, comments,
notes, story and Original source are excluded. Unmatched prose stays unclassified.
Historical import records below are unchanged.

Public-release subset, 8 October 2026. This replaces the private full-import report; it does not rewrite that historical evidence.

Pinned upstream: https://github.com/ronaldl29/public-domain-recipes, revision `da84378b36bd5b2e3cb35f610d64630bf1bd899d`.

Public corpus: **410** recipes: 117 earlier encodings and 293 generated/unchecked conversions. Upstream has 415 recipes; five are excluded from this distribution.

See [exclusion record](release-exclusions.json), [licensing](LICENSING.md) and [data sources](DATA-SOURCES.md). Neither parsing nor curation establishes culinary safety or rights clearance.

The public inventory retains hashes and paths for included sources. Migration and vocabulary baselines are filtered historical evidence; live reports describe only this public subset.

Regenerate with: node scripts/report-public-domain-import.ts, then node scripts/report-vocabulary-review.ts. The historical importer is intentionally not distributed: it retains provenance-held material. Do not re-import excluded sources.

Vocabulary review queue: 858 term/category pairs; classification hints are not canonical aliases.

## source ambiguity

- **aelplermagronen**: Method adds butter if needed, salt and optional nutmeg, absent from the formal ingredient list; source numbering skips 6. — Retain method wording without inventing amounts or a missing step.
- **coleslaw**: Mustard powder is listed but not explicitly added in the method; dressing yield exceeds the salad's need. — Keep the ingredient and source method without inventing an addition point or using all dressing.
- **greek-yogurt**: Near-duplicate of yogurt; adds cheesecloth straining for 30 minutes to 4 hours. — Keep as a distinct authored preparation; do not silently merge. Equipment was listed among ingredients and is separated here.
- **wholemeal-wheat-flour-pizza-dough**: Near-duplicate of existing pizza-dough, with different flour, quantities and resting time. — Keep distinct; amounts and flour choice are materially different.
- **yogurt**: Shares most steps with greek-yogurt, which additionally strains the yogurt. — Retain both with an explicit near-duplicate relationship.

## syntax/representation question

- **dou-sha-bao**: Baking paper appears in the ingredient list; package and parenthetical alternate measures are mixed. — Separate paper as equipment; preserve parenthetical measures without asserting exact equivalence.
- **eggs**: Four independent egg preparations are presented as subsections. — Keep the four methods as alternative blocks, not one sequential recipe.
- **modern-borscht**: Prep Directions and Cooking Directions overlap in time; source delays potatoes and cabbage until later simmer stages. — Preserve both subsection headings and timing instructions; do not execute all preparation up front.

## provenance/licensing

- **coleslaw**: Contributor says the recipe came from a closed local chili restaurant, without identifying copied text. — Record attribution for review; rely on contributor's upstream dedication, with no asserted independent rights verification.
- **russian-1000-islands-sauce**: Source says recipe taken from a Russian monastery; no identified publication or copying claim. — Retain provenance note; upstream dedication is the available redistribution evidence.

## quantity/unit oddity

- **aelplermagronen**: 10. Season to taste. (Needs quite a bit of salt). Nutmeg also works well here. — Preserve literal source quantity; no conversion or numeric estimate.
- **aglio-e-olio**: 7. At the very last second add the parsley, to preserve its freshness. Adjust the seasoning to taste if necessary. — Preserve literal source quantity; no conversion or numeric estimate.
- **air-fryer-zucchini**: - Pinch of season salt — Preserve literal source quantity; no conversion or numeric estimate.
- **almeirim-stone-soup**: 1. In a saucepan, boil the kidney beans with the pig's ear, sausages, pork belly, onions, garlic and bay leaf in some water and add a well-washed stone. Season with the olive oil and salt and pepper to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **apple-chicken**: - One glass (33c) of wine or cognac. — Preserve literal source quantity; no conversion or numeric estimate.
- **assam-tea**: 4. Add sugar and milk to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **baked-rice**: - Salt to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **basic-meatballs**: - Salt and pepper to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **batter-pudding**: - Eight table-spoonfuls of sifted flour. — Preserve literal source quantity; no conversion or numeric estimate.
- **batter-pudding**: - A spoonful of salt. — Preserve literal source quantity; no conversion or numeric estimate.
- **beef-jerky**: - ¾ tsp. salt — Preserve literal source quantity; no conversion or numeric estimate.
- **beef-jerky**: - ¼ tsp. pepper — Preserve literal source quantity; no conversion or numeric estimate.
- **beef-jerky**: - ¼ tsp. garlic — Preserve literal source quantity; no conversion or numeric estimate.
- **beef-jerky**: - ¼ tsp. Liquid Smoke — Preserve literal source quantity; no conversion or numeric estimate.
- **beef-jerky**: - Other common seasonings may include (¼ tsp. of) cayenne pepper, cheese powder, and/or white pepper — Preserve literal source quantity; no conversion or numeric estimate.
- **beef-jerky**: 3. Slice beef into ¼" (½ cm) thick strips. Small chunks, about ¾" (2 cm), of stewing beef may also be used. If possible, cut along the grain of the meat rather than across it. It may be easier to freeze the meat before attempting to cut it, as this will stop the meat pulling and deforming so easily. — Preserve literal source quantity; no conversion or numeric estimate.
- **beef-kidney**: 6. add 2 glasses of dry white wine — Preserve literal source quantity; no conversion or numeric estimate.
- **beef-kidney**: 7. add half a glass of water so that the mixture is well-bathed — Preserve literal source quantity; no conversion or numeric estimate.
- **belgian-pear-syrup**: - a small handful of dates, raisins, dried apricots or prunes (optional -- you can experiment with these; they can bring out some nice flavors.) — Preserve literal source quantity; no conversion or numeric estimate.
- **belgian-pear-syrup**: - 1 glass of water — Preserve literal source quantity; no conversion or numeric estimate.
- **belgian-pear-syrup**: - glass jar — Preserve literal source quantity; no conversion or numeric estimate.
- **belgian-pear-syrup**: 2. Place the fruit in a large pan with a thick bottom so you get even heat. I suggest you place the pears on the bottom, since they don't burn as fast. Add the glass of water. — Preserve literal source quantity; no conversion or numeric estimate.
- **belgian-pear-syrup**: 5. At this point, you can boil your glass jars to sterilize them. Place the sterilized jars on a clean, dry towel. — Preserve literal source quantity; no conversion or numeric estimate.
- **bolo-do-caco**: - 1¾ lb sweet potato — Preserve literal source quantity; no conversion or numeric estimate.
- **bolo-do-caco**: - ⅔ cup water (warm at 75F / 35C) — Preserve literal source quantity; no conversion or numeric estimate.
- **bread-pudding**: 2. Grate as much crumb of stale bread as will weigh a quarter of a pound. Beat the eggs, and when the milk is cold, stir them into it in turn with the bread and sugar. Add the lemon-peel, and if you choose, a table spoonful of rosewater. — Preserve literal source quantity; no conversion or numeric estimate.
- **brigadeiro**: - One can of condensed milk. — Preserve literal source quantity; no conversion or numeric estimate.
- **butter-biscuits**: - A salt-spoonful of salt. — Preserve literal source quantity; no conversion or numeric estimate.
- **cacio-e-pepe**: 1. Cook your chosen amount of spaghetti 3-4 minutes under the time on the package — Preserve literal source quantity; no conversion or numeric estimate.
- **cacio-e-pepe**:    according to the directions on the package or however you usually do it. See &#91;Pasta&#93;(/pasta). — Preserve literal source quantity; no conversion or numeric estimate.
- **cannellini-bean-salad**: 2. Add diced tomatoes, seasonings, and salt and pepper to taste. Simmer for 3 minutes. — Preserve literal source quantity; no conversion or numeric estimate.
- **cannellini-bean-salad**: 3. Add the beans, season to taste, mix until combined, and simmer for an additional 2 minutes. — Preserve literal source quantity; no conversion or numeric estimate.
- **cheesy-meatballs**: * 8 spoonfuls of tomato paste — Preserve literal source quantity; no conversion or numeric estimate.
- **cheesy-meatballs**:     oregano and basil, and ground black pepper; and salt to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **cheesy-potatoe-bake**:     6. Salt and Pepper to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **chicken-paprikash**: - salt to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **chicken-paprikash**: - pepper to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **chicken-paprikash**: 10. With a fork, test to see that the chicken is tender. Add salt and pepper to taste afterwards. — Preserve literal source quantity; no conversion or numeric estimate.
- **chicken-pasta-casserole**: 4. Add chicken and pasta into a casserole dish. Mix together. Add diced tomato and shredded mozzarella cheese and keep mixing. Top with parmesan cheese and bread crumbs for an even coat. Add about a spoonful of butter evenly on the top. — Preserve literal source quantity; no conversion or numeric estimate.
- **chorizo-and-chickpea-soup**: 3. Allow to boil for 5 or so min. Add Parsley and then salt to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **cinnamon-biscuits**: - 1 stick (½ cup / 113g) unsalted butter — Preserve literal source quantity; no conversion or numeric estimate.
- **cinnamon-biscuits**: - 2½ teaspoons (12g) baking powder — Preserve literal source quantity; no conversion or numeric estimate.
- **cinnamon-biscuits**: - ½ tablespoon (4g) ground cinnamon — Preserve literal source quantity; no conversion or numeric estimate.
- **cinnamon-biscuits**: - ½ cup + 2 tablespoons (150ml) cold whole milk — Preserve literal source quantity; no conversion or numeric estimate.
- **cinnamon-biscuits**: - 4 tablespoons (½ stick / 57g) unsalted butter (for glaze) — Preserve literal source quantity; no conversion or numeric estimate.
- **cinnamon-biscuits**: - ¼ cup (50g) granulated sugar (for glaze) — Preserve literal source quantity; no conversion or numeric estimate.
- **cinnamon-biscuits**: 2. In a large bowl, whisk together the flour, 2 tablespoons sugar, baking powder, salt, and ½ tablespoon cinnamon. — Preserve literal source quantity; no conversion or numeric estimate.
- **cinnamon-biscuits**: 9. While biscuits bake, melt the 4 tablespoons of butter for the glaze. Mix ¼ cup sugar with 1 teaspoon cinnamon in a small bowl. — Preserve literal source quantity; no conversion or numeric estimate.
- **coconut-flour-bread**: - ¾ cup Coconut Flour — Preserve literal source quantity; no conversion or numeric estimate.
- **coconut-flour-bread**: - Pinch of Salt — Preserve literal source quantity; no conversion or numeric estimate.
- **coconut-flour-bread**: - ½ tsp or less of Xanthan Gum (optional, to have a more stick bread) — Preserve literal source quantity; no conversion or numeric estimate.
- **collard-greens-with-smoked-duck-and-parnips**: This dish was a pandemic leftover invention loosely inspired by Ethiopian gomen. It can be served as a side dish, but we eat it an an entree. If you intend it as a side dish, then this serves 4. The smoked duck adds a bit of saltiness, so it's better to season to taste after cooking. Serve with good quality, crusty bread. — Preserve literal source quantity; no conversion or numeric estimate.
- **cooked-chickpeas**: 2. Cook over medium-high heat for 10-15 minutes. Salt and pepper to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **coriander-chicken**: 5. Into this chicken mixture add 1 tbsp Garam Masala and salt to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **coriander-chicken**: 12. Add salt to taste and keep stirring the chicken to make sure it does not burn or stick to the bottom of the pan. — Preserve literal source quantity; no conversion or numeric estimate.
- **corn-salsa**: - Few pinches of Cilantro, finely chopped — Preserve literal source quantity; no conversion or numeric estimate.
- **corn-salsa**: - Salt and pepper, to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **country-skillet**: * ½ an onion* — Preserve literal source quantity; no conversion or numeric estimate.
- **creamy-mashed-potatoes**: 7. Add some salt, black pepper and garlic powder to taste and continue mashing — Preserve literal source quantity; no conversion or numeric estimate.
- **croutons**: 2. In a large bowl combine olive oil, spices, and bread squares and gently mix to thoroughly season bread.  Spices can be anything but I recommend oregano, paprika, black pepper, garlic powder or freshly minced garlic, and a small pinch of cayenne. — Preserve literal source quantity; no conversion or numeric estimate.
- **cuca-italiana**: - A pinch of nutmeg — Preserve literal source quantity; no conversion or numeric estimate.
- **cuca-italiana**: 1. Add the sifted flour, the nutmeg and a pinch of salt into a bowl. In another one, add the sugar, the warm water, the fat of choice, the yeast and the vanilla essence. — Preserve literal source quantity; no conversion or numeric estimate.
- **danish-pancake**: - 1 ½ tablespoon sugar — Preserve literal source quantity; no conversion or numeric estimate.
- **demi-glace**: These are the basic proportions -- multiply as needed. I typically multiply by six to give me several weeks worth of demi-glace ice cubes. — Preserve literal source quantity; no conversion or numeric estimate.
- **demi-glace**: - 1 1/4 oz (7g) packet **unflavored, unsweetened** gelatin — Preserve literal source quantity; no conversion or numeric estimate.
- **diannes-southwest-salad**: - 1 (6-ounce) package Mexican cornbread mix — Preserve literal source quantity; no conversion or numeric estimate.
- **diannes-southwest-salad**: - 1 (8-ounce) package shredded Mexican four-cheese blend — Preserve literal source quantity; no conversion or numeric estimate.
- **diannes-southwest-salad**: 1. **Prepare** cornbread according to package directions, cool, and crumble. Then set aside. — Preserve literal source quantity; no conversion or numeric estimate.
- **diannes-southwest-salad**: 2. **Prepare** salad dressing according to package directions. — Preserve literal source quantity; no conversion or numeric estimate.
- **dominican-spaghetti**: - ¼ cup Evaporated Milk — Preserve literal source quantity; no conversion or numeric estimate.
- **dominican-spaghetti**: 3. Add seasonings and black pepper to taste. Mix until well combined. — Preserve literal source quantity; no conversion or numeric estimate.
- **dou-sha-bao**: 4. Put the bean paste in a low-heated pan with 150g (~ 5oz) sugar and a pinch of salt. Stir continuously to dry up the paste during around 10 minutes and let it cool. — Preserve literal source quantity; no conversion or numeric estimate.
- **dou-sha-bao**: 5. In a salad bowl, stir the flour, the rest of sugar (~ 50g / 1.7oz), a pinch of salt, the baking powder and baker's yeast. — Preserve literal source quantity; no conversion or numeric estimate.
- **dried-tomato-plum-spread**: - pinch of dried coriander (optional) — Preserve literal source quantity; no conversion or numeric estimate.
- **dried-tomato-plum-spread**: - pinch of chilli (optional, if you like it to be spicy) — Preserve literal source quantity; no conversion or numeric estimate.
- **dulce-de-leche**: - Two glass marbles (Optional, but it is a traditional way to prevent sticking, and they will not break in the process.) — Preserve literal source quantity; no conversion or numeric estimate.
- **dulce-de-leche**: 5. Once cold, put it on a glass jar and leave it in the fridge, or sterilize it. — Preserve literal source quantity; no conversion or numeric estimate.
- **eggroll-in-a-bowl**: 4. Add in the coleslaw mix and season with more soy sauce. Cook until the cabbage is just softened. Add 1/4 cup of hoisin sauce and stir to combine. Check seasoning and add salt to taste. Serve in a bowl with sweet chili sauce and green onions. — Preserve literal source quantity; no conversion or numeric estimate.
- **fennel-beans-and-kale-soup**:  - ½ cup olive oil — Preserve literal source quantity; no conversion or numeric estimate.
- **fennel-beans-and-kale-soup**:  - ½-1 teaspoon red-pepper flakes. — Preserve literal source quantity; no conversion or numeric estimate.
- **fennel-beans-and-kale-soup**: 4. Add one handful of greens at a time, stirring until leaves wilt. — Preserve literal source quantity; no conversion or numeric estimate.
- **fondue**: - A pinch of nutmeg — Preserve literal source quantity; no conversion or numeric estimate.
- **frijol-con-puerco**: - **Yucatan style tomato sauce** or _Chiltomate_ to taste (**optional**) — Preserve literal source quantity; no conversion or numeric estimate.
- **galinha-caipira**: 1. Cut the chicken into pieces. Remove offal or small bones, if you want. Salt and pepper to taste now. — Preserve literal source quantity; no conversion or numeric estimate.
- **galinha-caipira**: Source calls close to 2,5kg roughly 3 pounds and spells chicken ckicken. — Preserve discrepancy and source spelling rather than silently repairing either.
- **garam-masala**: 3. Too much Mace makes the masala quite bitter. So make sure you do not add more than what has been recommended. The amount of other spices can be changed according to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **garam-masala**: 8. The resulting mixture is garam masala. Store it in airtight glass jars. — Preserve literal source quantity; no conversion or numeric estimate.
- **garam-masala**: 5/6 Bayleaf, 5/6 Black pepper pods and storage for 2/3 months. — Retain slash spellings; do not decide fraction versus range.
- **garlic-toast**: 4. Season with garlic salt, to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **gnocchi**: 6. Flour a work surface, pinch off some of the dough and roll it on the surface into a long chubby snake. — Preserve literal source quantity; no conversion or numeric estimate.
- **grands-peres**: - 1 pinch salt — Preserve literal source quantity; no conversion or numeric estimate.
- **grands-peres**: - ½ cup milk — Preserve literal source quantity; no conversion or numeric estimate.
- **greek-yogurt**: - 2 thermos, ½l capacity each — Preserve literal source quantity; no conversion or numeric estimate.
- **grilled-mackerel-with-miso-soup-and-squash**: 7. Grill squash in the pan for 5-10 min, until both sides of the squash are golden brown. Add salt and pepper to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **grostoli**: - A pinch of salt — Preserve literal source quantity; no conversion or numeric estimate.
- **hakka-style-meatballs**: 5. Add meatballs and the stir-fry sauce to the pan with veggies. Cook, stirring gently, until sauce thickens slightly and coats meatballs (1 min). Season with salt and pepper, to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **hangover-eggs**: 5. Act fast! As the eggs start cooking, prepare a plate with two handfuls of chopped green onion and Tabasco. — Preserve literal source quantity; no conversion or numeric estimate.
- **hangover-eggs**: 11. Serve with glass of ice-cold beer. — Preserve literal source quantity; no conversion or numeric estimate.
- **instant-tom-yam-kung-noodle-soup**: - 2 packages of vegetable- or tom yam-quick noodles — Preserve literal source quantity; no conversion or numeric estimate.
- **italian-bread**: - 1 packet (appr. 2 1/4 tsp or 7g) active dry yeast — Preserve literal source quantity; no conversion or numeric estimate.
- **italian-bread**: 1. Follow directions on the packet to activate yeast in a bowl large enough for mixing the dough — Preserve literal source quantity; no conversion or numeric estimate.
- **italian-mulled-wine**: - 1 pinch rosemary — Preserve literal source quantity; no conversion or numeric estimate.
- **italian-mulled-wine**: - 1 pinch peppercorn — Preserve literal source quantity; no conversion or numeric estimate.
- **italian-mulled-wine**: - 1 pinch thyme — Preserve literal source quantity; no conversion or numeric estimate.
- **italian-mulled-wine**: - 1 pinch red pepper — Preserve literal source quantity; no conversion or numeric estimate.
- **italian-mulled-wine**: - 1 pinch fennel seeds — Preserve literal source quantity; no conversion or numeric estimate.
- **italian-mulled-wine**: - 1 pinch cloves — Preserve literal source quantity; no conversion or numeric estimate.
- **italian-mulled-wine**: - 1 pinch nutmeg — Preserve literal source quantity; no conversion or numeric estimate.
- **kettlecorn**: - salt to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **korv-stroganoff**: 4. Season to taste with plenty of pepper, and possibly salt. — Preserve literal source quantity; no conversion or numeric estimate.
- **kropsua**: 4. Once the oven has reached 400F, add one stick of butter into a 9x13 inch glass baking pan, then place it in the oven for a few minutes until the butter has completely melted. Avoid burning the butter by leaving it in the oven too long. — Preserve literal source quantity; no conversion or numeric estimate.
- **lasagna**: 3. If you want you can add 3-4 handfuls of grated emental cheese to the béchamel. — Preserve literal source quantity; no conversion or numeric estimate.
- **lebanese-lentil-soup**: - ¼ cup of lemon juice, more to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **lebanese-lentil-soup**: 4. Add salt and pepper to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **lemon-juice-salad-dressing**: 2. Add salt and pepper to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **lemon-pudding**: - A table-spoonful of white wine and brandy, mixed. — Preserve literal source quantity; no conversion or numeric estimate.
- **lemon-pudding**: - A tea-spoonful of rose-water. — Preserve literal source quantity; no conversion or numeric estimate.
- **limoncini**:   - a pinch of salt — Preserve literal source quantity; no conversion or numeric estimate.
- **lithuanian-cold-borscht**: 1. Wash 2-3 beets and cook in 2-3 litres of water (do not drain), peel. Grate on a medium or coarse grater. Squeeze a little lemon juice into the liquid in which the beets have been cooked, mix, then add salt, sugar and pepper to taste. Cool in the fridge. — Preserve literal source quantity; no conversion or numeric estimate.
- **lithuanian-cold-borscht**: 5. Place a few large spoonfuls of cooled grated beetroot and vegetable mixture in a bowl. Pour in the cold kefir. Add the cooled beetroot decoction (50-150 ml). If the kefir is too thick, add a little more liquid (the ratio of kefir to beetroot liquid varies from region to region and is adjusted to taste). — Preserve literal source quantity; no conversion or numeric estimate.
- **lithuanian-cold-borscht**: 6. Serve with potatoes and with a halved egg and spoonful of thick sour cream on top; sprinkle with chives. If you like, you can make it without the egg (as in the photo). — Preserve literal source quantity; no conversion or numeric estimate.
- **loaded-mexican-rice**: * 1 Can of black or pinto beans — Preserve literal source quantity; no conversion or numeric estimate.
- **lobster-bisque**: - 1 glass dry white wine — Preserve literal source quantity; no conversion or numeric estimate.
- **lobster-bisque**: 14. Let the soup boil for 4 more minutes to heat up the lobster and serve, add pepper and salt to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **mapo-tofu**: - 340 g (1 package) soft tofu cut into 1.5cm (1/2 inch cubes) — Preserve literal source quantity; no conversion or numeric estimate.
- **maque-choux**: - A good bit of grease (about a handful) — Preserve literal source quantity; no conversion or numeric estimate.
- **maque-choux**: - Handful of chopped onion — Preserve literal source quantity; no conversion or numeric estimate.
- **maque-choux**: - Handful of chopped bell pepper — Preserve literal source quantity; no conversion or numeric estimate.
- **maque-choux**: - Handful of chopped tomatoes — Preserve literal source quantity; no conversion or numeric estimate.
- **maque-choux**: - Salt & Pepper (to taste) — Preserve literal source quantity; no conversion or numeric estimate.
- **maque-choux**: 2. Mix all ingredients in a bowl excluding the grease. Salt & pepper to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **marinated-pork-steaks**: - ¼ cup soy sauce — Preserve literal source quantity; no conversion or numeric estimate.
- **marinated-pork-steaks**: - ¼ cup of honey — Preserve literal source quantity; no conversion or numeric estimate.
- **marinated-pork-steaks**: - 4 ¼ inch thick boneless pork shoulder steaks — Preserve literal source quantity; no conversion or numeric estimate.
- **mazurek**: 3. Add egg yolks, sugar, sour cream, and a pinch of salt. — Preserve literal source quantity; no conversion or numeric estimate.
- **meatloaf**: This recipe will result in two or three glass dishes of tasty, moist meatloaf. Great for family suppers. — Preserve literal source quantity; no conversion or numeric estimate.
- **meatloaf**: - 1 Can of Campbell's tomato soup — Preserve literal source quantity; no conversion or numeric estimate.
- **merchants-buckwheat**: 6. Add curcuma, chili powder, salt and black pepper to taste; mix thoroughly. — Preserve literal source quantity; no conversion or numeric estimate.
- **miso-ginger-pork**: 11. add miso paste to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **modern-borscht**: - 1 can of diced tomatoes — Preserve literal source quantity; no conversion or numeric estimate.
- **modern-borscht**: 3. Sear the beef on all sides until all cubes are browned. Salt and pepper the beef to taste. It is OK if the meat sticks to the bottom of the pot. Place a strainer in large bowl 3. — Preserve literal source quantity; no conversion or numeric estimate.
- **modern-borscht**: 9. After 60 minutes of simmering, add the cubed potatoes and the dill (to taste) to the mixture. Stir until well blended. Cover, and simmer for 15 minutes. *REMINDER* - during this 15 minute simmer, dice the 1/2 head of cabbage. — Preserve literal source quantity; no conversion or numeric estimate.
- **modern-borscht**: 11. Serve. The cabbage should be hot, yet still crunchy. It will retain this crunchiness through refrigeration and re-heating due to the short heat cycle. 1-2 spoonfulls of sour cream is recommended per bowl for additional flavor. — Preserve literal source quantity; no conversion or numeric estimate.
- **mushroom-risotto**: 3. Saute the vegetables until fragrant, then add the mushrooms with a pinch of salt and cook them down until they're nicely browned, about 10 minutes or so. — Preserve literal source quantity; no conversion or numeric estimate.
- **mushroom-sauce**: - A glass of cream or milk — Preserve literal source quantity; no conversion or numeric estimate.
- **mushroom-sauce**: 5. After 3 minutes, add a glass of cream (or milk), mix well and close the lid for 10 minutes. — Preserve literal source quantity; no conversion or numeric estimate.
- **oats**: - pinch of salt — Preserve literal source quantity; no conversion or numeric estimate.
- **oats**: 1. Bring water (with pinch of salt) to boil. — Preserve literal source quantity; no conversion or numeric estimate.
- **oats**: 7. Add a spoonful of peanut butter (if having peanut butter). — Preserve literal source quantity; no conversion or numeric estimate.
- **oaty-pancakes**: 3. Put spoonfuls of mixture onto preheated, greased or — Preserve literal source quantity; no conversion or numeric estimate.
- **okonomiyaki**: - Pinch salt to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **orange-glorious**: 1. In a blender, combine orange juice concentrate, milk, water, sugar and vanilla. Add ice cubes and blend until smooth. Pour into glasses and serve. — Preserve literal source quantity; no conversion or numeric estimate.
- **orange-pudding**: - A table-spoonful of mixed wine and brandy. — Preserve literal source quantity; no conversion or numeric estimate.
- **orange-pudding**: - A tea-spoonful of rose-water. — Preserve literal source quantity; no conversion or numeric estimate.
- **pasta-alla-norma**: 3. Then cut the aubergine widthways into 1cm thick slices. Place into a bowl with 75ml of olive oil, a good pinch of salt and black pepper. Coat the aubergines, then spread them onto two or three baking paper-lined trays. Roast for 30-35 minutes until dark brown. — Preserve literal source quantity; no conversion or numeric estimate.
- **pasta-alla-norma**: 4. Whilst the aubergines are cooking, put two tablespoons of olive oil into a frying pan or pot on a medium-high heat. Add garlic and chilies and fry for 1 minute (don't burn them!). Add tinned tomatoes, oregano, sugar and a pinch of salt and pepper to the pot. Reduce heat to medium low and cook until the sauce has thickened. — Preserve literal source quantity; no conversion or numeric estimate.
- **pasta-alla-norma**: 5. &#91;Cook the pasta&#93;(/pasta) according to packet instructions, once al dente, drain and retain some of the pasta water. — Preserve literal source quantity; no conversion or numeric estimate.
- **pasta-arrabbiata**: 5. When the water starts boiling, put a handful of salt into it and then your pasta of choice. Ideally leave the pasta slightly undercooked, because it will go in the hot sauce and finish cooking there. — Preserve literal source quantity; no conversion or numeric estimate.
- **pasta-navy-style**: 8. Salt some more to taste, and add some black pepper to taste, mix. — Preserve literal source quantity; no conversion or numeric estimate.
- **pasta-sauce**: - a can of San Marzano tomatoes (or home-grown with some extra pulp) — Preserve literal source quantity; no conversion or numeric estimate.
- **pastitsio**: 2. In a large pot of salted water, cook the pasta per package directions. Drain and set aside. — Preserve literal source quantity; no conversion or numeric estimate.
- **pastitsio**: 6. In a saucepan melt the butter and add the flour. Cook 2-3 mins until no longer starchy, whisking frequently. Add milk gradually and whisk continuously. Add stock and cook until sauce is thickened.  Add nutmeg and season to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **pate-chinois**: * 1½ lb of potatoes or around 6 big one, peeled and diced — Preserve literal source quantity; no conversion or numeric estimate.
- **pate-chinois**: * ½ cup milk — Preserve literal source quantity; no conversion or numeric estimate.
- **pate-chinois**: * (optional) ½ cup of strong cheddar cheese, grated — Preserve literal source quantity; no conversion or numeric estimate.
- **pate-chinois**: * Pinch of nutmeg — Preserve literal source quantity; no conversion or numeric estimate.
- **pate-chinois**: 6. Sprinkle some paprika to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **pate-chinois**: - For a vegetarian alternative, you can replace the beef with 500g of fake meat and a can of 19oz of lentils (drain and washed). — Preserve literal source quantity; no conversion or numeric estimate.
- **peanut-butter**: 2. While the peanuts are still hot remove any skins from them. This is best done by wrapping a few handfuls at a time in a dish towel and rolling them against each other for several seconds. — Preserve literal source quantity; no conversion or numeric estimate.
- **peat-carrot-salad**: Grate the carrot and rinse out under water. Then mix with coconut oil and vinegar, I also like to add a pinch or two of salt. — Preserve literal source quantity; no conversion or numeric estimate.
- **pesto-chicken-quinoa-bowls**: 2. Whisk the olive oil, lemon juice, Italian seasoning, garlic powder, and red pepper flakes in a large bowl with salt and pepper to taste. Add the chicken and toss to coat. — Preserve literal source quantity; no conversion or numeric estimate.
- **pilaf**: 2. Throw coarsely chopped meat into the cauldron and let it boil until it's golden brown, then add a pinch of salt. — Preserve literal source quantity; no conversion or numeric estimate.
- **plum-pudding**: - A glass of brandy. — Preserve literal source quantity; no conversion or numeric estimate.
- **plum-pudding**: - A glass of wine. — Preserve literal source quantity; no conversion or numeric estimate.
- **plum-pudding**: - A table-spoonful of mixed cinnamon and mace. — Preserve literal source quantity; no conversion or numeric estimate.
- **plum-pudding**: - A salt-spoonful of salt. — Preserve literal source quantity; no conversion or numeric estimate.
- **quesadilla**: - ~4 small pinches of (Mozzarella, Oaxaca, or Montery Jack cheese). — Preserve literal source quantity; no conversion or numeric estimate.
- **quiche**: I recommend serving it with a glass of white wine. — Preserve literal source quantity; no conversion or numeric estimate.
- **ragu-napoletano**: - Handfull of fresh parsley chopped — Preserve literal source quantity; no conversion or numeric estimate.
- **ragu-napoletano**: 9. Fill the pot with the seared meat, tomato sauce, add the fresh basil, then season with dried oregano, red pepper, salt, pepper, and a pinch of sugar to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **ragu**: - 28oz (825 ml) can of whole tomatoes — Preserve literal source quantity; no conversion or numeric estimate.
- **ragu**: 8. Remove herb sprigs and add pepper to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **ravioli**: 13. Grate the Pecorino into the bowl, add salt and pepper to taste, and mix to distribute the ingredients evenly — Preserve literal source quantity; no conversion or numeric estimate.
- **ravioli**: 24. Serve the seafood version with a simple fresh red sauce and basil, or spice it up a bit and go with a base of red sauce with some added heavy cream, and a pinch of red pepper flakes to make a pink sauce for the seafood version — Preserve literal source quantity; no conversion or numeric estimate.
- **refried-beans**: * 400-500g can of pre-cooked beans — Preserve literal source quantity; no conversion or numeric estimate.
- **refried-beans**: * 2-4 spoonfuls butter — Preserve literal source quantity; no conversion or numeric estimate.
- **refried-beans**: 4. Add salt, cumin, and paprika to taste. Usually I add paprika until the mix is — Preserve literal source quantity; no conversion or numeric estimate.
- **refried-beans**: 5. Open the can of beans and pour the beans into the pan. Depending on how — Preserve literal source quantity; no conversion or numeric estimate.
- **ricotta-lasagna-filling**: 1. Mix the ricotta cheese together with a handful of finely grated parmesan. — Preserve literal source quantity; no conversion or numeric estimate.
- **ricotta-lasagna-filling**: 3. Add salt and pepper to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **risengroed**: - Salt *2 pinches* — Preserve literal source quantity; no conversion or numeric estimate.
- **salsa**: - 1 handfull fresh cilantro — Preserve literal source quantity; no conversion or numeric estimate.
- **savory-squash**: - Salt, to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **savory-squash**: 3. Cut up into 2 inch chunks and toss into stand mixer. Mix on high and add a half stick of butter and salt to taste. Stir in half of the St. Augur blue cheese. — Preserve literal source quantity; no conversion or numeric estimate.
- **savory-squash**: 4. Pour into casserole dish. Stir in any extra blue cheese to taste or crumble on top. Lower oven to 300 and bake the mashed squash for 15 minutes. — Preserve literal source quantity; no conversion or numeric estimate.
- **shepherds-pie**: - 1 pinch of nutmeg — Preserve literal source quantity; no conversion or numeric estimate.
- **simple-chicken-curry**: - 1 ½ tsp Coriander — Preserve literal source quantity; no conversion or numeric estimate.
- **simple-chicken-curry**: - ½ tsp Turmeric — Preserve literal source quantity; no conversion or numeric estimate.
- **simple-chicken-curry**: - ½ tsp Ground Fennel Seeds — Preserve literal source quantity; no conversion or numeric estimate.
- **simple-chicken-curry**: - ½ tsp Cinnamon — Preserve literal source quantity; no conversion or numeric estimate.
- **simple-chicken-curry**: - ½ tsp Black Pepper — Preserve literal source quantity; no conversion or numeric estimate.
- **simple-chicken-curry**: - ½ tsp Ginger — Preserve literal source quantity; no conversion or numeric estimate.
- **simple-chicken-curry**: - ¼ tsp Mustard — Preserve literal source quantity; no conversion or numeric estimate.
- **simple-chicken-curry**: - ¼ tsp Ground Cloves — Preserve literal source quantity; no conversion or numeric estimate.
- **simple-chicken-curry**: - ¼ cup (½ stick) Butter — Preserve literal source quantity; no conversion or numeric estimate.
- **simple-chicken-curry**: - 1 ½ lbs Boneless Skinless Chicken Breasts — Preserve literal source quantity; no conversion or numeric estimate.
- **slowcooked-green-bean-beef-soup-supreme**: - 1 seasoned meat package (beef, peppers, some rub) — Preserve literal source quantity; no conversion or numeric estimate.
- **slowcooked-green-bean-beef-soup-supreme**: 1. Place the slow cooker on HIGH to let warm up, and pre-thaw the seasoned meat package if applicable. — Preserve literal source quantity; no conversion or numeric estimate.
- **slowcooked-green-bean-beef-soup-supreme**: 6. Let cook on HIGH for another 3 or so hours. Taste with a spoon midway to verify flavour or make any adjustments as needed (Add spices, thin with additional water, etc). — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-alla-puttanesca**: - A pinch of salt — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-and-meatballs**: - ½ chopped sweet yellow onion — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-and-meatballs**: - ¼ cup chopped fresh Italian parsley — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-and-meatballs**: - ¼ cup chopped fresh basil — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-and-meatballs**: - ¼ cup grated Parmesan-Romano cheese blend — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-and-meatballs**: - ¼ cup red wine (optional) — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-and-meatballs**: - ½ lb. fresh bulk Italian style pork sausage — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-and-meatballs**: - ½ cup finely chopped cremini brown mushrooms — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-and-meatballs**: - ¾ cup unseasoned breadcrumbs — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-and-meatballs**: - ¼ cup grated Parmesan-Romano cheese blend — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-and-meatballs**: - 1 ½ lb. dry spaghetti — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-and-meatballs**: 15. Add the cheese and red wine to the sauce and stir it in. Add 1 teaspoon of salt to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-sauce**: - 1 6 oz can of tomato paste — Preserve literal source quantity; no conversion or numeric estimate.
- **spaghetti-sauce**: 5. Add a pinch of salt, the remaining 1/4 cup of olive oil, and basil if you are adding that. — Preserve literal source quantity; no conversion or numeric estimate.
- **spiced-apple-pancakes**: - 1 tbsp cinnamon (or more to taste) — Preserve literal source quantity; no conversion or numeric estimate.
- **spiced-apple-pancakes**: 1. In a medium bowl, combine flour, sugar, cinnamon, baking powder, and 1 pinch of salt. — Preserve literal source quantity; no conversion or numeric estimate.
- **spicy-sausage-pasta**: - A large glass of red wine (approx. 250ml) — Preserve literal source quantity; no conversion or numeric estimate.
- **spicy-sausage-pasta**: 2. Increase the heat and break up the sausage meat with a wooden spoon. Once meat has browned, pour in red wine and reduce by half. Add the chopped tomatoes and reduce the sauce, uncovered, for about 30 mins. Cook the pasta according to packet instructions. — Preserve literal source quantity; no conversion or numeric estimate.
- **spinach-rice-casserole**: - 1/2 tsp Salt (or more, to taste) — Preserve literal source quantity; no conversion or numeric estimate.
- **steak-tartare**: 7. Add ketchup, mustard or Worcestershire sauce as needed and mix further. (Optional) — Preserve literal source quantity; no conversion or numeric estimate.
- **stir-fried-chicken-with-an-orange-sauce**: 6. Let that sit for a few minutes to let the flavors get to know each other a bit, then stir in a few spoonfuls of flour to thicken the sauce. — Preserve literal source quantity; no conversion or numeric estimate.
- **strawberry-compote**: !&#91;Strawberry Compote&#93;(/pix/glass-of-compote.webp) — Preserve literal source quantity; no conversion or numeric estimate.
- **stroganoff**: 10. Add Worchestershire sauce and the dijon mustard to taste. — Preserve literal source quantity; no conversion or numeric estimate.
- **taco-meat**: - 1 medium tomato, chopped (or 1 small can of tomato sauce) — Preserve literal source quantity; no conversion or numeric estimate.
- **tanzania-tea-with-milk**: 3. Sweeten to taste. Remember you can always add more if there isn't enough. — Preserve literal source quantity; no conversion or numeric estimate.
- **tarta-de-santiago**: * ¾ cup sugar (150 gr) — Preserve literal source quantity; no conversion or numeric estimate.
- **tarta-de-santiago**: * 1 ½ cup almond meal (150 gr) — Preserve literal source quantity; no conversion or numeric estimate.
- **tarta-de-santiago**: * ½ teaspoon cinnamon powder — Preserve literal source quantity; no conversion or numeric estimate.
- **tarta-de-santiago**: * ¼ teaspoon salt — Preserve literal source quantity; no conversion or numeric estimate.
- **tarte-merengada**: - 1 can of condensed milk (370g) — Preserve literal source quantity; no conversion or numeric estimate.
- **tiroler-groestl**: - Marjoram and cumin to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **tomato-flavored-hamburger-macaroni**: - 1 Can of tomato sauce — Preserve literal source quantity; no conversion or numeric estimate.
- **tuhu**: - ¾ cup of cilantro, chopped — Preserve literal source quantity; no conversion or numeric estimate.
- **tuna-salad**: - A pinch of garlic powder (optional) — Preserve literal source quantity; no conversion or numeric estimate.
- **tuna-sub**: 7. Season with salt and pepper to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **turkish-red-lentil-soup**: 3. In a large pot over medium-high heat, saute 2 Tbsp of the olive oil and and onion with a pinch of salt for 3 minutes. Add the carrots and saute for another 3 minutes. — Preserve literal source quantity; no conversion or numeric estimate.
- **ukrainian-vareniki**: - ¼ cup sour cream — Preserve literal source quantity; no conversion or numeric estimate.
- **ukrainian-vareniki**: - ½ teaspoon baking soda — Preserve literal source quantity; no conversion or numeric estimate.
- **ukrainian-vareniki**: - ½ cup water — Preserve literal source quantity; no conversion or numeric estimate.
- **ukrainian-vareniki**: - ¼ cup butter — Preserve literal source quantity; no conversion or numeric estimate.
- **ukrainian-vareniki**: - 3 ½ cups finely chopped button mushrooms — Preserve literal source quantity; no conversion or numeric estimate.
- **venezuelan-arepa**: - 2 ½ cups of water — Preserve literal source quantity; no conversion or numeric estimate.
- **venezuelan-arepa**: - delicatessen to taste — Preserve literal source quantity; no conversion or numeric estimate.
- **venezuelan-arepa**: 10. Fill them with delicatessen to taste (ham, cheese, beans, mortadella, eggs, etc.) — Preserve literal source quantity; no conversion or numeric estimate.
- **yogurt**: - 2 thermos, ½l capacity each — Preserve literal source quantity; no conversion or numeric estimate.
- **zaatar**: 3. Mix everything together, starting from the zaatar and sesame while adjusting the sumac (optionally citric acid) and salt to taste. — Preserve literal source quantity; no conversion or numeric estimate.

## culinary interpretation

- **air-fryer-zucchini**: Source alternates zucchinis/zucchini and makes garlic/onion powder optional. — Use one local zucchini identity; preserve optional seasonings and the authored time/temperature condition.
- **garam-masala**: Source calls mace a dried flower. — Retain in original source and flag the botanical statement; do not promote it as vocabulary knowledge.

## safety

- **autumn-soup**: 1. Peel and chop squash, potatoes, carrots, and onion, add to oven-safe pot. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **baked-rice**: 3. In a clay casserole (oven-safe), heat the olive oil over medium-high heat. Brown the pork ribs and pork belly until golden and crispy. Remove and set aside. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **belgian-pear-syrup**: 5. At this point, you can boil your glass jars to sterilize them. Place the sterilized jars on a clean, dry towel. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **belgian-pear-syrup**: 11. At this point, it's up to you on how thick you want your syrup to be. A good way to test the viscosity is to drop a little bit on a cold plate or on your countertop to see how it is at room temperature. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **belgian-pear-syrup**: 12. When you are happy with the viscosity, pour the syrup into your sterilized jars and immediately seal them. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **bolo-do-caco**: 8. Let the dough ferment for 3 days in the refrigerator. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **breton-crepes**: 2. Let it rest one hour at room temperature. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **cheese**: - 25g of table salt (optional with aging) — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **cheese**: - Oil and vinegar (for aging) — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **cheese**: ### Aging (optional) — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **cheese**: Every day of aging, flip the cheese upside-down. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **cheesy-potatoe-bake**: **You will need a deep dish that is oven safe** — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **cream-cheese**: Heat up to 90°C, then let it cool down until it reaches room temperature. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **dulce-de-leche**: 5. Once cold, put it on a glass jar and leave it in the fridge, or sterilize it. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **eggs**: You're pushing the cooked egg towards the center while letting the raw egg spill out to be cooked. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **frittata**: 1. Dice peppers and onions and saute in an oven safe pan at medium heat. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **frittata**: 7. Flip out of pan and cool to room temperature to ensure settling. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **greek-salad**: - 1/2 cup pitted Black Olives (preferably brine-cured), coarsely chopped — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **greek-yogurt**: 12h incubation, 45°C target, thermos washing and refrigeration directions. — Preserve source instructions without independently endorsing fermentation safety.
- **grilled-mackerel-with-miso-soup-and-squash**: 1. Place the mackerel fillets in a small container at room temperature. Pour sake on both sides of the fillets and let rest in the container, covered, for 30 min. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **lasagna**: 4. If necessary, boil the lasagna noodles following the instructions on the packaging, start preheating your oven to 175°C/350°F. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **marinated-pork-steaks**: 2. Add the pork steaks to the marinade and leave in room temperature for 30 minutes or a bit longer. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **meatloaf**: 7. Evenly distribute your mixed meat into 2 or 3 oven safe greased up dishes. Try to flatten the surface as much as you can. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **no-knead-pizza-dough**: 3. Cover bowl air tight, and let it sit in room temperature for at least 7 hours, and up to 24 hours. It should have dramatically increased in size. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **pasta**: 7. While the pasta is sitting in your strainer, you may add basil leaves or other herbs and aromatics. I also recommend taking a knob or so of room temperature butter and add it in and stirring it, melting it into the pasta. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **roasted-chicken-breast**: 1. Fill a large bowl with enough water to submerge the chicken. Add salt to the water until it's fully saturated. Put the chicken under the water and let it sit for 20-40 minutes at room temperature. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **roasted-chicken-breast**: 3. Remove the chicken from the water. Rinse it. Dry it. Put it in a roasting pan (you can use a casserole dish, oven-safe skillet, or baking pan too). — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **roasted-chicken-breast**: 8. Remove from the oven and immediately cover with foil leaving the probe inserted. Let the chicken sit for 10 minutes at room temperature. The chicken will continue to cook. It should reach at least 74°C / 165°F but if it doesn't, see &#91;this reddit post&#93;(https://www.reddit.com/r/Cooking/comments/49opyx/cooking_chicken_to_temps_below_165_is_it_safe/) about food safety when cooking chicken to less than 165°F. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **roasted-chicken-breast**: Source links to Reddit for cooking chicken below 165°F if carryover temperature does not reach its target. — Preserve the wording/link as an unvalidated source claim; flag for human safety review, not authoritative advice.
- **smoked-turkey**: - 1-2 cups whipped butter (room temperature) — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **soleier**: 5. Let them rest for at least three days and at most two weeks at room temperature or slightly below. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **spiced-cantaloupe**: 6. Place in hot sterilized jars and seal. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **steak-tartare**: title: Steak Tartare — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **steak-tartare**: Steak Tartare is a dish prepared using raw ground / minced beef and egg yolk. A popular dish in Europe, this recipe is a good stepping stone into the world of raw meats, organs and pates. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **sugar-free-brown-sugar-peanut-butter-cookies**: - 1 large egg, room temperature — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **sugar-free-brown-sugar-peanut-butter-cookies**: - 1 large egg yolk, room temperature — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **sugar-free-brown-sugar-peanut-butter-cookies**: Keeps airtight at room temperature 4-5 days, and gets chewier overnight. Raw dough balls can be frozen and baked from frozen with 2 extra minutes. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **tabouleh**: 5. Serve chilled or at room temperature. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **tajine**: 8. Bake for 30-35 minutes, or until set in the center. Allow to cool, and serve warm or at room temperature. Serve with some harissa, if you like. — Preserve source wording; no safety assurance inferred. Human safety review before practical reliance.
- **yogurt**: 12h incubation, 45°C target, thermos washing and refrigeration directions. — Preserve source instructions without independently endorsing fermentation safety.

## cross-recipe dependency

- **aelplermagronen**: &#91;Älplermagronen&#93;(/pix/aelplermagronen.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **aglio-e-olio**: &#91;cooking the pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **apple-chicken**: &#91;Applechicken&#93;(/pix/apple-chicken.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **apple-strudel**: &#91;apple-strudel-1&#93;(/pix/apple-strudel.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **ardei-umpluti**: &#91;Ardei umpluti&#93;(/pix/ardei-umpluti.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **arroz-chaufa**: &#91;Arroz Chaufa&#93;(/pix/arroz-chaufa.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **asian-style-chicken-sticky-sauce**: &#91;Asian Style Chicken with Sticky Sauce&#93;(/pix/asian-style-chicken-sticky-sauce.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **assam-tea**: &#91;Assam Tea&#93;(/pix/assam-tea.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **babas-feta-pasta**: &#91;cooking the pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **baked-mostaccioli**: &#91;baked mostaccioli in bowl&#93;(/pix/baked-mostaccioli.webp "Baked Mostaccioli in Bowl") — Retain local source link as text; do not inline or infer subrecipe quantities.
- **baked-mostaccioli**: &#91;cook pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **baked-rice**: &#91;Valencian Baked Rice&#93;(/pix/baked-rice.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **banana-oatmeal-cookies**: &#91;Banana and oatmeal cookies&#93;(/pix/banana-oatmeal-cookies.webp "Banana and oatmeal cookies") — Retain local source link as text; do not inline or infer subrecipe quantities.
- **beef-stew**: &#91;chicken stock&#93;(/chicken-stock-bone-broth) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **brigadeiro**: &#91;Brigadeiro&#93;(/pix/brigadeiro.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **burger-dressing**: &#91;burger-dressing&#93;(/pix/burger-dressing.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **burger-dressing**: &#91;mayonnese or aioli&#93;(/mayonnaise-or-aioli) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **cacio-e-pepe**: &#91;pepe&#93;(/pix/cacio-e-pepe.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **cacio-e-pepe**: &#91;Pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **caesar-salad**: &#91;caesar_salad&#93;(/pix/csalad.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **cheesy-meatballs**: &#91;Cheesy Meatballs with Tomato Sauce&#93;(/pix/cheesy-meatballs.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **cheesy-pasta-bake**: &#91;cooking the pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **chicken-parmesan**: &#91;pasta sauce&#93;(/pasta-sauce) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **chicken-parmesan**: &#91;pasta sauce&#93;(/pasta-sauce) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **chicken-parmesan**: &#91;pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **chicken-pasta-casserole**: &#91;Chicken Pasta Casserole&#93;(/pix/chicken-pasta-casserole.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **chicken-pasta-casserole**: &#91;Cook the pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **chicken-soup**: &#91;chicken breasts&#93;(/pan-seared-chicken) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **chicken-soup**: &#91;chicken breasts&#93;(/pan-seared-chicken) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **chicken-tikka-masala**: &#91;garam masala&#93;(/garam-masala) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **chimichanga**: &#91;taco-meat&#93;(/taco-meat) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **cinque-pi**: &#91;Cinque Pi&#93;(/pix/cinque-pi.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **cinque-pi**: &#91;pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **coconut-flour-bread**: &#91;keto-coconut-bread&#93;(/pix/coconutbread-lufemas.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **coriander-chicken**: &#91;Garam masala&#93;(/garam-masala) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **coriander-chicken**: &#91;naan&#93;(/naan-bread) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **coriander-chicken**: &#91;rice&#93;(/rice) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **country-skillet**: &#91;Country Breakfast Skillet&#93;(/pix/country-skillet.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **creamy-mashed-potatoes**: &#91;Creamy Mashed Potatoes&#93;(/pix/creamy-mashed-potatoes.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **croutons**: &#91;croutons&#93;(/pix/croutons.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **cuca-italiana**: &#91;fruit jam&#93;(/tags/jam) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **cuca-italiana**: &#91;dulce de leche&#93;(/dulce-de-leche) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **danish-pancake**: &#91;pancake&#93;(/pix/danish-pancake.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **diannes-southwest-salad**: &#91;Dianne's Southwestern Cornbread Salad&#93;(/pix/diannes-cornbread-salad.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **dominican-spaghetti**: &#91;spaghetti&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **dou-sha-bao**: &#91;Dou-Sha-Bao&#93;(/pix/dou-sha-bao.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **easy-pizza-sauce**: &#91;Easy-Pizza-Sauce&#93;(/pix/easy-pizza-sauce.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **eggs**: &#91;homepage&#93;(/index.html) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **farci-tomatoes**: &#91;Farci tomatoes&#93;(/pix/farci-tomatoes.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **fennel-beans-and-kale-soup**: &#91;finished bean soup&#93;(/pix/fennel-bean-kale-soup.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **flammkuchen**: &#91;Pizza Dough&#93;(/pizza-dough) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **fried-anglerfish-fillet**: &#91;anglerfish&#93;(/pix/fried-anglerfish-fillet.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **garam-masala**: &#91;Biriyani&#93;(/lamb-biriyani) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **grands-peres**: &#91;Grands-pères&#93;(/pix/grands-peres.webp "Nice and fluffy") — Retain local source link as text; do not inline or infer subrecipe quantities.
- **hearty-breakfast-oatmeal**: &#91;hearty-breakfast-oatmeal-00&#93;(/pix/hearty-breakfast-oatmeal.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **herbs-pizza**: &#91;Herbs pizza&#93;(/pix/herbs-pizza.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **hoisin-pork-belly**: &#91;Spicy Glazed Hoisin Pork Belly&#93;(/pix/hoisin-pork-belly.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **honey-sriracha-chicken-thighs**: &#91;Honey Sriracha Chicken Thighs&#93;(/pix/honey-sriracha-chicken-thighs.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **italian-mulled-wine**: &#91;Italian Mulled Wine&#93;(/pix/italian-mulled-wine.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **kettlecorn**: &#91;Kettle Corn&#93;(/pix/kettlecorn.webp "Kettle Corn made with brown sugar") — Retain local source link as text; do not inline or infer subrecipe quantities.
- **korv-stroganoff**: &#91;Korv Stroganoff&#93;(/pix/korv-stroganoff.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **kropsua**: &#91;kropsua&#93;(/pix/kropsua.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **lamb-biriyani**: &#91;onion raitha&#93;(/onion-raitha) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **lamb-biriyani**: &#91;Lamb Biriyani&#93;(/pix/lamb-biriyani.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **lamb-biriyani**: &#91;Garam Masala&#93;(/garam-masala) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **lasagna**: &#91;lasagna&#93;(/pix/lasagna.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **lasagna**: &#91;Fresh Bolognese sauce&#93;(/bolognese-sauce) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **lasagna**: &#91;Béchamel sauce&#93;(/classic-bechamel-sauce) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **lasagna**: &#91;ricotta lasagna filling&#93;(/ricotta-lasagna-filling) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **lemon-and-oregano-chicken-traybake**: &#91;Lemon and oregano chicken traybake&#93;(/pix/lemon-and-oregano-chicken-traybake.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **limoncini**: &#91;Limoncini&#93;(/pix/limoncini.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **lithuanian-cold-borscht**: &#91;Lithuanian Cold Borscht in a bowl&#93;(/pix/lithuanian-cold-borscht.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **mapo-tofu**: &#91;Mapo Tofu Over Rice&#93;(/pix/mapo-tofu.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **mazurek**: &#91;orange jam&#93;(/orange-jam) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **meatloaf**: &#91;Meatloaf&#93;(/pix/meatloaf.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **merchants-buckwheat**: &#91;Merchant's Buckwheat&#93;(/pix/merchants-buckwheat.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **mushroom-sauce**: &#91;pasta&#93;(/pasta/) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **oatmeal-pancakes**: &#91;oatmeal-pancakes&#93;(/pix/oatmeal-pancakes.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **pan-pizza**: &#91;Pan pizza&#93;(/pix/pan-pizza.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **pan-pizza**: &#91;no-knead pizza dough&#93;(/no-knead-pizza-dough) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **pan-pizza**: &#91;pizza sauce&#93;(/pizza-sauce) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **pan-seared-chicken**: &#91;Juicy Pan-seared Chicken Fillet&#93;(/pix/pan-seared-chicken.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **pancake**: &#91;Pancakes made at home&#93;(/pix/pancake.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **parmesan-potatoes**: &#91;Parmesan potatoes&#93;(/pix/parmesan-potatoes.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **pasta-alla-norma**: &#91;Cook the pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **pasta-arrabbiata**: &#91;arrabiata&#93;(/pix/pasta-arrabbiata.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **pasta-navy-style**: &#91;Pasta Navy Style&#93;(/pix/pasta-navy-style.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **pasta-navy-style**: &#91;Cook the pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **pasta**: &#91;pasta sauce&#93;(/pasta-sauce) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **pate-chinois**: &#91;pate chinois&#93;(/pix/pate-chinois.webp "Homemade pate chinois with to much ketchup") — Retain local source link as text; do not inline or infer subrecipe quantities.
- **pilaf**: &#91;rice&#93;(/rice) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **portuguese-steak-with-beer-sauce**: &#91;rice&#93;(/rice) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **potato-pure**: &#91;Potato purée&#93;(/pix/potato-puree.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **quesadilla**: &#91;brisket quesadilla&#93;(/pix/quesadilla.webp "Brisket and Bean Quesadilla with using Montery Jack Cheese") — Retain local source link as text; do not inline or infer subrecipe quantities.
- **ragu-napoletano**: &#91;Ragu Napoletano&#93;(/pix/ragu-napoletano.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **ragu-napoletano**: &#91;pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **ragu**: &#91;pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **ravioli**: &#91;Ravioli&#93;(/pix/ravioli.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **refried-beans**: &#91;Refried Beans&#93;(/pix/refried-beans.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **rice**: &#91;chicken stock&#93;(/chicken-stock-bone-broth) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **risengroed**: &#91;risen groed&#93;(/pix/risengroed.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **roesti**: &#91;Rösti&#93;(/pix/roesti.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **seafood-pasta**: &#91;these    instructions&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **shortcrust-pastry-biscuits**: &#91;Shortcrust pastry biscuits&#93;(/pix/shortcrust-pastry-biscuits.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **shortcrust-pastry-biscuits**: &#91;shortcrust pastry&#93;(/shortcrust-pastry) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **slowcooked-green-bean-beef-soup-supreme**: &#91;Slowcooked Green Bean Beef Soup Supreme&#93;(/pix/slowcooked-green-bean-beef-soup-supreme.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **smoked-turkey**: &#91;Smoked Turkey&#93;(/pix/smoked-turkey.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **soleier**: &#91;Soleier&#93;(/pix/soleier.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **sourdough-potato-bread**: &#91;Potato sourdough bread&#93;(/pix/sourdough-potato-bread.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **spaghetti-all-amatriciana**: &#91;Jebusthebus&#93;(/pix/spaghetti-all-amatriciana.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **spaghetti-all-amatriciana**: &#91;cooking the pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **spaghetti-alla-puttanesca**: &#91;cooking the pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **spaghetti-and-meatballs**: &#91;Cook the pasta&#93;(/pasta) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **spicy-sausage-pasta**: &#91;Spicy Sausage Pasta&#93;(/pix/spicy-sausage-pasta.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **stracciatella-soup**: &#91;Stracciatella soup&#93;(/pix/stracciatella-soup.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **strawberry-compote**: &#91;Strawberry Compote&#93;(/pix/glass-of-compote.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **stroganoff**: &#91;chicken stock&#93;(/chicken-stock-bone-broth) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **stuffed-vegetables**: &#91;Stuffed vegetables&#93;(/pix/stuffed-vegetables.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **swedish-pancakes**: &#91;Swedish Pancakes&#93;(/pix/swedish-pancakes.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **tahini-short-bread**: &#91;Tahini biscuits&#93;(/pix/tahini-short-bread.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **tahini-short-bread**: &#91;butter-based biscuits recipe&#93;(/butter-based-biscuit) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **tajine**: &#91;tajine maadnous&#93;(/pix/tajine-maadnous.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **tanzania-tea-with-milk**: &#91;Tanzanian tea with milk&#93;(/pix/tanzania-tea-with-milk.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **tarta-de-santiago**: &#91;Tarta de Santiago&#93;(/pix/tarta-de-santiago.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **tarte-merengada**: &#91;Meringe Lemon Pie&#93;(/pix/tarte-merengada.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **teriyaki-beef**: &#91;Teriyaki Beef Wok&#93;(/pix/teriyaki-beef.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **tomato-flavored-hamburger-macaroni**: &#91;Tomato Flavored Hamburger and Macaroni&#93;(/pix/tomato-flavored-hamburger-macaroni.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **torrijas**: &#91;Torrijas&#93;(/pix/torrijas.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **tuna-salad**: &#91;Tuna Salad&#93;(/pix/tuna-salad.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **wholemeal-pizza**: &#91;Wholemeal-Pizza&#93;(/pix/wholemeal-pizza.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **wholemeal-pizza**: &#91;Wholemeal Wheat Flour Pizza Dough&#93;(/wholemeal-wheat-flour-pizza-dough) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **wholemeal-pizza**: &#91;Easy Pizza Sauce&#93;(/easy-pizza-sauce) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **wholemeal-wheat-flour-pizza-dough**: &#91;Wholemeal-Wheat-Flour-Pizza-Dough&#93;(/pix/wholemeal-wheat-flour-pizza-dough.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.
- **yogurt-cake**: &#91;Yogurt cake&#93;(/pix/yogurt-cake.webp) — Retain local source link as text; do not inline or infer subrecipe quantities.

