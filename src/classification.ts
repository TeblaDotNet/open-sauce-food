/** Optional broad culinary roles; independent of ingredient vocabulary and publication. */
export const recipeCategories = ['drink', 'bread/baking', 'preserve/ferment', 'soup/stew', 'main', 'dessert', 'side', 'starter', 'sauce/seasoning/stock', 'snack', 'breakfast', 'miscellaneous'] as const;
export type RecipeCategory = typeof recipeCategories[number];
export function isRecipeCategory(value: string): value is RecipeCategory {
  return recipeCategories.some(category => category === value);
}
export const dietaryDisclaimer = 'Dietary labels are author-supplied and are not a guarantee of suitability. Check ingredients, substitutions and product labels for your own dietary requirements.';
