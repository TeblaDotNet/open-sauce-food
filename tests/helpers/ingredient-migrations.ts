import { restoreRecipePublication } from './recipe-publication.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const ledger = JSON.parse(readFileSync('ingredient-migration-decisions.json', 'utf8'));
/** Undo only the exact, checksum-protected migration before older provenance checks. */
export function restoreIngredientMigrations(source: string, pathOrSlug: string): string {
  source = restoreRecipePublication(source, pathOrSlug);
  const slug = pathOrSlug.replaceAll('\\', '/').split('/').at(-1)!.replace(/\.opensauce$/, '');
  const change = ledger.recipes.find((r: {slug: string}) => r.slug === slug);
  if (!change) return source;
  const sha = (s: string) => createHash('sha256').update(s).digest('hex');
  assert.equal(sha(source), change.afterSha256, slug + ': ingredient migration bytes changed');
  assert.equal(source.split(change.to).length - 1, change.count);
  const restored = source.replaceAll(change.to, change.from);
  assert.equal(sha(restored), change.beforeSha256);
  return restored;
}
