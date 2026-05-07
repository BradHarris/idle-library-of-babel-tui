/**
 * Number formatting utilities for the Library of Babel idle game.
 * Supports raw (0-9999), K/M/B/T suffixes, and scientific notation.
 */

/**
 * Format a non-negative number with tiered notation.
 * - 0-9,999: raw integer
 * - 10K-999.9T: K/M/B/T with 2 decimal places
 * - above 999.9T: scientific notation
 */
export function formatNumber(n) {
  if (n < 0 || !Number.isFinite(n)) return '0';
  if (n < 1000) {
    return String(Math.floor(n));
  }
  if (n < 1_000_000) {
    const v = n / 1_000;
    return v >= 1000 ? n.toExponential(2) : v.toFixed(2) + 'K';
  }
  if (n < 1_000_000_000) {
    const v = n / 1_000_000;
    return v >= 1000 ? n.toExponential(2) : v.toFixed(2) + 'M';
  }
  if (n < 1_000_000_000_000) {
    const v = n / 1_000_000_000;
    return v >= 1000 ? n.toExponential(2) : v.toFixed(2) + 'B';
  }
  if (n < 1_000_000_000_000_000) {
    const v = n / 1_000_000_000_000;
    return v >= 1000 ? n.toExponential(2) : v.toFixed(2) + 'T';
  }
  return n.toExponential(2);
}

/**
 * Format money: prefix with $, apply formatNumber rules.
 */
export function formatMoney(n) {
  return '$' + formatNumber(n);
}

/**
 * Format a page number with comma-separated thousands.
 * Uses BigInt-compatible string formatting.
 */
export function formatPageNumber(bigNum) {
  const str = typeof bigNum === 'bigint' ? bigNum.toString() : String(bigNum);
  // Check if it's large enough to need formatting
  if (str.length < 4) return str;
  // Check if it would exceed T suffix range (15+ digits → might need scientific)
  if (str.length > 15) {
    // Use scientific notation for very large page numbers
    const num = Number(bigNum);
    if (!Number.isFinite(num)) {
      return str;
    }
    return num.toExponential(2);
  }
  // Insert commas from the right
  let result = '';
  for (let i = str.length - 1, count = 0; i >= 0; i--) {
    result = str[i] + result;
    count++;
    if (count % 3 === 0 && i > 0) {
      result = ',' + result;
    }
  }
  return result;
}

/**
 * Format pages per second with 2 decimal places.
 */
export function formatPagesPerSecond(pps) {
  return pps.toFixed(2);
}

/**
 * Wrap a string into lines of a given width at character boundaries.
 * @param {string} text — the text to wrap
 * @param {number} width — the maximum line width
 * @returns {string[]} — array of wrapped lines
 */
export function wrapText(text, width) {
  if (!text) return [''];
  if (text.length <= width) return [text];
  const lines = [];
  for (let i = 0; i < text.length; i += width) {
    lines.push(text.slice(i, i + width));
  }
  return lines;
}
