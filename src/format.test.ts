import { it } from 'vitest';
import assert from 'node:assert/strict';
import { formatNumber, formatMoney, formatPageNumber, formatPagesPerSecond, wrapText } from './format.js';

function test(name: string, fn: (...args: any[]) => any, args: any[], expected: any): void {
  it(name, () => {
    const result = fn(...args);
    let match: boolean;
    if (Array.isArray(result) && Array.isArray(expected)) {
      match = JSON.stringify(result) === JSON.stringify(expected);
    } else {
      match = String(result) === String(expected);
    }
    assert.ok(match, `${name}: got ${JSON.stringify(result)}, expected ${JSON.stringify(expected)}`);
  });
}

// formatNumber tests
test('formatNumber 0', formatNumber, [0], '0');
test('formatNumber 42', formatNumber, [42], '42');
test('formatNumber 999', formatNumber, [999], '999');
test('formatNumber 1000', formatNumber, [1000], '1.00K');
test('formatNumber 1500', formatNumber, [1500], '1.50K');
test('formatNumber 999999 carries into M', formatNumber, [999999], '1.00M');
test('formatNumber 1000000', formatNumber, [1000000], '1.00M');
test('formatNumber 2500000', formatNumber, [2500000], '2.50M');
test('formatNumber 7500000000', formatNumber, [7500000000], '7.50B');
test('formatNumber 1500000000000', formatNumber, [1500000000000], '1.50T');
test('formatNumber 999999999999999 carries into scientific', formatNumber, [999999999999999], '1.00e15');
test('formatNumber 1000000000001', formatNumber, [1000000000001], '1.00T');

// formatMoney tests
test('formatMoney 0', formatMoney, [0], '$0');
test('formatMoney 42', formatMoney, [42], '$42');
test('formatMoney 999', formatMoney, [999], '$999');
test('formatMoney 1000', formatMoney, [1000], '$1.00K');
test('formatMoney 1500', formatMoney, [1500], '$1.50K');
test('formatMoney 10000', formatMoney, [10000], '$10.00K');
test('formatMoney 1500000', formatMoney, [1500000], '$1.50M');
test('formatMoney large', formatMoney, [99999999999999999999], '$1.00e20');

// formatPageNumber tests
test('formatPageNumber 0n', formatPageNumber, [0n], '0');
test('formatPageNumber 42n', formatPageNumber, [42n], '42');
test('formatPageNumber 1000n', formatPageNumber, [1000n], '1,000');
test('formatPageNumber 847293841029n', formatPageNumber, [847293841029n], '847,293,841,029');
test('formatPageNumber 123456789012345n', formatPageNumber, [123456789012345n], '123,456,789,012,345');
test('formatPageNumber large', formatPageNumber, [99999999999999999999n], '1.00e20');

// formatPagesPerSecond tests
test('formatPagesPerSecond 0', formatPagesPerSecond, [0], '0.00');
test('formatPagesPerSecond 1', formatPagesPerSecond, [1], '1.00');
test('formatPagesPerSecond 1.5', formatPagesPerSecond, [1.5], '1.50');
test('formatPagesPerSecond 42.123', formatPagesPerSecond, [42.123], '42.12');

// wrapText tests
test('wrapText empty', wrapText, ['', 80], ['']);
test('wrapText short', wrapText, ['hello', 80], ['hello']);
test('wrapText long', wrapText, ['hello world this is a test', 10], ['hello worl', 'd this is ', 'a test']);
test('wrapText exact', wrapText, ['abcdef', 6], ['abcdef']);


// Big numbers, rates and multipliers
import { Decimal } from './bignum.js';
import { formatMultiplier, formatPrice, formatRate } from './format.js';

test('formatNumber beyond the float range', formatNumber, [Decimal.fromParts(1.2345, 500)], '1.23e500');
test('formatNumber scientific carries 9.999e20', formatNumber, [9.999e20], '1.00e21');
test('formatPageNumber huge bigint stays short', formatPageNumber, [7n * 10n ** 400n], '7.00e400');
test('formatRate keeps 2 decimals', formatRate, [1.05], '1.05');
test('formatRate does not drop trailing zeros', formatRate, [1.1], '1.10');
test('formatRate small', formatRate, [0.05], '0.05');
test('formatRate carries 999.996', formatRate, [999.996], '1.00K');
test('formatMultiplier', formatMultiplier, [1.5 ** 2], '×2.25');
test('formatMultiplier huge', formatMultiplier, [Decimal.fromParts(3.2, 40)], '×3.20e40');
test('formatPrice rounds up', formatPrice, [11.5], '$12');
