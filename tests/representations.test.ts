import assert from 'node:assert/strict';
import test from 'node:test';
import * as api from '../src/index.ts';

test('Code is primary, Compact is generated prose, original provenance is literal', () => {
  const input='::ingredients\n(flour) 100g\n::instructions\n(flour) <mix>\n::source\n<<<\n<script>untrusted</script>\n(raw) <not syntax>\n>>>\n';
  const recipe=api.parseRecipe(input);
  assert.equal(recipe.source,input);
  assert.match(api.renderCode(recipe),/\(flour\) <mix>/);
  assert.match(api.renderCompact(recipe),/Mix the flour\./);
  assert.doesNotMatch(api.renderCompact(recipe),/untrusted/);
  assert.equal(api.renderOriginalSource(recipe),'<script>untrusted</script>\n(raw) <not syntax>\n');
  assert.equal(recipe.sections.at(-1)!.originalSource!.text,api.renderOriginalSource(recipe));
  assert.equal(api.renderHtml(recipe),api.renderHtml(recipe,{view:'code'}));
  assert.match(api.renderHtml(recipe,{view:'code',syntaxSpans:true}),/os-view-code/);
  assert.match(api.renderHtml(recipe,{view:'code',syntaxSpans:true}),/os-syntax-/);
  const compact=api.renderHtml(recipe,{view:'compact',syntaxSpans:true});
  assert.match(compact,/os-view-compact/);assert.doesNotMatch(compact,/os-syntax-/);
  const original=api.renderHtml(recipe,{view:'originalSource',syntaxSpans:true});
  assert.match(original,/aria-label="Original recipe source"/);
  assert.match(original,/&lt;script&gt;untrusted&lt;\/script&gt;/);
  assert.doesNotMatch(original,/<script>|os-token|os-syntax-/);
  assert.equal('renderEnglish' in api,false);assert.equal('renderSource' in api,false);
});

test('missing original provenance does not synthesize another recipe view', () => {
  const r=api.parseRecipe('::instructions\n(flour) <mix>');
  assert.equal(api.renderOriginalSource(r),'');
  assert.equal(api.renderHtml(r,{view:'originalSource'}),'');
});
