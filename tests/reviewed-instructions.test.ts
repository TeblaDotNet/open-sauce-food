import { restoreCorpusRepairs } from './helpers/corpus-quality-unattended.ts';
import { restoreRecipePublication } from './helpers/recipe-publication.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRecipe } from '../src/parser/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { auditConversion } from '../src/conversion-quality.ts';
import { reviewedInstructionSlugs, restoreReviewedInstructions, restoreReviewedDeclarations, instructionSlices } from './helpers/reviewed-instructions.ts';
const vocabulary = await loadVocabulary('.');
for (const slug of reviewedInstructionSlugs) test('reviewed instructions: ' + slug + ' preserves historical bytes and improves structure', () => {
  // Historical reviewed-body assertions use the hash-verified pre-repair source.
  const source = restoreCorpusRepairs(readFileSync('examples/public-domain-recipes/' + slug + '/' + slug + '.opensauce', 'utf8'), slug);
  const baseline = restoreReviewedInstructions(source, slug);
  const before = parseRecipe(baseline, { vocabulary }), after = parseRecipe(source, { vocabulary });
  assert.equal(after.diagnostics.filter(d => d.severity === 'error').length, 0);
  assert.equal(after.diagnostics.filter(d => /UNRESOLVED|AMBIGUOUS|MISSING_SUBJECT/.test(d.code)).length, 0);
  assert.deepEqual(after.sections.filter(s => s.originalSource).map(s => s.originalSource!.text), before.sections.filter(s => s.originalSource).map(s => s.originalSource!.text));
  const current = instructionSlices(source), historical = instructionSlices(baseline);
  assert.equal(instructionSlices(restoreReviewedDeclarations(restoreRecipePublication(source, slug), slug)).prefix, historical.prefix); assert.equal(current.suffix, historical.suffix);
  assert.ok(auditConversion(after, vocabulary).score > auditConversion(before, vocabulary).score);
  assert.throws(() => restoreReviewedInstructions(current.prefix + 'Invented action\n' + current.instructions + current.suffix, slug), /unreviewed instruction|publication|Unrecorded corpus repair bytes/);
  assert.throws(() => restoreReviewedInstructions(source.replace('name:', 'name: Changed'), slug), /non-instruction bytes|Unrecorded corpus repair bytes/);
  assert.throws(() => restoreReviewedInstructions(source.replace('::recipe\n', '::recipe\r\n'), slug), /non-instruction bytes|Unrecorded corpus repair bytes/);
});
test('unlisted recipes are unchanged by restoration; reverted Turkish has no authorisation', () => {
  const source = '::recipe\nname: Untouched\n::instructions\nKeep me';
  assert.equal(restoreReviewedInstructions(source, 'unlisted-recipe'), source);
  const slug = 'turkish-style-spiced-chicken';
  assert.ok(!reviewedInstructionSlugs.includes(slug));
  const original = readFileSync('examples/public-domain-recipes/' + slug + '/' + slug + '.opensauce', 'utf8');
  assert.equal(restoreReviewedInstructions(original, slug), original);
  // Unknown keys must not inherit an object-prototype exemption.
  assert.equal(restoreReviewedInstructions(source, 'toString'), source);
});
test('exact instruction slicing supports final sections and CRLF without normalization', () => {
  const source = '::recipe\r\nname: X\r\n::instructions # note\r\n<serve>\r\n';
  const parts = instructionSlices(source);
  assert.equal(parts.instructions, '<serve>\r\n'); assert.equal(parts.suffix, '');
  assert.equal(parts.prefix + parts.instructions + parts.suffix, source);
});
