import { formatNumber, formatMoney, formatPageNumber, formatPagesPerSecond, wrapText } from './format.js';

function test(name, fn, args, expected) {
  const result = fn(...args);
  // Handle array comparison
  let match;
  if (Array.isArray(result) && Array.isArray(expected)) {
    match = JSON.stringify(result) === JSON.stringify(expected);
  } else {
    match = String(result) === String(expected);
  }
  if (match) {
    passed++;
    console.log(`  ✓ ${name}(${args.map(a => String(a)).join(', ')}) = ${result}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}(${args.map(a => String(a)).join(', ')}) = ${result} (expected ${expected})`);
  }
}

let passed = 0;
let failed = 0;

// formatNumber tests
test('formatNumber 0', formatNumber, [0], '0');
test('formatNumber 42', formatNumber, [42], '42');
test('formatNumber 999', formatNumber, [999], '999');
test('formatNumber 1000', formatNumber, [1000], '1.00K');
test('formatNumber 1500', formatNumber, [1500], '1.50K');
test('formatNumber 999999', formatNumber, [999999], '1000.00K');
test('formatNumber 1000000', formatNumber, [1000000], '1.00M');
test('formatNumber 2500000', formatNumber, [2500000], '2.50M');
test('formatNumber 7500000000', formatNumber, [7500000000], '7.50B');
test('formatNumber 1500000000000', formatNumber, [1500000000000], '1.50T');
test('formatNumber 999999999999999', formatNumber, [999999999999999], '1000.00T');
test('formatNumber 1000000000001', formatNumber, [1000000000001], '1.00T');

// formatMoney tests
test('formatMoney 0', formatMoney, [0], '$0');
test('formatMoney 42', formatMoney, [42], '$42');
test('formatMoney 999', formatMoney, [999], '$999');
test('formatMoney 1000', formatMoney, [1000], '$1.00K');
test('formatMoney 1500', formatMoney, [1500], '$1.50K');
test('formatMoney 10000', formatMoney, [10000], '$10.00K');
test('formatMoney 1500000', formatMoney, [1500000], '$1.50M');
test('formatMoney large', formatMoney, [99999999999999999999], '$1.00e+20');

// formatPageNumber tests
test('formatPageNumber 0n', formatPageNumber, [0n], '0');
test('formatPageNumber 42n', formatPageNumber, [42n], '42');
test('formatPageNumber 1000n', formatPageNumber, [1000n], '1,000');
test('formatPageNumber 847293841029n', formatPageNumber, [847293841029n], '847,293,841,029');
test('formatPageNumber 123456789012345n', formatPageNumber, [123456789012345n], '123,456,789,012,345');
test('formatPageNumber large', formatPageNumber, [99999999999999999999n], '1.00e+20');

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

console.log(`\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
