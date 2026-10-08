import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRecipe, renderCompact, renderHtml, renderCode } from '../src/index.ts';

const recipe = (instructions: string, ingredients = '', equipment = '') => parseRecipe(`::ingredients\n${ingredients}\n::equipment\n${equipment}\n::instructions\n${instructions}`);
for (const [items, expected] of [
  ['(apple) + (lemon)', 'apple and lemon'],
  ['(apple) + (lemon) + (sugar)', 'apple, lemon, and sugar'],
  ['(apple) + (lemon) + (sugar) + (salt)', 'apple, lemon, sugar, and salt']
]) test(`Compact list: ${expected}`, () => {
  assert.ok(renderCompact(recipe(`{mix} = ${items}`)).includes(`Combine ${expected} to make mix.`));
});
test('one inherited action preserves source and HTML child identity', () => {
  const r = recipe('(apple) <peel>\n    <cut, 1-2in strips>', '(apple) 2');
  const before = JSON.stringify(r), code = renderCode(r);
  assert.match(renderCompact(r), /Peel the apple, then cut into 1–2 in strips\./);
  assert.match(renderHtml(r, { view: 'compact' }), /<span id="[^"]+" data-inherited-subject="[^"]+">/);
  assert.equal(JSON.stringify(r), before);
  assert.equal(renderCode(r), code);
});
test('several inherited actions use a final then', () => {
  assert.match(renderCompact(recipe('(dough) <knead, 10m>\n    <rest, 30m>\n    <shape>', '(dough)')), /Knead the dough for 10 minutes, rest for 30 minutes, then shape\./);
});
test('natural qualifiers keep parts, types and preparation', () => {
  const result = renderCompact(recipe('{mix} = (egg, yolk) + (sugar, white) + (onion, finely chopped)'));
  assert.match(result, /Combine egg yolk, white sugar, and finely chopped onion to make mix/);
});
test('unique declarations shed redundant context only in instructions', () => {
  const result = renderCompact(recipe('(water, ice-cold, for crust) <add>', '(water, ice-cold, for crust) 50ml'));
  assert.match(result, /water \(ice-cold; for crust\) 50ml/i);
  assert.match(result, /Add the water\./);
});
test('duplicate bases retain the smallest available discriminator', () => {
  const result = renderCompact(recipe('(water, ice-cold, for crust) <add>\n(sugar, white, for crust) <add>', '(water, ice-cold, for crust) 50ml\n(water, for wash) 15ml\n(sugar, white, for crust) 20g\n(sugar, brown, for filling) 30g'));
  assert.match(result, /Add the water \(ice-cold\)\./);
  assert.match(result, /Add the white sugar\./);
});
test('same type with two roles keeps the role; ambiguous references stay ambiguous', () => {
  const r = recipe('(sugar, white, for crust) <add>\n(sugar, white) <stir>', '(sugar, white, for crust) 20g\n(sugar, white, for filling) 30g');
  assert.match(renderCompact(r), /Add the white sugar \(for crust\)/);
  assert.ok(r.diagnostics.some(d => d.code === 'AMBIGUOUS_REFERENCE'));
});
test('unknown qualifiers and parameters remain visible and escaped', () => {
  const r = recipe('(salt, mysterious) <scatter, a & b>');
  assert.match(renderCompact(r), /salt \(mysterious\).*\(a & b\)/);
  assert.match(renderHtml(r, { view: 'compact' }), /a &amp; b/);
});
test('safe parameter roles and opaque fallback', () => {
  const result = renderCompact(recipe('{crust} <process, food processor, 5-10s>\n{filling} <reduce, saucepan, medium-low heat, ~15m, stirring regularly>\n(baking tray) <layer, cream>', '', '(food processor)\n(saucepan)\n(baking tray)'));
  assert.match(result, /Process the crust using the food processor for 5–10 seconds/);
  assert.match(result, /Reduce the filling in the saucepan over medium-low heat for approximately 15 minutes, stirring regularly/);
  assert.match(result, /Layer the baking tray \(cream\)/);
});
test('visible comments and alternatives are continuation boundaries', () => {
  const r = recipe('(apple) <peel> # keep here\n    <cut>\nOptional [\n    (apple) <bake>\n]');
  assert.match(renderCompact(r, { comments: true }), /Peel the apple\.\n  Cut the apple\./);
  assert.match(renderCompact(r, { comments: true }), /# keep here/);
  assert.match(renderCompact(r), /Optional/);
});
test('unknown amount expressions and process arguments are not reinterpreted', () => {
  const r = recipe('{mix} = (cheese) ~35g + extra for serving\n{mix} <remove, saucepan>\n    <spoon, bowl>', '(cheese)', '(saucepan)\n(bowl)');
  assert.match(renderCompact(r), /approximately 35g and extra for serving/);
  assert.match(renderCompact(r), /Remove the mix \(saucepan\), then spoon into the bowl/);
});
test('multiple qualifiers remain when neither alone disambiguates', () => {
  const r = recipe('(water, cold, for crust) <add>', '(water, cold, for crust)\n(water, warm, for crust)\n(water, cold, for wash)');
  assert.match(renderCompact(r), /Add the water \(cold; for crust\)/);
});
