const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require('playwright');
const { assertReferenceHeading, assertReferenceFragment } = require('./helpers/browser-reference.cjs');

// Optional Playwright regression; run after site:build with the same browser
// environment as site-browser.cjs. Stream unchanged built HTML in two chunks.
(async () => {
  let releaseBody;
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://local').pathname.replace(/^\/opensaucefood\//, '');
      const data = await readFile(join(process.cwd(), 'site-dist', path.endsWith('/') ? path + 'index.html' : path));
      res.setHeader('Content-Type', path.endsWith('/') ? 'text/html' : path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'text/javascript' : path.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream');
      if (path === 'ingredients/egg/') {
        const split = data.indexOf('<article');
        assert.ok(split > 0);
        res.write(data.subarray(0, split));
        releaseBody = () => res.end(data.subarray(split));
      } else res.end(data);
    } catch (error) { res.writeHead(500); res.end(String(error)); }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.SITE_BROWSER_EXECUTABLE ? { executablePath: process.env.SITE_BROWSER_EXECUTABLE } : {}) });
    const page = await browser.newPage();
    const base = `http://127.0.0.1:${server.address().port}/opensaucefood/`;
    for (let repetition = 1; repetition <= 5; repetition++) {
      for (const view of ['code', 'compact']) {
        await page.goto(base + 'recipe/stracciatella-soup/');
        await page.locator(`input[value="${view}"]`).check();
        const link = page.locator(`[data-view-panel="${view}"] a[href="/opensaucefood/ingredients/egg/"]`).first();
        await page.keyboard.press('Tab'); await link.focus();
        await link.click();
        assert.equal(page.url(), base + 'ingredients/egg/');
        // Demonstrate that the old instantaneous assertion fails at commit.
        assert.equal(await page.locator('.os-reference h1').isVisible(), false);
        const accepted = assertReferenceHeading(page, base + 'ingredients/egg/');
        releaseBody();
        await accepted;
        await page.getByRole('link', { name: 'Stracciatella soup', exact: true }).click();
        assert.equal(page.url(), base + 'recipe/stracciatella-soup/');
        console.log(`Streamed reference passed: repetition ${repetition} ${view}`);
      }
    }
    // Hold the exact yolk target back until the assertion is waiting: no sleeps.
    for (let repetition = 1; repetition <= 10; repetition++) {
      await page.goto(base + 'recipe/mayonnaise-or-aioli/');
      await page.locator('[data-view-panel="code"] a[href="/opensaucefood/ingredients/egg/#part-yolk"]').first().click();
      const expected = base + 'ingredients/egg/#part-yolk';
      assert.equal(page.url(), expected);
      assert.equal(await page.locator('#part-yolk').isVisible(), false);
      const accepted = assertReferenceFragment(page, expected);
      releaseBody();
      await accepted;
      await assertReferenceHeading(page, expected);
      assert.match(await page.locator('#part-yolk h3').innerText(), /^egg\s*\u203a\s*yolk$/);
      assert.equal(await page.getByRole('link', { name: 'Mayonnaise or aioli', exact: true }).count(), 0);
      console.log(`Streamed Mayonnaise -> egg/yolk passed: repetition ${repetition}`);
    }
    const expected = base + 'ingredients/egg/#part-yolk';
    await assert.rejects(assertReferenceFragment(page, base + 'ingredients/egg/#part-white'), /expected fragment=#part-white.*becameVisibleBeforeTimeout=false/);
    await page.locator('#part-yolk').evaluate(el => el.hidden = true);
    await assert.rejects(assertReferenceFragment(page, expected, { timeout: 100 }), /becameVisibleBeforeTimeout=false.*"targetExisted":true/);
    await page.locator('#part-yolk').evaluate(el => el.remove());
    await assert.rejects(assertReferenceFragment(page, expected, { timeout: 100 }), /becameVisibleBeforeTimeout=false.*"targetExisted":false/);
    await page.goto(base + 'recipe/stracciatella-soup/');
    // A wrong target and a missing heading must still fail with diagnostics.
    await assert.rejects(assertReferenceHeading(page, base + 'ingredients/egg/'), /expected URL=.*actual URL=.*selector=\.os-reference h1/);
    await assert.rejects(assertReferenceHeading(page, page.url(), { timeout: 100 }), /readyState.*reference.*heading/);
  } finally {
    releaseBody?.();
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
