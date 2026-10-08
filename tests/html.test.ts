import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseRecipe, renderHtml, renderCompact, safeUrl, Vocabulary } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { demoRecipes, createDemoServer } from '../scripts/demo-server.ts';

const vocabulary = new Vocabulary([
  { id: 'courgette', kind: 'ingredient', names: { en: 'courgette' }, aliases: ['zucchini'] },
  { id: 'baking-tray', kind: 'equipment', names: { en: 'baking tray' }, aliases: ['baking sheet'] },
  { id: 'boil', kind: 'process', names: { en: 'boil' }, aliases: ['bring to boil'] }
]);
const source = '::recipe\nname: A recipe\nimage: finished.jpg\n::ingredients\n(zucchini) ~2\n::equipment\n(baking sheet)\n::instructions\n(zucchini) <bring to boil, until golden> # inline note\n    <rest>\n![stage](stage.jpg)\n::story\nA story with ![detail](detail.jpg).\n# private note';

for (const view of ['compact', 'code'] as const) {
  test(`HTML ${view}: semantics, canonical and declaration references, no AST mutation`, () => {
    const r = parseRecipe(source, { vocabulary });
    const before = JSON.stringify(r);
    const html = renderHtml(r, { view, referenceUrl: r => `/reference/${r.kind}/${r.canonicalId}`, idPrefix: 'recipe-1' });
    assert.match(html, /<article /);
    assert.match(html, /<section [^>]*data-section="ingredients"/);
    assert.match(html, /<ul class="os-list"/);
    assert.match(html, /<ol class="os-list"/);
    assert.match(html, /data-kind="ingredient" data-canonical-id="courgette"/);
    assert.match(html, /data-kind="equipment" data-canonical-id="baking-tray"/);
    assert.match(html, /data-kind="process" data-canonical-id="boil"/);
    assert.match(html, /href="\/reference\/process\/boil"/);
    assert.match(html, /data-declaration-ids="recipe-1-n\d+"/);
    assert.match(html, /data-inherited-subject="recipe-1-n\d+"/);
    assert.ok(html.toLowerCase().includes('zucchini'));
    assert.ok(html.toLowerCase().includes('bring to boil'));
    assert.equal(JSON.stringify(r), before);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(ids.length, new Set(ids).size);
    if (view === 'code') assert.match(html, /&lt;bring to boil, until golden&gt;/);
    else assert.match(html, /until golden/);
  });

  test(`HTML ${view}: independent visibility options, including inline story images`, () => {
    const r = parseRecipe(source);
    const defaults = renderHtml(r, { view });
    assert.doesNotMatch(defaults, /inline note|private note/);
    assert.match(defaults, /src="finished.jpg"/);
    assert.match(defaults, /src="stage.jpg"/);
    assert.match(defaults, /src="detail.jpg"/);
    const withoutImages = renderHtml(r, { view, images: false });
    assert.doesNotMatch(withoutImages, /<img|finished.jpg|stage.jpg|detail.jpg/);
    assert.match(withoutImages, /A story with/);
    const withoutStory = renderHtml(r, { view, story: false, comments: true });
    assert.doesNotMatch(withoutStory, /data-section="story"|A story|private note|detail.jpg/);
    assert.match(withoutStory, /inline note/);
    assert.match(withoutStory, /stage.jpg/);
  });

  test(`HTML ${view}: hostile text in every display context is escaped`, () => {
    const r = parseRecipe('::recipe\nname: <script>alert("x")</script> & friends\nsource: javascript:alert(1)\n::ingredients\n(flour, " onmouseover="evil) 2\n::instructions\n{<img src=x onerror=evil>} <mix, </span><script>evil</script>> # <svg onload=evil>\n::story\n</p><script>evil</script>\n![" onerror="evil](photo.jpg)\n::unknown" autofocus="evil\nKeep <b>literal</b>');
    const html = renderHtml(r, { view, comments: true });
    assert.doesNotMatch(html, /<script|<svg|<b>|<img src=x|\sonerror="evil"|\sonmouseover="evil"|href="javascript:/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&lt;svg onload=evil&gt;/);
    assert.match(html, /alt="&quot; onerror=&quot;evil"/);
    assert.match(html, /data-section="unknown&quot; autofocus=&quot;evil"/);
  });
}

test('HTML escapes formatter results and reference IDs; malicious URLs never become attributes', () => {
  const r = parseRecipe(source, { vocabulary });
  const html = renderHtml(r, { view: 'compact', formatTerm: () => '<script>bad</script>', formatValue: () => '<img onerror=bad>', referenceUrl: () => 'javascript:alert(1)' });
  assert.match(html, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.match(html, /&lt;img onerror=bad&gt;/);
  assert.doesNotMatch(html, /<script|<img onerror|href="javascript:/);
  const custom = new Vocabulary([{ id: 'x" onclick="bad', kind: 'ingredient', names: { en: 'zucchini' } }]);
  assert.match(renderHtml(parseRecipe(source, { vocabulary: custom })), /data-canonical-id="x&quot; onclick=&quot;bad"/);
});

test('URL policy rejects active schemes and browser normalization tricks', () => {
  for (const url of ['javascript:alert(1)', 'JaVaScRiPt:evil', 'java\nscript:evil', 'data:image/svg+xml,bad', 'file:///etc/passwd', '//evil.test/x', '\\evil.test/x', 'https://', 'https://ok.test/\u0000x']) {
    assert.equal(safeUrl(url), undefined, url);
    const r = parseRecipe('::recipe\nname: Image\nimage: placeholder');
    const image = r.sections[0].children.find(n => n.kind === 'metadata' && n.key === 'image');
    assert.ok(image?.kind === 'metadata');
    image.value = url; // also exercise arbitrary model input containing embedded controls
    assert.doesNotMatch(renderHtml(r), /<img /, url);
  }
  for (const url of ['https://example.test/a?x=1&y=2', 'http://localhost/a', '/reference/flour', '#part', 'photos/a.webp']) assert.equal(safeUrl(url), url);
});

test('image paths resolve relative to recipe directories, with attribute escaping', () => {
  const r = parseRecipe('::recipe\nname: Picture\nimage: images/a.jpg?x=1&y=2');
  assert.match(renderHtml(r, { assetBaseUrl: '/recipes/test/' }), /src="\/recipes\/test\/images\/a.jpg\?x=1&amp;y=2"/);
  assert.match(renderHtml(r, { assetBaseUrl: 'https://example.test/recipes/test/' }), /src="https:\/\/example.test\/recipes\/test\/images\/a.jpg/);
  assert.doesNotMatch(renderHtml(r, { assetBaseUrl: 'javascript:evil' }), /<img /);
});

test('unresolved terms and recipe-local choices stay unlinked without invented canonical IDs', () => {
  const r = parseRecipe('::ingredients\n(fat) = (butter) -OR- (oil)\n::instructions\n(fat) <magic>\n(mystery) <do something>');
  let links = 0;
  const html = renderHtml(r, { referenceUrl: () => { links++; return '/invented'; } });
  assert.equal(links, 0);
  assert.doesNotMatch(html, /data-canonical-id|href=/);
  assert.match(html, /data-kind="choice"/);
  assert.match(html, /data-kind="unresolved"/);
});

test('group labels, alternatives, Repeat conditions and comments survive both views', () => {
  const r = parseRecipe('::instructions\nRepeat [ # opening\n    Optional [\n        {cake} <cool>\n    ]\n] # closing\nuntil ready\n[\n    {cake} <bake>\n]\n-OR-\n[\n    {cake} <fry>\n]');
  for (const view of ['compact', 'code'] as const) {
    const html = renderHtml(r, { view, comments: true });
    assert.match(html, /data-relationship="Repeat"/);
    assert.match(html, /data-relationship="Optional"/);
    assert.match(html, /[Uu]ntil ready/);
    assert.match(html, /data-role="alternative"/);
    assert.match(html, /# opening/);
    assert.match(html, /# closing/);
  }
});

test('shared Compact phrasing retains text renderer behavior and token names', () => {
  const r = parseRecipe('::instructions\n{cake mix} <spoon, loaf tin>\n    <level surface>\n    <bake, 50-55m>\n{cake} <cool, slightly>\n    <pierce, top>');
  assert.match(renderCompact(r), /Spoon the cake mix into the loaf tin/);
  const html = renderHtml(r, { view: 'compact' });
  assert.match(html, /data-kind="process">Spoon<\/span> the <span[^>]*>cake mix<\/span> into the loaf tin/);
  assert.match(html, /50–55 minutes/);
  assert.match(html, /data-kind="process">cool<\/span> slightly/);
});

const canonical = await loadVocabulary('.');
for (const recipe of demoRecipes) test(`HTML demo fixture: ${recipe.name}`, async () => {
  const r = parseRecipe(await readFile(`examples/public-domain-recipes/${recipe.id}/${recipe.id}.opensauce`, 'utf8'), { vocabulary: canonical });
  for (const view of ['compact', 'code'] as const) {
    const html = renderHtml(r, { view, comments: true });
    assert.match(html, /data-section="ingredients"/);
    assert.match(html, /data-section="equipment"/);
    assert.match(html, /data-section="instructions"/);
    assert.match(html, /data-canonical-id=/);
    assert.doesNotMatch(html, /undefined|null/);
  }
});

test('local demo serves selected sources and modules, denies unrelated files and mutation', async () => {
  const server = await createDemoServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Original recipe source/);
    assert.match(page.headers.get('content-security-policy')!, /object-src 'none'/);
    assert.equal((await (await fetch(base + '/api/recipes')).json()).length, demoRecipes.length);
    assert.equal((await fetch(base + '/examples/public-domain-recipes/tiramisu/tiramisu.opensauce')).status, 200);
    for (const path of ['/package.json', '/.git/config', '/demo/../package.json', '/dist/%2e%2e/package.json', '/examples/public-domain-recipes/apple-pie/../../../src/index.ts'])
      assert.equal((await fetch(base + path)).status, 404, path);
    assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
