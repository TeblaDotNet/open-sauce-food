const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require('playwright');
const { assertReferenceHeading } = require('./helpers/browser-reference.cjs');

// Optional Playwright regression; run after site:build with the same browser
// environment as site-browser.cjs. Stream unchanged built HTML in two chunks.
(async () => {
  let releaseBody;
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://local').pathname.replace(/^\/opensaucefood\//, '');
      const data = await readFile(join(process.cwd(), 'site-dist', path.endsWith('/') ? path + 'index.html' : path));
      res.setHeader('Content-Type', path.endsWith('/') ? 'text/html' : path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
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
