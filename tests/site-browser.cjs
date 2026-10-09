const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
// Optional browser acceptance: provide Playwright on NODE_PATH or install it locally.
const { chromium } = require('playwright');
(async () => {
  const port = 4196, base = (process.env.SITE_TEST_ORIGIN ?? `http://127.0.0.1:${port}`) + '/opensaucefood/';
  const server = process.env.SITE_TEST_ORIGIN ? undefined : spawn(process.execPath, ['scripts/site-preview.ts'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore','pipe','pipe'], windowsHide: true });
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
    await page.goto(base); await page.screenshot({ path: join(evidence, 'home-desktop.png'), fullPage: true });
    const recipeUrl = base + 'recipe/mayonnaise-or-aioli/';
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
      for (const [kind, suffix] of [['ingredient','ingredients/egg/#part-yolk'],['process','processes/blend/'],['equipment','equipment/immersion-blender/']]) {
        await page.goto(recipeUrl); await page.locator(`input[value="${view}"]`).check();
        const link = page.locator(`[data-view-panel="${view}"] a.os-${kind}[href="/opensaucefood/${suffix}"]`).first();
        await page.keyboard.press('Tab'); await link.focus(); assert.equal(await link.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
        await link.click(); assert.equal(page.url(), base + suffix);
        if (kind === 'ingredient') assert.ok(await page.locator('#part-yolk').isVisible());
        await page.getByRole('link', { name: 'Mayonnaise or aioli', exact: true }).click(); assert.equal(page.url(), recipeUrl);
      }
    }
    await page.locator('[data-section-toggle="story"]').uncheck();
    assert.ok(!await page.locator('[data-view-panel="code"] [data-section="story"]').isVisible());
    await page.locator('input[value="originalSource"]').check();
    assert.ok(await page.locator('.provenance').isVisible());
    assert.equal(await page.locator('[data-view-panel="originalSource"] a').count(), 0);
    const source = await readFile('examples/public-domain-recipes/mayonnaise-or-aioli/mayonnaise-or-aioli.opensauce', 'utf8');
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
    assert.ok(await plain.getByRole('heading', { name: 'Mayonnaise or aioli', exact: true }).isVisible());
    assert.ok(await plain.locator('[data-view-panel="code"]').isVisible());
    assert.ok(await plain.locator('.provenance').isVisible());
    assert.ok(!await plain.locator('.controls').isVisible());
    await plain.locator('[data-view-panel="code"] a[href="/opensaucefood/ingredients/egg/#part-yolk"]').first().click();
    assert.ok(await plain.locator('#part-yolk').isVisible());
    await plain.getByRole('link', { name: 'Mayonnaise or aioli', exact: true }).click();
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
    assert.equal(await page.locator('#all-recipes [data-recipe]').count(), 410);
    assert.ok(await page.locator('#all-recipes [data-recipe] a').evaluateAll(links => links.every(a => a.pathname.startsWith('/opensaucefood/recipe/'))));
    await page.screenshot({ path: join(evidence, 'recipes-browse.png') });
    await page.locator('#tags a[href="/opensaucefood/recipes/tag/sauce/"]').click();
    assert.equal(await page.locator('[data-recipe]').count(), 24);
    await page.screenshot({ path: join(evidence, 'tag-sauce.png'), fullPage: true });
    await page.locator('[data-recipe="mayonnaise-or-aioli"] a').click(); assert.equal(page.url(), recipeUrl);
    await page.goto(base + 'recipes/category/baking/');
    assert.equal(await page.locator('[data-recipe]').count(), 3);
    await page.locator('[data-recipe="no-knead-bread"] a').click(); assert.ok(page.url().endsWith('/recipe/no-knead-bread/'));
    for (const [family, count] of [['ingredients',433],['processes',201],['equipment',119]]) {
      await page.goto(base + family + '/'); assert.equal(await page.locator('[data-reference]').count(), count);
    }
    await page.goto(base + 'ingredients/'); await page.screenshot({ path: join(evidence, 'ingredient-index.png') });
    await page.locator('[data-reference="egg"] a').click();
    await page.screenshot({ path: join(evidence, 'ingredient-egg.png') });
    await page.getByRole('link', { name: 'Apple Pie', exact: true }).click(); assert.ok(page.url().endsWith('/recipe/apple-pie/'));
    await page.goto(base + 'spec/');
    assert.ok((await page.locator('.spec-document pre code').count()) > 20);
    assert.ok((await page.locator('.spec-document').textContent()).includes('Draft 8'));
    await page.locator('.spec-contents summary').click();
    await page.locator('.spec-contents a').nth(2).click();
    assert.ok(page.url().includes('#spec-'));
    await page.goto(base + 'about/'); assert.ok((await page.locator('main').textContent()).includes('Original recipe source'));
    for (const route of ['recipes/', 'recipes/tag/sauce/', 'recipes/category/baking/', 'ingredients/', 'ingredients/egg/', 'processes/blend/', 'equipment/immersion-blender/', 'spec/', 'about/', 'recipe/apple-pie/', 'recipe/butter-cake/']) {
      await plain.goto(base + route); assert.ok(await plain.locator('main').isVisible()); assert.ok(await plain.locator('nav').first().isVisible());
      if (route.startsWith('recipe/')) { assert.ok(await plain.locator('[data-view-panel="code"]').isVisible()); assert.ok(await plain.locator('.provenance').isVisible()); }
    }
    await plain.goto(base + 'recipes/tag/sauce/'); await plain.locator('[data-recipe="mayonnaise-or-aioli"] a').click(); assert.equal(plain.url(), recipeUrl);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ['recipes/', 'ingredients/', 'spec/', 'about/']) { await page.goto(base + route); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile overflow: ' + route); }
    assert.equal((await fetch(base + 'recipe/missing/')).status, 404);
    assert.equal((await fetch(base + 'assets/missing.js')).status, 404);
    assert.equal((await fetch(base + 'recipes', { redirect: 'manual' })).status, 301);
    assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
    const result = { status: 'passed', checks: ['Code default','Compact switching','literal original','syntax toggle computed style','theme toggle and persistence','story toggle','Code and Compact ingredient/process/equipment loops','part-yolk anchor','visible keyboard focus','390px no overflow','no-JavaScript navigation and provenance','real 404 and slash redirect','with/without original and image','Story and Notes','410 local recipe browse links','tag and category membership/navigation','433/201/119 reference indexes','additional egg/Apple Pie backlink','Spec code examples and contents anchors','About','no-JavaScript browse/index/spec/about routes'], screenshots: evidence };
    await writeFile(join(evidence, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); server?.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
