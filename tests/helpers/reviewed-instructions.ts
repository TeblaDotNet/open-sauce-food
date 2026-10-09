import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
interface ReviewedReplacement {
  historicalCommit: string;
  historicalInstructions: string;
  historicalSourceSha256: string;
  acceptedInstructionsSha256: string;
  nonInstructionsSha256: string;
}
const fixture = JSON.parse(readFileSync('tests/fixtures/reviewed-instructions.json', 'utf8')) as {
  schemaVersion: number; recipes: Record<string, ReviewedReplacement>;
};
assert.equal(fixture.schemaVersion, 1);
export const reviewedInstructionSlugs = Object.keys(fixture.recipes).sort();
for (const slug of reviewedInstructionSlugs) {
  assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  const record = fixture.recipes[slug];
  assert.equal(typeof record.historicalInstructions, 'string');
  assert.match(record.historicalCommit, /^[a-f0-9]{40}$/);
  for (const hash of [record.historicalSourceSha256, record.acceptedInstructionsSha256, record.nonInstructionsSha256])
    assert.match(hash, /^[a-f0-9]{64}$/);
}
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
/** Exact slices: no newline normalization, including the instruction header. */
export function instructionSlices(source: string) {
  const header = /^::instructions[^\r\n]*(?:\r\n|\n|\r)/m.exec(source);
  assert.ok(header, 'Missing instructions section');
  const start = header.index + header[0].length;
  const next = /^::/m.exec(source.slice(start));
  const end = next ? start + next.index : source.length;
  return { prefix: source.slice(0, start), instructions: source.slice(start, end), suffix: source.slice(end) };
}
/** Only explicit registry entries may restore a reviewed body for historical checksum checks.
 * All other recipes pass through unchanged and remain subject to those historical checks.
 */
export function restoreReviewedInstructions(source: string, pathOrSlug: string): string {
  const slug = pathOrSlug.replaceAll('\\', '/').split('/').at(-1)!.replace(/\.opensauce$/, '');
  if (!Object.hasOwn(fixture.recipes, slug)) return source;
  const record = fixture.recipes[slug];
  const { prefix, instructions, suffix } = instructionSlices(source);
  assert.equal(sha(instructions), record.acceptedInstructionsSha256, slug + ': unreviewed instruction change');
  assert.equal(sha(prefix + suffix), record.nonInstructionsSha256, slug + ': non-instruction bytes changed');
  const historical = prefix + record.historicalInstructions + suffix;
  assert.equal(sha(historical), record.historicalSourceSha256, slug + ': historical reconstruction changed');
  return historical;
}
