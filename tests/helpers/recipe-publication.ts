import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const ledger = JSON.parse(readFileSync('recipe-publication-decisions.json', 'utf8'));
/** Remove only the new header metadata; all other bytes retain baseline protection. */
export function restoreRecipePublication(source: string, pathOrSlug: string): string {
  const slug = pathOrSlug.replaceAll('\\', '/').split('/').at(-1)!.replace(/\.opensauce$/, '');
  if (!Object.hasOwn(ledger.records, slug)) return source;
  const restored = source.replace(/^(::recipe\n)conversion stage: (?:initial|reworked|blocked)\n/, '$1');
  if (restored !== source) assert.equal(createHash('sha256').update(restored).digest('hex'), ledger.records[slug].beforeSha256, slug + ': publication non-instruction bytes / generated pass bytes changed');
  return restored;
}
