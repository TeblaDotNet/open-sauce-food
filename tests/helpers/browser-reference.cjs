const assert = require('node:assert/strict');

// Navigation can commit before the response body containing the target is parsed.
async function assertReferenceTarget(page, expectedUrl, selector, { timeout = 10000 } = {}) {
  const expectedFragment = new URL(expectedUrl).hash;
  let becameVisible = false;
  try {
    assert.equal(page.url(), expectedUrl);
    await page.locator(selector).waitFor({ state: 'visible', timeout });
    becameVisible = true;
    assert.equal(page.url(), expectedUrl);
  } catch (cause) {
    const state = await page.evaluate(selector => ({
      title: document.title, readyState: document.readyState,
      reference: !!document.querySelector('.os-reference'),
      heading: !!document.querySelector('.os-reference h1'),
      targetExisted: !!document.querySelector(selector),
    }), selector).catch(() => ({ document: 'unavailable', targetExisted: 'unknown' }));
    throw new Error(`Reference acceptance failed: expected URL=${expectedUrl}; actual URL=${page.url()}; selector=${selector}; expected fragment=${expectedFragment || '(none)'}; becameVisibleBeforeTimeout=${becameVisible}; timeoutMs=${timeout}; ${JSON.stringify(state)}`, { cause });
  }
}

function assertReferenceHeading(page, expectedUrl, options) {
  return assertReferenceTarget(page, expectedUrl, '.os-reference h1', options);
}

function assertReferenceFragment(page, expectedUrl, options) {
  const fragment = new URL(expectedUrl).hash;
  assert.ok(fragment, 'Expected reference URL must include a fragment');
  return assertReferenceTarget(page, expectedUrl, `[id=${JSON.stringify(decodeURIComponent(fragment.slice(1)))}]`, options);
}
module.exports = { assertReferenceHeading, assertReferenceFragment };
