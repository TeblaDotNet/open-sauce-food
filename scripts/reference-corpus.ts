import { readFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { parseRecipe, buildUsageIndex } from '../src/index.ts';
import type { Vocabulary } from '../src/vocabulary/index.ts';
import { recipeFiles } from './corpus.ts';

/** Local adapter only: the reusable index itself accepts already-parsed recipes. */
export async function loadReferenceCorpus(root: string, vocabulary: Vocabulary) {
  const files = await recipeFiles(join(root, 'examples/public-domain-recipes'));
  const recipes = await Promise.all(files.map(async file => {
    const recipe = parseRecipe(await readFile(file, 'utf8'), { filename: file, vocabulary });
    const title = recipe.sections.find(s => s.name === 'recipe')?.children.find(n => n.kind === 'metadata' && n.key === 'name');
    const id = basename(dirname(file));
    return { id, name: title?.kind === 'metadata' ? title.value : id, recipe,
      path: '/' + relative(root, file).replaceAll('\\', '/') };
  }));
  return { catalog: recipes.map(({ id, name, path }) => ({ id, name, path })), usage: buildUsageIndex(recipes) };
}
