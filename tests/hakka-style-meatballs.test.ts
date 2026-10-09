import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseRecipe, renderCode, renderCompact, renderOriginalSource, renderHtml } from '../src/index.ts';
import type { Node, Statement } from '../src/model/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { auditConversion } from '../src/conversion-quality.ts';
import { restoreReviewedInstructions } from './helpers/reviewed-instructions.ts';
const path = 'examples/public-domain-recipes/hakka-style-meatballs/hakka-style-meatballs.opensauce';
const source = readFileSync(path, 'utf8'), vocabulary = await loadVocabulary('.');
const recipe = parseRecipe(source, { vocabulary });
const visit = (nodes: Node[]): Statement[] => nodes.flatMap(n => n.kind === 'statement' ? [n, ...visit(n.children)] : n.kind === 'group' ? visit(n.children) : []);
const nodes = visit(recipe.sections.find(s => s.name === 'instructions')!.children);
const tokens = nodes.flatMap(n => n.tokens), processes = tokens.filter(t => t.kind === 'process');
test('Hakka retains literal Original source and round-trips reviewed Code', () => {
  const before = parseRecipe(restoreReviewedInstructions(source, path));
  assert.equal(renderOriginalSource(recipe), renderOriginalSource(before));
  const code = renderCode(recipe, { comments: true });
  const reparsed = parseRecipe(code, { vocabulary });
  assert.equal(renderCode(reparsed, { comments: true }), code);
  assert.equal(renderOriginalSource(reparsed), renderOriginalSource(recipe));
  assert.ok(!recipe.diagnostics.some(d => d.severity === 'error' || /SUBJECT|UNRESOLVED|AMBIGUOUS/.test(d.code)));
});
test('Hakka splits action heads and retains source timing and quantitative endpoints', () => {
  assert.equal(processes.length, 32);
  assert.deepEqual(processes.slice(0, 12).map(t => t.name), ['preheat', 'add', 'cover', 'bring to boil', 'add', 'reduce heat', 'cover', 'cook', 'add', 'remove', 'leave covered', 'roll']);
  assert.deepEqual(tokens.filter(t => t.kind === 'judgement').map(t => t.judgement!.text), ['tender and liquid absorbed', 'golden-brown and cooked through', 'slightly softened', 'fragrant', 'sauce thickens slightly and coats meatballs']);
  for (const fact of ['450F', '1 1/4 cup water', '1/4 tsp salt', '12-14m', '9 equal-sized meatballs', '8-10m', '1/2-inch pieces', '1/4 cup water', '1 Tbsp', '2-3m', '30s', '1m'])
    assert.ok(nodes.some(n => n.tokens.map(t => t.raw).join('').includes(fact)), fact);
  for (const n of nodes.filter(n => n.tokens.some(t => t.name === 'stir' && t.kind === 'process'))) {
    if (n.tokens.some(t => t.kind === 'result' && ['veggies', 'meatballs in sauce'].includes(t.name!)))
      assert.ok(source.slice(0, n.span.start).lastIndexOf('Meanwhile [') >= 0);
  }
  assert.ok(!processes.some(t => /[.;]/.test(t.raw)));
});
test('Hakka Compact preserves subjects, overlapping work, vessels and finishing actions', () => {
  const compact = renderCompact(recipe);
  for (const phrase of ['Preheat the oven at 450°F.', 'While the rice cooks:', 'halfway through cooking', 'Roll the meatball mixture (into 9 equal-sized meatballs).', 'On a parchment-lined baking sheet:', 'on the middle rack in the oven', 'In a small bowl:', 'Heat the large non-stick pan over medium-high heat.', 'Stir the veggies (occasionally).', 'Stir the veggies (constantly).', 'Stir the meatballs in sauce gently.', 'with salt and pepper to taste', 'with a fork', 'between plates', 'any sauce in the pan', 'Sprinkle the cilantro (remaining) (over top).'])
    assert.ok(compact.includes(phrase), phrase);
  assert.ok(!/then\s*[.,]|the While|the In the/.test(compact));
  const mixture = nodes.find(n => n.tokens[0]?.name === 'meatball mixture')!;
  const roll = nodes.find(n => n.tokens.some(t => t.name === 'roll'))!;
  assert.equal(roll.inheritedSubjectId, mixture.id);
  const codeHtml = renderHtml(recipe, { syntaxSpans: true });
  assert.equal((codeHtml.match(/class="os-syntax-value">\?=/g) ?? []).length, 5);
  assert.ok(renderHtml(recipe, { view: 'compact' }).replace(/<[^>]+>/g, '').includes('until golden-brown and cooked through'));
});
test('Hakka seasoning/taste idiom is not treated as a second action', () => {
  const audit = auditConversion(recipe, vocabulary);
  assert.equal(audit.ingredients.referenced, 13); assert.equal(audit.equipment.referenced, 4);
  assert.equal(audit.ruleCounts.CQ003, 0); assert.equal(audit.ruleCounts.CQ004, 0);
  const flagged = audit.diagnostics.filter(d => d.rule === 'CQ005');
  assert.equal(flagged.length, 0);
  assert.ok(recipe.diagnostics.every(d => d.code === 'FREE_TEXT'));
});
