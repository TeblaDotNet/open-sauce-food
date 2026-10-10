import { restoreRecipePublication } from './helpers/recipe-publication.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { parseRecipe, renderCode, renderCompact, Vocabulary } from '../src/index.ts';
import type { Node, Recipe, Statement } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { recipeFiles } from '../scripts/corpus.ts';

function statements(recipe: Recipe): Statement[] {
  const result: Statement[] = [];
  function visit(nodes: Node[]): void {
    for (const n of nodes) if (n.kind === 'statement' || n.kind === 'group') {
      if (n.kind === 'statement') result.push(n);
      visit(n.children);
      if (n.kind === 'group' && n.condition) result.push(n.condition);
    }
  }
  visit(recipe.preamble); recipe.sections.forEach(s => visit(s.children)); return result;
}
const errors = (r: Recipe) => r.diagnostics.filter(d => d.severity === 'error');
const instruction = (s: string) => parseRecipe(`::recipe\nname: Test\n::instructions\n${s}`);

for (const file of (await readdir('tests/fixtures')).filter(f => f.endsWith('.opensauce'))) {
  test(`fixture: ${file}`, async () => {
    const source = await readFile(`tests/fixtures/${file}`, 'utf8');
    const recipe = parseRecipe(source);
    assert.deepEqual(errors(recipe), []);
    assert.equal(recipe.source, source);
    for (const n of statements(recipe)) for (const t of n.tokens) assert.equal(source.slice(t.span.start, t.span.end), t.raw);
    const code = renderCode(recipe, { comments: true });
    const reparsed = parseRecipe(code);
    assert.deepEqual(errors(reparsed), []);
    assert.equal(renderCode(reparsed, { comments: true }), code);
    assert.deepEqual(statements(reparsed).map(n => n.tokens.map(t => t.raw)), statements(recipe).map(n => n.tokens.map(t => t.raw)));
    const compact = renderCompact(recipe, { comments: true });
    for (const node of statements(recipe)) for (const token of node.tokens) {
      if (token.kind === 'thing' || token.kind === 'result') assert.ok(compact.toLowerCase().includes(token.name!.toLowerCase()), token.raw);
      for (const parameter of token.parameters ?? []) {
        if (!/^~?\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?[smh]$/.test(parameter)) assert.ok(compact.includes(parameter === "1-2in strips" ? "1–2 in strips" : parameter === "350f" ? "350°F" : parameter), parameter);
      }
    }
    assert.ok(compact.includes('Instructions:'));
  });
}

test('complete live corpus: no syntax errors, lossless token spans and working renderers', async () => {
  const files = await recipeFiles('.');
  const imported = JSON.parse(await readFile('public-domain-import.json', 'utf8'));
  assert.ok(files.length >= imported.summary.finalPromoted);
  assert.equal(files.filter(f => f.replaceAll('\\', '/').startsWith('examples/public-domain-recipes/')).length, imported.summary.finalPromoted);
  const vocabulary = await loadVocabulary('.');
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const recipe = parseRecipe(source, { vocabulary });
    assert.deepEqual(errors(recipe), [], file);
    assert.ok(renderCompact(recipe).length, file);
    const code = renderCode(recipe, { comments: true });
    assert.deepEqual(errors(parseRecipe(code)), [], file);
    for (const n of statements(recipe)) for (const t of n.tokens) assert.equal(source.slice(t.span.start, t.span.end), t.raw, file);
  }
});

test('inherited subject is scoped to indentation and group', () => {
  const r = instruction('{cake mix} <spoon, loaf tin>\n    <level surface>\n    <bake, 50-55m>\n{cake} <cool, slightly>\n    <pierce, top>\nMeanwhile [\n    <wait>\n]\n<serve>');
  const nodes = statements(r);
  assert.equal(nodes[1].inheritedSubjectId, nodes[0].id);
  assert.equal(nodes[2].inheritedSubjectId, nodes[0].id);
  assert.equal(nodes[4].inheritedSubjectId, nodes[3].id);
  assert.equal(nodes[5].inheritedSubjectId, undefined);
  assert.equal(nodes[6].inheritedSubjectId, undefined);
  const compact = renderCompact(r);
  assert.match(compact, /Spoon the cake mix into the loaf tin/);
  assert.match(compact, /level the surface/);
  assert.match(compact, /then bake for 50–55 minutes/);
  assert.match(compact, /Allow the cake to cool slightly/);
  assert.match(compact, /then pierce the top/);
  assert.equal(nodes[3].tokens[0].implicit, true);
});

test('named ingredient choices, equipment and ingredient parts', () => {
  const r = parseRecipe('::ingredients\n(fat) =\n    (butter) 20g\n    -OR-\n    (oil) 20g\n(egg) 2\n::equipment\n(bowl)\n::instructions\n(fat) <melt>\n(egg, yolk) <beat, bowl>\n(bowl) <wash>');
  const nodes = statements(r);
  assert.equal(nodes[0].role, 'choice');
  assert.equal(nodes[0].children.length, 3);
  assert.equal(nodes.at(-3)!.tokens[0].thingKind, 'choice');
  assert.equal(nodes.at(-2)!.tokens[0].thingKind, 'ingredient');
  assert.equal(nodes.at(-1)!.tokens[0].thingKind, 'equipment');
});

test('fractions, equivalents, approximations and unusual quantities stay distinct', () => {
  const r = parseRecipe('::ingredients\n(yeast) 1.25/4tsp\n(flour) 1 1/2 cups / ~240g\n(salt) to taste\n(water) as needed');
  const nodes = statements(r);
  assert.equal(nodes[0].tokens.filter(t => t.raw === '/').length, 0);
  assert.equal(nodes[1].tokens.filter(t => t.raw === '/').length, 1);
  assert.ok(nodes[1].tokens.some(t => t.raw === '~'));
  assert.match(renderCompact(r), /1\.25\/4tsp/);
  assert.match(renderCompact(r), /to taste/);
  assert.match(renderCompact(r), /as needed/);
});

test('nested groups, Repeat condition and alternative relationship survive rendering', () => {
  const r = instruction('Repeat [\n    Optional [\n        {mix} <stir>\n    ]\n]\nuntil {mix} smooth\n[\n    {mix} <bake>\n]\n-OR-\n[\n    {mix} <fry>\n]');
  assert.deepEqual(errors(r), []);
  const group = r.sections.at(-1)!.children[0];
  assert.equal(group.kind, 'group');
  if (group.kind === 'group') assert.equal(group.condition?.role, 'condition');
  const compact = renderCompact(r);
  assert.match(compact, /Repeat:/);
  assert.match(compact, /Optional:/);
  assert.match(compact, /Until mix smooth/);
  assert.match(renderCode(r), /\]\n-OR-\n\[/);
});

test('inline groups and process alternatives', () => {
  const r = instruction('Optional [ {cake} <cool> ]\n{cake} <bake, 20m> -OR- {cake} <fry, until golden>');
  assert.deepEqual(errors(r), []);
  assert.match(renderCompact(r), /OR fry the cake until golden/);
});

test('comments, story and both image forms have independent view controls', () => {
  const source = '::recipe # header\nname: Picture\nsource: https://example.org/#recipe\nimage: hero.jpg\n::instructions\n# private\n{mix} <stir> # inline\n![stage](stage.jpg#view)\n::story\nA tale with ![inline](inline.jpg).\n# story private';
  const r = parseRecipe(source);
  assert.deepEqual(errors(r), []);
  for (const render of [renderCode, renderCompact]) {
    assert.doesNotMatch(render(r), /private|# header|# inline/);
    assert.match(render(r, { comments: true }), /private/);
    assert.match(render(r, { comments: true }), /# header/);
    assert.doesNotMatch(render(r, { images: false }), /hero\.jpg|stage\.jpg|inline\.jpg/);
    assert.match(render(r, { images: false }), /A tale/);
    assert.doesNotMatch(render(r, { story: false }), /A tale/);
    assert.match(render(r, { story: false }), /stage\.jpg/);
    assert.match(render(r), /https:\/\/example.org\/#recipe/);
  }
});

test('malformed syntax reports source locations and preserves original input', () => {
  for (const [source, code] of [
    ['(flour', 'UNCLOSED_TOKEN'], ['{mix', 'UNCLOSED_TOKEN'], ['<bake', 'UNCLOSED_TOKEN'],
    [')', 'UNEXPECTED_DELIMITER'], [']', 'UNEXPECTED_GROUP_END'], ['Repeat [\n{mix} <stir>', 'UNCLOSED_GROUP'],
    ['<>', 'EMPTY_NAME'], ['= (flour)', 'INVALID_ASSIGNMENT'], ['{mix} =', 'MISSING_ASSIGNMENT_VALUE'],
    ['Repeat [\n::story\nUnclosed', 'UNCLOSED_GROUP']
  ]) {
    const r = instruction(source);
    assert.ok(errors(r).some(d => d.code === code), source);
    assert.ok(errors(r).every(d => d.span.line >= 4 && d.span.column >= 1));
    assert.ok(r.source.endsWith(source));
  }
});

test('unknown content is retained and unresolved references are warnings', () => {
  const r = instruction('(mystery) <perform magic, as needed>\nJust follow the packet.\n::future\nKeep [all] <this> prose');
  assert.deepEqual(errors(r), []);
  assert.ok(r.diagnostics.some(d => d.code === 'UNRESOLVED_REFERENCE'));
  assert.ok(r.diagnostics.some(d => d.code === 'UNKNOWN_SECTION'));
  assert.match(renderCompact(r), /Just follow the packet/);
  assert.match(renderCode(r), /Keep \[all\] <this> prose/);
});

test('vocabulary uses explicit aliases only and preserves source spelling', async () => {
  const vocabulary = new Vocabulary([{ id: 'courgette', kind: 'ingredient', names: { 'en-GB': 'courgette' }, aliases: ['zucchini'] }]);
  const r = parseRecipe('::ingredients\n(zucchini) 1', { vocabulary });
  assert.equal(statements(r)[0].tokens[0].canonicalId, 'courgette');
  assert.match(renderCode(r), /\(zucchini\)/);
  const current = await loadVocabulary('.');
  assert.equal(current.entries.length, 723);
  assert.equal(current.resolve('zucchini', 'ingredient').length, 1);
  assert.equal(current.resolve('courgette', 'ingredient')[0].id, current.resolve('zucchini', 'ingredient')[0].id);
  assert.equal(current.resolve('baking sheet', 'equipment')[0].id, 'baking-tray');
  assert.equal(current.resolve('bring to boil', 'process')[0].id, 'boil');
  assert.deepEqual(current.resolve('courgette, medium, ~6cm sticks', 'ingredient'), []);
});

test('CRLF, Unicode and tabs keep exact token offsets', () => {
  const r = parseRecipe('::instructions\r\n{crème} <stir>\r\n\t<cool>\r\n');
  const nodes = statements(r);
  assert.equal(nodes[1].inheritedSubjectId, nodes[0].id);
  for (const n of nodes) for (const t of n.tokens) assert.equal(r.source.slice(t.span.start, t.span.end), t.raw);
});

test('fixture copies match the promoted recipes', async () => {
  for (const file of (await readdir('tests/fixtures')).filter(f => f.endsWith('.opensauce'))) {
    const name = file.replace('.opensauce', '');
    assert.equal((await readFile(`tests/fixtures/${file}`, 'utf8')).replaceAll('\r\n', '\n'),
      restoreRecipePublication(await readFile(`examples/public-domain-recipes/${name}/${file}`, 'utf8'), name).replaceAll('\r\n', '\n'));
  }
});

test('canonical aliases resolve local references without rewriting names or phrases', async () => {
  const vocabulary = await loadVocabulary('.');
  const r = parseRecipe('::ingredients\n(courgette) 1\n::equipment\n(baking tray)\n::instructions\n(zucchini) <bring to boil>\n(baking sheet) <remove from heat>', { vocabulary });
  const [vegetable, tray] = statements(r).slice(-2);
  assert.equal(vegetable.tokens[0].thingKind, 'ingredient');
  assert.equal(vegetable.tokens[0].canonicalId, 'courgette');
  assert.equal(tray.tokens[0].thingKind, 'equipment');
  assert.equal(tray.tokens[0].canonicalId, 'baking-tray');
  assert.equal(tray.tokens.find(t => t.kind === 'process')?.canonicalId, 'remove');
  assert.match(renderCompact(r), /Remove from heat/);
  assert.match(renderCode(r), /\(zucchini\) <bring to boil>/);
});

test('raw observations can be loaded separately without creating aliases', async () => {
  const raw = await loadVocabulary('vocabulary-raw/draft6-seed');
  assert.equal(raw.resolve('zucchini', 'ingredient')[0].id, 'zucchini');
  assert.equal(raw.resolve('courgette', 'ingredient')[0].id, 'courgette');
});

test('conditions attach to nested Repeat blocks once', () => {
  const r = instruction('{mix} <stir>\n    Repeat [\n        {mix} <fold>\n    ]\n    until smooth\nuntil extra');
  const first = r.sections.at(-1)!.children[0];
  assert.equal(first.kind, 'statement');
  if (first.kind === 'statement') {
    const group = first.children[0];
    assert.equal(group.kind, 'group');
    if (group.kind === 'group') assert.equal(group.condition?.tokens.map(t => t.raw).join(''), 'until smooth');
  }
  assert.ok(r.diagnostics.some(d => d.code === 'UNATTACHED_CONDITION'));
});

test('dangling alternatives and invalid assignment targets are errors', () => {
  for (const source of ['-OR-', '{cake} -OR-', '-OR- {cake}', '{cake}\n-OR-', '(a) + (b) = (c)', '<mix> = (a)']) {
    assert.ok(errors(instruction(source)).length > 0, source);
  }
});

test('adjacent hash comments are hidden; image and URL hashes stay literal', () => {
  const r = instruction('{mix} <stir>#secret\n![#stage](image.jpg#view)');
  assert.doesNotMatch(renderCode(r), /secret/);
  assert.match(renderCode(r, { comments: true }), /# secret/);
  assert.match(renderCode(r), /!\[#stage\]\(image.jpg#view\)/);
});

test('Compact assignment prose combines multiline operands and keeps comments', () => {
  const r = instruction('{cream} =\n    (egg, yolk) + # fresh\n    (sugar)\n{cream} <beat>');
  const compact = renderCompact(r, { comments: true });
  assert.match(compact, /Combine egg yolk and sugar to make cream\./);
  assert.match(compact, /# fresh/);
  assert.match(compact, /Beat the cream\./);
  const unknown = renderCompact(instruction('{mix} <spoon, gently>'));
  assert.match(unknown, /Spoon the mix gently/);
});

test('Compact extension hooks format terms and values without changing AST', () => {
  const r = instruction('{cake} <bake, 50m>');
  const before = JSON.stringify(r);
  const out = renderCompact(r, { formatTerm: t => t.kind === 'result' ? 'example cake' : t.name!, formatValue: v => `original ${v}` });
  assert.match(out, /Bake the example cake \(original 50m\)/);
  assert.equal(JSON.stringify(r), before);
});
