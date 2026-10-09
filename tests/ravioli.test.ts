import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseRecipe, renderCode, renderCompact, renderOriginalSource, renderHtml } from '../src/index.ts';
import type { Node, Statement } from '../src/model/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { auditConversion } from '../src/conversion-quality.ts';
import { restoreReviewedInstructions } from './helpers/reviewed-instructions.ts';
const path = 'examples/public-domain-recipes/ravioli/ravioli.opensauce';
const source = readFileSync(path, 'utf8'), vocabulary = await loadVocabulary('.');
const recipe = parseRecipe(source, { vocabulary });
const instructions = recipe.sections.find(s => s.name === 'instructions')!;
const visit = (nodes: Node[]): Statement[] => nodes.flatMap(n => n.kind === 'statement' ? [n, ...visit(n.children)] : n.kind === 'group' ? visit(n.children) : []);
const statements = visit(instructions.children), tokens = statements.flatMap(s => s.tokens);
const actions = tokens.filter(t => t.kind === 'process');
const code = renderCode(recipe, { comments: true }), compact = renderCompact(recipe);

test('Ravioli preserves Original and reviewed history, including declaration corrections', () => {
  const historical = restoreReviewedInstructions(source, path);
  assert.equal(renderOriginalSource(recipe), renderOriginalSource(parseRecipe(historical)));
  assert.equal(renderCode(parseRecipe(code, { vocabulary }), { comments: true }), code);
  assert.ok(recipe.diagnostics.every(d => d.code === 'FREE_TEXT'));
  for (const [before, after, message] of [
    ['(olive oil, for Dough) a drizzle', '(olive oil, for Dough) 100 g', /unreviewed ingredients|publication/],
    ['(plastic wrap)\n', '(pot)\n', /unreviewed equipment|publication/],
    ['::equipment\n', '::equipment # changed\n', /non-instruction bytes/],
    ['title: "Ravioli"', 'title: "Changed"', /non-instruction bytes/],
  ] as const) assert.throws(() => restoreReviewedInstructions(source.replace(before, after), path), message);
});

test('Ravioli retains dough and rolling alternatives, optional seafood and overlapping filling work', () => {
  const top = instructions.children;
  const alternatives = top.flatMap((n, i) => n.kind === 'statement' && n.tokens.some(t => t.raw === '-OR-') ? [i] : []);
  assert.equal(alternatives.length, 2);
  for (const i of alternatives) {
    assert.equal(top[i - 1].kind, 'group'); assert.equal(top[i + 1].kind, 'group');
  }
  const first = alternatives[0];
  assert.ok(source.slice(top[first - 1].span.start, top[first - 1].span.end).includes('Well method:'));
  assert.ok(source.slice(top[first + 1].span.start, top[first + 1].span.end).includes('Stand-mixer method'));
  assert.match(code, /<rest, 15-30m>\nMeanwhile \[/);
  assert.match(code, /Optional \[\s*\{cheese filling\} \+ \(seafood\)/);
  assert.match(compact, /Choose seafood \(optional\) from:[\s\S]*Chopped leftover lobster legs[\s\S]*Lobster tail[\s\S]*Minced crab/);
  assert.ok(!/skip to step|As stated in step|step \d/.test(source.slice(source.indexOf('::instructions'), source.indexOf('::source'))));
});

test('Ravioli splits key actions, uses additions and keeps suitable result endpoints', () => {
  for (const name of ['crack', 'break up', 'mix', 'bring together', 'knead', 'zest', 'juice', 'grate', 'take out', 'cut', 'press', 'expel', 'seal', 'cook'])
    assert.ok(actions.some(t => t.name === name), name);
  assert.ok(!actions.some(t => t.name === 'add'));
  assert.deepEqual([...new Set(tokens.filter(t => t.kind === 'result').map(t => t.name))].sort(), ['cheese filling', 'dough', 'ravioli']);
  const judgements = tokens.filter(t => t.kind === 'judgement').map(t => t.judgement!.text);
  for (const condition of ['smooth', 'a nice smooth ball', 'you can just barely see your hand through it', 'the two pieces of dough stick together', 'firmly closed with no visible leaks or air bubbles', 'they float to the top'])
    assert.ok(judgements.includes(condition), condition);
  const audit = auditConversion(recipe, vocabulary);
  assert.equal(audit.ruleCounts.CQ005, 0);
  assert.equal(audit.ruleCounts.CQ008, 0);
  assert.equal(audit.equipment.referenced, audit.equipment.total);
  assert.deepEqual(audit.ingredients.unreferenced.map(i => i.name), ['leftover lobster legs', 'lobster tail', 'crab']);
  assert.ok(!recipe.sections.find(s => s.name === 'equipment')!.children.some(n => n.kind === 'statement' && n.tokens.some(t => t.name === 'pot')));
});

test('Ravioli Compact retains action subjects, source choices and approximate timings', () => {
  for (const phrase of ['Add olive oil to the egg (for Dough).', 'for approximately 5–10 minutes, until smooth.', 'for approximately 3–5 minutes.', 'Mix the cheese filling, until ingredients evenly distributed.', 'Expel the air (from between the sheets).', 'If you did not use a pasta cutter:', 'With a fork:', 'until firmly closed with no visible leaks or air bubbles', 'Store the ravioli on a floured wax paper sheet or freeze them for later.', 'Cook the ravioli for 1–2 minutes, until they float to the top.', 'about 16 x 8 inches', 'leaving a few inches on each side for seams', 'For the seafood version', 'a pinch of red pepper flakes'])
    assert.ok(compact.includes(phrase), phrase);
  assert.ok(!/Expel the ravioli|the While|the In the|then\s*[.,]/.test(compact));
  assert.ok(renderHtml(recipe, { view: 'compact' }).replace(/<[^>]+>/g, '').includes('Expel the air'));
});
