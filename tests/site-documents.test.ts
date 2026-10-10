import assert from 'node:assert/strict';
import test from 'node:test';
import { aboutPage } from '../scripts/site/documents.ts';
import { shell } from '../scripts/site/shell.ts';
import { routes, siteConfig } from '../scripts/site/routes.ts';
test('About uses the current explanation with one development section and working source routes', () => {
  const config = siteConfig(), urls = routes(config);
  const html = shell(config, urls, 'About', urls.page('about'), aboutPage(config, urls));
  assert.equal((html.match(/<h2>Early development<\/h2>/g) ?? []).length, 1);
  assert.ok(!html.includes('class="development-notice"'));
  for (const text of ['Sauce Code', 'Compact', 'Original Source', 'structure where structure is useful', 'Normal browsing focuses on reworked recipes', 'Source for this page']) assert.ok(html.includes(text), text);
  for (const href of [urls.recipes(), urls.page('spec'), config.github, urls.source('README.md'), urls.source('scripts/site/documents.ts')]) assert.ok(html.includes('href="' + href + '"'), href);
  assert.ok(!html.includes('noindex')); assert.ok(!html.includes('programming exercise'));
});

import { readFile } from 'node:fs/promises';
import { parseRecipe } from '../src/parser/index.ts';
import { highlightSauceCode } from '../scripts/site/sauce-code.ts';
import { renderSpec } from '../scripts/site/documents.ts';
const decode = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
test('Spec highlights exact source using existing semantic roles without links or executable HTML', () => {
  const source = '::ingredients\n(flour; plain) !500g\n(egg: yolk) 2\n::equipment\n(knife)\n::instructions\n{dough} <cut, with (knife)> ?= smooth & "ready"\n';
  const html = highlightSauceCode(source);
  assert.equal(decode(html), source);
  for (const role of ['ingredient','equipment','specificity','process','result','value']) assert.ok(html.includes('os-syntax-' + role), role);
  assert.ok(!html.includes('<a ')); assert.ok(!html.includes('style='));
  assert.ok(html.includes('os-syntax-value">?= smooth &amp; &quot;ready&quot;'));
  assert.equal(decode(highlightSauceCode('<script>alert(1)</script>')), '<script>alert(1)</script>');
  assert.ok(!highlightSauceCode('<script>alert(1)</script>').includes('<script>'));
});
test('only opensauce fences are highlighted; source blocks and ordinary fences remain literal', () => {
  const source = '::source\n<<<\n(egg) <mix> & raw\n>>>\n';
  assert.equal(decode(highlightSauceCode(source)), source);
  assert.ok(!highlightSauceCode(source).includes('os-syntax-'));
  const urls = routes(siteConfig());
  for (const language of ['sh','yaml','text']) {
    const html = renderSpec('```' + language + '\n(egg) <mix>\n```', urls);
    assert.ok(!html.includes('os-syntax-')); assert.ok(html.includes('&lt;mix&gt;'));
  }
});
test('current approved Spec examples parse without errors and retain every source character', async () => {
  const spec = (await readFile('SPEC.md', 'utf8')).replaceAll('\r\n', '\n');
  assert.ok(spec.includes('Sauce Code \u2014 Draft 8'));
  for (const text of ['?=', '~~', '!500g', '; plain', 'egg: yolk', 'Original Source', 'recommendation value', 'reworked', 'not a fully structured alternative']) assert.ok(spec.includes(text), text);
  assert.ok(!/Draft [27]|schema does not exist/.test(spec));
  let count = 0;
  for (const match of spec.matchAll(/```opensauce(?: (\w+))?\n([\s\S]*?)\n```/g)) {
    const context = match[1] ?? 'instructions', source = match[2];
    const prefix = /^::[a-z]/m.test(source) ? '' : '::' + context + '\n';
    assert.deepEqual(parseRecipe(prefix + source).diagnostics.filter(d => d.severity === 'error'), [], source);
    assert.equal(decode(highlightSauceCode(source, context)), source); count++;
  }
  assert.ok(count > 20);
});
