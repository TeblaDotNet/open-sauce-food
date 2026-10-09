import assert from 'node:assert/strict';
import test from 'node:test';
import { assertNoCache } from '../scripts/hosting-headers.ts';

test('hosting Cache-Control accepts no-cache with surrounding HTTP whitespace', () => {
  for (const value of ['no-cache', 'no-cache ', 'no-cache              ', ' no-cache', '\t no-cache \t']) {
    assert.doesNotThrow(() => assertNoCache(value, '/opensaucefood/assets/style.css'));
  }
});

test('hosting Cache-Control still rejects missing or different effective policies', () => {
  for (const value of [null, '', ' \t', 'no-store', 'max-age=3600', 'no-cache, max-age=0',
    'no-cache, no-cache', 'no- cache', 'NO-CACHE', 'xno-cache', 'no-cachex',
    '\u00a0no-cache', 'no-cache\n']) {
    assert.throws(() => assertNoCache(value, '/opensaucefood/assets/style.css'), {
      name: 'AssertionError', message: /^\/opensaucefood\/assets\/style\.css/,
    });
  }
});
