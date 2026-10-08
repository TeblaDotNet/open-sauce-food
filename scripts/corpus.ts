import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseRecipe, renderCode, renderCompact, renderHtml } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';

export async function recipeFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (['node_modules', '.git', 'tests', 'work', 'dist', 'History'].includes(entry.name)) continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await recipeFiles(path));
    else if (entry.name.endsWith('.opensauce')) files.push(path);
  }
  return files.sort();
}

if (import.meta.main) {
  const vocabulary = await loadVocabulary('.');
  let successful = 0, warnings = 0, promoted = 0, promotedSuccessful = 0, promotedWarnings = 0;
  const warningCodes: Record<string, number> = {};
  const files = await recipeFiles('.');
  for (const file of files) {
    const recipe = parseRecipe(await readFile(file, 'utf8'), { filename: file, vocabulary });
    const errors = recipe.diagnostics.filter(d => d.severity === 'error');
    const isPromoted = file.replaceAll('\\', '/').startsWith('examples/public-domain-recipes/');
    if (isPromoted) { promoted++; if (!errors.length) promotedSuccessful++; promotedWarnings += recipe.diagnostics.filter(d => d.severity === 'warning').length; }
    warnings += recipe.diagnostics.filter(d => d.severity === 'warning').length;
    for (const d of recipe.diagnostics.filter(d => d.severity === 'warning')) warningCodes[d.code] = (warningCodes[d.code] ?? 0) + 1;
    if (!errors.length) successful++;
    else console.error(file, errors);
    renderCode(recipe); renderCompact(recipe); renderHtml(recipe); renderHtml(recipe, { view: 'compact' });
  }
  console.log(JSON.stringify({ promoted, promotedSuccessful, promotedWarnings, totalFiles: files.length, successful, failed: files.length - successful, warnings, warningCodes, vocabularyEntries: vocabulary.entries.length }, null, 2));
  if (successful !== files.length) process.exitCode = 1;
}
