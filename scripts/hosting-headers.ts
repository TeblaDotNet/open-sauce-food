import assert from 'node:assert/strict';

/** Ignore only surrounding HTTP optional whitespace (SP / HTAB). */
export function assertNoCache(value: string | null, context: string): void {
  assert.equal(value?.replace(/^[ \t]+|[ \t]+$/g, ''), 'no-cache', context);
}
