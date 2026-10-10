const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
// Optional browser acceptance: provide Playwright on NODE_PATH or install it locally.
const { chromium } = require('playwright');
const { assertReferenceHeading } = require('./helpers/browser-reference.cjs');
(async () => {
  const port = 4196, base = (process.env.SITE_TEST_ORIGIN ?? `http://127.0.0.1:${port}`) + '/opensaucefood/';
  const server = process.env.SITE_TEST_ORIGIN ? undefined : spawn(process.execPath, ['scripts/site-preview.ts'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore','pipe','pipe'], windowsHide: true });
  const manifest = JSON.parse(await readFile('site-dist/site-manifest.json', 'utf8'));
  const published = manifest.recipes.filter(r => r.conversionStage === 'reworked');
  let serverLog = ''; server?.stdout.on('data', b => serverLog += b); server?.stderr.on('data', b => serverLog += b);
  let browser;
  const evidence = join(tmpdir(), process.env.SITE_TEST_ORIGIN ? 'open-sauce-site-browser-hosting' : 'open-sauce-site-browser-m2');
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(base)).ok) break; } catch {}
      if (server && server.exitCode !== null) throw new Error(`Preview exited: ${serverLog}`);
      if (attempt === 99) throw new Error(`Preview timeout: ${serverLog}`);
      await new Promise(r => setTimeout(r, 100));
    }
    browser = await chromium.launch({ headless: true, ...(process.env.SITE_BROWSER_EXECUTABLE ? { executablePath: process.env.SITE_BROWSER_EXECUTABLE } : {}) });
    await mkdir(evidence, { recursive: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage(), errors = [], badResponses = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) badResponses.push(r.url()); });
    // Verify real Sauce Code tokens: semantic colour is independent of reference links.
    const modelActions = ['transfer','pour','reserve','set-aside','serve','arrange','cover','uncover','adjust','assemble','bottle','brush','check','clean','combine','discard','distribute','divide','drizzle','dust','empty','fill','flip','garnish','grease','halve','keep','keep-warm','reduce-heat','rinse','sprinkle','taste','turn-off-heat'];
    const recipeHtml = await Promise.all(manifest.recipes.map(async r => [r.slug, await readFile(join('site-dist','recipe',r.slug,'index.html'),'utf8')]));
    for (const id of [...modelActions,'blanch','braise','julienne','confit','flambe','render','pan-fry','microwave','dry-roast','steam-dry','sun-dry','age','drain','line','preheat','rub','shape','spread','submerge','reduce']) {
      const match = recipeHtml.find(([,html]) => new RegExp('<[^>]*class="[^"]*os-process[^"]*"[^>]*data-canonical-id="' + id + '"').test(html));
      assert.ok(match, id);
      await page.goto(base + 'recipe/' + match[0] + '/');
      const token = page.locator('[data-view-panel="code"] .os-process[data-canonical-id="' + id + '"]').first();
      assert.ok(await token.isVisible(), id);
      const style = await token.evaluate(el => {
        const ink = el.querySelector('.os-syntax-process');
        return {tag:el.tagName, decoration:getComputedStyle(el).textDecorationLine,
          accent:ink && getComputedStyle(ink).getPropertyValue('--syntax-accent').trim(),
          red:getComputedStyle(el).getPropertyValue('--os-process').trim()};
      });
      assert.ok(style.accent && style.accent === style.red, id);
      assert.equal(style.tag, modelActions.includes(id) ? 'SPAN' : 'A', id);
      if (modelActions.includes(id)) assert.equal(style.decoration,'none',id);
    }
    // Equipment identity/colour remains independent of page eligibility, in both themes.
    for (const dark of [true, false]) {
      await page.goto(base + 'recipe/stracciatella-soup/');
      if (await page.locator('html').evaluate(el => el.classList.contains('dark-mode')) !== dark)
        await page.locator('#dark-mode-toggle').click();
      const bowl = page.locator('[data-view-panel="code"] .os-equipment[data-canonical-id="bowl"]').first();
      const style = await bowl.evaluate(el => {
        const ink = el.querySelector('.os-syntax-equipment');
        return { tag: el.tagName, href: el.getAttribute('href'), decoration: getComputedStyle(el).textDecorationLine,
          accent: getComputedStyle(ink).getPropertyValue('--syntax-accent').trim(),
          blue: getComputedStyle(el).getPropertyValue('--os-equipment').trim() };
      });
      assert.equal(style.tag, 'SPAN'); assert.equal(style.href, null); assert.equal(style.decoration, 'none');
      assert.ok(style.accent && style.accent === style.blue);
    }
    assert.equal((await fetch(base + 'equipment/bowl/')).status, 404);
    // Restore the starting theme expected by the existing toggle acceptance checks.
    await page.locator('#dark-mode-toggle').click();
    for (const [child, parent] of [['paring-knife','knife'],['cast-iron-frying-pan','frying-pan'],['stand-mixer','mixer']]) {
      await page.goto(base + 'equipment/' + child + '/');
      await page.locator('.os-reference a[href="/opensaucefood/equipment/' + parent + '/"]').click();
      assert.equal(page.url(), base + 'equipment/' + parent + '/');
      await page.locator('.os-reference a[href="/opensaucefood/equipment/' + child + '/"]').click();
      assert.equal(page.url(), base + 'equipment/' + child + '/');
    }
    await page.goto(base); await page.screenshot({ path: join(evidence, 'home-desktop.png'), fullPage: true });
    const recipeUrl = base + 'recipe/stracciatella-soup/';
    await page.goto(recipeUrl);
    assert.ok(await page.locator('[data-view-panel="code"]').isVisible());
    assert.ok(!await page.locator('[data-view-panel="compact"]').isVisible());
    assert.ok(await page.locator('.os-image').first().evaluate(img => img.complete && img.naturalWidth > 0));
    await page.screenshot({ path: join(evidence, 'recipe-code-dark.png'), fullPage: true });
    const accent = page.locator('[data-view-panel="code"] .os-syntax-ingredient').first();
    const before = await accent.evaluate(el => getComputedStyle(el).color);
    await page.locator('#syntax-colour').uncheck();
    assert.equal(await page.locator('body').getAttribute('data-colour'), 'off');
    assert.notEqual(await accent.evaluate(el => getComputedStyle(el).color), before);
    await page.locator('#syntax-colour').check();
    await page.locator('#dark-mode-toggle').click();
    assert.ok(!await page.locator('html').evaluate(el => el.classList.contains('dark-mode')));
    await page.reload();
    assert.ok(!await page.locator('html').evaluate(el => el.classList.contains('dark-mode')));
    await page.locator('input[value="compact"]').check();
    assert.ok(await page.locator('[data-view-panel="compact"]').isVisible());
    assert.ok(!await page.locator('[data-view-panel="code"]').isVisible());
    await page.screenshot({ path: join(evidence, 'recipe-compact-light.png'), fullPage: true });
    for (const view of ['code','compact']) {
      for (const [kind, suffix] of [['ingredient','ingredients/egg/'],['process','processes/beat/'],['equipment','equipment/knife/']]) {
        const loopRecipe = kind === 'equipment' ? published.find(r => r.semanticLinks.includes('/opensaucefood/equipment/knife/')) : published.find(r => r.slug === 'stracciatella-soup');
        const loopUrl = base + 'recipe/' + loopRecipe.slug + '/';
        await page.goto(loopUrl); await page.locator(`input[value="${view}"]`).check();
        const link = page.locator(`[data-view-panel="${view}"] a.os-${kind}[href="/opensaucefood/${suffix}"]`).first();
        await page.keyboard.press('Tab'); await link.focus(); assert.equal(await link.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
        await link.click();
        if (kind === 'ingredient') await assertReferenceHeading(page, base + suffix);
        else assert.equal(page.url(), base + suffix);
        await page.getByRole('link', { name: loopRecipe.name, exact: true }).click(); assert.equal(page.url(), loopUrl);
      }
    }
    await page.goto(recipeUrl);
    await page.locator('[data-section-toggle="notes"]').uncheck();
    assert.ok(!await page.locator('[data-view-panel="code"] [data-section="notes"]').isVisible());
    await page.locator('input[value="originalSource"]').check();
    assert.ok(await page.locator('.provenance').isVisible());
    assert.equal(await page.locator('[data-view-panel="originalSource"] a').count(), 0);
    const source = await readFile('examples/public-domain-recipes/stracciatella-soup/stracciatella-soup.opensauce', 'utf8');
    const original = source.split('<<<')[1].split('>>>')[0].replace(/^\r?\n/, '');
    assert.equal((await page.locator('[data-view-panel="originalSource"] code').textContent()).replaceAll('\r',''), original.replaceAll('\r',''));
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(recipeUrl);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('.os-image').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const img = document.querySelector('.os-image'); return img.complete && img.naturalWidth > 0; });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: join(evidence, 'recipe-mobile.png'), fullPage: true });
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const plain = await noJs.newPage(); await plain.goto(recipeUrl);
    assert.ok(await plain.getByRole('heading', { name: 'Stracciatella soup', exact: true }).isVisible());
    assert.ok(await plain.locator('[data-view-panel="code"]').isVisible());
    assert.ok(await plain.locator('.provenance').isVisible());
    assert.ok(!await plain.locator('.controls').isVisible());
    await plain.locator('[data-view-panel="code"] a[href="/opensaucefood/ingredients/egg/"]').first().click();
    await assertReferenceHeading(plain, base + 'ingredients/egg/');
    await plain.getByRole('link', { name: 'Stracciatella soup', exact: true }).click();
    await plain.screenshot({ path: join(evidence, 'recipe-no-javascript.png'), fullPage: true });
    // Full-alpha coverage beyond the original representative.
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(base + 'recipe/apple-pie/');
    assert.equal(await page.locator('input[value="originalSource"]').count(), 0);
    assert.ok(await page.locator('[data-view-panel="code"]').isVisible());
    await page.locator('.os-image').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.os-image').naturalWidth > 0);
    await page.goto(base + 'recipe/butter-cake/');
    assert.equal(await page.locator('img').count(), 0);
    await page.locator('input[value="originalSource"]').check();
    assert.ok(await page.locator('[data-view-panel="originalSource"]').isVisible());
    await page.goto(base + 'recipe/bread/');
    for (const section of ['story','notes']) {
      await page.locator('[data-section-toggle="' + section + '"]').uncheck();
      assert.ok(!await page.locator('[data-view-panel="code"] [data-section="' + section + '"]').isVisible());
      await page.locator('[data-section-toggle="' + section + '"]').check();
    }
    await page.goto(base + 'recipes/');
    assert.equal(await page.locator('#all-recipes [data-recipe]').count(), published.length);
    assert.ok(await page.locator('#all-recipes [data-recipe] a').evaluateAll(links => links.every(a => a.pathname.startsWith('/opensaucefood/recipe/'))));
    await page.screenshot({ path: join(evidence, 'recipes-browse.png') });
    await page.locator('#tags a[href="/opensaucefood/recipes/tag/soup/"]').click();
    assert.equal(await page.locator('[data-recipe]').count(), manifest.tags.find(t => t.slug === 'soup').count);
    await page.screenshot({ path: join(evidence, 'tag-sauce.png'), fullPage: true });
    await page.locator('[data-recipe="stracciatella-soup"] a').click(); assert.equal(page.url(), recipeUrl);
    assert.equal(manifest.categories.length, 12);
    await page.goto(base + 'recipes/');
    assert.equal(await page.locator('#categories a').count(), 12);
    await page.locator('#categories a[href="/opensaucefood/recipes/category/main/"]').click();
    const mainCategory = manifest.categories.find(c => c.value === 'main');
    assert.deepEqual((await page.locator('[data-recipe]').evaluateAll(nodes => nodes.map(n => n.dataset.recipe))).sort(), [...mainCategory.recipes].sort());
    await page.goto(base + 'recipes/category/soup-stew/');
    assert.equal(await page.locator('[data-recipe]').count(), manifest.categories.find(c => c.value === 'soup/stew').count);
    await page.locator('[data-recipe="stracciatella-soup"] a').click();
    assert.equal(page.url(), recipeUrl);
    for (const slug of ['sauce-seasoning-stock', 'miscellaneous']) {
      await page.goto(base + 'recipes/');
      await page.locator('#categories a[href="/opensaucefood/recipes/category/' + slug + '/"]').click();
      assert.equal(await page.locator('[data-recipe]').count(), manifest.categories.find(c => c.slug === slug).count);
      await plain.goto(base + 'recipes/category/' + slug + '/');
      assert.equal(await plain.locator('[data-recipe]').count(), manifest.categories.find(c => c.slug === slug).count);
    }
    assert.equal((await fetch(base + 'recipes/category/sauce/')).status, 404);
    await plain.goto(base + 'recipes/category/bread-baking/');
    assert.equal(await plain.locator('[data-recipe]').count(), manifest.categories.find(c => c.value === 'bread/baking').count);
    await page.goto(base + 'recipe/basic-waffles/');
    assert.ok((await page.locator('[data-view-panel="code"] .os-dietary-notice').textContent()).includes('not a guarantee of suitability'));
    for (const [family, count] of [['ingredients',386],['processes',180],['equipment',120]]) {
      await page.goto(base + family + '/'); assert.equal(await page.locator('[data-reference]').count(), count);
    }
    await page.goto(base + 'ingredients/'); await page.screenshot({ path: join(evidence, 'ingredient-index.png') });
    await page.locator('[data-reference="egg"] a').click();
    await page.screenshot({ path: join(evidence, 'ingredient-egg.png') });
    assert.equal(await page.getByRole('link', { name: 'Apple Pie', exact: true }).count(), 0);
    await page.getByRole('link', { name: 'Stracciatella soup', exact: true }).click(); assert.equal(page.url(), recipeUrl);
    await page.goto(base + 'spec/');
    assert.ok((await page.locator('.spec-document pre code').count()) > 20);
    assert.ok((await page.locator('.spec-document').textContent()).includes('Draft 8'));
    await page.locator('.spec-contents summary').click();
    await page.locator('.spec-contents a').nth(2).click();
    assert.ok(page.url().includes('#spec-'));
    await page.goto(base + 'about/'); assert.ok((await page.locator('main').textContent()).includes('Original recipe source'));
    for (const route of ['recipes/', 'recipes/tag/soup/', 'ingredients/', 'ingredients/egg/', 'processes/beat/', 'equipment/knife/', 'spec/', 'about/', 'recipe/apple-pie/', 'recipe/butter-cake/']) {
      await plain.goto(base + route); assert.ok(await plain.locator('main').isVisible()); assert.ok(await plain.locator('nav').first().isVisible());
      if (route.startsWith('recipe/')) { assert.ok(await plain.locator('[data-view-panel="code"]').isVisible()); assert.ok(await plain.locator('.provenance').isVisible()); }
    }
    await plain.goto(base + 'recipes/tag/soup/'); await plain.locator('[data-recipe="stracciatella-soup"] a').click(); assert.equal(plain.url(), recipeUrl);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ['recipes/', 'ingredients/', 'spec/', 'about/']) { await page.goto(base + route); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile overflow: ' + route); }
    // Initial and blocked remain usable directly, with noindex and a modest notice.
    for (const stage of ['initial','blocked']) {
      const hidden = manifest.recipes.find(r => r.conversionStage === stage);
      await page.goto(base + 'recipe/' + hidden.slug + '/');
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex');
      assert.ok((await page.locator('main .metadata-notice').textContent()).includes('development corpus'));
      assert.ok(await page.locator('[data-view-panel="code"]').isVisible());
      await plain.goto(base + 'recipe/' + hidden.slug + '/');
      assert.ok(await plain.locator('main .metadata-notice').isVisible());
      await page.goto(base + 'recipes/');
      assert.equal(await page.locator('[data-recipe="' + hidden.slug + '"]').count(),0);
    }
    await page.goto(recipeUrl);
    assert.equal(await page.locator('meta[name="robots"]').count(), 0);
    // The retained hidden Mayonnaise page still exercises part navigation without a public backlink.
    await page.goto(base + 'recipe/mayonnaise-or-aioli/');
    await page.locator('[data-view-panel="code"] a[href="/opensaucefood/ingredients/egg/#part-yolk"]').first().click();
    assert.ok(await page.locator('#part-yolk').isVisible());
    assert.equal(await page.getByRole('link',{name:'Mayonnaise or aioli',exact:true}).count(),0);
    assert.equal((await fetch(base + 'recipe/missing/')).status, 404);
    assert.equal((await fetch(base + 'assets/missing.js')).status, 404);
    assert.equal((await fetch(base + 'recipes', { redirect: 'manual' })).status, 301);
    assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
    const result = { status: 'passed', checks: ['Equipment Model v1 blue unlinked bowl in both themes and parent/child navigation','Process Model v1 semantic colour and reference eligibility','Code default','Compact switching','literal original','syntax toggle computed style','theme toggle and persistence','story toggle','Code and Compact ingredient/process/equipment loops','part-yolk anchor','visible keyboard focus','390px no overflow','no-JavaScript navigation and provenance','real 404 and slash redirect','with/without original and image','Story and Notes',published.length + ' published recipe browse links','initial/blocked direct pages and noindex','hidden backlink exclusion','tag and category membership/navigation','386/180/120 reference indexes','public egg/Stracciatella backlink','Spec code examples and contents anchors','About','no-JavaScript browse/index/spec/about routes'], screenshots: evidence };
    await writeFile(join(evidence, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); server?.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
