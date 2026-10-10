const assert = require('node:assert/strict');

// A click can finish at navigation commit, before the response body is parsed.
async function assertReferenceHeading(page, expectedUrl, options = {}) {
  const selector = '.os-reference h1';
  try {
    assert.equal(page.url(), expectedUrl);
    await page.locator(selector).waitFor({ state: 'visible', ...options });
    assert.equal(page.url(), expectedUrl);
  } catch (cause) {
    const state = await page.evaluate(() => ({
      title: document.title, readyState: document.readyState,
      reference: !!document.querySelector('.os-reference'),
      heading: !!document.querySelector('.os-reference h1'),
    })).catch(() => ({ document: 'unavailable' }));
    throw new Error(`Reference acceptance failed: expected URL=${expectedUrl}; actual URL=${page.url()}; selector=${selector}; ${JSON.stringify(state)}`, { cause });
  }
}
module.exports = { assertReferenceHeading };
