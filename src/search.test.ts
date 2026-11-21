import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { searchLibrary } from './search.js';
import { queryToPageAddress } from './page.js';

describe('searchLibrary', () => {
  it('ignores blank queries', () => {
    assert.strictEqual(searchLibrary('   ', 0n), null);
  });

  it('is not found until that page has been generated', () => {
    const address = queryToPageAddress('hello');
    const before = searchLibrary('hello', address - 1n);
    assert.strictEqual(before?.type, 'notFound');

    const after = searchLibrary(' hello ', address);
    assert.strictEqual(after?.type, 'found');
    if (after?.type === 'found') {
      assert.strictEqual(after.address, address);
      assert.strictEqual(after.content.length, 280);
    }
  });
});
