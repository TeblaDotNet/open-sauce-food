import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseRecipe, renderCode, renderCompact, renderHtml, Vocabulary, createReferencePage, buildUsageIndex } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import type { Node, Statement } from '../src/model/index.ts';
const vocabulary = await loadVocabulary('.');
const source = (instructions: string) => '::recipe\nname: Test\n::ingredients\n(onion) 1\n(butter) 100g\n(sugar) 100g\n(egg) 1\n(milk) 100ml\n::instructions\n' + instructions + '\n';
const statements = (nodes: Node[]): Statement[] => nodes.flatMap(n => n.kind === 'statement' ? [n, ...statements(n.children)] : n.kind === 'group' ? statements(n.children) : []);
const instructions = (s: string) => {
  const recipe = parseRecipe(source(s), { vocabulary });
  return { recipe, nodes: statements(recipe.sections.find(s => s.name === 'instructions')!.children) };
};
const referenceUrl = ({ kind, canonicalId }: { kind: string; canonicalId: string }) => '/' + kind + '/' + canonicalId + '/';

test('judgement preserves raw body, exact spans and explicit process attachment independently of vocabulary', () => {
  const input = source('(onion) <cook, medium heat> ?= soft and translucent');
  for (const options of [{}, { vocabulary }]) {
    const r = parseRecipe(input, options), n = statements(r.sections.find(s => s.name === 'instructions')!.children)[0];
    const process = n.tokens.find(t => t.kind === 'process')!, j = n.tokens.find(t => t.kind === 'judgement')!;
    assert.deepEqual(process.parameters, ['medium heat']);
    assert.equal(j.raw, '?= soft and translucent');
    assert.equal(j.judgement!.text, 'soft and translucent');
    assert.deepEqual(j.judgement!.processSpan, process.span);
    assert.equal(input.slice(j.span.start, j.span.end), j.raw);
    assert.equal(n.role, 'instruction');
    assert.ok(!r.diagnostics.some(d => d.severity === 'error'));
    assert.equal(renderCode(r), input);
    assert.match(renderCompact(r), /Cook the onion over medium heat, until soft and translucent\./);
  }
});
test('judgement follows the last process and Compact handles the requested temperature and duration example', () => {
  const { recipe, nodes } = instructions('<roast, 180C, 20 mins> ?= golden brown');
  assert.match(renderCompact(recipe), /Roast at 180°C for 20 mins, until golden brown\./);
  assert.deepEqual(nodes[0].quantities!.map(q => q.value.trim()), ['180C', '20 mins']);
  const chained = instructions('{batter} <mix> <beat> ?= smooth');
  const j = chained.nodes[0].tokens.find(t => t.kind === 'judgement')!;
  assert.equal(j.judgement!.processSpan!.start, chained.nodes[0].tokens.find(t => t.name === 'beat')!.span.start);
  assert.match(renderCompact(chained.recipe), /Mix the batter, then beat, until smooth\./);
});
test('judgement is one orange unit, safely escaped and opaque to references and numeric quantities', () => {
  const { recipe, nodes } = instructions('<roast> ?= <add> (onion) & \"golden\" 100g');
  assert.equal(nodes[0].tokens.filter(t => t.kind === 'process').length, 1);
  assert.deepEqual(nodes[0].quantities, []);
  const seen: string[] = [];
  const html = renderHtml(recipe, { syntaxSpans: true, referenceUrl: t => { seen.push(t.canonicalId); return referenceUrl(t); } });
  assert.ok(html.includes('<span class="os-syntax-value">?= &lt;add&gt; (onion) &amp; &quot;golden&quot; 100g</span>'));
  assert.equal(seen.filter(id => id === 'add').length, 0);
  assert.ok(!renderHtml(recipe, { syntaxSpans: false }).includes('os-syntax-'));
  assert.ok(!renderHtml(recipe, { view: 'compact', syntaxSpans: true }).includes('os-syntax-'));
  assert.match(renderHtml(recipe, { view: 'compact' }), /until .*&lt;add&gt;/);
});
test('judgement keeps comment syntax and CRLF spans; unattached or empty targets have dedicated diagnostics', () => {
  const input = source('<roast> ?= golden brown # check colour').replaceAll('\n', '\r\n');
  const r = parseRecipe(input), n = statements(r.sections.find(s => s.name === 'instructions')!.children)[0];
  assert.equal(n.comment, 'check colour');
  assert.equal(n.tokens.at(-1)!.raw, '?= golden brown');
  assert.equal(input.slice(n.tokens.at(-1)!.span.start, n.tokens.at(-1)!.span.end), '?= golden brown');
  assert.match(renderCode(r, { comments: true }), /\?= golden brown # check colour/);
  for (const s of ['?= golden', '(onion) ?= soft', '<cook> extra ?= soft', '<cook>\n?= soft']) {
    const r = instructions(s).recipe;
    assert.ok(r.diagnostics.some(d => d.code === 'UNATTACHED_JUDGEMENT'), s);
    assert.ok(!r.diagnostics.some(d => d.code === 'INVALID_ASSIGNMENT'), s);
  }
  assert.ok(instructions('<cook> ?=').recipe.diagnostics.some(d => d.code === 'EMPTY_JUDGEMENT'));
});
test('judgement after an inline alternative stays attached in Compact', () => {
  assert.match(renderCompact(instructions('{batter} <mix> -OR- {batter} <beat> ?= smooth').recipe), /OR beat the batter, until smooth\./);
});
test('result definition supports several inherited actions, additions and faithful concise Code', () => {
  const body = '{batter} = (butter) + (sugar)\n    <beat> ?= incorporated\n    + (egg: yolk) <beat, one at a time>\n    + (milk) <beat>';
  const { recipe, nodes } = instructions(body);
  assert.equal(nodes[0].children.filter(n => n.kind === 'statement').length, 3);
  for (const n of nodes.slice(1)) assert.equal(n.inheritedSubjectId, nodes[0].id);
  assert.ok(!recipe.diagnostics.some(d => d.code === 'MISSING_SUBJECT'));
  assert.equal(renderCode(recipe), source(body));
  const compact = renderCompact(recipe);
  assert.match(compact, /Beat the batter, until incorporated\./);
  assert.match(compact, /Add egg yolk to the batter, then beat the batter \(one at a time\)\./);
  assert.match(compact, /Add milk to the batter, then beat the batter\./);
});
test('explicit and inherited result subjects have equivalent Compact action wording', () => {
  const inherited = renderCompact(instructions('{batter} = (butter) + (sugar)\n    <beat> ?= incorporated').recipe);
  const explicit = renderCompact(instructions('{batter} = (butter) + (sugar)\n{batter} <beat> ?= incorporated').recipe);
  assert.equal(inherited.replace(/^ +/gm, ''), explicit);
});
test('result inheritance works inside Optional and ends at dedent, group and section boundaries', () => {
  const { recipe, nodes } = instructions('Optional [\n    {batter} = (butter) + (sugar)\n        <mix> ?= smooth\n]\n<beat>\n{other} = (milk)\n    <mix>\n<roast>\n::instructions\n    <whisk>');
  assert.equal(nodes[1].inheritedSubjectId, nodes[0].id);
  assert.equal(nodes[2].inheritedSubjectId, undefined);
  assert.equal(nodes[4].inheritedSubjectId, nodes[3].id);
  assert.equal(nodes[5].inheritedSubjectId, undefined);
  const last = statements(recipe.sections.at(-1)!.children)[0];
  assert.equal(last.inheritedSubjectId, undefined);
  assert.match(renderCompact(recipe), /Mix the batter, until smooth\./);
  assert.ok(!recipe.diagnostics.some(d => d.code === 'MISSING_SUBJECT'));
});
test('result assignment RHS is never the inherited subject and thing assignments gain no result-definition scope', () => {
  const { recipe, nodes } = instructions('{batter} = (butter) + (sugar) <mix>\n    <beat>');
  assert.equal(nodes[1].inheritedSubjectId, nodes[0].id);
  assert.match(renderCompact(recipe), /Beat the batter\./);
  const other = instructions('(onion) = (butter)\n    <beat>');
  assert.equal(other.nodes[1].inheritedSubjectId, undefined);
  assert.ok(other.recipe.diagnostics.some(d => d.code === 'MISSING_SUBJECT'));
});
test('known generic actions retain IDs, red styling and Compact wording but no links, pages or reference usage', () => {
  for (const verb of ['add', 'remove', 'place', 'remove from heat']) {
    const { recipe, nodes } = instructions('(onion) <' + verb + '>');
    const token = nodes[0].tokens.find(t => t.kind === 'process')!;
    assert.equal(token.reference, false);
    assert.ok(token.canonicalId);
    const html = renderHtml(recipe, { syntaxSpans: true, referenceUrl });
    assert.ok(html.includes('<span class="os-syntax-process">' + verb + '</span>'));
    assert.ok(!html.includes('href="/process/'));
    assert.ok(!renderHtml(recipe, { view: 'compact', referenceUrl }).includes('href="/process/'));
    assert.ok(renderCompact(recipe).toLowerCase().includes(verb));
    assert.equal(createReferencePage(vocabulary, 'process', token.canonicalId!), undefined);
    assert.equal(buildUsageIndex([{ id: 'test', name: 'Test', recipe }]).concepts[JSON.stringify(['process', token.canonicalId])], undefined);
  }
});
test('put and unknown actions remain legal, red and unlinked; culinary techniques still have reference pages', () => {
  for (const verb of ['put', 'unknown-action']) {
    const { recipe, nodes } = instructions('(onion) <' + verb + '>');
    assert.equal(nodes[0].tokens.find(t => t.kind === 'process')!.canonicalId, undefined);
    assert.ok(!recipe.diagnostics.some(d => d.severity === 'error'));
    const html = renderHtml(recipe, { syntaxSpans: true, referenceUrl });
    assert.ok(html.includes('<span class="os-syntax-process">' + verb + '</span>'));
    assert.ok(!html.includes('href="/process/'));
  }
  for (const verb of ['roast', 'knead', 'ferment', 'caramelise', 'simmer', 'whisk']) {
    const r = instructions('(onion) <' + verb + '>').recipe;
    const entry = vocabulary.resolve(verb, 'process')[0];
    assert.ok(entry, verb);
    assert.ok(createReferencePage(vocabulary, 'process', entry.id));
    assert.ok(renderHtml(r, { referenceUrl }).includes('href="/process/' + entry.id + '/"'));
  }
});
test('reference classification is validated data and survives browser serialization', () => {
  // Reference eligibility also works for independently supplied technique vocabularies.
  const technique = new Vocabulary([{ id: 'blanch', kind: 'process', names: { en: 'blanch' } }]);
  assert.ok(createReferencePage(technique, 'process', 'blanch'));
  assert.match(renderHtml(parseRecipe(source('<blanch>'), { vocabulary: technique }), { referenceUrl }), /href="\/process\/blanch\/"/);
  const copy = new Vocabulary(JSON.parse(JSON.stringify(vocabulary.entries)));
  assert.equal(copy.resolve('add', 'process')[0].reference, false);
  assert.throws(() => new Vocabulary([{ id: 'bad', kind: 'ingredient', names: { en: 'bad' }, reference: false }]), /reference must/);
  assert.throws(() => new Vocabulary([{ id: 'bad', kind: 'process', names: { en: 'bad' }, reference: 'no' as never }]), /reference must/);
});
test('existing orange colour family covers light/dark and colour-off without adding a semantic colour', async () => {
  const css = await readFile('demo/style.css', 'utf8');
  assert.match(css, /os-syntax-value/);
  assert.match(css, /body\[data-colour="off"\]/);
  assert.match(css, /html\.dark-mode/);
  assert.ok(css.includes('--os-value: var(--tebla-ochre)'));
  const { recipe } = instructions('<roast> ?= golden');
  const html = renderHtml(recipe, { syntaxSpans: true });
  assert.match(html, /class="os-syntax-value">\?= golden/);
  assert.ok(!html.includes('os-syntax-judgement'));
});
