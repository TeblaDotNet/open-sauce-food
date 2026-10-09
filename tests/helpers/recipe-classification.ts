import { restoreProcessTranche2 } from './process-tranche-2.ts';
/** Historical metadata-only migration adapter. Runtime truth remains recipe metadata. */
const originalCategories: Record<string, string> = {
  "apple-pie": "dessert",
  "baked-pasta-with-broccoli": "main",
  "banana-muffins-with-chocolate": "baking",
  "basic-waffles": "breakfast",
  "beef-goulash": "main",
  "butter-chicken-masala": "main",
  "carbonara": "main",
  "chocolate-chip-cookies": "baking",
  "fall-vegetable-and-chickpea-curry": "main",
  "guacamole": "dip",
  "hummus": "dip",
  "lavacake": "dessert",
  "no-knead-bread": "baking",
  "paella": "main",
  "paneer-tikka-masala": "main",
  "pavlova": "dessert",
  "potato-leek-soup": "soup",
  "shakshouka": "breakfast",
  "tiramisu": "dessert"
};
export function restoreRecipeClassification(source: string, pathOrSlug: string): string {
  source = restoreProcessTranche2(source, pathOrSlug);
  const slug = pathOrSlug.replaceAll('\\', '/').split('/').at(-1)!.replace(/\.opensauce$/, '');
  const end = source.indexOf('\n::', '\n::recipe'.length);
  const header = end < 0 ? source : source.slice(0, end);
  const original = originalCategories[slug];
  const restored = original === undefined
    ? header.replace(/^(::recipe\nconversion stage: [^\n]+\n)category: [^\n]+\n/, '$1')
    : header.replace(/^category: [^\n]+$/m, 'category: ' + original);
  return restored + (end < 0 ? '' : source.slice(end));
}
