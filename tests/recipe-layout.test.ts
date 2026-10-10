import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRecipe, renderHtml } from '../src/index.ts';
import { recipePageBody } from '../scripts/site/recipe-page.ts';
import type { RecipeRecord } from '../scripts/site/corpus.ts';
const source = '::recipe\nname: Layout proof\ncategory: main\nserves: 4\ntags: test\ndietary: vegan\ncuisine: Example cuisine\nregion: Example region\nunits: metric\n::story\nA story.\n::ingredients\n(flour) 100g\n::equipment\n(bowl)\n::instructions\n<mix> (flour)\n::notes\nA note.\n::source\n<<<\nOriginal <text> & punctuation.\n>>>\n';
test('section disclosure is opt-in and keeps core sections and original source intact', () => {
  const recipe = parseRecipe(source);
  const normal = renderHtml(recipe);
  assert.ok(!normal.includes('<details'));
  const html = renderHtml(recipe, { collapsedSections: ['recipe', 'story', 'source'] });
  for (const section of ['recipe', 'story', 'source']) assert.ok(html.includes('data-section="' + section + '"><summary>'));
  for (const section of ['ingredients', 'equipment', 'instructions', 'notes']) assert.ok(html.includes('<section class="os-section" data-section="' + section + '"'));
  assert.ok(!html.includes('<details open'));
  assert.equal(renderHtml(recipe, { view: 'originalSource', collapsedSections: ['source'] }), renderHtml(recipe, { view: 'originalSource' }));
});
test('optional primary fields are escaped and absent fields are not promoted', () => {
  const recipe = parseRecipe(source.replace('Example cuisine', '<script>bad</script>'));
  const record = { name: 'Layout proof', provenance: { source: 'javascript:bad', 'source author': '<author>' }, githubUrl: 'https://example.com/source' } as Pick<RecipeRecord, 'name' | 'provenance' | 'githubUrl'>;
  const html = recipePageBody(recipe, record, ['code','compact','originalSource'], {code:'Sauce Code',compact:'Compact',originalSource:'Original Source'}, '', () => '');
  const header = html.split('</header>')[0];
  for (const key of ['category','serves','tags','dietary','cuisine','region']) assert.ok(header.includes('<dt>' + key + '</dt>'));
  assert.ok(header.includes('not a guarantee of suitability'));
  assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('href="javascript:')); assert.ok(html.includes('&lt;author&gt;'));
  const empty = recipePageBody(parseRecipe('::recipe\nname: Empty'), record, ['code'], {code:'Sauce Code',compact:'Compact',originalSource:'Original Source'}, '', () => '');
  assert.ok(!empty.includes('class="recipe-primary"'));
});
