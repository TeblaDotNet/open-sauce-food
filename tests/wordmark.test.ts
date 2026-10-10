import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {shell} from '../scripts/site/shell.ts';
import {routes,siteConfig} from '../scripts/site/routes.ts';
const config=siteConfig(), urls=routes(config);
test('header wordmark has one accessible name, home destination and both vector variants',()=>{
 const html=shell(config,urls,'Proof',urls.home(),'<h1>Proof</h1>');
 assert.ok(html.includes('class="brand" href="'+urls.home()+'" aria-label="Open Sauce Food"'));
 for(const variant of ['light','dark']) assert.ok(html.includes('src="'+urls.asset('brand/open-sauce-food-wordmark-'+variant+'.svg')+'" alt=""'));
});
test('README uses real transparent wordmarks in both themes and preserves the exact project description',async()=>{
 const readme=await readFile('README.md','utf8');
 assert.ok(readme.includes('media="(prefers-color-scheme: dark)"'));
 assert.ok(readme.includes('alt="Open Sauce Food"'));
 assert.ok(readme.includes('Open Sauce Food is a human-readable recipe language and shared culinary knowledge base, designed for personal recipe collection, versioning, remixing and collaboration.'));
 const css=await readFile('demo/style.css','utf8');
 for(const variant of ['light','dark']){
  const path='assets/brand/open-sauce-food-wordmark-'+variant+'.svg';
  assert.ok(readme.includes(path));const svg=await readFile(path,'utf8');
  assert.match(svg, /<svg\b/);assert.doesNotMatch(svg, /<(rect|image|script|text)\b/);
  for(const color of ['#ddd78c','#da8e8e','#b5e1b8']){assert.ok(css.includes(color));assert.ok(svg.includes(color));}
  assert.ok(svg.includes(variant==='light'?'#202020':'#e6e6e6'));
 }
});
