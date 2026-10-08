import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseRecipe, renderCode, renderCompact, renderHtml, renderOriginalSource, Vocabulary } from '../src/index.ts';
import type { Statement } from '../src/index.ts';

const first = (s: string) => parseRecipe('::ingredients\n' + s).sections[0].children[0] as Statement;
for (const [raw, base, variant, parts, label] of [
  ['(flour; plain)', 'flour', 'plain', [], 'plain flour'],
  ['(egg: yolk)', 'egg', undefined, ['yolk'], 'egg yolk'],
  ['(orange: peel, finely grated)', 'orange', undefined, ['peel'], 'finely grated orange peel'],
  ['(chicken: thigh: skin)', 'chicken', undefined, ['thigh', 'skin'], 'chicken thigh skin'],
  ['(chicken; free range: thigh: skin)', 'chicken', 'free range', ['thigh', 'skin'], 'free range chicken thigh skin']
] as const) test(`Draft 8 structure: ${raw}`, () => {
  const source = '::ingredients\r\n' + raw + ' !100g\r\n';
  const r = parseRecipe(source), t = (r.sections[0].children[0] as Statement).tokens[0];
  assert.equal(t.name, base); assert.equal(t.variant, variant); assert.deepEqual(t.parts, parts);
  assert.deepEqual(t.qualifiers, raw.includes('finely grated') ? ['finely grated'] : []);
  assert.equal(t.raw, raw); assert.equal(source.slice(t.span.start, t.span.end), raw);
  assert.equal(r.source, source); assert.ok(renderCode(r).includes(raw));
  assert.ok(renderCompact(r).toLowerCase().includes(label));
  assert.ok(renderHtml(r, { view: 'compact' }).toLowerCase().includes(label));
  assert.ok(renderHtml(r, { view: 'code' }).includes(raw));
  assert.deepEqual(r.diagnostics.filter(d => d.severity === 'error'), []);
});
test('legacy comma qualifiers remain unstructured in the model', () => {
  for (const s of ['(egg, yolk)', '(flour, plain)']) {
    const t = first(s).tokens[0];
    assert.equal(t.variant, undefined); assert.deepEqual(t.parts, []);
    assert.equal(t.qualifiers!.length, 1); assert.equal(t.raw, s);
  }
});
test('structured matching distinguishes sibling parts and variants, preserves canonical base IDs', () => {
  const vocabulary = new Vocabulary([{ id: 'egg', kind: 'ingredient', names: { en: 'egg' } }]);
  const r = parseRecipe('::ingredients\n(egg: yolk) 2\n(egg: white) 2\n(flour; plain) 100g\n(flour; rye) 100g\n::instructions\n(egg: yolk) <beat>\n(flour; plain) <add>', { vocabulary });
  const nodes = r.sections[1].children as Statement[];
  assert.equal(nodes[0].tokens[0].canonicalId, 'egg');
  for (const n of nodes) assert.equal(n.tokens[0].declarationIds!.length, 1);
  assert.match(renderHtml(r, { view: 'compact' }), /data-parts="\[&quot;yolk&quot;\]"/);
  const wrong = parseRecipe('::ingredients\n(egg: white)\n::instructions\n(egg: yolk) <beat>');
  assert.ok(wrong.diagnostics.some(d => d.code === 'UNRESOLVED_REFERENCE'));
  const derived = parseRecipe('::ingredients\n(chicken; free range)\n::instructions\n(chicken; free range: thigh: skin) <remove>');
  assert.equal((derived.sections[1].children[0] as Statement).tokens[0].declarationIds!.length, 1);
});
for (const [quantity, precision, label] of [['!100g', 'high', 'measure closely: 100g'], ['~100g', 'approximate', 'approximately 100g'], ['~~100g', 'very-approximate', 'very approximately 100g'], ['100g', 'unspecified', '100g']] as const)
  test(`quantity precision: ${quantity}`, () => {
    const source = '::ingredients\n(flour) ' + quantity;
    const r = parseRecipe(source), q = (r.sections[0].children[0] as Statement).quantities![0];
    assert.equal(q.raw, quantity); assert.equal(q.value, '100g'); assert.equal(q.precision, precision);
    assert.equal(source.slice(q.span.start, q.span.end), quantity);
    assert.ok(renderCode(r).includes(quantity)); assert.ok(renderCompact(r).includes(label));
    assert.ok(renderHtml(r, { view: 'compact' }).includes('100g'));
    const reparsed = parseRecipe(renderCode(r));
    assert.equal((reparsed.sections[0].children[0] as Statement).quantities![0].precision, precision);
  });
test('quantity scope includes process parameters and separate equivalents without numerical evaluation', () => {
  const r = parseRecipe('::instructions\n(flour) !1 1/2 cups / ~240g <rest, ~~10-20m>\n(spinach) ~~1 handful');
  const [a,b] = r.sections[0].children as Statement[];
  assert.deepEqual(a.quantities!.map(q => q.precision), ['high', 'approximate', 'very-approximate']);
  assert.equal(b.quantities![0].raw, '~~1 handful');
  for (const n of [a,b]) for (const q of n.quantities!) assert.equal(r.source.slice(q.span.start,q.span.end),q.raw);
  assert.equal(a.tokens[0].qualifiers!.length, 0);
  assert.match(renderCompact(r), /very approximately 10–20 minutes/);
});
test('notes and story have independent visibility in text and HTML', () => {
  const r = parseRecipe('::story\nFamily history\n::notes\nFreeze leftovers');
  for (const render of [renderCompact, renderCode, renderHtml]) {
    assert.ok(render(r, { story: false }).includes('Freeze leftovers'));
    assert.ok(!render(r, { story: false }).includes('Family history'));
    assert.ok(render(r, { notes: false }).includes('Family history'));
    assert.ok(!render(r, { notes: false }).includes('Freeze leftovers'));
  }
});
for (const eol of ['\n', '\r\n', '\r']) test(`opaque source preserves ${JSON.stringify(eol)} and resumes parsing`, () => {
  const payload = ['# Heading', '::ingredients', '(thing) {result} <script>alert(1)</script> []', '', '', '', '**Markdown** https://example.org/#x', '![image](x.jpg)', ' <<<', ' >>>', ''].join(eol);
  const input = '::source' + eol + '<<<' + eol + payload + '>>>' + eol + '::notes' + eol + 'Store chilled' + eol;
  const r = parseRecipe(input), source = r.sections[0].originalSource!;
  assert.equal(source.text, payload); assert.equal(input.slice(source.span.start, source.span.end), payload);
  assert.equal(renderOriginalSource(r), payload);
  assert.equal(renderOriginalSource(parseRecipe(renderCode(r))), payload);
  assert.equal(r.sections[1].name, 'notes'); assert.match(renderCompact(r), /Store chilled/);
  assert.ok(!renderCompact(r).includes('alert(1)'));
  const html = renderHtml(r, { view: 'originalSource', comments: false, images: false, story: false });
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('# Heading')); assert.ok(html.includes('![image](x.jpg)'));
  assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img'));
  assert.deepEqual(r.diagnostics.filter(d => d.severity === 'error'), []);
});
test('source fencing diagnoses malformed input and never parses an unclosed payload', () => {
  for (const input of ['::source\n', '::source\n  <<<\n']) assert.ok(parseRecipe(input).diagnostics.some(d => d.code === 'MISSING_SOURCE_FENCE'));
  const r = parseRecipe('::source\n<<<\n::ingredients\n(broken');
  assert.equal(renderOriginalSource(r), '::ingredients\n(broken');
  assert.ok(r.diagnostics.some(d => d.code === 'UNCLOSED_SOURCE'));
  assert.ok(!r.diagnostics.some(d => d.code === 'UNCLOSED_TOKEN'));
  assert.equal(renderHtml(parseRecipe('::notes\nNo original'), { view: 'originalSource' }), '');
});
test('malformed explicit thing structure reports a diagnostic without losing source', () => {
  for (const raw of ['(egg:)', '(flour;)', '(chicken: thigh; free range)', '(egg::yolk)']) {
    const r = parseRecipe('::ingredients\n' + raw);
    assert.ok(r.diagnostics.some(d => d.code === 'INVALID_THING_STRUCTURE'));
    assert.ok(renderCode(r).includes(raw));
  }
});
test('every embedded source matches verified local Markdown, with only documented fence newline additions', async () => {
  const records = JSON.parse(await readFile('draft8-migration.json', 'utf8'));
  assert.equal(records.length,117);
  const embedded = records.filter((r: { sourcePath?: string }) => r.sourcePath);
  assert.equal(embedded.length,98);
  for (const item of embedded) {
    const original = await readFile(item.sourcePath, 'utf8');
    const hash = createHash('sha256').update(original).digest('hex');
    // The repository's existing text=auto eol=lf policy normalizes CRLF at commit.
    assert.ok(hash === item.sha256 || hash === item.lfSha256, item.recipe);
    const r = parseRecipe(await readFile(item.file, 'utf8'));
    assert.equal(renderOriginalSource(r), original + (original.endsWith('\n') ? '' : '\n'), item.recipe);
    assert.equal(renderOriginalSource(parseRecipe(renderCode(r))), renderOriginalSource(r), item.recipe);
  }
});
