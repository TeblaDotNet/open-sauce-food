import { restoreGeneratedReconversion } from './helpers/generated-reconversion.ts';
import { restoreReviewedInstructions } from './helpers/reviewed-instructions.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { curationOrigins, curationReviews, readCuration, parseRecipe, renderCode, renderHtml, Vocabulary, createReferencePage, renderReferenceHtml } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';

for (const origin of curationOrigins) for (const review of curationReviews) {
  test(`independent curation values: ${origin} / ${review}`, () => {
    const curation = { origin, review };
    assert.deepEqual(readCuration(curation), { curation, warnings: [] });
    const source = `::recipe\nname: Test\ncuration origin: ${origin}\ncuration review: ${review}\n::source\n<<<\nOriginal\r\n>>>\n`;
    const recipe = parseRecipe(source);
    assert.deepEqual(recipe.curation, curation);
    assert.equal(recipe.source, source);
    assert.deepEqual(parseRecipe(renderCode(recipe)).curation, curation);
    assert.match(renderHtml(recipe), /Encoding curation:/);
    const vocabulary = new Vocabulary([{ id: 'test', kind: 'ingredient', names: { en: 'Test' }, curation }]);
    assert.deepEqual(vocabulary.diagnostics, []);
    const page = createReferencePage(vocabulary, 'ingredient', 'test')!;
    assert.deepEqual(page.curation, curation);
    assert.ok(renderReferenceHtml(page).includes(`${origin} · ${review === 'checked' ? 'human checked' : 'unchecked'}`));
  });
}

test('missing status stays unknown; malformed status warns and preserves raw values', () => {
  assert.deepEqual(readCuration(undefined), { warnings: [] });
  assert.equal(parseRecipe('::recipe\nname: Legacy').curation, undefined);
  for (const raw of [null, 'checked', [], {}, { origin: 'robot', review: 'checked' }, { origin: 'human', review: 'certified' }, { origin: 'human', review: 'checked', extra: true }]) {
    const entry = { id: 'test', kind: 'process' as const, names: { en: 'Test' }, curation: raw };
    const vocabulary = new Vocabulary([entry as any]);
    assert.ok(vocabulary.diagnostics.every(d => d.code === 'INVALID_CURATION'));
    assert.ok(vocabulary.diagnostics.length);
    assert.equal(vocabulary.entries[0].curation, raw);
    assert.equal(createReferencePage(vocabulary, 'process', 'test')!.curation, undefined);
  }
  for (const fields of ['curation: checked', 'curation origin: robot\ncuration review: unchecked', 'curation origin: human', 'curation origin: human\ncuration review: certified', 'curation origin: human\ncuration review: checked\ncuration review: unchecked']) {
    const source = `::recipe\nname: Test\n${fields}`;
    const recipe = parseRecipe(source);
    assert.equal(recipe.curation, undefined);
    assert.ok(recipe.diagnostics.some(d => d.code === 'INVALID_CURATION' && d.severity === 'warning'));
    assert.equal(recipe.source, source);
    assert.ok(renderCode(recipe).includes(fields));
  }
});

test('YAML loader preserves curation for all entry kinds and diagnoses malformed values', async () => {
  const root = await mkdtemp(join(tmpdir(), 'opensauce-curation-'));
  try {
    for (const [folder, kind] of [['ingredients','ingredient'],['equipment','equipment'],['processes','process']]) {
      await mkdir(join(root, folder));
      await writeFile(join(root, folder, 'index.yaml'), 'schema_version: "0.3"\nentries:\n  - file: test.yaml\n  - file: legacy.yaml\n  - file: invalid.yaml\n');
      const base = `kind: ${kind}\nnames:\n  en: Test\n`;
      await writeFile(join(root, folder, 'test.yaml'), `id: test\n${base}curation:\n  origin: generated\n  review: checked\n`);
      await writeFile(join(root, folder, 'legacy.yaml'), `id: legacy\n${base}`);
      await writeFile(join(root, folder, 'invalid.yaml'), `id: invalid\n${base}curation: unreviewed\n`);
    }
    const vocabulary = await loadVocabulary(root);
    assert.equal(vocabulary.diagnostics.length, 3);
    for (const entry of vocabulary.entries) {
      if (entry.id === 'test') assert.deepEqual(entry.curation, { origin: 'generated', review: 'checked' });
      if (entry.id === 'legacy') assert.equal(entry.curation, undefined);
      if (entry.id === 'invalid') assert.equal(entry.curation, 'unreviewed');
    }
    const restored = new Vocabulary(JSON.parse(JSON.stringify(vocabulary.entries)));
    assert.equal(JSON.stringify(restored.entries), JSON.stringify(vocabulary.entries));
    assert.deepEqual(restored.diagnostics, vocabulary.diagnostics);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('293 encoding metadata additions remain intact after reviewed instruction replacements', async () => {
  const manifest = JSON.parse(await readFile('public-domain-import.json', 'utf8'));
  const records = manifest.records.filter((r: any) => r.conversionStatus === 'converted');
  assert.equal(records.length, 293);
  for (const record of records) {
    const source = await readFile(record.opensaucePath, 'utf8');
    assert.deepEqual(parseRecipe(source).curation, { origin: 'generated', review: 'unchecked' }, record.slug);
    const previous = restoreReviewedInstructions(restoreGeneratedReconversion(source, record.slug), record.slug).replace(/^::recipe\r?\ncuration origin: generated\ncuration review: unchecked\n/, '::recipe\n').replaceAll('\r\n', '\n');
    assert.equal(createHash('sha256').update(previous).digest('hex'), record.outputSha256, record.slug);
  }
});
